import hre from "hardhat";
import { expect } from "chai";

describe("deploy-all task — restricts --global-denylist-manager-address to compliance types that enforce it", function () {
  const baseArgs = {
    name: "Token Example",
    symbol: "EXA",
    decimals: 2,
  };

  it("throws when a denylist address is given with --compliance REGULATED (default)", async function () {
    const [, someAddress] = await hre.ethers.getSigners();

    await expect(
      hre.run("deploy-all", {
        ...baseArgs,
        globalDenylistManagerAddress: await someAddress.getAddress(),
      }),
    ).to.be.rejectedWith(
      "--global-denylist-manager-address is only supported with --compliance PERMISSIONLESS or BLACKLISTED, got REGULATED",
    );
  });

  it("throws when a denylist address is given with --compliance WHITELISTED", async function () {
    const [, someAddress] = await hre.ethers.getSigners();

    await expect(
      hre.run("deploy-all", {
        ...baseArgs,
        compliance: "WHITELISTED",
        globalDenylistManagerAddress: await someAddress.getAddress(),
      }),
    ).to.be.rejectedWith(
      "--global-denylist-manager-address is only supported with --compliance PERMISSIONLESS or BLACKLISTED, got WHITELISTED",
    );
  });

  it("does not throw for --compliance PERMISSIONLESS with a valid denylist address", async function () {
    const globalDenylistManager = await hre.ethers.deployContract("GlobalDenyListManagerMock");
    await globalDenylistManager.waitForDeployment();

    const contracts = await hre.run("deploy-all", {
      ...baseArgs,
      compliance: "PERMISSIONLESS",
      registryType: "STUB",
      globalDenylistManagerAddress: await globalDenylistManager.getAddress(),
    });
    expect(await contracts.globalDenylistManager.getAddress()).to.equal(await globalDenylistManager.getAddress());
  });

  it("does not throw for --compliance BLACKLISTED with a valid denylist address", async function () {
    const globalDenylistManager = await hre.ethers.deployContract("GlobalDenyListManagerMock");
    await globalDenylistManager.waitForDeployment();

    const contracts = await hre.run("deploy-all", {
      ...baseArgs,
      compliance: "BLACKLISTED",
      registryType: "STUB",
      globalDenylistManagerAddress: await globalDenylistManager.getAddress(),
    });
    expect(await contracts.globalDenylistManager.getAddress()).to.equal(await globalDenylistManager.getAddress());
  });

  it("does not throw for --compliance REGULATED when no denylist address is given", async function () {
    await expect(hre.run("deploy-all", { ...baseArgs })).to.not.be.rejected;
  });
});
