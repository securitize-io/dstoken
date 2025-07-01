import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenPartitioned, deployDSTokenRegulated, INVESTORS } from './utils/fixture';

describe('Token Issuer Unit Tests', function() {
  describe('Creation', function() {
    it('Should fail when trying to initialize twice', async function() {
      const { tokenIssuer } = await loadFixture(deployDSTokenRegulated);
      await expect(tokenIssuer.initialize()).revertedWithCustomError(tokenIssuer, 'InvalidInitialization');
    });

    it('Should get version correctly', async function() {
      const { tokenIssuer } = await loadFixture(deployDSTokenRegulated);
      expect( await tokenIssuer.getInitializedVersion()).to.equal(1);
    });

    it('Should get implementation address correctly', async function() {
      const { tokenIssuer } = await loadFixture(deployDSTokenRegulated);
      expect( await tokenIssuer.getImplementationAddress()).to.be.exist;
    });
  });

  describe('Normal Token Issuance', function() {
    it('Should issue tokens to a new investor without locks successfully', async function() {
      const [ investor ] = await hre.ethers.getSigners();
      const { dsToken, tokenIssuer, lockManager } = await loadFixture(deployDSTokenRegulated);

      await tokenIssuer.issueTokens(
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        investor,
        [ 100, 1 ],
        'a',
        [],
        [],
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        'US',
        [ 0, 0, 0 ],
        [ 0, 0, 0 ]
      );
      expect(await dsToken.balanceOf(investor)).to.equal(100);
      const locksCount = await lockManager.lockCount(investor);
      expect(locksCount).to.equal(0);
    });

    it('Should issue tokens to a new investor without attributes', async function() {
      const [ investor ] = await hre.ethers.getSigners();
      const { dsToken, tokenIssuer, lockManager } = await loadFixture(deployDSTokenRegulated);

      await tokenIssuer.issueTokens(
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        investor,
        [ 100, 1 ],
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        [],
        [],
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        'US',
        [],
        []
      );
      expect(await dsToken.balanceOf(investor)).to.equal(100);
      const locksCount = await lockManager.lockCount(investor);
      expect(locksCount).to.equal(0);
    });

    it('Should revert when passing attributes with size != 3', async function() {
      const [ investor ] = await hre.ethers.getSigners();
      const { tokenIssuer } = await loadFixture(deployDSTokenRegulated);

      await expect(
        tokenIssuer.issueTokens(
          INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
          investor,
          [ 100, 1 ],
          INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
          [],
          [],
          INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
          'US',
          [ 0, 0 ],
          [ 0, 0 ]
        )).to.be.revertedWith('Wrong length of parameters');
    });

    it('Should issue tokens to a new investor with locks successfully', async function() {
      const [ investor ] = await hre.ethers.getSigners();
      const { dsToken, tokenIssuer, lockManager } = await loadFixture(deployDSTokenRegulated);

      const releaseTime = await time.latest() + 1000;
      await tokenIssuer.issueTokens(
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        investor,
        [ 100, 1 ],
        '',
        [ 10 ],
        [ releaseTime ],
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        'US',
        [ 0, 0, 0 ],
        [ 0, 0, 0 ]
      );
      expect(await dsToken.balanceOf(investor)).to.equal(100);
      const transferable = await lockManager.getTransferableTokens(investor, await time.latest());
      expect(transferable).to.equal(90);

      const locksCount = await lockManager.lockCount(investor);
      const lockInfo = await lockManager.lockInfo(investor, 0);

      expect(lockInfo[2]).to.equal(10);
      expect(lockInfo[3]).to.equal(releaseTime);
      expect(locksCount).to.equal(1);
    });
  });

  describe.skip('Partitioned Token Issuance', function() {
    it('Should issue tokens to a new investor without locks successfully', async function() {
      const [ investor ] = await hre.ethers.getSigners();
      const { dsToken, tokenIssuer, lockManager } = await loadFixture(deployDSTokenPartitioned);

      await tokenIssuer.issueTokens(
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        investor,
        [ 100, 1 ],
        'a',
        [],
        [],
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        'US',
        [ 0, 0, 0 ],
        [ 0, 0, 0 ]
      );
      expect(await dsToken.balanceOf(investor)).to.equal(100);
      const partition = await dsToken.partitionOf(investor, 0);
      const locksCount = await lockManager['lockCount(address, bytes32)'](investor, partition);
      expect(locksCount).to.equal(0);
    });

    it('Should issue tokens to a new investor without attributes', async function() {
      const [ investor ] = await hre.ethers.getSigners();
      const { dsToken, tokenIssuer, lockManager } = await loadFixture(deployDSTokenPartitioned);

      await tokenIssuer.issueTokens(
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        investor,
        [ 100, 1 ],
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        [],
        [],
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        'US',
        [],
        []
      );
      expect(await dsToken.balanceOf(investor)).to.equal(100);
      const partition = await dsToken.partitionOf(investor, 0);
      const locksCount = await lockManager['lockCount(address, bytes32)'](investor, partition);
      expect(locksCount).to.equal(0);
    });

    it('Should revert when passing attributes with size != 3', async function() {
      const [ investor ] = await hre.ethers.getSigners();
      const { tokenIssuer } = await loadFixture(deployDSTokenPartitioned);

      await expect(
        tokenIssuer.issueTokens(
          INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
          investor,
          [ 100, 1 ],
          INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
          [],
          [],
          INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
          'US',
          [ 0, 0 ],
          [ 0, 0 ]
        )).to.be.revertedWith('Wrong length of parameters');
    });

    it('Should issue tokens to a new investor with locks successfully', async function() {
      const [ investor ] = await hre.ethers.getSigners();
      const { dsToken, tokenIssuer, lockManager } = await loadFixture(deployDSTokenPartitioned);

      const releaseTime = await time.latest() + 1000;
      await tokenIssuer.issueTokens(
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        investor,
        [ 100, 1 ],
        '',
        [ 50 ],
        [ releaseTime ],
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        'US',
        [ 0, 0, 0 ],
        [ 0, 0, 0 ]
      );
      expect(await dsToken.balanceOf(investor)).to.equal(100);
      const transferable = await lockManager.getTransferableTokens(investor, await time.latest());
      expect(transferable).to.equal(50);

      const partition = await dsToken.partitionOf(investor, 0);
      const locksCount = await lockManager['lockCount(address, bytes32)'](investor, partition);
      const lockInfo = await lockManager['lockInfo(address, uint256, bytes32)'](investor, 0, partition);

      expect(lockInfo[2]).to.equal(50);
      expect(lockInfo[3]).to.equal(releaseTime);
      expect(locksCount).to.equal(1);
    });
  });
});
