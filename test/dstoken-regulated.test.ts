import { expect } from 'chai';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import hre from 'hardhat';
import {
  deployDSTokenRegulated,
  deployDSTokenRegulatedWithRebasing,
  deployDSTokenRegulatedWithRebasingAndEighteenDecimal,
  deployDSTokenRegulatedWithRebasingAndSixDecimal,
  INVESTORS,
} from './utils/fixture';
import { buildPermitSignature, registerInvestor } from './utils/test-helper';

describe('DS Token Regulated Unit Tests', function() {
  describe('Creation', function() {
    it('Should get the basic details of the token correctly', async function() {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      expect(await dsToken.name()).equal('Token Example 1');
      expect(await dsToken.symbol()).equal('TX1');
      expect(await dsToken.decimals()).equal(2);
      expect(await dsToken.totalSupply()).equal(0);
    });

    it('Should fail when trying to initialize twice', async function() {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      await expect(dsToken.initialize('TX1', 'TX1', 6)).revertedWithCustomError(dsToken, 'InvalidInitialization');
    });

    it('Should get version correctly', async function() {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      expect(await dsToken.getInitializedVersion()).to.equal(1);
    });

    it('Should get implementation address correctly', async function() {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      expect(await dsToken.getImplementationAddress()).to.be.exist;
    });

    it('SHOULD fail when trying to initialize implementation contract directly', async () => {
      const TokenLibrary = await hre.ethers.deployContract('TokenLibrary');
      const DSTokenFactory = await hre.ethers.getContractFactory('DSToken', {
        libraries: {
          TokenLibrary: TokenLibrary.target,
        },
      });
      const implementation = await DSTokenFactory.deploy();
      await expect(implementation.initialize('Test', 'TST', 18))
        .to.revertedWithCustomError(implementation, 'UUPSUnauthorizedCallContext');
    });
  });

  describe('Ownership', function() {
    it('Should allow to transfer ownership and return the correct owner address', async function() {
      const [, newOwner] = await hre.ethers.getSigners();
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      await dsToken.transferOwnership(newOwner);

      expect(await dsToken.owner()).equal(newOwner);
    });
  });

  describe('Name and Symbol', function() {
    it('Should update name and symbol', async function() {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      await expect(dsToken.updateNameAndSymbol('Token Example 2', 'TX2')).to
        .emit(dsToken, 'NameUpdated').withArgs('Token Example 1', 'Token Example 2')
        .emit(dsToken, 'SymbolUpdated').withArgs('TX1', 'TX2');

      expect(await dsToken.name()).equal('Token Example 2');
      expect(await dsToken.symbol()).equal('TX2');
    });

    it('Should only update name - Same symbol', async function() {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      await expect(dsToken.updateNameAndSymbol('Token Example 2', 'TX1')).to
        .emit(dsToken, 'NameUpdated').withArgs('Token Example 1', 'Token Example 2');

      expect(await dsToken.name()).equal('Token Example 2');
      expect(await dsToken.symbol()).equal('TX1');
    });

    it('Should only update symbol - Same name', async function() {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      await expect(dsToken.updateNameAndSymbol('Token Example 1', 'TX2')).to
        .emit(dsToken, 'SymbolUpdated').withArgs('TX1', 'TX2');

      expect(await dsToken.name()).equal('Token Example 1');
      expect(await dsToken.symbol()).equal('TX2');
    });

    it('Should fail if name is empty', async function() {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      await expect(dsToken.updateNameAndSymbol('', 'TX2')).to.be.revertedWith('Name cannot be empty');

      expect(await dsToken.name()).equal('Token Example 1');
      expect(await dsToken.symbol()).equal('TX1');
    });

    it('Should fail if symbol is empty', async function() {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      await expect(dsToken.updateNameAndSymbol('Token Example 2', '')).to.be.revertedWith('Symbol cannot be empty');

      expect(await dsToken.name()).equal('Token Example 1');
      expect(await dsToken.symbol()).equal('TX1');
    });

    it('Should fail when trying to update name and symbol from unauthorized account', async function() {
      const [, unauthorized] = await hre.ethers.getSigners();
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      const tokenUnauthorized = dsToken.connect(unauthorized);
      await expect(tokenUnauthorized.updateNameAndSymbol('Token Example 2', 'TX2')).to.be.revertedWith('Insufficient trust level');

      expect(await dsToken.name()).equal('Token Example 1');
      expect(await dsToken.symbol()).equal('TX1');
    });

    it('Should handle multiple sequential updates correctly', async function() {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      
      // Initial state
      expect(await dsToken.name()).equal('Token Example 1');
      expect(await dsToken.symbol()).equal('TX1');
      
      // First update: Original → Version A
      await expect(dsToken.updateNameAndSymbol('Version A', 'VA'))
        .to.emit(dsToken, 'NameUpdated').withArgs('Token Example 1', 'Version A')
        .to.emit(dsToken, 'SymbolUpdated').withArgs('TX1', 'VA');
      
      expect(await dsToken.name()).equal('Version A');
      expect(await dsToken.symbol()).equal('VA');
      
      // Second update: Version A → Version B
      await expect(dsToken.updateNameAndSymbol('Version B', 'VB'))
        .to.emit(dsToken, 'NameUpdated').withArgs('Version A', 'Version B')
        .to.emit(dsToken, 'SymbolUpdated').withArgs('VA', 'VB');
      
      expect(await dsToken.name()).equal('Version B');
      expect(await dsToken.symbol()).equal('VB');
      
      // Third update: Version B → Final
      await expect(dsToken.updateNameAndSymbol('Final Name', 'FIN'))
        .to.emit(dsToken, 'NameUpdated').withArgs('Version B', 'Final Name')
        .to.emit(dsToken, 'SymbolUpdated').withArgs('VB', 'FIN');
      
      expect(await dsToken.name()).equal('Final Name');
      expect(await dsToken.symbol()).equal('FIN');
    });

    it('Should allow no-op calls with identical values (no events emitted)', async function() {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      
      const currentName = await dsToken.name();  // 'Token Example 1'
      const currentSymbol = await dsToken.symbol();  // 'TX1'
      
      // Call with exact same values
      const tx = await dsToken.updateNameAndSymbol(currentName, currentSymbol);
      const receipt = await tx.wait();
      
      // Transaction should succeed
      expect(receipt.status).to.equal(1);
      
      // But NO events should be emitted (gas optimization)
      const nameUpdatedEvents = receipt.logs.filter((log: any) => {
        try {
          const parsed = dsToken.interface.parseLog(log);
          return parsed?.name === 'NameUpdated';
        } catch { return false; }
      });
      
      const symbolUpdatedEvents = receipt.logs.filter((log: any) => {
        try {
          const parsed = dsToken.interface.parseLog(log);
          return parsed?.name === 'SymbolUpdated';
        } catch { return false; }
      });
      
      expect(nameUpdatedEvents).to.have.length(0);
      expect(symbolUpdatedEvents).to.have.length(0);
      
      // State unchanged
      expect(await dsToken.name()).equal(currentName);
      expect(await dsToken.symbol()).equal(currentSymbol);
    });

    it('Should handle partial no-op (name changes, symbol same)', async function() {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      
      const currentSymbol = await dsToken.symbol();  // 'TX1'
      
      // Update name but keep symbol same
      const tx = await dsToken.updateNameAndSymbol('New Name', currentSymbol);
      const receipt = await tx.wait();
      
      // Should emit NameUpdated but NOT SymbolUpdated
      await expect(tx)
        .to.emit(dsToken, 'NameUpdated')
        .withArgs('Token Example 1', 'New Name');
      
      const symbolUpdatedEvents = receipt.logs.filter((log: any) => {
        try {
          const parsed = dsToken.interface.parseLog(log);
          return parsed?.name === 'SymbolUpdated';
        } catch { return false; }
      });
      
      expect(symbolUpdatedEvents).to.have.length(0);
      
      expect(await dsToken.name()).equal('New Name');
      expect(await dsToken.symbol()).equal(currentSymbol);
    });
  });

  describe('Features flag', function() {
    it('Should enable/disable features correctly', async function() {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      expect(await dsToken.supportedFeatures()).equal(0);

      await dsToken.setFeature(20, true);
      expect(await dsToken.supportedFeatures()).equal(Math.pow(2, 20));

      await dsToken.setFeature(20, false);
      expect(await dsToken.supportedFeatures()).equal(0);

      await dsToken.setFeature(31, true);
      await dsToken.setFeature(32, true);
      expect(await dsToken.supportedFeatures()).equal(Math.pow(2, 31) + Math.pow(2, 32));
    });

    it('Should set features member correctly', async function () {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      expect(await dsToken.supportedFeatures()).equal(0);

      await dsToken.setFeatures(Math.pow(2, 31));
      expect(await dsToken.supportedFeatures()).equal(Math.pow(2, 31));
    });
  });

  describe('Cap - Max Authorized securities checks', function () {
    it('Prevents issuing too many tokens', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await complianceConfigurationService.setAuthorizedSecurities(10);
      await expect(dsToken.issueTokens(investor, 500)).revertedWith('Max authorized securities exceeded');
    });
  });

  describe('Issuance', function () {
    it('Should issue tokens to a us wallet', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
      await dsToken.issueTokens(investor, 500);
      expect(await dsToken.balanceOf(investor)).equal(500);
    });

    it('Should issue tokens to a eu wallet', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
      await dsToken.issueTokens(investor, 500);
      expect(await dsToken.balanceOf(investor)).equal(500);
    });

    it('Should not issue tokens to a forbidden wallet', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);
      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.CHINA, INVESTORS.Compliance.FORBIDDEN);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.CHINA);
      await expect(dsToken.issueTokens(investor, 500)).revertedWith('Destination restricted');
    });

    it('Should record the number of total issued token correctly', async function () {
      const [investor, investor2] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.USA);
      await dsToken.issueTokens(investor, 500);
      await dsToken.issueTokens(investor2, 500);
      await dsToken.issueTokens(investor, 500);
      await dsToken.issueTokens(investor2, 500);
      expect(await dsToken.totalIssued()).equal(2000);
    });

    it('Should emit TxShares event on issuance', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);

      const valueToIssue = 500;
      const shares = await rebasingProvider.convertTokensToShares(valueToIssue);
      const multiplier = await rebasingProvider.multiplier();

      await expect(dsToken.issueTokens(investor, valueToIssue))
        .to.emit(dsToken, 'TxShares')
        .withArgs(hre.ethers.ZeroAddress, investor.address, shares, multiplier);
    });
  });

  describe('Transfer', function () {
    it('Should emit TxShares event on transfer', async function () {
      const [investor, investor2] = await hre.ethers.getSigners();
      const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
      await dsToken.issueTokens(investor, 500);

      const valueToTransfer = 100;
      const shares = await rebasingProvider.convertTokensToShares(valueToTransfer);
      const multiplier = await rebasingProvider.multiplier();

      const dsTokenFromInvestor = await dsToken.connect(investor);
      await expect(dsTokenFromInvestor.transfer(investor2, valueToTransfer))
        .to.emit(dsToken, 'TxShares')
        .withArgs(investor.address, investor2.address, shares, multiplier);
    });

    it('Investors can transfer tokens from other investors, just with previous allowance', async function () {
      // setup 2 investors
      const [investor, investor2] = await hre.ethers.getSigners();
      const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);

      // give first investor some tokens
      await dsToken.issueTokens(investor, 500);

      const valueToTransfer = 100;
      const shares = await rebasingProvider.convertTokensToShares(valueToTransfer);
      const multiplier = await rebasingProvider.multiplier();

      // connect as second investor
      const dsTokenFromInvestor = await dsToken.connect(investor2);

      // first investor approves second investor as a spender
      await dsToken.connect(investor).approve(investor2, valueToTransfer);

      await expect(dsTokenFromInvestor.transferFrom(investor, investor2, valueToTransfer))
        .to.emit(dsToken, 'TxShares')
        .withArgs(investor.address, investor2.address, shares, multiplier);
    });

    it('Investors can not steal tokens from other investors', async function () {
      // setup 2 investors
      const [investor, investor2] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);

      // give first investor some tokens
      await dsToken.issueTokens(investor, 500);

      const valueToTransfer = 100;

      // connect as second investor
      const dsTokenFromInvestor = await dsToken.connect(investor2);

      // use `transferFrom` to steal tokens from first investor, even though
      // first investor never approved second investor as a spender
      await expect(dsTokenFromInvestor.transferFrom(investor, investor2, valueToTransfer))
        .to.be.revertedWith('Not enough allowance');
    });

    describe('Permit transfer', async function () {
      it('Should sets allowance via permit()', async () => {
        const [owner, spender] = await hre.ethers.getSigners();
        const { dsToken } = await loadFixture(deployDSTokenRegulated);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const value = 100;
        const message = {
          owner: owner.address,
          spender: spender.address,
          value,
          nonce: await dsToken.nonces(owner.address),
          deadline,
        };
        const { v, r, s } = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());

        await dsToken.permit(owner.address, spender.address, value, deadline, v, r, s);

        const allowance = await dsToken.allowance(owner.address, spender.address);
        expect(allowance).to.equal(value);

        const nonceAfter = await dsToken.nonces(owner.address);
        expect(nonceAfter).to.equal(1n);
      });

      it('Should rejects expired permits', async () => {
        const [owner, spender] = await hre.ethers.getSigners();
        const { dsToken } = await loadFixture(deployDSTokenRegulated);
        const value = 100;
        const deadline = BigInt(Math.floor(Date.now() / 1000) - 10); // expired
        const message = {
          owner: owner.address,
          spender: spender.address,
          value,
          nonce: await dsToken.nonces(owner.address),
          deadline,
        };
        const { v, r, s } = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());

        await expect(
          dsToken.permit(owner.address, spender.address, value, deadline, v, r, s)
        ).to.be.revertedWith('Permit: expired deadline');
      });

      it('Should rejects reused signatures (nonce mismatch)', async () => {
        const [owner, spender] = await hre.ethers.getSigners();
        const { dsToken } = await loadFixture(deployDSTokenRegulated);
        const value = 100;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const message = {
          owner: owner.address,
          spender: spender.address,
          value,
          nonce: await dsToken.nonces(owner.address),
          deadline,
        };
        const { v, r, s } = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());

        // First permit succeeds
        await dsToken.permit(owner.address, spender.address, value, deadline, v, r, s);

        // Reusing same signature should fail (nonce already used)
        await expect(
          dsToken.permit(owner.address, spender.address, value, deadline, v, r, s),
        ).to.be.revertedWith('Permit: invalid signature');
      });

      it('Should transferWithPermit() transfers tokens and consumes nonce', async () => {
        const [owner, spender, recipient] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
        const value = 100;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const message = {
          owner: owner.address,
          spender: spender.address,
          value,
          nonce: await dsToken.nonces(owner.address),
          deadline,
        };
        const { v, r, s } = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());

        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, recipient, registryService);

        await dsToken.issueTokens(owner, value);
        const balanceBefore = await dsToken.balanceOf(recipient.address);

        await expect(dsToken.connect(spender).transferWithPermit(owner.address, recipient.address, value, deadline, v, r, s))
          .to.emit(dsToken, 'Transfer').withArgs(owner.address, recipient.address, value);

        const balanceAfter = await dsToken.balanceOf(recipient.address);
        expect(balanceAfter - balanceBefore).to.equal(value);

        // Allowance should be consumed (since transferFrom reduces it)
        const allowance = await dsToken.allowance(owner.address, spender.address);
        expect(allowance).to.equal(0n);

        // owner balance is now zero
        const ownerBalance = await dsToken.balanceOf(owner.address);
        expect(ownerBalance).to.equal(0n);
      });

      it('Should DOMAIN_SEPARATOR matches EIP-712 spec', async () => {
        const { dsToken } = await loadFixture(deployDSTokenRegulated);
        const domain = hre.ethers.TypedDataEncoder.hashDomain({
          version: '1',
          name: await dsToken.name(),
          verifyingContract: await dsToken.getAddress(),
          chainId: (await hre.ethers.provider.getNetwork()).chainId,
        });

        const separator = await dsToken.DOMAIN_SEPARATOR();
        expect(separator).to.equal(domain);
      });

      it('Should reject signature from wrong signer', async () => {
        const [owner, spender, attacker] = await hre.ethers.getSigners();
        const { dsToken } = await loadFixture(deployDSTokenRegulated);
        const value = 100;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const message = {
          owner: owner.address,
          spender: spender.address,
          value,
          nonce: await dsToken.nonces(owner.address),
          deadline,
        };
        const { v, r, s } = await buildPermitSignature(attacker, message, await dsToken.name(), await dsToken.getAddress());

        await expect(
          dsToken.permit(owner.address, spender.address, value, deadline, v, r, s)
        ).to.be.revertedWith('Permit: invalid signature');

        const allowance = await dsToken.allowance(owner.address, spender.address);
        expect(allowance).to.equal(0);
      });

      it('Should reject signature with wrong chainId', async () => {
        const [owner, spender] = await hre.ethers.getSigners();
        const { dsToken } = await loadFixture(deployDSTokenRegulated);
        const value = 100;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const wrongDomain = {
          version: '1',
          name: await dsToken.name(),
          verifyingContract: await dsToken.getAddress(),
          chainId: 999n,
        };
        const types = {
          Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        };
        const message = {
          owner: owner.address,
          spender: spender.address,
          value,
          nonce: await dsToken.nonces(owner.address),
          deadline,
        };
        const signature = await owner.signTypedData(wrongDomain, types, message);
        const { v, r, s } = hre.ethers.Signature.from(signature);

        await expect(
          dsToken.permit(owner.address, spender.address, value, deadline, v, r, s)
        ).to.be.revertedWith('Permit: invalid signature');
      });

      it('Should reject signature with wrong verifyingContract', async () => {
        const [owner, spender] = await hre.ethers.getSigners();
        const { dsToken } = await loadFixture(deployDSTokenRegulated);
        const value = 100;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const wrongDomain = {
          version: '1',
          name: await dsToken.name(),
          verifyingContract: '0x0000000000000000000000000000000000000001',
          chainId: (await hre.ethers.provider.getNetwork()).chainId,
        };
        const types = {
          Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        };
        const message = {
          owner: owner.address,
          spender: spender.address,
          value,
          nonce: await dsToken.nonces(owner.address),
          deadline,
        };
        const signature = await owner.signTypedData(wrongDomain, types, message);
        const { v, r, s } = hre.ethers.Signature.from(signature);

        await expect(
          dsToken.permit(owner.address, spender.address, value, deadline, v, r, s)
        ).to.be.revertedWith('Permit: invalid signature');
      });

      it('Should permit zero value and increment nonce', async () => {
        const [owner, spender] = await hre.ethers.getSigners();
        const { dsToken } = await loadFixture(deployDSTokenRegulated);
        const value = 0;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const nonceBefore = await dsToken.nonces(owner.address);
        const message = {
          owner: owner.address,
          spender: spender.address,
          value,
          nonce: nonceBefore,
          deadline,
        };
        const { v, r, s } = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());

        await expect(dsToken.permit(owner.address, spender.address, value, deadline, v, r, s))
          .to.emit(dsToken, 'Approval')
          .withArgs(owner.address, spender.address, 0);

        const allowance = await dsToken.allowance(owner.address, spender.address);
        expect(allowance).to.equal(0);

        const nonceAfter = await dsToken.nonces(owner.address);
        expect(nonceAfter).to.equal(nonceBefore + 1n);
      });

      it('Should overwrite existing allowance', async () => {
        const [owner, spender] = await hre.ethers.getSigners();
        const { dsToken } = await loadFixture(deployDSTokenRegulated);

        await dsToken.connect(owner).approve(spender.address, 50);
        expect(await dsToken.allowance(owner.address, spender.address)).to.equal(50);

        const value = 200;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const message = {
          owner: owner.address,
          spender: spender.address,
          value,
          nonce: await dsToken.nonces(owner.address),
          deadline,
        };
        const { v, r, s } = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());

        await dsToken.permit(owner.address, spender.address, value, deadline, v, r, s);

        const allowance = await dsToken.allowance(owner.address, spender.address);
        expect(allowance).to.equal(200);
      });

      it('Should reduce existing allowance', async () => {
        const [owner, spender] = await hre.ethers.getSigners();
        const { dsToken } = await loadFixture(deployDSTokenRegulated);

        await dsToken.connect(owner).approve(spender.address, 500);
        expect(await dsToken.allowance(owner.address, spender.address)).to.equal(500);

        const value = 100;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const message = {
          owner: owner.address,
          spender: spender.address,
          value,
          nonce: await dsToken.nonces(owner.address),
          deadline,
        };
        const { v, r, s } = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());

        await dsToken.permit(owner.address, spender.address, value, deadline, v, r, s);

        const allowance = await dsToken.allowance(owner.address, spender.address);
        expect(allowance).to.equal(100);
      });

      it('Should permit works OK after name change', async function() {
        const [owner, spender] = await hre.ethers.getSigners();
        const { dsToken } = await loadFixture(deployDSTokenRegulated);

        // Initial state: Token name is "Token Example 1"
        const originalName = await dsToken.name();
        expect(originalName).to.equal('Token Example 1');

        // Permit works BEFORE name change
        const deadline1 = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const value = 100;
        const message1 = {
          owner: owner.address,
          spender: spender.address,
          value,
          nonce: await dsToken.nonces(owner.address),
          deadline: deadline1,
        };

        // User signs with original name "Token Example 1"
        const sig1 = await buildPermitSignature(
          owner,
          message1,
          originalName, // Uses "Token Example 1"
          await dsToken.getAddress(),
        );

        // Permit succeeds with original name
        await dsToken.permit(owner.address, spender.address, value, deadline1, sig1.v, sig1.r, sig1.s);
        expect(await dsToken.allowance(owner.address, spender.address)).to.equal(value);

        // Master updates token name
        const newName = 'Token Example 2 - Updated';
        await dsToken.updateNameAndSymbol(newName, 'TX2');
        expect(await dsToken.name()).to.equal(newName);

        // STEP 3: Permit continues working after name change
        const deadline2 = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const message2 = {
          owner: owner.address,
          spender: spender.address,
          value: 200,
          nonce: await dsToken.nonces(owner.address),
          deadline: deadline2,
        };

        // User's wallet fetches current name and generates signature
        const currentName = await dsToken.name(); // Returns "Token Example 2 - Updated"

        const sig2 = await buildPermitSignature(
          owner,
          message2,
          currentName, // Uses NEW name "Token Example 2 - Updated"
          await dsToken.getAddress(),
        );

        // Permit does not fail
        await dsToken.permit(owner.address, spender.address, 200, deadline2, sig2.v, sig2.r, sig2.s);
      });

      it('Should increment nonces monotonically', async () => {
        const [owner, spender1, spender2] = await hre.ethers.getSigners();
        const { dsToken } = await loadFixture(deployDSTokenRegulated);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

        let nonce = await dsToken.nonces(owner.address);
        expect(nonce).to.equal(0n);

        let message = { owner: owner.address, spender: spender1.address, value: 100, nonce, deadline };
        let sig = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());
        await dsToken.permit(owner.address, spender1.address, 100, deadline, sig.v, sig.r, sig.s);
        nonce = await dsToken.nonces(owner.address);
        expect(nonce).to.equal(1n);

        message = { owner: owner.address, spender: spender2.address, value: 200, nonce, deadline };
        sig = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());
        await dsToken.permit(owner.address, spender2.address, 200, deadline, sig.v, sig.r, sig.s);
        nonce = await dsToken.nonces(owner.address);
        expect(nonce).to.equal(2n);

        message = { owner: owner.address, spender: spender1.address, value: 300, nonce, deadline };
        sig = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());
        await dsToken.permit(owner.address, spender1.address, 300, deadline, sig.v, sig.r, sig.s);
        nonce = await dsToken.nonces(owner.address);
        expect(nonce).to.equal(3n);

        expect(await dsToken.allowance(owner.address, spender1.address)).to.equal(300);
        expect(await dsToken.allowance(owner.address, spender2.address)).to.equal(200);
      });

      it('Should have independent nonces per wallet', async () => {
        const [user1, user2, spender] = await hre.ethers.getSigners();
        const { dsToken } = await loadFixture(deployDSTokenRegulated);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

        for (let i = 0; i < 3; i++) {
          const message = {
            owner: user1.address,
            spender: spender.address,
            value: 100 * (i + 1),
            nonce: await dsToken.nonces(user1.address),
            deadline,
          };
          const sig = await buildPermitSignature(user1, message, await dsToken.name(), await dsToken.getAddress());
          await dsToken.permit(user1.address, spender.address, 100 * (i + 1), deadline, sig.v, sig.r, sig.s);
        }

        const nonce1 = await dsToken.nonces(user1.address);
        expect(nonce1).to.equal(3n);

        const nonce2 = await dsToken.nonces(user2.address);
        expect(nonce2).to.equal(0n);
      });

      it('Should emit Approval before Transfer in transferWithPermit', async () => {
        const [owner, spender, recipient] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
        const value = 100;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const message = {
          owner: owner.address,
          spender: spender.address,
          value,
          nonce: await dsToken.nonces(owner.address),
          deadline,
        };
        const { v, r, s } = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());

        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, recipient, registryService);
        await dsToken.issueTokens(owner, value);

        const tx = await dsToken.connect(spender).transferWithPermit(owner.address, recipient.address, value, deadline, v, r, s);
        const receipt = await tx.wait();

        let approvalIndex = -1;
        let transferIndex = -1;
        receipt.logs.forEach((log: any, index: number) => {
          try {
            const parsed = dsToken.interface.parseLog({ topics: [...log.topics], data: log.data });
            if (parsed?.name === 'Approval') approvalIndex = index;
            else if (parsed?.name === 'Transfer') transferIndex = index;
          } catch {}
        });

        expect(approvalIndex).to.be.greaterThan(-1);
        expect(transferIndex).to.be.greaterThan(-1);
        expect(approvalIndex).to.be.lessThan(transferIndex);
      });

      it('Should revert transferWithPermit with expired deadline', async () => {
        const [owner, spender, recipient] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
        const value = 100;
        const deadline = BigInt(Math.floor(Date.now() / 1000) - 10);
        const message = {
          owner: owner.address,
          spender: spender.address,
          value,
          nonce: await dsToken.nonces(owner.address),
          deadline,
        };
        const { v, r, s } = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());

        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, recipient, registryService);
        await dsToken.issueTokens(owner, value);

        // With mitigation: permit() fails due to expired deadline, but since there's no existing allowance,
        // transferWithPermit reverts with "Insufficient allowance"
        await expect(
          dsToken.connect(spender).transferWithPermit(owner.address, recipient.address, value, deadline, v, r, s)
        ).to.be.revertedWith('Insufficient allowance');

        expect(await dsToken.balanceOf(recipient.address)).to.equal(0);
        expect(await dsToken.balanceOf(owner.address)).to.equal(value);
      });

      it('Should revert transferWithPermit with insufficient balance', async () => {
        const [owner, spender, recipient] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
        const value = 100;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const message = {
          owner: owner.address,
          spender: spender.address,
          value,
          nonce: await dsToken.nonces(owner.address),
          deadline,
        };
        const { v, r, s } = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());

        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, recipient, registryService);
        await dsToken.issueTokens(owner, 50);

        await expect(
          dsToken.connect(spender).transferWithPermit(owner.address, recipient.address, value, deadline, v, r, s)
        ).to.be.revertedWith('Not enough tokens');

        expect(await dsToken.balanceOf(recipient.address)).to.equal(0);
        expect(await dsToken.balanceOf(owner.address)).to.equal(50);
        expect(await dsToken.allowance(owner.address, spender.address)).to.equal(0);
        expect(await dsToken.nonces(owner.address)).to.equal(0n);
      });

      it('Should prevent replay on transferWithPermit', async () => {
        const [owner, spender, recipient] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
        const value = 100;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const message = {
          owner: owner.address,
          spender: spender.address,
          value,
          nonce: await dsToken.nonces(owner.address),
          deadline,
        };
        const { v, r, s } = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());

        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, recipient, registryService);
        await dsToken.issueTokens(owner, 200);

        await dsToken.connect(spender).transferWithPermit(owner.address, recipient.address, value, deadline, v, r, s);
        expect(await dsToken.balanceOf(recipient.address)).to.equal(100);
        expect(await dsToken.balanceOf(owner.address)).to.equal(100);

        // With mitigation: permit() fails due to nonce already consumed, but since allowance was consumed
        // by the first transferFrom, transferWithPermit reverts with "Insufficient allowance"
        await expect(
          dsToken.connect(spender).transferWithPermit(owner.address, recipient.address, value, deadline, v, r, s)
        ).to.be.revertedWith('Insufficient allowance');

        expect(await dsToken.balanceOf(recipient.address)).to.equal(100);
        expect(await dsToken.balanceOf(owner.address)).to.equal(100);
      });

      it('Should transferWithPermit with zero value', async () => {
        const [owner, spender, recipient] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
        const value = 0;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const nonceBefore = await dsToken.nonces(owner.address);
        const message = {
          owner: owner.address,
          spender: spender.address,
          value,
          nonce: nonceBefore,
          deadline,
        };
        const { v, r, s } = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());

        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, recipient, registryService);
        await dsToken.issueTokens(owner, 100);

        await expect(
          dsToken.connect(spender).transferWithPermit(owner.address, recipient.address, value, deadline, v, r, s)
        ).to.emit(dsToken, 'Transfer').withArgs(owner.address, recipient.address, 0);

        expect(await dsToken.balanceOf(owner.address)).to.equal(100);
        expect(await dsToken.balanceOf(recipient.address)).to.equal(0);

        const nonceAfter = await dsToken.nonces(owner.address);
        expect(nonceAfter).to.equal(nonceBefore + 1n);
      });

      it('Should demonstrate front-running attack on transferWithPermit', async () => {
        const [owner, spender, recipient, attacker] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
        const value = 100;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

        const message = {
          owner: owner.address,
          spender: spender.address,
          value,
          nonce: await dsToken.nonces(owner.address),
          deadline,
        };
        const { v, r, s } = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());

        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, recipient, registryService);
        await dsToken.issueTokens(owner, value);

        // ATTACK SCENARIO: Attacker front-runs by calling permit() directly
        await dsToken.connect(attacker).permit(owner.address, spender.address, value, deadline, v, r, s);

        // With mitigation: transferWithPermit() should SUCCEED because:
        // 1. permit() fails (nonce already consumed), but...
        // 2. allowance was set by attacker's permit() call
        // 3. transferFrom proceeds successfully
        await expect(
          dsToken.connect(spender).transferWithPermit(owner.address, recipient.address, value, deadline, v, r, s)
        ).to.emit(dsToken, 'Transfer').withArgs(owner.address, recipient.address, value);

        // Verify the transfer succeeded despite the front-running attack
        expect(await dsToken.balanceOf(recipient.address)).to.equal(value);
        expect(await dsToken.balanceOf(owner.address)).to.equal(0);
        expect(await dsToken.allowance(owner.address, spender.address)).to.equal(0); // Consumed by transferFrom
        expect(await dsToken.nonces(owner.address)).to.equal(1n); // Nonce consumed by attacker's permit()
      });
    });
  });

  describe('Locking', async function () {
    it('Should not allow transferring any tokens when all locked', async function () {
      const [investor, investor2] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
      await dsToken.issueTokensCustom(investor, 500, await time.latest(), 500, 'TEST', await time.latest() + 1000);

      const dsTokenFromInvestor = await dsToken.connect(investor);
      await expect(dsTokenFromInvestor.transfer(investor2, 500)).revertedWith('Tokens locked');
    });

    it('Should ignore issuance time if token has disallowBackDating set to true and allow transferring', async function () {
      const [investor, investor2] = await hre.ethers.getSigners();
      const { dsToken, complianceConfigurationService, registryService, complianceService } = await loadFixture(deployDSTokenRegulated);
      await complianceConfigurationService.setDisallowBackDating(true);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
      const issuanceTime = await time.latest();
      await dsToken.issueTokensCustom(investor, 100, issuanceTime + 10000, 0, 'TEST', 0);
      expect(await dsToken.balanceOf(investor)).equal(100);
      expect(await complianceService.getComplianceTransferableTokens(investor, await time.latest(), 0)).equal(100);

      const dsTokenFromInvestor = await dsToken.connect(investor);
      await dsTokenFromInvestor.transfer(investor2, 100);
      expect(await dsToken.balanceOf(investor)).equal(0);
      expect(await dsToken.balanceOf(investor2)).equal(100);
    });

    it('Should allow transferring tokens when other are locked', async function () {
      const [investor, investor2] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
      await dsToken.issueTokensCustom(investor, 500, await time.latest(), 200, 'TEST', await time.latest() + 1000);

      const dsTokenFromInvestor = await dsToken.connect(investor);
      await dsTokenFromInvestor.transfer(investor2, 300);
      expect(await dsToken.balanceOf(investor)).equal(200);
      expect(await dsToken.balanceOf(investor2)).equal(300);
    });

    it('Should allow transferring tokens when other are locked', async function () {
      const [investor, anotherWallet] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.addWallet(anotherWallet, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
      await dsToken.issueTokensCustom(investor, 500, await time.latest(), 500, 'TEST', await time.latest() + 1000);

      const dsTokenFromInvestor = await dsToken.connect(investor);
      await dsTokenFromInvestor.transfer(anotherWallet, 300);
      expect(await dsToken.balanceOf(investor)).equal(200);
      expect(await dsToken.balanceOf(anotherWallet)).equal(300);
    });
  });

  describe('Burn', function () {
    it('Should burn tokens from a specific wallet', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokens(investor, 500);
      await dsToken.burn(investor, 50, 'test burn');
      expect(await dsToken.balanceOf(investor)).equal(450);
      expect(await dsToken.totalIssued()).equal(500);
    });

    it('Should emit TxShares event on burn', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokens(investor, 500);

      const valueToBurn = 50;
      const shares = await rebasingProvider.convertTokensToShares(valueToBurn);
      const multiplier = await rebasingProvider.multiplier();

      await expect(dsToken.burn(investor, valueToBurn, 'test burn'))
        .to.emit(dsToken, 'TxShares')
        .withArgs(investor.address, hre.ethers.ZeroAddress, shares, multiplier);
    });
  });

  describe('Seize', function () {
    it('Should seize tokens correctly', async function () {
      const [investor, issuer] = await hre.ethers.getSigners();
      const { dsToken, registryService, walletManager } = await loadFixture(deployDSTokenRegulated);
      await walletManager.addIssuerWallet(issuer);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokens(investor, 500);
      await dsToken.seize(investor, issuer, 50, 'test burn');
      expect(await dsToken.balanceOf(investor)).equal(450);
      expect(await dsToken.balanceOf(issuer)).equal(50);
      expect(await dsToken.totalIssued()).equal(500);
    });

    it('Should emit TxShares event on seize', async function () {
      const [investor, issuer] = await hre.ethers.getSigners();
      const { dsToken, registryService, walletManager, rebasingProvider } = await loadFixture(deployDSTokenRegulated);
      await walletManager.addIssuerWallet(issuer);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokens(investor, 500);

      const valueToSeize = 50;
      const shares = await rebasingProvider.convertTokensToShares(valueToSeize);
      const multiplier = await rebasingProvider.multiplier();

      await expect(dsToken.seize(investor, issuer, valueToSeize, 'test seize'))
        .to.emit(dsToken, 'TxShares')
        .withArgs(investor.address, issuer.address, shares, multiplier);
    });

    it('Cannot seize more than balance', async function () {
      const [investor, issuer] = await hre.ethers.getSigners();
      const { dsToken, registryService, walletManager } = await loadFixture(deployDSTokenRegulated);
      await walletManager.addIssuerWallet(issuer);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokens(investor, 500);
      await expect(dsToken.seize(investor, issuer, 550, 'test burn')).revertedWith('Not enough balance');
    });
  });

  describe('DS Token Regulated with Rebasing 1500000000000000000 and 2 decimals', function () {
    describe('Cap - Max Authorized securities checks', function () {
      it('Prevents issuing too many tokens', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await complianceConfigurationService.setAuthorizedSecurities(10);
        await expect(dsToken.issueTokens(investor, 500)).revertedWith('Max authorized securities exceeded');
      });
    });

    describe('Issuance', function () {
      it('Should issue tokens to a us wallet', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.issueTokens(investor, 500);
        expect(await dsToken.balanceOf(investor)).equal(500);
      });

      it('Should issue tokens to a eu wallet', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
        await dsToken.issueTokens(investor, 500);
        expect(await dsToken.balanceOf(investor)).equal(500);
      });

      it('Should not issue tokens to a forbidden wallet', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.CHINA, INVESTORS.Compliance.FORBIDDEN);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.CHINA);
        await expect(dsToken.issueTokens(investor, 500)).revertedWith('Destination restricted');
      });

      it('Should record the number of total issued token correctly', async function () {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.USA);
        await dsToken.issueTokens(investor, 500);
        await dsToken.issueTokens(investor2, 500);
        await dsToken.issueTokens(investor, 500);
        await dsToken.issueTokens(investor2, 500);
        expect(await dsToken.totalIssued()).equal(2000);
      });

      it('Should emit TxShares event on issuance', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);

        const valueToIssue = 500;
        const shares = await rebasingProvider.convertTokensToShares(valueToIssue);
        const multiplier = await rebasingProvider.multiplier();

        await expect(dsToken.issueTokens(investor, valueToIssue))
          .to.emit(dsToken, 'TxShares')
          .withArgs(hre.ethers.ZeroAddress, investor.address, shares, multiplier);
      });
    });

    describe('Transfer', function () {
      it('Should emit TxShares event on transfer', async function () {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        await dsToken.issueTokens(investor, 500);

        const valueToTransfer = 100;
        const shares = await rebasingProvider.convertTokensToShares(valueToTransfer);
        const multiplier = await rebasingProvider.multiplier();

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await expect(dsTokenFromInvestor.transfer(investor2, valueToTransfer))
          .to.emit(dsToken, 'TxShares')
          .withArgs(investor.address, investor2.address, shares, multiplier);
      });
    });

    describe('Locking', async function () {
      it('Should not allow transferring any tokens when all locked', async function () {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.issueTokensCustom(investor, 500, await time.latest(), 500, 'TEST', await time.latest() + 1000);

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await expect(dsTokenFromInvestor.transfer(investor2, 500)).revertedWith('Tokens locked');
      });

      it('Should ignore issuance time if token has disallowBackDating set to true and allow transferring', async function () {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, complianceConfigurationService, registryService, complianceService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await complianceConfigurationService.setDisallowBackDating(true);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        const issuanceTime = await time.latest();
        await dsToken.issueTokensCustom(investor, 100, issuanceTime + 10000, 0, 'TEST', 0);
        expect(await dsToken.balanceOf(investor)).equal(100);
        expect(await complianceService.getComplianceTransferableTokens(investor, await time.latest(), 0)).equal(100);

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await dsTokenFromInvestor.transfer(investor2, 100);
        expect(await dsToken.balanceOf(investor)).equal(0);
        expect(await dsToken.balanceOf(investor2)).equal(100);
      });

      it('Should allow transferring tokens when other are locked', async function () {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.issueTokensCustom(investor, 500, await time.latest(), 200, 'TEST', await time.latest() + 1000);

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await dsTokenFromInvestor.transfer(investor2, 300);
        expect(await dsToken.balanceOf(investor)).equal(200);
        expect(await dsToken.balanceOf(investor2)).equal(300);
      });

      it('Should allow transferring tokens when other are locked', async function () {
        const [investor, anotherWallet] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.addWallet(anotherWallet, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.issueTokensCustom(investor, 500, await time.latest(), 500, 'TEST', await time.latest() + 1000);

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await dsTokenFromInvestor.transfer(anotherWallet, 300);
        expect(await dsToken.balanceOf(investor)).equal(200);
        expect(await dsToken.balanceOf(anotherWallet)).equal(300);
      });
    });

    describe('Burn', function () {
      it('Should burn tokens from a specific wallet', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.issueTokens(investor, 500);
        await dsToken.burn(investor, 50, 'test burn');
        expect(await dsToken.balanceOf(investor)).equal(450);
        expect(await dsToken.totalIssued()).equal(500);
      });

      it('Should emit TxShares event on burn', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.issueTokens(investor, 500);

        const valueToBurn = 50;
        const shares = await rebasingProvider.convertTokensToShares(valueToBurn);
        const multiplier = await rebasingProvider.multiplier();

        await expect(dsToken.burn(investor, valueToBurn, 'test burn'))
          .to.emit(dsToken, 'TxShares')
          .withArgs(investor.address, hre.ethers.ZeroAddress, shares, multiplier);
      });
    });

    describe('Seize', function () {
      it('Should seize tokens correctly', async function () {
        const [investor, issuer] = await hre.ethers.getSigners();
        const { dsToken, registryService, walletManager } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await walletManager.addIssuerWallet(issuer);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.issueTokens(investor, 500);
        await dsToken.seize(investor, issuer, 50, 'test burn');
        expect(await dsToken.balanceOf(investor)).equal(450);
        expect(await dsToken.balanceOf(issuer)).equal(50);
        expect(await dsToken.totalIssued()).equal(500);
      });

      it('Should emit TxShares event on seize', async function () {
        const [investor, issuer] = await hre.ethers.getSigners();
        const { dsToken, registryService, walletManager, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await walletManager.addIssuerWallet(issuer);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.issueTokens(investor, 500);

        const valueToSeize = 50;
        const shares = await rebasingProvider.convertTokensToShares(valueToSeize);
        const multiplier = await rebasingProvider.multiplier();

        await expect(dsToken.seize(investor, issuer, valueToSeize, 'test seize'))
          .to.emit(dsToken, 'TxShares')
          .withArgs(investor.address, issuer.address, shares, multiplier);
      });

      it('Cannot seize more than balance', async function () {
        const [investor, issuer] = await hre.ethers.getSigners();
        const { dsToken, registryService, walletManager } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await walletManager.addIssuerWallet(issuer);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.issueTokens(investor, 500);
        await expect(dsToken.seize(investor, issuer, 550, 'test burn')).revertedWith('Not enough balance');
      });
    });
  });

  describe('DS Token Regulated with Rebasing 1730000000000000000 and 6 decimals', function () {
    describe('Cap - Max Authorized securities checks', function () {
      it('Prevents issuing too many tokens', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await complianceConfigurationService.setAuthorizedSecurities(10);
        await expect(dsToken.issueTokens(investor, 500)).revertedWith('Max authorized securities exceeded');
      });
    });

    describe('Issuance', function () {
      it('Should issue tokens to a us wallet', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.issueTokens(investor, 500);
        expect(await dsToken.balanceOf(investor)).equal(500);
      });

      it('Should issue tokens to a eu wallet', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
        await dsToken.issueTokens(investor, 500);
        expect(await dsToken.balanceOf(investor)).equal(500);
      });

      it('Should not issue tokens to a forbidden wallet', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
        await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.CHINA, INVESTORS.Compliance.FORBIDDEN);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.CHINA);
        await expect(dsToken.issueTokens(investor, 500)).revertedWith('Destination restricted');
      });

      it('Should record the number of total issued token correctly', async function () {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.USA);
        await dsToken.issueTokens(investor, 500);
        await dsToken.issueTokens(investor2, 500);
        await dsToken.issueTokens(investor, 500);
        await dsToken.issueTokens(investor2, 500);
        expect(await dsToken.totalIssued()).equal(2000);
      });

      it('Should emit TxShares event on issuance', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);

        const valueToIssue = 500;
        const shares = await rebasingProvider.convertTokensToShares(valueToIssue);
        const multiplier = await rebasingProvider.multiplier();

        await expect(dsToken.issueTokens(investor, valueToIssue))
          .to.emit(dsToken, 'TxShares')
          .withArgs(hre.ethers.ZeroAddress, investor.address, shares, multiplier);
      });
    });

    describe('Transfer', function () {
      it('Should emit TxShares event on transfer', async function () {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        await dsToken.issueTokens(investor, 500);

        const valueToTransfer = 100;
        const shares = await rebasingProvider.convertTokensToShares(valueToTransfer);
        const multiplier = await rebasingProvider.multiplier();

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await expect(dsTokenFromInvestor.transfer(investor2, valueToTransfer))
          .to.emit(dsToken, 'TxShares')
          .withArgs(investor.address, investor2.address, shares, multiplier);
      });
    });

    describe('Locking', async function () {
      it('Should not allow transferring any tokens when all locked', async function () {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.issueTokensCustom(investor, 500, await time.latest(), 500, 'TEST', await time.latest() + 1000);

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await expect(dsTokenFromInvestor.transfer(investor2, 500)).revertedWith('Tokens locked');
      });

      it('Should ignore issuance time if token has disallowBackDating set to true and allow transferring', async function () {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, complianceConfigurationService, registryService, complianceService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
        await complianceConfigurationService.setDisallowBackDating(true);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        const issuanceTime = await time.latest();
        await dsToken.issueTokensCustom(investor, 100, issuanceTime + 10000, 0, 'TEST', 0);
        expect(await dsToken.balanceOf(investor)).equal(100);
        expect(await complianceService.getComplianceTransferableTokens(investor, await time.latest(), 0)).equal(100);

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await dsTokenFromInvestor.transfer(investor2, 100);
        expect(await dsToken.balanceOf(investor)).equal(0);
        expect(await dsToken.balanceOf(investor2)).equal(100);
      });

      it('Should allow transferring tokens when other are locked', async function () {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.issueTokensCustom(investor, 500, await time.latest(), 200, 'TEST', await time.latest() + 1000);

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await dsTokenFromInvestor.transfer(investor2, 300);
        expect(await dsToken.balanceOf(investor)).equal(200);
        expect(await dsToken.balanceOf(investor2)).equal(300);
      });

      it('Should allow transferring tokens when other are locked', async function () {
        const [investor, anotherWallet] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.addWallet(anotherWallet, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.issueTokensCustom(investor, 500, await time.latest(), 500, 'TEST', await time.latest() + 1000);

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await dsTokenFromInvestor.transfer(anotherWallet, 300);
        expect(await dsToken.balanceOf(investor)).equal(200);
        expect(await dsToken.balanceOf(anotherWallet)).equal(300);
      });
    });

    describe('Burn', function () {
      it('Should burn tokens from a specific wallet', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.issueTokens(investor, 500);
        await dsToken.burn(investor, 50, 'test burn');
        expect(await dsToken.balanceOf(investor)).equal(450);
        expect(await dsToken.totalIssued()).equal(500);
      });

      it('Should emit TxShares event on burn', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.issueTokens(investor, 500);

        const valueToBurn = 50;
        const shares = await rebasingProvider.convertTokensToShares(valueToBurn);
        const multiplier = await rebasingProvider.multiplier();

        await expect(dsToken.burn(investor, valueToBurn, 'test burn'))
          .to.emit(dsToken, 'TxShares')
          .withArgs(investor.address, hre.ethers.ZeroAddress, shares, multiplier);
      });
    });

    describe('Seize', function () {
      it('Should seize tokens correctly', async function () {
        const [investor, issuer] = await hre.ethers.getSigners();
        const { dsToken, registryService, walletManager } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
        await walletManager.addIssuerWallet(issuer);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.issueTokens(investor, 500);
        await dsToken.seize(investor, issuer, 50, 'test burn');
        expect(await dsToken.balanceOf(investor)).equal(450);
        expect(await dsToken.balanceOf(issuer)).equal(50);
        expect(await dsToken.totalIssued()).equal(500);
      });

      it('Should emit TxShares event on seize', async function () {
        const [investor, issuer] = await hre.ethers.getSigners();
        const { dsToken, registryService, walletManager, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
        await walletManager.addIssuerWallet(issuer);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.issueTokens(investor, 500);

        const valueToSeize = 50;
        const shares = await rebasingProvider.convertTokensToShares(valueToSeize);
        const multiplier = await rebasingProvider.multiplier();

        await expect(dsToken.seize(investor, issuer, valueToSeize, 'test seize'))
          .to.emit(dsToken, 'TxShares')
          .withArgs(investor.address, issuer.address, shares, multiplier);
      });

      it('Cannot seize more than balance', async function () {
        const [investor, issuer] = await hre.ethers.getSigners();
        const { dsToken, registryService, walletManager } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
        await walletManager.addIssuerWallet(issuer);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.issueTokens(investor, 500);
        await expect(dsToken.seize(investor, issuer, 550, 'test burn')).revertedWith('Not enough balance');
      });
    });
  });

  describe('DS Token Regulated with Rebasing 1250000000000000000 and 18 decimals', function () {
    describe('Cap - Max Authorized securities checks', function () {
      it('Prevents issuing too many tokens', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await complianceConfigurationService.setAuthorizedSecurities(10);
        await expect(dsToken.issueTokens(investor, 500)).revertedWith('Max authorized securities exceeded');
      });
    });

    describe('Issuance', function () {
      it('Should issue tokens to a us wallet', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.issueTokens(investor, 500);
        expect(await dsToken.balanceOf(investor)).equal(500);
      });

      it('Should issue tokens to a eu wallet', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
        await dsToken.issueTokens(investor, 500);
        expect(await dsToken.balanceOf(investor)).equal(500);
      });

      it('Should not issue tokens to a forbidden wallet', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
        await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.CHINA, INVESTORS.Compliance.FORBIDDEN);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.CHINA);
        await expect(dsToken.issueTokens(investor, 500)).revertedWith('Destination restricted');
      });

      it('Should record the number of total issued token correctly', async function () {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.USA);
        await dsToken.issueTokens(investor, 500);
        await dsToken.issueTokens(investor2, 500);
        await dsToken.issueTokens(investor, 500);
        await dsToken.issueTokens(investor2, 500);
        expect(await dsToken.totalIssued()).equal(2000);
      });

      it('Should emit TxShares event on issuance', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);

        const valueToIssue = 500;
        const shares = await rebasingProvider.convertTokensToShares(valueToIssue);
        const multiplier = await rebasingProvider.multiplier();

        await expect(dsToken.issueTokens(investor, valueToIssue))
          .to.emit(dsToken, 'TxShares')
          .withArgs(hre.ethers.ZeroAddress, investor.address, shares, multiplier);
      });
    });

    describe('Transfer', function () {
      it('Should emit TxShares event on transfer', async function () {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        await dsToken.issueTokens(investor, 500);

        const valueToTransfer = 100;
        const shares = await rebasingProvider.convertTokensToShares(valueToTransfer);
        const multiplier = await rebasingProvider.multiplier();

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await expect(dsTokenFromInvestor.transfer(investor2, valueToTransfer))
          .to.emit(dsToken, 'TxShares')
          .withArgs(investor.address, investor2.address, shares, multiplier);
      });
    });

    describe('Locking', async function () {
      it('Should not allow transferring any tokens when all locked', async function () {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.issueTokensCustom(investor, 500, await time.latest(), 500, 'TEST', await time.latest() + 1000);

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await expect(dsTokenFromInvestor.transfer(investor2, 500)).revertedWith('Tokens locked');
      });

      it('Should ignore issuance time if token has disallowBackDating set to true and allow transferring', async function () {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, complianceConfigurationService, registryService, complianceService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
        await complianceConfigurationService.setDisallowBackDating(true);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        const issuanceTime = await time.latest();
        await dsToken.issueTokensCustom(investor, 100, issuanceTime + 10000, 0, 'TEST', 0);
        expect(await dsToken.balanceOf(investor)).equal(100);
        expect(await complianceService.getComplianceTransferableTokens(investor, await time.latest(), 0)).equal(100);

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await dsTokenFromInvestor.transfer(investor2, 100);
        expect(await dsToken.balanceOf(investor)).equal(0);
        expect(await dsToken.balanceOf(investor2)).equal(100);
      });

      it('Should allow transferring tokens when other are locked', async function () {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.issueTokensCustom(investor, 500, await time.latest(), 200, 'TEST', await time.latest() + 1000);

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await dsTokenFromInvestor.transfer(investor2, 300);
        expect(await dsToken.balanceOf(investor)).equal(200);
        expect(await dsToken.balanceOf(investor2)).equal(300);
      });

      it('Should allow transferring tokens when other are locked', async function () {
        const [investor, anotherWallet] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.addWallet(anotherWallet, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.issueTokensCustom(investor, 500, await time.latest(), 500, 'TEST', await time.latest() + 1000);

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await dsTokenFromInvestor.transfer(anotherWallet, 300);
        expect(await dsToken.balanceOf(investor)).equal(200);
        expect(await dsToken.balanceOf(anotherWallet)).equal(300);
      });
    });

    describe('Burn', function () {
      it('Should burn tokens from a specific wallet', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.issueTokens(investor, 500);
        await dsToken.burn(investor, 50, 'test burn');
        expect(await dsToken.balanceOf(investor)).equal(450);
        expect(await dsToken.totalIssued()).equal(500);
      });

      it('Should emit TxShares event on burn', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.issueTokens(investor, 500);

        const valueToBurn = 50;
        const shares = await rebasingProvider.convertTokensToShares(valueToBurn);
        const multiplier = await rebasingProvider.multiplier();

        await expect(dsToken.burn(investor, valueToBurn, 'test burn'))
          .to.emit(dsToken, 'TxShares')
          .withArgs(investor.address, hre.ethers.ZeroAddress, shares, multiplier);
      });
    });

    describe('Seize', function () {
      it('Should seize tokens correctly', async function () {
        const [investor, issuer] = await hre.ethers.getSigners();
        const { dsToken, registryService, walletManager } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
        await walletManager.addIssuerWallet(issuer);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.issueTokens(investor, 500);
        await dsToken.seize(investor, issuer, 50, 'test burn');
        expect(await dsToken.balanceOf(investor)).equal(450);
        expect(await dsToken.balanceOf(issuer)).equal(50);
        expect(await dsToken.totalIssued()).equal(500);
      });

      it('Should emit TxShares event on seize', async function () {
        const [investor, issuer] = await hre.ethers.getSigners();
        const { dsToken, registryService, walletManager, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
        await walletManager.addIssuerWallet(issuer);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.issueTokens(investor, 500);

        const valueToSeize = 50;
        const shares = await rebasingProvider.convertTokensToShares(valueToSeize);
        const multiplier = await rebasingProvider.multiplier();

        await expect(dsToken.seize(investor, issuer, valueToSeize, 'test seize'))
          .to.emit(dsToken, 'TxShares')
          .withArgs(investor.address, issuer.address, shares, multiplier);
      });

      it('Cannot seize more than balance', async function () {
        const [investor, issuer] = await hre.ethers.getSigners();
        const { dsToken, registryService, walletManager } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
        await walletManager.addIssuerWallet(issuer);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.issueTokens(investor, 500);
        await expect(dsToken.seize(investor, issuer, 550, 'test burn')).revertedWith('Not enough balance');
      });
    });
  });

  describe('DS Token Regulated with Rebasing and 1 decimal - Rounding after multiplier change', function () {
    it('should demonstrate rounding loss with multiplier 2.0 → 1.0', async function () {
      const [owner, investor, investor2] = await hre.ethers.getSigners();

      // Deploy with multiplier 2.0
      const name = 'Token Example 1';
      const symbol = 'TX1';
      const decimals = 1;
      const multiplier = hre.ethers.parseUnits('2', 18).toString();
      const { dsToken, registryService, rebasingProvider } = await hre.run('deploy-all', { name, symbol, decimals, multiplier });

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);

      // Issue 1 token with multiplier 2.0 → generates 0.05 shares
      await dsToken.issueTokens(investor, 1);
      const sharesBeforeRebase = await rebasingProvider.convertTokensToShares(1);
      expect(sharesBeforeRebase).to.equal(50000000000000000n); // 0.05 * 10^18
      expect(await dsToken.balanceOf(investor)).to.equal(1n);

      // Change multiplier to 1.0
      await rebasingProvider.connect(owner).setMultiplier(hre.ethers.parseUnits('1', 18));

      // Balance calculation with round to nearest:
      // Step 1: (shares * multiplier + DECIMALS_FACTOR/2) / DECIMALS_FACTOR
      //         = (0.05e18 * 1e18 + 0.5e18) / 1e18 = 0.55e18 / 1e18 = 0.55 → rounds to nearest = 1
      // Step 2: (1e18 + scale/2) / scale = (1e18 + 0.5e17) / 1e17 = 1.5e18 / 1e17 = 15 → rounds to nearest = 1 token (1 decimal)
      const balanceAfter = await dsToken.balanceOf(investor);
      expect(balanceAfter).to.equal(1n);

      // To transfer 1 token with multiplier 1.0, need 0.1 shares, but only have 0.05 shares
      const sharesRequiredForTransfer = await rebasingProvider.convertTokensToShares(balanceAfter);
      expect(sharesRequiredForTransfer).to.equal(100000000000000000n); // 0.1 * 10^18
      expect(sharesRequiredForTransfer).to.be.gt(sharesBeforeRebase);

      // Transfer should fail - not enough shares despite visible balance showing 1
      const dsTokenFromInvestor = dsToken.connect(investor);
      await expect(dsTokenFromInvestor.transfer(investor2, balanceAfter)).to.be.reverted;
    });

    it('should demonstrate rounding loss with multiplier 10.0 → 1.0', async function () {
      const [owner, investor, investor2] = await hre.ethers.getSigners();

      // Deploy with multiplier 10.0
      const name = 'Token Example 1';
      const symbol = 'TX1';
      const decimals = 1;
      const multiplier = hre.ethers.parseUnits('10', 18).toString();
      const { dsToken, registryService, rebasingProvider } = await hre.run('deploy-all', { name, symbol, decimals, multiplier });

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);

      // Issue 4 tokens with multiplier 10.0 → generates 0.04 shares
      await dsToken.issueTokens(investor, 4);
      const sharesBeforeRebase = await rebasingProvider.convertTokensToShares(4);
      expect(sharesBeforeRebase).to.equal(40000000000000000n); // 0.04 * 10^18
      expect(await dsToken.balanceOf(investor)).to.equal(4n);

      // Change multiplier to 1.0
      await rebasingProvider.connect(owner).setMultiplier(hre.ethers.parseUnits('1', 18));

      // Balance calculation with round to nearest:
      // Step 1: (shares * multiplier + DECIMALS_FACTOR/2) / DECIMALS_FACTOR
      //         = (0.04e18 * 1e18 + 0.5e18) / 1e18 = 0.54e18 / 1e18
      //         = 0.54 → rounds to nearest, which is round down to 0
      // Step 2: (0 + scale/2) / scale = 0.5e17 / 1e17 = 5
      //         → rounds to nearest, which is round down to 0 token (1 decimal)
      const balanceAfter = await dsToken.balanceOf(investor);
      expect(balanceAfter).to.equal(0n);

      // User has shares > 0 in storage but visible balance is 0
      expect(sharesBeforeRebase).to.be.gt(0n);

      // Any transfer attempt should fail - balance is 0
      const dsTokenFromInvestor = dsToken.connect(investor);
      await expect(dsTokenFromInvestor.transfer(investor2, 1)).to.be.reverted;
    });

    it('should demonstrate complete loss with multiplier 3.0 → 1.0', async function () {
      const [owner, investor, investor2] = await hre.ethers.getSigners();

      // Deploy with multiplier 3.0
      const name = 'Token Example 1';
      const symbol = 'TX1';
      const decimals = 1;
      const multiplier = hre.ethers.parseUnits('3', 18).toString();
      const { dsToken, registryService, rebasingProvider } = await hre.run('deploy-all', { name, symbol, decimals, multiplier });

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);

      // Issue 1 token with multiplier 3.0 → generates ~0.033 shares
      await dsToken.issueTokens(investor, 1);
      const sharesBeforeRebase = await rebasingProvider.convertTokensToShares(1);
      expect(sharesBeforeRebase).to.equal(33333333333333333n); // ~0.033 * 10^18
      expect(await dsToken.balanceOf(investor)).to.equal(1n);

      // Change multiplier to 1.0
      await rebasingProvider.connect(owner).setMultiplier(hre.ethers.parseUnits('1', 18));

      // Balance calculation with round to nearest:
      // Step 1: (shares * multiplier + DECIMALS_FACTOR/2) / DECIMALS_FACTOR
      //         = (0.033e18 * 1e18 + 0.5e18) / 1e18 = 0.533e18 / 1e18
      //         = 0.533 → rounds to nearest, which is round down to 0
      // Step 2: (0 + scale/2) / scale = 0.5e17 / 1e17 = 5
      //         → rounds to nearest, which is round down to 0 token (1 decimal)
      const balanceAfter = await dsToken.balanceOf(investor);
      expect(balanceAfter).to.equal(0n);

      // User has shares > 0 in storage but visible balance is 0
      expect(sharesBeforeRebase).to.be.gt(0n);

      // Any transfer attempt should fail - balance is 0
      const dsTokenFromInvestor = dsToken.connect(investor);
      await expect(dsTokenFromInvestor.transfer(investor2, 1)).to.be.reverted;
    });
  });

  describe('DS Token Regulated with Rebasing and 0 decimals - Extreme rounding after multiplier change', function () {
    it('should demonstrate rounding loss with multiplier 2.0 → 1.0', async function () {
      const [owner, investor, investor2] = await hre.ethers.getSigners();

      // Deploy with multiplier 2.0 and 0 decimals
      const name = 'Token Example 1';
      const symbol = 'TX1';
      const decimals = 0;
      const multiplier = hre.ethers.parseUnits('2', 18).toString();
      const { dsToken, registryService, rebasingProvider } = await hre.run('deploy-all', { name, symbol, decimals, multiplier });

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);

      // Issue 1 token with multiplier 2.0 → generates 0.5 shares
      await dsToken.issueTokens(investor, 1);
      const sharesBeforeRebase = await rebasingProvider.convertTokensToShares(1);
      expect(sharesBeforeRebase).to.equal(500000000000000000n); // 0.5 * 10^18
      expect(await dsToken.balanceOf(investor)).to.equal(1n);

      // Change multiplier to 1.0
      await rebasingProvider.connect(owner).setMultiplier(hre.ethers.parseUnits('1', 18));

      // Balance calculation with round to nearest (demonstrates "mirror rounding effect"):
      // Step 1: (shares * multiplier + DECIMALS_FACTOR/2) / DECIMALS_FACTOR
      //         = (0.5e18 * 1e18 + 0.5e18) / 1e18 = 1.0e18 / 1e18 = 1
      // Step 2: (1e18 + scale/2) / scale where scale = 10^18
      //         = (1e18 + 0.5e18) / 1e18 = 1.5e18 / 1e18
      //         Integer division: 1.5e18 / 1e18 = 1 token (0 decimals)
      //
      // IMPORTANT: balanceOf() rounds UP showing 1 token, but internally user only has 0.5 shares
      const balanceAfter = await dsToken.balanceOf(investor);
      expect(balanceAfter).to.equal(1n);

      // To transfer 1 token with multiplier 1.0, need 1.0 shares, but only have 0.5 shares
      const sharesRequiredForTransfer = await rebasingProvider.convertTokensToShares(balanceAfter);
      expect(sharesRequiredForTransfer).to.equal(1000000000000000000n); // 1.0 * 10^18
      expect(sharesRequiredForTransfer).to.be.gt(sharesBeforeRebase);

      // Transfer fails due to "mirror rounding effect":
      // - balanceOf() rounds UP: 0.5 shares → displays as 1 token
      // - transfer() requires exact shares: 1 token → needs 1.0 shares
      // - User only has 0.5 shares → insufficient → REVERT
      const dsTokenFromInvestor = dsToken.connect(investor);
      await expect(dsTokenFromInvestor.transfer(investor2, balanceAfter)).to.be.reverted;
    });

    it('should demonstrate complete loss with multiplier 3.0 → 1.0', async function () {
      const [owner, investor, investor2] = await hre.ethers.getSigners();

      // Deploy with multiplier 3.0 and 0 decimals
      const name = 'Token Example 1';
      const symbol = 'TX1';
      const decimals = 0;
      const multiplier = hre.ethers.parseUnits('3', 18).toString();
      const { dsToken, registryService, rebasingProvider } = await hre.run('deploy-all', { name, symbol, decimals, multiplier });

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);

      // Issue 1 token with multiplier 3.0 → generates ~0.333 shares
      await dsToken.issueTokens(investor, 1);
      const sharesBeforeRebase = await rebasingProvider.convertTokensToShares(1);
      expect(sharesBeforeRebase).to.equal(333333333333333333n); // ~0.333 * 10^18
      expect(await dsToken.balanceOf(investor)).to.equal(1n);

      // Change multiplier to 1.0
      await rebasingProvider.connect(owner).setMultiplier(hre.ethers.parseUnits('1', 18));

      // Balance calculation with round to nearest:
      // Step 1: (shares * multiplier + DECIMALS_FACTOR/2) / DECIMALS_FACTOR
      //         = (0.333e18 * 1e18 + 0.5e18) / 1e18 = 0.833e18 / 1e18
      //         = 0.833 → rounds to nearest, which is round down to 0
      // Step 2: (0 + scale/2) / scale = 0.5e18 / 1e18 = 0.5
      //         → rounds to nearest, which is round down to 0 token (0 decimals)
      const balanceAfter = await dsToken.balanceOf(investor);
      expect(balanceAfter).to.equal(0n);

      // User has shares > 0 in storage but visible balance is 0
      expect(sharesBeforeRebase).to.be.gt(0n);

      // Any transfer attempt should fail - balance is 0
      const dsTokenFromInvestor = dsToken.connect(investor);
      await expect(dsTokenFromInvestor.transfer(investor2, 1)).to.be.reverted;
    });

    it('should demonstrate complete loss with multiplier 10.0 → 1.0', async function () {
      const [owner, investor, investor2] = await hre.ethers.getSigners();

      // Deploy with multiplier 10.0 and 0 decimals
      const name = 'Token Example 1';
      const symbol = 'TX1';
      const decimals = 0;
      const multiplier = hre.ethers.parseUnits('10', 18).toString();
      const { dsToken, registryService, rebasingProvider } = await hre.run('deploy-all', { name, symbol, decimals, multiplier });

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);

      // Issue 1 token with multiplier 10.0 → generates 0.1 shares
      await dsToken.issueTokens(investor, 1);
      const sharesBeforeRebase = await rebasingProvider.convertTokensToShares(1);
      expect(sharesBeforeRebase).to.equal(100000000000000000n); // 0.1 * 10^18
      expect(await dsToken.balanceOf(investor)).to.equal(1n);

      // Change multiplier to 1.0
      await rebasingProvider.connect(owner).setMultiplier(hre.ethers.parseUnits('1', 18));

      // Balance calculation with round to nearest:
      // Step 1: (shares * multiplier + DECIMALS_FACTOR/2) / DECIMALS_FACTOR
      //         = (0.1e18 * 1e18 + 0.5e18) / 1e18 = 0.6e18 / 1e18
      //         = 0.6 → rounds to nearest, which is round down to 0
      // Step 2: (0 + scale/2) / scale = 0.5e18 / 1e18 = 0.5
      //         → rounds to nearest, which is round down to 0 token (0 decimals)
      const balanceAfter = await dsToken.balanceOf(investor);
      expect(balanceAfter).to.equal(0n);

      // User has shares > 0 in storage but visible balance is 0
      expect(sharesBeforeRebase).to.be.gt(0n);

      // Any transfer attempt should fail - balance is 0
      const dsTokenFromInvestor = dsToken.connect(investor);
      await expect(dsTokenFromInvestor.transfer(investor2, 1)).to.be.reverted;
    });
  });
});
