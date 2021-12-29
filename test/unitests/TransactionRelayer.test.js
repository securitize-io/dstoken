const TestToken = artifacts.require('TestToken');
const lightwallet = require('eth-lightwallet');
const assertRevert = require('../utils/assertRevert');
const deployContractBehindProxy = require('../utils').deployContractBehindProxy;
const roles = require('../../utils/globals').roles;
const deployContracts = require('../utils/index').deployContracts;
const { setOmnibusTBEServicesDependencies, resetCounters, setCounters, toHex, assertCounters, assertEvent } =
  require('../utils/omnibus/utils');
const fixtures = require('../fixtures');
const globals = require('../../utils/globals');
const { HSMSigner } = require('../utils/specialSigners');

// eslint-disable-next-line max-len
const TXTYPE_HASH = '0x18352269123822ee0d5f7ae54168e303ddfc22d7bd1afb2feb38c21fffe27ea7';
const NAME_HASH = '0x378460f4f89643d76dadb1d55fed95ff69d3c2e4b34cc81a5b565a797b10ce30';
const VERSION_HASH = '0x2a80e1ef1d7842f27f2e6be0972bb708b9a135c38860dbe73c27c3486c34f4de';
const EIP712DOMAINTYPE_HASH = '0xd87cd6ef79d4e2b95e15ce8abf732db51ec771f1ca2edccf22a46c729ac56472';
const SALT = '0x6e31104f5170e59a0a98ebdeb5ba99f8b32ef7b56786b1722f81a5fa19dd1629';

const CHAINID = 1;
const seedPhrase = 'cereal face vapor scrub trash traffic disease region swim stick identify grant';
const password = '';
const ZEROADDR = '0x0000000000000000000000000000000000000000';

const HOLDER_ID = '7eecc07cb4d247af821e848a35bc9d2d';
const HOLDER_ADDRESS = '0xb94824a9cc0714D8A3AFee0aF6b8524E91AE4b1B';
const HOLDER_COUNTRY_CODE = 'US';

const lockManagerType = globals.lockManagerType;
const role = globals.roles;
const compliance = globals.complianceType;

const investorId = fixtures.InvestorId;

let euRetailCountries = [];
let euRetailCountryCounts = [];
const issuanceTime = 15495894;

let hsmSigner = null;

