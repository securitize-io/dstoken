import hre from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { DSConstants } from "../../utils/globals";

/**
 * Cross-repo integration test (BC-2349): deploys the REAL GlobalDenyListManager, vendored
 * verbatim into contracts/vendor/global-denylist-manager/ from bc-global-denylist-manager-sc
 * (see the "VENDORED COPY" header on each of those 4 files for the exact source commit),
 * instead of the trivial GlobalDenyListManagerMock used by the rest of the
 * compliance-service-permissionless suite. Every other BC-2349 test validates
 * ComplianceServicePermissionless's OWN logic against a mock; this file validates that the
 * real sibling contract's actual ABI/behavior (its own OPERATOR_ROLE/ADMIN handover flow,
 * idempotency, pause) works correctly when wired end-to-end into a real permissionless
 * DSToken.
 *
 * This used to be a git devDependency (`npm install` re-resolving the sibling repo's `dev`
 * branch on demand), which gave automatic drift detection but required SSH access to a
 * second private repo — CI runners don't have that, so `npm install` failed there. Vendoring
 * trades that automatic drift detection for a CI that actually works: this test only catches
 * drift against whatever commit was last vendored in, not the sibling repo's live tip. See
 * docs/runbooks/global-denylist-admin.md for how to re-sync the vendored copy.
 */
describe("GlobalDenyListManager integration (real contract from bc-global-denylist-manager-sc)", function () {
  async function fixture() {
    const [deployer, operator, user1, user2] = await hre.ethers.getSigners();

    // Deploy the REAL contract — no-arg initialize(), deployer becomes ADMIN, then ADMIN
    // grants OPERATOR — mirrors that repo's own deploy-all handover flow.
    const GlobalDenyListManager = await hre.ethers.getContractFactory("GlobalDenyListManager");
    const realGlobalDenylistManager = await hre.upgrades.deployProxy(GlobalDenyListManager, []);
    await realGlobalDenylistManager.waitForDeployment();
    await realGlobalDenylistManager.addOperator(operator);

    const contracts = await hre.run("deploy-all", {
      name: "Token Example 1",
      symbol: "TX1",
      decimals: 2,
      compliance: "PERMISSIONLESS",
      registryType: "STUB",
      globalDenylistManagerAddress: await realGlobalDenylistManager.getAddress(),
    });

    const { dsToken, trustService, complianceService, blacklistManager } = contracts;
    await trustService.setRole(operator, DSConstants.roles.TRANSFER_AGENT);

    const user1Address = await user1.getAddress();
    const user2Address = await user2.getAddress();
    await dsToken.issueTokens(user1Address, 1_000);

    return {
      dsToken,
      complianceService,
      blacklistManager,
      realGlobalDenylistManager,
      deployer,
      operator,
      user1,
      user2,
      user1Address,
      user2Address,
    };
  }

  it("wires the real contract's address into the token's GLOBAL_DENYLIST_MANAGER service slot", async function () {
    const { complianceService, realGlobalDenylistManager } = await loadFixture(fixture);
    expect(await complianceService.getDSService(DSConstants.services.GLOBAL_DENYLIST_MANAGER)).to.equal(
      await realGlobalDenylistManager.getAddress(),
    );
  });

  it("real addToGlobalDenylist + preTransferCheck: rejects with code 102", async function () {
    const { complianceService, realGlobalDenylistManager, operator, user1Address, user2Address } = await loadFixture(fixture);

    await realGlobalDenylistManager.connect(operator).addToGlobalDenylist(user1Address);
    expect(await realGlobalDenylistManager.isGloballyDenylisted(user1Address)).to.equal(true);

    const check = await complianceService.preTransferCheck(user1Address, user2Address, 100);
    expect(check[0]).to.equal(102);
    expect(check[1]).to.equal("Wallet is globally denylisted");
  });

  it("real contract wired end-to-end: transfer() reverts for a globally denylisted recipient", async function () {
    const { dsToken, realGlobalDenylistManager, operator, user1, user2Address } = await loadFixture(fixture);

    await realGlobalDenylistManager.connect(operator).addToGlobalDenylist(user2Address);

    await expect(dsToken.connect(user1).transfer(user2Address, 100)).to.be.revertedWith("Wallet is globally denylisted");
  });

  it("removing from the real global denylist restores transferability immediately", async function () {
    const { complianceService, realGlobalDenylistManager, operator, user1Address, user2Address } = await loadFixture(fixture);

    await realGlobalDenylistManager.connect(operator).addToGlobalDenylist(user1Address);
    let check = await complianceService.preTransferCheck(user1Address, user2Address, 100);
    expect(check[0]).to.equal(102);

    await realGlobalDenylistManager.connect(operator).removeFromGlobalDenylist(user1Address);
    check = await complianceService.preTransferCheck(user1Address, user2Address, 100);
    expect(check[0]).to.equal(0);
  });

  it("local-only hit (real GlobalDenyListManager clean) still returns code 100, not 102", async function () {
    const { complianceService, blacklistManager, operator, user1Address, user2Address } = await loadFixture(fixture);

    await blacklistManager.connect(operator).addToBlacklist(user1Address, "local reason");

    const check = await complianceService.preTransferCheck(user1Address, user2Address, 100);
    expect(check[0]).to.equal(100);
    expect(check[1]).to.equal("Wallet is blacklisted");
  });

  it("global short-circuits local: both lists hit, code is 102 (global), not 100", async function () {
    const { complianceService, blacklistManager, realGlobalDenylistManager, operator, user1Address, user2Address } =
      await loadFixture(fixture);

    await blacklistManager.connect(operator).addToBlacklist(user1Address, "local reason");
    await realGlobalDenylistManager.connect(operator).addToGlobalDenylist(user1Address);

    const check = await complianceService.preTransferCheck(user1Address, user2Address, 100);
    expect(check[0]).to.equal(102);
  });

  it("pausing the real GlobalDenyListManager blocks new admin ops but leaves already-set state readable", async function () {
    const { complianceService, realGlobalDenylistManager, deployer, operator, user1Address, user2Address } = await loadFixture(
      fixture,
    );

    await realGlobalDenylistManager.connect(operator).addToGlobalDenylist(user1Address);
    await realGlobalDenylistManager.connect(deployer).pause();

    // Existing state is still enforced — isGloballyDenylisted is a view, unaffected by pause.
    const check = await complianceService.preTransferCheck(user1Address, user2Address, 100);
    expect(check[0]).to.equal(102);

    // But the operator can no longer add/remove while paused.
    await expect(realGlobalDenylistManager.connect(operator).addToGlobalDenylist(user2Address)).to.be.revertedWithCustomError(
      realGlobalDenylistManager,
      "EnforcedPause",
    );
  });
});
