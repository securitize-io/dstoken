import hre from 'hardhat';
import { expect } from 'chai';
import { deployDSTokenGlobalWhitelisted, INVESTORS } from './utils/fixture';
import { DSConstants } from '../utils/globals';
import { waitUntilIdle } from '../tasks/utils/task.helper';

describe('Global blacklist tasks (BC-2643)', function () {
  const BLM = DSConstants.services.BLACKLIST_MANAGER;

  async function setup() {
    const [master, ta, w1, w2, w3, investor1, investor2] = await hre.ethers.getSigners();
    const tokenA = await deployDSTokenGlobalWhitelisted();
    const tokenB = await deployDSTokenGlobalWhitelisted();

    // Local lists: A = {w1, w2}, B = {w2, w3}
    await tokenA.blacklistManager.addToBlacklist(w1.address, 'sanctioned');
    await tokenA.blacklistManager.addToBlacklist(w2.address, 'lost wallet');
    await tokenB.blacklistManager.addToBlacklist(w2.address, 'lost wallet');
    await tokenB.blacklistManager.addToBlacklist(w3.address, 'fraud');

    const globalList = await hre.run('deploy-global-blacklist', { master: master.address, transferAgents: ta.address });
    return { master, ta, w1, w2, w3, investor1, investor2, tokenA, tokenB, globalList, global: globalList.blackListManager as string };
  }

  const migrateArgs = (token: any, global: string, execute = false) => ({ token: token.dsToken.target, global, execute });

  describe('deploy-global-blacklist', function () {
    it('deploys a dedicated trust service and wires roles', async function () {
      const { globalList, master, ta, tokenA } = await setup();
      const blm = globalList.blacklistManager;
      const trust = globalList.trustService;

      expect(await blm.getDSService(DSConstants.services.TRUST_SERVICE)).to.equal(globalList.trustService.target);
      expect(globalList.trustService.target).to.not.equal(tokenA.trustService.target);
      expect(await trust.getRole(master.address)).to.equal(DSConstants.roles.MASTER);
      expect(await trust.getRole(ta.address)).to.equal(DSConstants.roles.TRANSFER_AGENT);
      expect(await blm.owner()).to.equal(master.address);
    });

    it('moves MASTER and ownership to the given addresses', async function () {
      const [signer, newMaster, newOwner, agent] = await hre.ethers.getSigners();
      const result = await hre.run('deploy-global-blacklist', {
        master: newMaster.address,
        transferAgents: agent.address,
        owner: newOwner.address,
      });
      expect(await result.trustService.getRole(newMaster.address)).to.equal(DSConstants.roles.MASTER);
      expect(await result.trustService.getRole(signer.address)).to.equal(DSConstants.roles.NONE);
      expect(await result.trustService.getRole(agent.address)).to.equal(DSConstants.roles.TRANSFER_AGENT);
      expect(await result.blacklistManager.owner()).to.equal(newOwner.address);
      expect(result.blackListManager).to.equal(result.blacklistManager.target);
    });

    it('resumes with an existing TrustService without deploying a new one', async function () {
      const [signer, newMaster, agent] = await hre.ethers.getSigners();
      const trustService = await hre.run('deploy-trust-service');
      const result = await hre.run('deploy-global-blacklist', {
        master: newMaster.address,
        transferAgents: agent.address,
        trustService: trustService.target,
      });
      expect(result.trustService.target).to.equal(trustService.target);
      expect(await result.blacklistManager.getDSService(DSConstants.services.TRUST_SERVICE)).to.equal(trustService.target);
      expect(await trustService.getRole(newMaster.address)).to.equal(DSConstants.roles.MASTER);
      expect(await trustService.getRole(agent.address)).to.equal(DSConstants.roles.TRANSFER_AGENT);
      expect(await trustService.getRole(signer.address)).to.equal(DSConstants.roles.NONE);
    });

    it('resumes with both addresses: only missing wiring runs and a second run is a no-op', async function () {
      const [, newMaster, newOwner, agent] = await hre.ethers.getSigners();
      const trustService = await hre.run('deploy-trust-service');
      const blm = await hre.run('deploy-blacklist-manager');
      const args = {
        master: newMaster.address,
        transferAgents: agent.address,
        owner: newOwner.address,
        trustService: trustService.target,
        blacklistManager: blm.target,
      };

      // Partially done: BLM already connected
      await blm.setDSService(DSConstants.services.TRUST_SERVICE, trustService.target);

      await hre.run('deploy-global-blacklist', args);
      expect(await blm.getDSService(DSConstants.services.TRUST_SERVICE)).to.equal(trustService.target);
      expect(await trustService.getRole(agent.address)).to.equal(DSConstants.roles.TRANSFER_AGENT);
      expect(await trustService.getRole(newMaster.address)).to.equal(DSConstants.roles.MASTER);
      expect(await blm.owner()).to.equal(newOwner.address);

      // The signer lost every right: a re-run must send nothing
      const blockBefore = await hre.ethers.provider.getBlockNumber();
      await hre.run('deploy-global-blacklist', args);
      expect(await hre.ethers.provider.getBlockNumber()).to.equal(blockBefore);
    });

    it('rejects resume addresses without code', async function () {
      const [signer, other] = await hre.ethers.getSigners();
      await expect(hre.run('deploy-global-blacklist', { master: signer.address, trustService: other.address }))
        .to.be.rejectedWith('No contract at --trust-service');
      await expect(hre.run('deploy-global-blacklist', { master: signer.address, blacklistManager: other.address }))
        .to.be.rejectedWith('No contract at --blacklist-manager');
    });

    it('waitUntilIdle resolves when idle and throws an actionable error with a pending tx', async function () {
      const [signer, other] = await hre.ethers.getSigners();
      await waitUntilIdle(signer.address, hre);

      await hre.network.provider.send('evm_setAutomine', [false]);
      try {
        await signer.sendTransaction({ to: other.address, value: 1 });
        await expect(waitUntilIdle(signer.address, hre, { timeoutMs: 50, pollMs: 10 }))
          .to.be.rejectedWith('pending transaction');
      } finally {
        await hre.network.provider.send('evm_setAutomine', [true]);
        await hre.network.provider.send('evm_mine', []);
      }
      await waitUntilIdle(signer.address, hre);
    });

    it('validates addresses before deploying', async function () {
      const [signer] = await hre.ethers.getSigners();
      await expect(hre.run('deploy-global-blacklist', { master: '0x123' })).to.be.rejectedWith('--master must be a valid non-zero address');
      await expect(hre.run('deploy-global-blacklist', { master: signer.address, transferAgents: `${signer.address},nope` }))
        .to.be.rejectedWith('--transfer-agents');
      await expect(hre.run('deploy-global-blacklist', { master: signer.address, owner: hre.ethers.ZeroAddress }))
        .to.be.rejectedWith('--owner');
    });
  });

  describe('migrate-token-blacklist', function () {
    it('dry run sends nothing and prints calls with calldata', async function () {
      const { tokenA, globalList, global } = await setup();
      const blockBefore = await hre.ethers.provider.getBlockNumber();

      const result = await hre.run('migrate-token-blacklist', migrateArgs(tokenA, global));

      expect(await hre.ethers.provider.getBlockNumber()).to.equal(blockBefore);
      expect(result.executed).to.equal(false);
      expect(result.calls).to.have.length(4); // 2 entries + 2 repoints
      expect(result.calls[2].target).to.equal(tokenA.dsToken.target);
      expect(result.calls[3].target).to.equal(tokenA.complianceService.target);
      expect(result.calls[2].data).to.equal(
        tokenA.dsToken.interface.encodeFunctionData('setDSService', [BLM, global]),
      );
      expect(await globalList.blacklistManager.getBlacklistedWalletsCount()).to.equal(0);
      expect(await tokenA.dsToken.getDSService(BLM)).to.equal(tokenA.blacklistManager.target);
    });

    it('execute copies entries and repoints both maps, idempotently', async function () {
      const { tokenA, tokenB, globalList, global, w1, w2, w3 } = await setup();

      const resultA = await hre.run('migrate-token-blacklist', migrateArgs(tokenA, global, true));
      expect(resultA.executed).to.equal(true);
      expect(await tokenA.dsToken.getDSService(BLM)).to.equal(global);
      expect(await tokenA.complianceService.getDSService(BLM)).to.equal(global);
      expect(await globalList.blacklistManager.getBlacklistReason(w1.address)).to.equal('sanctioned');
      expect(await globalList.blacklistManager.getBlacklistReason(w2.address)).to.equal('lost wallet');

      // Second token shares w2: only w3 is missing (1 entry + 2 repoints)
      const dry = await hre.run('migrate-token-blacklist', migrateArgs(tokenB, global));
      expect(dry.calls).to.have.length(3);
      await hre.run('migrate-token-blacklist', migrateArgs(tokenB, global, true));
      expect([...(await globalList.blacklistManager.getBlacklistedWallets())].sort())
        .to.deep.equal([w1.address, w2.address, w3.address].sort());

      // Re-run: nothing left to do
      const again = await hre.run('migrate-token-blacklist', migrateArgs(tokenA, global, true));
      expect(again.calls).to.have.length(0);
      expect(again.executed).to.equal(false);
    });

    it('refuses a global address without code and an unreachable compliance', async function () {
      const { tokenA, investor1 } = await setup();
      await expect(hre.run('migrate-token-blacklist', migrateArgs(tokenA, investor1.address)))
        .to.be.rejectedWith('No contract at --global');

      const { globalList } = await setup();
      await tokenA.dsToken.setDSService(DSConstants.services.COMPLIANCE_SERVICE, hre.ethers.ZeroAddress);
      await expect(hre.run('migrate-token-blacklist', migrateArgs(tokenA, globalList.blackListManager)))
        .to.be.rejectedWith('not reachable');
    });

    it('stops on the first failure without repointing', async function () {
      const { tokenA, globalList, global, ta } = await setup();
      // Signer loses TA rights on the global list: addToBlacklist must fail and nothing is repointed.
      const [signer] = await hre.ethers.getSigners();
      await globalList.trustService.removeRole(ta.address);
      await globalList.trustService.setServiceOwner(ta.address);
      expect(await globalList.trustService.getRole(signer.address)).to.equal(DSConstants.roles.NONE);

      await expect(hre.run('migrate-token-blacklist', migrateArgs(tokenA, global, true))).to.be.rejected;
      expect(await tokenA.dsToken.getDSService(BLM)).to.equal(tokenA.blacklistManager.target);
      expect(await tokenA.complianceService.getDSService(BLM)).to.equal(tokenA.blacklistManager.target);
    });
  });

  describe('verify-blacklist-wiring', function () {
    it('passes after migration and throws on a deliberate mismatch', async function () {
      const { tokenA, tokenB, global } = await setup();
      const tokens = `${tokenA.dsToken.target},${tokenB.dsToken.target}`;

      // Before: each token has its own local list, but token and compliance agree
      await hre.run('verify-blacklist-wiring', { tokens });
      await expect(hre.run('verify-blacklist-wiring', { tokens, global })).to.be.rejectedWith('mismatch');

      await hre.run('migrate-token-blacklist', migrateArgs(tokenA, global, true));
      await hre.run('migrate-token-blacklist', migrateArgs(tokenB, global, true));
      await hre.run('verify-blacklist-wiring', { tokens, global });

      // Deliberate mismatch: only the compliance map is pointed elsewhere
      await tokenB.complianceService.setDSService(BLM, tokenB.blacklistManager.target);
      await expect(hre.run('verify-blacklist-wiring', { tokens })).to.be.rejectedWith('mismatch on 1 of 2');
      await expect(hre.run('verify-blacklist-wiring', { tokens: tokenA.dsToken.target, global: tokenB.blacklistManager.target }))
        .to.be.rejectedWith('mismatch');
    });
  });

  describe('shared list enforcement', function () {
    it('a wallet blacklisted once on the global list is blocked on both tokens', async function () {
      const { tokenA, tokenB, global, globalList, ta, investor1, investor2 } = await setup();
      const tokens = [tokenA, tokenB];

      for (const [i, t] of tokens.entries()) {
        await t.registryService.registerInvestor(`inv1-${i}`, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await t.registryService.addWallet(investor1.address, `inv1-${i}`);
        await t.registryService.registerInvestor(`inv2-${i}`, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_2);
        await t.registryService.addWallet(investor2.address, `inv2-${i}`);
        await t.dsToken.issueTokens(investor1.address, 100);
        await hre.run('migrate-token-blacklist', migrateArgs(t, global, true));
        // Not blacklisted yet: transfers pass the compliance check
        expect((await t.complianceService.preTransferCheck(investor1.address, investor2.address, 10))[0]).to.equal(0);
      }

      await globalList.blacklistManager.connect(ta).addToBlacklist(investor2.address, 'sanctioned once');

      for (const t of tokens) {
        const check = await t.complianceService.preTransferCheck(investor1.address, investor2.address, 10);
        expect(check[0]).to.equal(100);
        expect(check[1]).to.equal('Wallet is blacklisted');
        await expect(t.dsToken.connect(investor1).transfer(investor2.address, 10)).to.be.reverted;
      }
    });
  });
});