contract.only('TransactionRelayer', function ([owner, destinationAddress, omnibusWallet, investorWallet1,
  investorWallet2]) {
  let keyFromPw;
  let acct;
  let lightWalletKeyStore;
  let tokenInstance;
  let initialNonce;
  let executor;
  const ISSUED_TOKENS = 1000000;
  const gasLimit = 200000000;
  const value = 0;
  before(async () => {
    await lightwallet.keystore.createVault({
      hdPathString: 'm/44\'/60\'/0\'/0',
      seedPhrase: seedPhrase,
      password: password,
    }, function (err, keystore) {
      lightWalletKeyStore = keystore;
      lightWalletKeyStore.keyFromPassword(password, function (e, privateKey) {
        keyFromPw = privateKey;
        lightWalletKeyStore.generateNewAddress(keyFromPw, 10);
        let acctWithout0x = lightWalletKeyStore.getAddresses();
        acct = acctWithout0x.map((a) => { return a; });
        acct.sort();

        hsmSigner = new HSMSigner({
          nameHash: NAME_HASH,
          versionHash: VERSION_HASH,
          chainId: CHAINID,
          salt: SALT,
          eip712DomainTypeHash: EIP712DOMAINTYPE_HASH,
          txTypeHash: TXTYPE_HASH,
          lightWalletKeyStore,
          keyFromPw,
        });
      });
    });

    // Omnibus Deployments!
    await deployContracts(
      this,
      artifacts,
      compliance.NORMAL,
      lockManagerType.INVESTOR,
      undefined,
      false,
      omnibusWallet
    );

    // Registrar Deployments!

    await deployContractBehindProxy(
      artifacts.require('Proxy'),
      artifacts.require('WalletRegistrar'),
      this,
      'walletRegistrar'
    );

    await deployContractBehindProxy(
      artifacts.require('Proxy'),
      artifacts.require('TransactionRelayer'),
      this,
      'transactionRelayer',
      [CHAINID]
    );

    // Set Services!
    console.log('Connecting transaction relayer to trust service');
    const TRUST_SERVICE = 1;
    await this.transactionRelayer.setDSService(TRUST_SERVICE, this.trustService.address);

    console.log('Connecting wallet registrar');
    const REGISTRY_SERVICE = 4;
    await this.walletRegistrar.setDSService(REGISTRY_SERVICE, this.registryService.address);

    await this.walletRegistrar.setDSService(
      TRUST_SERVICE,
      this.trustService.address
    );

    await this.registryService.setDSService(
      TRUST_SERVICE,
      this.trustService.address
    );

    await this.trustService.setRole(this.walletRegistrar.address, roles.ISSUER, {
      from: owner,
    });

    console.log('Connecting registry to wallet mananger');
    const WALLET_MANAGER = 32;
    await this.registryService.setDSService(
      WALLET_MANAGER,
      this.walletManager.address
    );

    console.log('Omnibus Settings');

    await setOmnibusTBEServicesDependencies(this);

    await this.registryService.registerInvestor(
      investorId.GENERAL_INVESTOR_ID_1,
      investorId.GENERAL_INVESTOR_COLLISION_HASH_2
    );
    await this.registryService.addWallet(
      investorWallet1,
      investorId.GENERAL_INVESTOR_ID_1
    );
    await this.registryService.registerInvestor(
      investorId.GENERAL_INVESTOR_ID_2,
      investorId.GENERAL_INVESTOR_COLLISION_HASH_2
    );
    await this.registryService.addWallet(
      investorWallet2,
      investorId.GENERAL_INVESTOR_ID_2
    );

    await resetCounters(this);
  });
  describe('execute', () => {
    describe(`ERC-20 token smart contract. Transferring ${ISSUED_TOKENS} TestToken to ${destinationAddress}`, () => {
      describe(`WHEN transferring ${ISSUED_TOKENS} TestToken `, () => {
        beforeEach(async () => {
          executor = acct[1];
          tokenInstance = await TestToken.new({ from: owner });
          assert.ok(tokenInstance);

          initialNonce = await this.transactionRelayer.nonce.call();
          assert.ok(initialNonce);
        });
        describe('AND one issuer sign a TestToken.issueTokens() transaction', () => {
          it('SHOULD transfer tokens from Relayer to destinationAddress', async () => {
            let issuer = acct[0];

            await this.trustService.setRole(issuer, roles.ISSUER, {
              from: owner,
            });

            const role = await this.trustService.getRole(issuer);
            assert.equal(role.words[0], roles.ISSUER);

            const data = tokenInstance.contract.methods.issueTokens(
              destinationAddress,
              ISSUED_TOKENS).encodeABI();

            let sigs = hsmSigner.preApproval(
              issuer,
              this.transactionRelayer.address,
              initialNonce.toNumber(),
              tokenInstance.address,
              0,
              data,
              ZEROADDR,
              gasLimit);

            await this.transactionRelayer.execute(
              sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              tokenInstance.address,
              0,
              data,
              ZEROADDR,
              gasLimit,
              { from: executor, gasLimit });

            let newNonce = await this.transactionRelayer.nonce.call();
            assert.equal(initialNonce.toNumber() + 1, newNonce.toNumber());

            assert.equal(
              0,
              await tokenInstance.balanceOf(this.transactionRelayer.address)
            );

            assert.equal(
              ISSUED_TOKENS,
              await tokenInstance.balanceOf(destinationAddress)
            );
          });
        });
        describe('AND only one no issuer sign a TestToken.issueTokens() transaction', () => {
          it('SHOULD revert', async () => {
            let issuer = acct[3];
            const data = tokenInstance.contract.methods.issueTokens(
              destinationAddress,
              ISSUED_TOKENS).encodeABI();

            let sigs = hsmSigner.preApproval(
              issuer,
              this.transactionRelayer.address,
              initialNonce.toNumber(),
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit);
            await assertRevert(
              this.transactionRelayer.execute(
                sigs.sigV,
                sigs.sigR,
                sigs.sigS,
                tokenInstance.address,
                value,
                data,
                ZEROADDR,
                gasLimit,
                { from: executor, gasLimit })
            );
          });
        });
        describe('WHEN signing with wrong TXTYPE_HASH ', () => {
          it('SHOULD revert', async () => {
            let issuer = acct[0];
            const data = tokenInstance.contract.methods.issueTokens(
              destinationAddress,
              ISSUED_TOKENS).encodeABI();

            let sigs = hsmSigner.preApproval(
              issuer,
              this.transactionRelayer.address,
              initialNonce.toNumber(),
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              'wrong hash');
            await assertRevert(
              this.transactionRelayer.execute(
                sigs.sigV,
                sigs.sigR,
                sigs.sigS,
                tokenInstance.address,
                value,
                data,
                ZEROADDR,
                gasLimit,
                { from: executor, gasLimit })
            );
          });
        });
        describe('WHEN signing with wrong NAME_HASH ', () => {
          it('SHOULD revert', async () => {
            let issuer = acct[0];
            const data = tokenInstance.contract.methods.issueTokens(
              destinationAddress,
              ISSUED_TOKENS).encodeABI();

            let sigs = hsmSigner.preApproval(
              issuer,
              this.transactionRelayer.address,
              initialNonce.toNumber(),
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              TXTYPE_HASH,
              'wrong hash');
            await assertRevert(
              this.transactionRelayer.execute(
                sigs.sigV,
                sigs.sigR,
                sigs.sigS,
                tokenInstance.address,
                value,
                data,
                ZEROADDR,
                gasLimit,
                { from: executor, gasLimit })
            );
          });
        });
        describe('WHEN signing with wrong VERSION_HASH ', () => {
          it('SHOULD revert', async () => {
            let issuer = acct[0];
            const data = tokenInstance.contract.methods.issueTokens(
              destinationAddress,
              ISSUED_TOKENS).encodeABI();

            let sigs = hsmSigner.preApproval(
              issuer,
              this.transactionRelayer.address,
              initialNonce.toNumber(),
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              TXTYPE_HASH,
              NAME_HASH,
              'wrong hash');
            await assertRevert(
              this.transactionRelayer.execute(
                sigs.sigV,
                sigs.sigR,
                sigs.sigS,
                tokenInstance.address,
                value,
                data,
                ZEROADDR,
                gasLimit,
                { from: executor, gasLimit })
            );
          });
        });
        describe('WHEN signing with wrong EIP712DOMAINTYPE_HASH ', () => {
          it('SHOULD revert', async () => {
            let issuer = acct[0];
            const data = tokenInstance.contract.methods.issueTokens(
              destinationAddress,
              ISSUED_TOKENS).encodeABI();

            let sigs = hsmSigner.preApproval(
              issuer,
              this.transactionRelayer.address,
              initialNonce.toNumber(),
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              TXTYPE_HASH,
              NAME_HASH,
              VERSION_HASH,
              'WRONG HASH');
            await assertRevert(
              this.transactionRelayer.execute(
                sigs.sigV,
                sigs.sigR,
                sigs.sigS,
                tokenInstance.address,
                value,
                data,
                ZEROADDR,
                gasLimit,
                { from: executor, gasLimit })
            );
          });
        });
      });
    });
    describe('Interaction with Registry Service', () => {
      beforeEach(async () => {
        executor = acct[1];
        initialNonce = await this.transactionRelayer.nonce.call();
        assert.ok(initialNonce);
      });
      describe('Register a Wallet', () => {
        it('SHOULD Register a wallet signing with the relayer', async () => {
          let issuer = acct[0];

          const role = await this.trustService.getRole(issuer);
          assert.equal(role.words[0], roles.ISSUER);

          await this.trustService.setRole(this.transactionRelayer.address, roles.ISSUER, {
            from: owner,
          });

          const data = this.walletRegistrar.contract.methods.registerWallet(
            HOLDER_ID,
            [HOLDER_ADDRESS],
            HOLDER_ID,
            HOLDER_COUNTRY_CODE,
            ['1', '2'],
            ['1', '1'],
            ['0', '0']
          ).encodeABI();

          let sigs = hsmSigner.preApproval(
            issuer,
            this.transactionRelayer.address,
            initialNonce.toNumber(),
            this.walletRegistrar.address,
            value,
            data,
            ZEROADDR,
            gasLimit);

          await this.transactionRelayer.execute(
            sigs.sigV,
            sigs.sigR,
            sigs.sigS,
            this.walletRegistrar.address,
            0,
            data,
            ZEROADDR,
            gasLimit,
            { from: executor, gasLimit });

          let newNonce = await this.transactionRelayer.nonce.call();
          assert.equal(initialNonce.toNumber() + 1, newNonce.toNumber());

          const investor = await this.registryService.getInvestor(HOLDER_ADDRESS);
          assert(investor, HOLDER_ID);
        });
      });
      describe('When signing with no role a wallet', () => {
        it('SHOULD revert', async () => {
          let issuer = acct[9];

          const role = await this.trustService.getRole(issuer);
          assert.equal(role.words[0], roles.NONE);

          const data = this.walletRegistrar.contract.methods.registerWallet(
            HOLDER_ID,
            [HOLDER_ADDRESS],
            HOLDER_ID,
            HOLDER_COUNTRY_CODE,
            ['1', '2'],
            ['1', '1'],
            ['0', '0']
          ).encodeABI();

          let sigs = hsmSigner.preApproval(
            issuer,
            this.transactionRelayer.address,
            initialNonce.toNumber(),
            this.walletRegistrar.address,
            value,
            data,
            ZEROADDR,
            gasLimit);

          await assertRevert(
            this.transactionRelayer.execute(
              sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              this.walletRegistrar.address,
              0,
              data,
              ZEROADDR,
              gasLimit,
              { from: executor, gasLimit })
          );
        });
      });
    });
    describe('Interaction with OmnibusTBE', () => {
      beforeEach(async () => {
        executor = acct[1];
        initialNonce = await this.transactionRelayer.nonce.call();
        assert.ok(initialNonce);

        await resetCounters(this);
        const currentBalance = await this.token.balanceOf(omnibusWallet);
        if (currentBalance.toNumber() > 0) {
          await this.token.burn(omnibusWallet, currentBalance, '');
        }

        await euRetailCountries.forEach((country, index) => {
          // Reset counters
          this.complianceService.setEURetailInvestorsCount(country, 0);
        });
        euRetailCountries = [];
        euRetailCountryCounts = [];
      });
      describe('Bulk transfer', () => {
        it('should bulk transfer tokens from omnibus to wallet correctly', async () => {
          let issuer = acct[0];

          // GIVEN
          const valueToTranser = 1000;
          const tokenValues = ['500', '500'];
          const investorWallets = [investorWallet1, investorWallet2];
          const txCounters = {
            totalInvestorsCount: 5,
            accreditedInvestorsCount: 5,
            usTotalInvestorsCount: 4,
            usAccreditedInvestorsCount: 1,
            jpTotalInvestorsCount: 0,
          };
          euRetailCountries.push('ES');
          euRetailCountryCounts.push(2);

          await setCounters(txCounters, this);

          // WHEN
          await this.omnibusTBEController
            .bulkIssuance(valueToTranser, issuanceTime, txCounters.totalInvestorsCount,
              txCounters.accreditedInvestorsCount,
              txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
              txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

          await this.token.approve(this.omnibusTBEController.address, valueToTranser, { from: omnibusWallet });

          const data = await this.omnibusTBEController.contract.methods
            .bulkTransfer(investorWallets, tokenValues).encodeABI();

          let sigs = hsmSigner.preApproval(
            issuer,
            this.transactionRelayer.address,
            initialNonce.toNumber(),
            this.omnibusTBEController.address,
            0,
            data,
            ZEROADDR,
            gasLimit);

          await this.transactionRelayer.execute(
            sigs.sigV,
            sigs.sigR,
            sigs.sigS,
            this.omnibusTBEController.address,
            0,
            data,
            ZEROADDR,
            gasLimit,
            { from: executor, gasLimit });

          // THEN
          await assertCounters(this);

          const omnibusCurrentBalance = await this.token.balanceOf(omnibusWallet);
          assert.equal(
            omnibusCurrentBalance.toNumber(),
            0
          );
          const investorWallet1CurrentBalance = await this.token.balanceOf(investorWallet1);
          assert.equal(
            investorWallet1CurrentBalance.toNumber(),
            500
          );
          const investorWallet2CurrentBalance = await this.token.balanceOf(investorWallet2);
          assert.equal(
            investorWallet2CurrentBalance.toNumber(),
            500
          );

          // Reset balance
          await this.token.burn(investorWallet1, 500, 'reset');
          await this.token.burn(investorWallet2, 500, 'reset');
        });
        it('should not bulk transfer tokens from omnibus to wallet if not corresponding rights', async () => {
          let issuer = acct[8];

          // GIVEN
          const valueToTranser = 1000;
          const tokenValues = ['500', '500'];
          const investorWallets = [investorWallet1, investorWallet2];
          const txCounters = {
            totalInvestorsCount: 5,
            accreditedInvestorsCount: 5,
            usTotalInvestorsCount: 4,
            usAccreditedInvestorsCount: 1,
            jpTotalInvestorsCount: 0,
          };
          euRetailCountries.push('ES');
          euRetailCountryCounts.push(2);

          await setCounters(txCounters, this);

          // WHEN
          await this.omnibusTBEController
            .bulkIssuance(valueToTranser, issuanceTime, txCounters.totalInvestorsCount,
              txCounters.accreditedInvestorsCount,
              txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
              txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

          await this.token.approve(this.omnibusTBEController.address, valueToTranser, { from: omnibusWallet });

          const data = await this.omnibusTBEController.contract.methods
            .bulkTransfer(investorWallets, tokenValues).encodeABI();

          let sigs = hsmSigner.preApproval(
            issuer,
            this.transactionRelayer.address,
            initialNonce.toNumber(),
            this.omnibusTBEController.address,
            0,
            data,
            ZEROADDR,
            gasLimit);

          await assertRevert(
            this.transactionRelayer.execute(
              sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              this.omnibusTBEController.address,
              0,
              data,
              ZEROADDR,
              gasLimit,
              { from: executor, gasLimit })
          );
        });
      });
    });
  });

  describe('executeByInvestor', () => {
    describe(`ERC-20 token smart contract. Transferring ${ISSUED_TOKENS} TestToken to ${destinationAddress}`, () => {
      describe(`WHEN transferring ${ISSUED_TOKENS} TestToken `, () => {
        beforeEach(async () => {
          executor = acct[1];
          tokenInstance = await TestToken.new({ from: owner });
          assert.ok(tokenInstance);

          initialNonce = await this.transactionRelayer.nonceByInvestor('issuer');
          assert.ok(initialNonce);
        });
        describe('AND one issuer sign a TestToken.issueTokens() transaction', () => {
          it('SHOULD transfer tokens from Relayer to destinationAddress', async () => {
            let issuer = acct[0];

            const role = await this.trustService.getRole(issuer);
            assert.equal(role.words[0], roles.ISSUER);

            const data = tokenInstance.contract.methods.issueTokens(
              destinationAddress,
              ISSUED_TOKENS).encodeABI();

            let sigs = hsmSigner.preApproval(
              issuer,
              this.transactionRelayer.address,
              initialNonce.toNumber(),
              tokenInstance.address,
              0,
              data,
              ZEROADDR,
              gasLimit);

            await this.transactionRelayer.executeByInvestor(
              sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              'issuer',
              tokenInstance.address,
              0,
              data,
              ZEROADDR,
              gasLimit,
              { from: executor, gasLimit });

            let newNonce = await this.transactionRelayer.nonceByInvestor('issuer');
            assert.equal(initialNonce.toNumber() + 1, newNonce.toNumber());

            assert.equal(
              0,
              await tokenInstance.balanceOf(this.transactionRelayer.address)
            );

            assert.equal(
              ISSUED_TOKENS,
              await tokenInstance.balanceOf(destinationAddress)
            );
          });
        });
        describe('AND only one no issuer sign a TestToken.issueTokens() transaction', () => {
          it('SHOULD revert', async () => {
            let issuer = acct[3];
            const data = tokenInstance.contract.methods.issueTokens(
              destinationAddress,
              ISSUED_TOKENS).encodeABI();

            let sigs = hsmSigner.preApproval(
              issuer,
              this.transactionRelayer.address,
              initialNonce.toNumber(),
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit);
            await assertRevert(
              this.transactionRelayer.executeByInvestor(
                sigs.sigV,
                sigs.sigR,
                sigs.sigS,
                'no_issuer',
                tokenInstance.address,
                value,
                data,
                ZEROADDR,
                gasLimit,
                { from: executor, gasLimit })
            );
          });
        });
        describe('WHEN signing with wrong TXTYPE_HASH ', () => {
          it('SHOULD revert', async () => {
            let issuer = acct[0];
            const data = tokenInstance.contract.methods.issueTokens(
              destinationAddress,
              ISSUED_TOKENS).encodeABI();

            let sigs = hsmSigner.preApproval(
              issuer,
              this.transactionRelayer.address,
              initialNonce.toNumber(),
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              'wrong hash');
            await assertRevert(
              this.transactionRelayer.executeByInvestor(
                sigs.sigV,
                sigs.sigR,
                sigs.sigS,
                'issuer',
                tokenInstance.address,
                value,
                data,
                ZEROADDR,
                gasLimit,
                { from: executor, gasLimit })
            );
          });
        });
        describe('WHEN signing with wrong NAME_HASH ', () => {
          it('SHOULD revert', async () => {
            let issuer = acct[0];
            const data = tokenInstance.contract.methods.issueTokens(
              destinationAddress,
              ISSUED_TOKENS).encodeABI();

            let sigs = hsmSigner.preApproval(
              issuer,
              this.transactionRelayer.address,
              initialNonce.toNumber(),
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              TXTYPE_HASH,
              'wrong hash');
            await assertRevert(
              this.transactionRelayer.executeByInvestor(
                sigs.sigV,
                sigs.sigR,
                sigs.sigS,
                'issuer',
                tokenInstance.address,
                value,
                data,
                ZEROADDR,
                gasLimit,
                { from: executor, gasLimit })
            );
          });
        });
        describe('WHEN signing with wrong VERSION_HASH ', () => {
          it('SHOULD revert', async () => {
            let issuer = acct[0];
            const data = tokenInstance.contract.methods.issueTokens(
              destinationAddress,
              ISSUED_TOKENS).encodeABI();

            let sigs = hsmSigner.preApproval(
              issuer,
              this.transactionRelayer.address,
              initialNonce.toNumber(),
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              TXTYPE_HASH,
              NAME_HASH,
              'wrong hash');
            await assertRevert(
              this.transactionRelayer.executeByInvestor(
                sigs.sigV,
                sigs.sigR,
                sigs.sigS,
                'issuer',
                tokenInstance.address,
                value,
                data,
                ZEROADDR,
                gasLimit,
                { from: executor, gasLimit })
            );
          });
        });
        describe('WHEN signing with wrong EIP712DOMAINTYPE_HASH ', () => {
          it('SHOULD revert', async () => {
            let issuer = acct[0];
            const data = tokenInstance.contract.methods.issueTokens(
              destinationAddress,
              ISSUED_TOKENS).encodeABI();

            let sigs = hsmSigner.preApproval(
              issuer,
              this.transactionRelayer.address,
              initialNonce.toNumber(),
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              TXTYPE_HASH,
              NAME_HASH,
              VERSION_HASH,
              'WRONG HASH');
            await assertRevert(
              this.transactionRelayer.executeByInvestor(
                sigs.sigV,
                sigs.sigR,
                sigs.sigS,
                'issuer',
                tokenInstance.address,
                value,
                data,
                ZEROADDR,
                gasLimit,
                { from: executor, gasLimit })
            );
          });
        });
      });
    });
    describe('Interaction with Registry Service', () => {
      beforeEach(async () => {
        executor = acct[1];
        initialNonce = await this.transactionRelayer.nonceByInvestor(HOLDER_ID);
        assert.ok(initialNonce);
      });
      describe('Register a Wallet', () => {
        it('SHOULD Register a wallet signing with the relayer', async () => {
          let issuer = acct[0];

          const role = await this.trustService.getRole(issuer);
          assert.equal(role.words[0], roles.ISSUER);

          const roleRelayer = await this.trustService.getRole(this.transactionRelayer.address);
          assert.equal(roleRelayer.words[0], roles.ISSUER);

          const data = this.walletRegistrar.contract.methods.registerWallet(
            HOLDER_ID,
            [HOLDER_ADDRESS],
            HOLDER_ID,
            HOLDER_COUNTRY_CODE,
            ['1', '2'],
            ['1', '1'],
            ['0', '0']
          ).encodeABI();

          let sigs = hsmSigner.preApproval(
            issuer,
            this.transactionRelayer.address,
            initialNonce.toNumber(),
            this.walletRegistrar.address,
            value,
            data,
            ZEROADDR,
            gasLimit);

          await this.transactionRelayer.executeByInvestor(
            sigs.sigV,
            sigs.sigR,
            sigs.sigS,
            HOLDER_ID,
            this.walletRegistrar.address,
            0,
            data,
            ZEROADDR,
            gasLimit,
            { from: executor, gasLimit });

          const investor = await this.registryService.getInvestor(HOLDER_ADDRESS);
          assert(investor, HOLDER_ID);

          let newNonce = await this.transactionRelayer.nonceByInvestor(HOLDER_ID);
          assert.equal(initialNonce.toNumber() + 1, newNonce.toNumber());
        });
        it('SHOULD revert when trying to sign an pre-approved transaction after investor nonce update', async () => {
          let issuer = acct[0];

          const role = await this.trustService.getRole(issuer);
          assert.equal(role.words[0], roles.ISSUER);

          const roleRelayer = await this.trustService.getRole(this.transactionRelayer.address);
          assert.equal(roleRelayer.words[0], roles.ISSUER);

          const data = this.walletRegistrar.contract.methods.registerWallet(
            HOLDER_ID,
            [HOLDER_ADDRESS],
            HOLDER_ID,
            HOLDER_COUNTRY_CODE,
            ['1', '2'],
            ['1', '1'],
            ['0', '0']
          ).encodeABI();

          let sigs = hsmSigner.preApproval(
            issuer,
            this.transactionRelayer.address,
            initialNonce.toNumber(),
            this.walletRegistrar.address,
            value,
            data,
            ZEROADDR,
            gasLimit);

          const NEW_NONCE_UPDATED_BY_MASTER = initialNonce.toNumber() + 10;
          await this.transactionRelayer.setInvestorNonce(
            HOLDER_ID,
            NEW_NONCE_UPDATED_BY_MASTER, { from: owner }
          );
          await assertEvent(this.transactionRelayer, 'InvestorNonceUpdated', {
            investorId: HOLDER_ID,
            newNonce: NEW_NONCE_UPDATED_BY_MASTER,
          });

          await assertRevert(
            this.transactionRelayer.executeByInvestor(
              sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              HOLDER_ID,
              this.walletRegistrar.address,
              0,
              data,
              ZEROADDR,
              gasLimit,
              { from: executor, gasLimit })
          );
        });
      });
      describe('When signing with no role a wallet', () => {
        it('SHOULD revert', async () => {
          let issuer = acct[9];

          const role = await this.trustService.getRole(issuer);
          assert.equal(role.words[0], roles.NONE);

          const data = this.walletRegistrar.contract.methods.registerWallet(
            HOLDER_ID,
            [HOLDER_ADDRESS],
            HOLDER_ID,
            HOLDER_COUNTRY_CODE,
            ['1', '2'],
            ['1', '1'],
            ['0', '0']
          ).encodeABI();

          let sigs = hsmSigner.preApproval(
            issuer,
            this.transactionRelayer.address,
            initialNonce.toNumber(),
            this.walletRegistrar.address,
            value,
            data,
            ZEROADDR,
            gasLimit);

          await assertRevert(
            this.transactionRelayer.executeByInvestor(
              sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              HOLDER_ID,
              this.walletRegistrar.address,
              0,
              data,
              ZEROADDR,
              gasLimit,
              { from: executor, gasLimit })
          );

          let newNonce = await this.transactionRelayer.nonceByInvestor(HOLDER_ID);
          assert.equal(initialNonce.toNumber(), newNonce.toNumber());
        });
      });
    });
    describe('Interaction with OmnibusTBE', () => {
      beforeEach(async () => {
        executor = acct[1];
        initialNonce = await this.transactionRelayer.nonceByInvestor(HOLDER_ID);
        assert.ok(initialNonce);

        await resetCounters(this);
        const currentBalance = await this.token.balanceOf(omnibusWallet);
        if (currentBalance.toNumber() > 0) {
          await this.token.burn(omnibusWallet, currentBalance, '');
        }

        await euRetailCountries.forEach((country, index) => {
          // Reset counters
          this.complianceService.setEURetailInvestorsCount(country, 0);
        });
        euRetailCountries = [];
        euRetailCountryCounts = [];
      });
      describe('Bulk transfer', () => {
        it('should bulk transfer tokens from omnibus to wallet correctly', async () => {
          let issuer = acct[0];

          // GIVEN
          const valueToTransfer = 1000;
          const tokenValues = ['500', '500'];
          const investorWallets = [investorWallet1, investorWallet2];
          const txCounters = {
            totalInvestorsCount: 5,
            accreditedInvestorsCount: 5,
            usTotalInvestorsCount: 4,
            usAccreditedInvestorsCount: 1,
            jpTotalInvestorsCount: 0,
          };
          euRetailCountries.push('ES');
          euRetailCountryCounts.push(2);

          await setCounters(txCounters, this);

          // WHEN
          await this.omnibusTBEController
            .bulkIssuance(valueToTransfer, issuanceTime, txCounters.totalInvestorsCount,
              txCounters.accreditedInvestorsCount,
              txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
              txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

          await this.token.approve(this.omnibusTBEController.address, valueToTransfer, { from: omnibusWallet });

          const data = await this.omnibusTBEController.contract.methods
            .bulkTransfer(investorWallets, tokenValues).encodeABI();

          let sigs = hsmSigner.preApproval(
            issuer,
            this.transactionRelayer.address,
            initialNonce.toNumber(),
            this.omnibusTBEController.address,
            0,
            data,
            ZEROADDR,
            gasLimit);

          await this.transactionRelayer.executeByInvestor(
            sigs.sigV,
            sigs.sigR,
            sigs.sigS,
            HOLDER_ID,
            this.omnibusTBEController.address,
            0,
            data,
            ZEROADDR,
            gasLimit,
            { from: executor, gasLimit });

          // THEN
          await assertCounters(this);

          const omnibusCurrentBalance = await this.token.balanceOf(omnibusWallet);
          assert.equal(
            omnibusCurrentBalance.toNumber(),
            0
          );
          const investorWallet1CurrentBalance = await this.token.balanceOf(investorWallet1);
          assert.equal(
            investorWallet1CurrentBalance.toNumber(),
            500
          );
          const investorWallet2CurrentBalance = await this.token.balanceOf(investorWallet2);
          assert.equal(
            investorWallet2CurrentBalance.toNumber(),
            500
          );

          let newNonce = await this.transactionRelayer.nonceByInvestor(HOLDER_ID);
          assert.equal(initialNonce.toNumber() + 1, newNonce.toNumber());

          // Reset balance
          await this.token.burn(investorWallet1, 500, 'reset');
          await this.token.burn(investorWallet2, 500, 'reset');
        });
        it('should not bulk transfer tokens from omnibus to wallet if not corresponding rights', async () => {
          let issuer = acct[8];

          // GIVEN
          const valueToTranser = 1000;
          const tokenValues = ['500', '500'];
          const investorWallets = [investorWallet1, investorWallet2];
          const txCounters = {
            totalInvestorsCount: 5,
            accreditedInvestorsCount: 5,
            usTotalInvestorsCount: 4,
            usAccreditedInvestorsCount: 1,
            jpTotalInvestorsCount: 0,
          };
          euRetailCountries.push('ES');
          euRetailCountryCounts.push(2);

          await setCounters(txCounters, this);

          // WHEN
          await this.omnibusTBEController
            .bulkIssuance(valueToTranser, issuanceTime, txCounters.totalInvestorsCount,
              txCounters.accreditedInvestorsCount,
              txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
              txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

          await this.token.approve(this.omnibusTBEController.address, valueToTranser, { from: omnibusWallet });

          const data = await this.omnibusTBEController.contract.methods
            .bulkTransfer(investorWallets, tokenValues).encodeABI();

          let sigs = hsmSigner.preApproval(
            issuer,
            this.transactionRelayer.address,
            initialNonce.toNumber(),
            this.omnibusTBEController.address,
            0,
            data,
            ZEROADDR,
            gasLimit);

          await assertRevert(
            this.transactionRelayer.executeByInvestor(
              sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              HOLDER_ID,
              this.omnibusTBEController.address,
              0,
              data,
              ZEROADDR,
              gasLimit,
              { from: executor, gasLimit })
          );
        });
        it('should revert on bulk transfer when a master wallet updates nonce of investor', async () => {
          const issuer = acct[0];

          // GIVEN
          const valueToTransfer = 1000;
          const tokenValues = ['500', '500'];
          const investorWallets = [investorWallet1, investorWallet2];
          const txCounters = {
            totalInvestorsCount: 5,
            accreditedInvestorsCount: 5,
            usTotalInvestorsCount: 4,
            usAccreditedInvestorsCount: 1,
            jpTotalInvestorsCount: 0,
          };
          euRetailCountries.push('ES');
          euRetailCountryCounts.push(2);

          await setCounters(txCounters, this);

          // WHEN
          await this.omnibusTBEController
            .bulkIssuance(valueToTransfer, issuanceTime, txCounters.totalInvestorsCount,
              txCounters.accreditedInvestorsCount,
              txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
              txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

          await this.token.approve(this.omnibusTBEController.address, valueToTransfer, { from: omnibusWallet });

          const data = await this.omnibusTBEController.contract.methods
            .bulkTransfer(investorWallets, tokenValues).encodeABI();

          let sigs = hsmSigner.preApproval(
            issuer,
            this.transactionRelayer.address,
            initialNonce.toNumber(),
            this.omnibusTBEController.address,
            0,
            data,
            ZEROADDR,
            gasLimit);

          const NEW_NONCE_UPDATED_BY_MASTER = initialNonce.toNumber() + 10;
          await this.transactionRelayer.setInvestorNonce(
            HOLDER_ID,
            NEW_NONCE_UPDATED_BY_MASTER, { from: owner }
          );
          await assertEvent(this.transactionRelayer, 'InvestorNonceUpdated', {
            investorId: HOLDER_ID,
            newNonce: NEW_NONCE_UPDATED_BY_MASTER,
          });

          await assertRevert(
            this.transactionRelayer.executeByInvestor(
              sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              HOLDER_ID,
              this.omnibusTBEController.address,
              0,
              data,
              ZEROADDR,
              gasLimit,
              { from: executor, gasLimit })
          );
        });
      });
    });
  });

  describe('executeByInvestor2', () => {
    describe(`ERC-20 token smart contract. Transferring ${ISSUED_TOKENS} TestToken to ${destinationAddress}`, () => {
      describe(`WHEN transferring ${ISSUED_TOKENS} TestToken `, () => {
        beforeEach(async () => {
          executor = acct[1];
          tokenInstance = await TestToken.new({ from: owner });
          assert.ok(tokenInstance);

          initialNonce = await this.transactionRelayer.nonceByInvestor('issuer');
          assert.ok(initialNonce);
        });
        describe('AND one issuer sign a TestToken.issueTokens() transaction', () => {
          it('SHOULD transfer tokens from Relayer to destinationAddress', async () => {
            let issuer = acct[0];

            const role = await this.trustService.getRole(issuer);
            assert.equal(role.words[0], roles.ISSUER);

            const data = tokenInstance.contract.methods.issueTokens(
              destinationAddress,
              ISSUED_TOKENS).encodeABI();

            let sigs = hsmSigner.preApproval(
              issuer,
              this.transactionRelayer.address,
              initialNonce.toNumber(),
              tokenInstance.address,
              0,
              data,
              ZEROADDR,
              gasLimit);

            const params = [0, gasLimit];
            await this.transactionRelayer.executeByInvestor2(
              sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              'issuer',
              tokenInstance.address,
              ZEROADDR,
              data,
              params,
              { from: executor, gasLimit });

            let newNonce = await this.transactionRelayer.nonceByInvestor('issuer');
            assert.equal(initialNonce.toNumber() + 1, newNonce.toNumber());

            assert.equal(
              0,
              await tokenInstance.balanceOf(this.transactionRelayer.address)
            );

            assert.equal(
              ISSUED_TOKENS,
              await tokenInstance.balanceOf(destinationAddress)
            );
          });
        });
      });
    });
  });

  describe('updateDomainSeparator', () => {
    beforeEach(async () => {
      executor = acct[1];
      tokenInstance = await TestToken.new({ from: owner });
      assert.ok(tokenInstance);

      initialNonce = await this.transactionRelayer.nonceByInvestor('issuer');
      assert.ok(initialNonce);
    });
    describe('WHEN a master calls update domain separator', () => {
      it('SHOULD throw a DomainSeparatorUpdated event', async () => {
        //
        await this.transactionRelayer.updateDomainSeparator(4, { from: owner });
        await assertEvent(this.transactionRelayer, 'DomainSeparatorUpdated', {
          chainId: 4,
        });
      });
    });
    describe('WHEN a NO master calls update domain separator', () => {
      it('SHOULD revert', async () => {
        await assertRevert(this.transactionRelayer.updateDomainSeparator(4, { from: investorWallet1 }));
      });
    });
  });

  describe('setInvestorNonce', () => {
    const NEW_NONCE = 4;
    beforeEach(async () => {
      executor = acct[1];
      tokenInstance = await TestToken.new({ from: owner });
      assert.ok(tokenInstance);

      initialNonce = await this.transactionRelayer.nonceByInvestor('issuer');
      assert.ok(initialNonce);
    });
    describe('WHEN a master wallet calls set investor nonce', () => {
      it('SHOULD set new nonce and throw a InvestorNonceUpdated event', async () => {
        const NONCE_TO_UPDATE = initialNonce.toNumber() + 10;
        await this.transactionRelayer.setInvestorNonce('issuer', NONCE_TO_UPDATE, { from: owner });
        await assertEvent(this.transactionRelayer, 'InvestorNonceUpdated', {
          investorId: 'issuer',
          newNonce: NONCE_TO_UPDATE,
        });
        const nonceAfterSetNonce = await this.transactionRelayer.nonceByInvestor('issuer');
        await assert.equal(
          nonceAfterSetNonce,
          NONCE_TO_UPDATE
        );
      });
    });
    describe('WHEN a NO master wallet calls update set investor nonce', () => {
      it('SHOULD revert', async () => {
        await assertRevert(this.transactionRelayer.setInvestorNonce('issuer', NEW_NONCE,
          { from: investorWallet1 }
        ));
      });
    });
  });
});
