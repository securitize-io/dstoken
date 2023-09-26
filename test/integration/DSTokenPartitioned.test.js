const { expectRevert } = require('@openzeppelin/test-helpers');
const latestTime = require('../utils/latestTime');
const snapshotsHelper = require('../utils/snapshots');
const deployContracts = require('../utils').deployContracts;
const fixtures = require('../fixtures');
const investorId = fixtures.InvestorId;
const country = fixtures.Country;
const compliance = fixtures.Compliance;
const time = fixtures.Time;
const complianceType = require('../../utils/globals').complianceType;
const lockManagerType = require('../../utils/globals').lockManagerType;

contract('DSTokenPartitioned (regulated)', function ([
  issuerWallet,
  usInvestorWallet,
  usInvestorSecondaryWallet,
  usInvestor2Wallet,
  spainInvestorWallet,
  germanyInvestorWallet,
  chinaInvestorWallet,
  israelInvestorWallet,
]) {
  before(async function () {
    // Setting up the environment
    await deployContracts(
      this,
      artifacts,
      complianceType.PARTITIONED,
      lockManagerType.PARTITIONED,
      undefined,
      true,
    );

    // // Basic seed
    await this.complianceConfiguration.setCountryCompliance(
      country.USA,
      compliance.US,
    );
    await this.complianceConfiguration.setCountryCompliance(
      country.SPAIN,
      compliance.EU,
    );
    await this.complianceConfiguration.setCountryCompliance(
      country.GERMANY,
      compliance.EU,
    );
    await this.complianceConfiguration.setCountryCompliance(
      country.CHINA,
      compliance.FORBIDDEN,
    );

    // Registering the investors and wallets
    await this.registryService.registerInvestor(
      investorId.US_INVESTOR_ID,
      investorId.US_INVESTOR_COLLISION_HASH,
    );
    await this.registryService.setCountry(
      investorId.US_INVESTOR_ID,
      country.USA,
    );
    await this.registryService.addWallet(
      usInvestorWallet,
      investorId.US_INVESTOR_ID,
    );
    await this.registryService.addWallet(
      usInvestorSecondaryWallet,
      investorId.US_INVESTOR_ID,
    );

    await this.registryService.registerInvestor(
      investorId.US_INVESTOR_ID_2,
      investorId.US_INVESTOR_COLLISION_HASH_2,
    );
    await this.registryService.setCountry(
      investorId.US_INVESTOR_ID_2,
      country.USA,
    );
    await this.registryService.addWallet(
      usInvestor2Wallet,
      investorId.US_INVESTOR_ID_2,
    );

    await this.registryService.registerInvestor(
      investorId.SPAIN_INVESTOR_ID,
      investorId.SPAIN_INVESTOR_COLLISION_HASH,
    );
    await this.registryService.setCountry(
      investorId.SPAIN_INVESTOR_ID,
      country.SPAIN,
    );
    await this.registryService.addWallet(
      spainInvestorWallet,
      investorId.SPAIN_INVESTOR_ID,
    );

    await this.registryService.registerInvestor(
      investorId.GERMANY_INVESTOR_ID,
      investorId.GERMANY_INVESTOR_COLLISION_HASH,
    );
    await this.registryService.setCountry(
      investorId.GERMANY_INVESTOR_ID,
      country.GERMANY,
    );
    await this.registryService.addWallet(
      germanyInvestorWallet,
      investorId.GERMANY_INVESTOR_ID,
    );

    await this.registryService.registerInvestor(
      investorId.CHINA_INVESTOR_ID,
      investorId.CHINA_INVESTOR_COLLISION_HASH,
    );
    await this.registryService.setCountry(
      investorId.CHINA_INVESTOR_ID,
      country.CHINA,
    );
    await this.registryService.addWallet(
      chinaInvestorWallet,
      investorId.CHINA_INVESTOR_ID,
    );

    await this.registryService.registerInvestor(
      investorId.ISRAEL_INVESTOR_ID,
      investorId.ISRAEL_INVESTOR_COLLISION_HASH,
    );
    await this.registryService.setCountry(
      investorId.ISRAEL_INVESTOR_ID,
      country.ISRAEL,
    );
    await this.registryService.addWallet(
      israelInvestorWallet,
      investorId.ISRAEL_INVESTOR_ID,
    );

    await this.complianceConfiguration.setAll(
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, 1 * time.YEARS, 0, 0],
      [true, false, false, false, false],
    );
  });

  beforeEach(async function () {
    snapshot = await snapshotsHelper.takeSnapshot();
    snapshotId = snapshot.result;
  });

  afterEach(async function () {
    await snapshotsHelper.revertToSnapshot(snapshotId);
  });

  describe('Creation', function () {
    it('Should get the basic details of the token correctly', async function () {
      const name = await this.token.name.call();
      const symbol = await this.token.symbol.call();
      const decimals = await this.token.decimals.call();
      const totalSupply = await this.token.totalSupply.call();

      assert.equal(name, 'DSTokenMock');
      assert.equal(symbol, 'DST');
      assert.equal(decimals, 18);
      assert.equal(totalSupply, 0);
    });
  });

  describe('Token Initialization', function () {
    it('Token cannot be initialized twice', async function () {
      await expectRevert(this.token.initialize(), 'Contract instance has already been initialized');
    });
  });

  describe('Issuance', function () {
    it('Should issue tokens to a us wallet', async function () {
      const result = await this.token.issueTokens(usInvestorWallet, 100);
      const partition = await this.token.partitionOf(usInvestorWallet, 0);
      const balance = await this.token.balanceOf(usInvestorWallet);
      assert.equal(balance.toNumber(), 100);
      assert.equal(result.logs.length, 4);
      assert.equal(result.logs[0].event, 'Issue');
      assert.equal(result.logs[1].event, 'Transfer');
      assert.equal(result.logs[2].event, 'IssueByPartition');
      assert.equal(result.logs[2].args.to, usInvestorWallet);
      assert.equal(result.logs[2].args.value, 100);
      assert.equal(result.logs[2].args.partition, partition);
      assert.equal(result.logs[3].event, 'TransferByPartition');
      assert.equal(
        result.logs[3].args.from,
        '0x0000000000000000000000000000000000000000',
      );
      assert.equal(result.logs[3].args.to, usInvestorWallet);
      assert.equal(result.logs[3].args.value, 100);
      assert.equal(result.logs[3].args.partition, partition);
    });

    it('Should issue tokens to a eu wallet', async function () {
      await this.token.issueTokens(germanyInvestorWallet, 100);
      const balance = await this.token.balanceOf(germanyInvestorWallet);
      assert.equal(balance.toNumber(), 100);
    });

    it('Should not issue tokens to a forbidden wallet', async function () {
      await expectRevert.unspecified(this.token.issueTokens(chinaInvestorWallet, 100));
    });

    it('Should issue tokens to a none wallet', async function () {
      await this.token.issueTokens(israelInvestorWallet, 100);
      const balance = await this.token.balanceOf(israelInvestorWallet);
      assert.equal(balance.toNumber(), 100);
    });

    it('Should record the number of total issued token correctly', async function () {
      await this.token.issueTokens(usInvestorWallet, 100);
      await this.token.issueTokens(usInvestorSecondaryWallet, 100);
      await this.token.issueTokens(usInvestor2Wallet, 100);
      await this.token.issueTokens(usInvestorWallet, 200);
      await this.token.issueTokens(germanyInvestorWallet, 100);
      await this.token.issueTokens(israelInvestorWallet, 100);

      const totalIssued = await this.token.totalIssued();

      assert.equal(totalIssued.toNumber(), 700);
    });

    it('Should create a partition with the given time and region', async function () {
      await this.token.issueTokensCustom(usInvestorWallet, 100, 1, 0, '', 0);
      const partition = await this.token.partitionOf(usInvestorWallet, 0);
      const issuanceTime = await this.partitionsManager.getPartitionIssuanceDate(
        partition,
      );
      const region = await this.partitionsManager.getPartitionRegion.call(
        partition,
      );
      assert.equal(issuanceTime, 1);
      assert.equal(region, compliance.US);
    });

    it('Should return the correct balance of investor by partition', async function () {
      await this.token.issueTokensCustom(usInvestorWallet, 100, 1, 0, '', 0);
      const partition = await this.token.partitionOf(usInvestorWallet, 0);
      const balance = await this.token.balanceOfInvestorByPartition.call(
        investorId.US_INVESTOR_ID,
        partition,
      );
      assert.equal(balance.toNumber(), 100);
    });

    it('Should return the correct balance of wallet by partition', async function () {
      await this.token.issueTokensCustom(usInvestorWallet, 100, 1, 0, '', 0);
      const partition = await this.token.partitionOf(usInvestorWallet, 0);
      const balance = await this.token.balanceOfByPartition.call(
        usInvestorWallet,
        partition,
      );
      assert.equal(balance.toNumber(), 100);
    });
  });

  describe('Issuance with no compliance', function () {
    it('Should issue tokens to a us wallet', async function () {
      const result = await this.token.issueTokensWithNoCompliance(usInvestorWallet, 100);
      const partition = await this.token.partitionOf(usInvestorWallet, 0);
      const balance = await this.token.balanceOf(usInvestorWallet);
      assert.equal(balance.toNumber(), 100);
      assert.equal(result.logs.length, 4);
      assert.equal(result.logs[0].event, 'Issue');
      assert.equal(result.logs[1].event, 'Transfer');
      assert.equal(result.logs[2].event, 'IssueByPartition');
      assert.equal(result.logs[2].args.to, usInvestorWallet);
      assert.equal(result.logs[2].args.value, 100);
      assert.equal(result.logs[2].args.partition, partition);
      assert.equal(result.logs[3].event, 'TransferByPartition');
      assert.equal(
        result.logs[3].args.from,
        '0x0000000000000000000000000000000000000000',
      );
      assert.equal(result.logs[3].args.to, usInvestorWallet);
      assert.equal(result.logs[3].args.value, 100);
      assert.equal(result.logs[3].args.partition, partition);
    });

    it('Should issue tokens to a eu wallet', async function () {
      await this.token.issueTokensWithNoCompliance(germanyInvestorWallet, 100);
      const balance = await this.token.balanceOf(germanyInvestorWallet);
      assert.equal(balance.toNumber(), 100);
    });

    it('Should issue tokens to a forbidden wallet (no compliance)', async function () {
      this.token.issueTokensWithNoCompliance(chinaInvestorWallet, 100);
    });

    it('Should issue tokens to a none wallet', async function () {
      await this.token.issueTokensWithNoCompliance(israelInvestorWallet, 100);
      const balance = await this.token.balanceOf(israelInvestorWallet);
      assert.equal(balance.toNumber(), 100);
    });

    it('Should record the number of total issued token correctly', async function () {
      await this.token.issueTokensWithNoCompliance(usInvestorWallet, 100);
      await this.token.issueTokensWithNoCompliance(usInvestorSecondaryWallet, 100);
      await this.token.issueTokensWithNoCompliance(germanyInvestorWallet, 100);
      await this.token.issueTokensWithNoCompliance(israelInvestorWallet, 100);

      const totalIssued = await this.token.totalIssued();

      assert.equal(totalIssued.toNumber(), 400);
    });

    it('Should create a partition with the given time and region', async function () {
      await this.token.issueTokensCustom(usInvestorWallet, 100, 1, 0, '', 0);
      const partition = await this.token.partitionOf(usInvestorWallet, 0);
      const issuanceTime = await this.partitionsManager.getPartitionIssuanceDate(
        partition,
      );
      const region = await this.partitionsManager.getPartitionRegion.call(
        partition,
      );
      assert.equal(issuanceTime, 1);
      assert.equal(region, compliance.US);
    });

    it('Should return the correct balance of investor by partition', async function () {
      await this.token.issueTokensCustom(usInvestorWallet, 100, 1, 0, '', 0);
      const partition = await this.token.partitionOf(usInvestorWallet, 0);
      const balance = await this.token.balanceOfInvestorByPartition.call(
        investorId.US_INVESTOR_ID,
        partition,
      );
      assert.equal(balance.toNumber(), 100);
    });

    it('Should return the correct balance of wallet by partition', async function () {
      await this.token.issueTokensCustom(usInvestorWallet, 100, 1, 0, '', 0);
      const partition = await this.token.partitionOf(usInvestorWallet, 0);
      const balance = await this.token.balanceOfByPartition.call(
        usInvestorWallet,
        partition,
      );
      assert.equal(balance.toNumber(), 100);
    });
  });

  describe('Locking', function () {
    it('Should not allow transferring any tokens when all locked', async function () {
      await this.token.issueTokensCustom(
        israelInvestorWallet,
        100,
        await latestTime(),
        100,
        'TEST',
        (await latestTime()) + 1 * time.WEEKS,
      );
      await expectRevert.unspecified(
        this.token.transfer(germanyInvestorWallet, 1, {
          from: israelInvestorWallet,
        }),
      );
      const partition = await this.token.partitionOf(israelInvestorWallet, 0);
      await this.token.burnByPartition(israelInvestorWallet, 100, 'test burn', partition);
      const balance = await this.token.balanceOf(israelInvestorWallet);
      assert.equal(balance, 0);
    });

    it('Should ignore issuance time if token has disallowBackDating set to true and allow transferring', async function () {
      await this.complianceConfiguration.setDisallowBackDating(true);
      const time = await latestTime();
      await this.token.issueTokensCustom(israelInvestorWallet, 100, time + 10000, 0, 'TEST', 0);
      const balance = await this.token.balanceOf(israelInvestorWallet);
      assert.equal(balance, 100);
      await this.token.transfer(germanyInvestorWallet, 100, {
        from: israelInvestorWallet,
      });
      const israelBalance = await this.token.balanceOf(israelInvestorWallet);
      assert.equal(israelBalance, 0);
      const germanyBalance = await this.token.balanceOf(germanyInvestorWallet);
      assert.equal(germanyBalance, 100);
    });

    it('Should not ignore issuance time if token has disallowBackDating set to false and not allow transferring', async function () {
      const time = await latestTime();
      await this.complianceConfiguration.setDisallowBackDating(false);
      await this.token.issueTokensCustom(israelInvestorWallet, 100, time + 10000, 0, 'TEST', 0);
      await expectRevert(
        this.token.transfer(germanyInvestorWallet, 1, {
          from: israelInvestorWallet,
        }),
        'Hold-up'
      );
      const partition = await this.token.partitionOf(israelInvestorWallet, 0);
      await this.token.burnByPartition(israelInvestorWallet, 100, 'test burn', partition);
      const israelBalance = await this.token.balanceOf(israelInvestorWallet);
      assert.equal(israelBalance, 0);
    });

    it('Should allow transferring tokens when enough tokens are unlocked', async function () {
      await this.token.issueTokensCustom(
        israelInvestorWallet,
        100,
        await latestTime(),
        50,
        'TEST',
        (await latestTime()) + 1 * time.WEEKS,
      );
      await this.token.transfer(germanyInvestorWallet, 50, {
        from: israelInvestorWallet,
      });
      const israelBalance = await this.token.balanceOf(israelInvestorWallet);
      assert.equal(israelBalance.toNumber(), 50);
      const germanyBalance = await this.token.balanceOf(germanyInvestorWallet);
      assert.equal(germanyBalance.toNumber(), 50);
    });

    it('Should allow investors to move locked tokens between their own wallets', async function () {
      await this.token.issueTokensCustom(
        usInvestorWallet,
        100,
        await latestTime(),
        100,
        'TEST',
        (await latestTime()) + 1 * time.WEEKS,
      );
      await this.token.transfer(usInvestorSecondaryWallet, 50, {
        from: usInvestorWallet,
      });
      const usInvestorBalance = await this.token.balanceOf(usInvestorWallet);
      assert.equal(usInvestorBalance.toNumber(), 50);
      const usInvestorSecondaryWalletBalance = await this.token.balanceOf(
        usInvestorSecondaryWallet,
      );
      assert.equal(usInvestorSecondaryWalletBalance.toNumber(), 50);
    });
  });

  describe('Transfer', function () {
    const partitions = [];
    beforeEach(async function () {
      await this.token.issueTokensCustom(
        israelInvestorWallet,
        100,
        1, // TIME = 1
        0,
        '',
        0,
      );

      await this.token.issueTokensCustom(
        israelInvestorWallet,
        100,
        2, // TIME = 2
        0,
        '',
        0,
      );

      await this.token.issueTokensCustom(
        israelInvestorWallet,
        100,
        3, // TIME = 3
        0,
        '',
        0,
      );
      partitions.push(await this.token.partitionOf(israelInvestorWallet, 0));
      partitions.push(await this.token.partitionOf(israelInvestorWallet, 1));
      partitions.push(await this.token.partitionOf(israelInvestorWallet, 2));
    });

    it('Should transfer from more than one partition', async function () {
      await this.token.transfer(germanyInvestorWallet, 300, {
        from: israelInvestorWallet,
      });
      const partition0Balance = await this.token.balanceOfByPartition(
        germanyInvestorWallet,
        partitions[0],
      );
      const partition1Balance = await this.token.balanceOfByPartition(
        germanyInvestorWallet,
        partitions[1],
      );
      const partition2Balance = await this.token.balanceOfByPartition(
        germanyInvestorWallet,
        partitions[2],
      );
      assert.equal(partition0Balance, 100);
      assert.equal(partition1Balance, 100);
      assert.equal(partition2Balance, 100);
    });

    it('Should transfer by specific partitions', async function () {
      const result = await this.token.transferByPartitions(
        germanyInvestorWallet,
        150,
        [partitions[0], partitions[2]],
        [100, 50],
        {
          from: israelInvestorWallet,
        },
      );
      const germanyInvestorPartition0Balance = await this.token.balanceOfByPartition(
        germanyInvestorWallet,
        partitions[0],
      );
      assert.equal(germanyInvestorPartition0Balance, 100);
      const israelInvestorPartition0Balance = await this.token.balanceOfByPartition(
        israelInvestorWallet,
        partitions[0],
      );
      assert.equal(israelInvestorPartition0Balance, 0); // Partition doesn't exist anymore
      const germanyInvestorPartition2Balance = await this.token.balanceOfByPartition(
        germanyInvestorWallet,
        partitions[2],
      );
      assert.equal(germanyInvestorPartition2Balance, 50);
      const israelInvestorPartition2Balance = await this.token.balanceOfByPartition(
        israelInvestorWallet,
        partitions[2],
      );
      assert.equal(israelInvestorPartition2Balance, 50);
      const partitionCountOfIsraelInvestor = await this.token.partitionCountOf(
        israelInvestorWallet,
      );
      assert.equal(partitionCountOfIsraelInvestor, 2);
      const partitionCountOfGermanyInvestor = await this.token.partitionCountOf(
        germanyInvestorWallet,
      );
      assert.equal(partitionCountOfGermanyInvestor, 2);
      assert.equal(result.logs[0].event, 'Transfer');
      assert.equal(result.logs[0].args.from, israelInvestorWallet);
      assert.equal(result.logs[0].args.to, germanyInvestorWallet);
      assert.equal(result.logs[0].args.value, 150);
      assert.equal(result.logs[1].event, 'TransferByPartition');
      assert.equal(result.logs[1].args.from, israelInvestorWallet);
      assert.equal(result.logs[1].args.to, germanyInvestorWallet);
      assert.equal(result.logs[1].args.value, 100);
      assert.equal(result.logs[1].args.partition, partitions[0]);
      assert.equal(result.logs[2].event, 'TransferByPartition');
      assert.equal(result.logs[2].args.from, israelInvestorWallet);
      assert.equal(result.logs[2].args.to, germanyInvestorWallet);
      assert.equal(result.logs[2].args.value, 50);
      assert.equal(result.logs[2].args.partition, partitions[2]);
    });
  });

  describe('Burn', function () {
    it('Should not allow burn without specifying a partition', async function () {
      await this.token.issueTokens(usInvestorWallet, 100);
      await expectRevert.unspecified(this.token.burn(usInvestorWallet, 50, 'test burn'));
    });

    it('Should burn tokens of a partition correctly', async function () {
      await this.token.issueTokens(usInvestorWallet, 100);
      // get the partition identifier
      const partition = await this.token.partitionOf(usInvestorWallet, 0);
      const result = await this.token.burnByPartition(
        usInvestorWallet,
        50,
        'test burn',
        partition,
      );

      const balance = await this.token.balanceOf(usInvestorWallet);
      const partitionBalance = await this.token.balanceOfByPartition(
        usInvestorWallet,
        partition,
      );
      assert.equal(balance, 50);
      assert.equal(partitionBalance, 50);
      assert.equal(result.logs.length, 4);
      assert.equal(result.logs[0].event, 'Burn');
      assert.equal(result.logs[1].event, 'Transfer');
      assert.equal(result.logs[2].event, 'BurnByPartition');
      assert.equal(result.logs[2].args.burner, usInvestorWallet);
      assert.equal(result.logs[2].args.value, 50);
      assert.equal(result.logs[2].args.reason, 'test burn');
      assert.equal(result.logs[2].args.partition, partition);
      assert.equal(result.logs[3].event, 'TransferByPartition');
      assert.equal(result.logs[3].args.from, usInvestorWallet);
      assert.equal(
        result.logs[3].args.to,
        '0x0000000000000000000000000000000000000000',
      );
      assert.equal(result.logs[3].args.value, 50);
      assert.equal(result.logs[3].args.partition, partition);
    });

    it('Should record the number of total issued token correctly after burn', async function () {
      // await this.token.issueTokens(usInvestorWallet, 100);
      // await this.token.issueTokens(usInvestorWallet, 100);
      await this.token.issueTokensCustom(usInvestorWallet, 100, 1, 0, '', 0);
      await this.token.issueTokensCustom(usInvestorWallet, 100, 1, 0, '', 0);
      const partition = await this.token.partitionOf(usInvestorWallet, 0);
      await this.token.burnByPartition(
        usInvestorWallet,
        100,
        'test burn',
        partition,
      );

      const totalIssued = await this.token.totalIssued();
      assert.equal(totalIssued, 200);
    });
  });

  describe('Seize', function () {
    beforeEach(async function () {
      await this.walletManager.addIssuerWallet(issuerWallet);
      await this.token.issueTokens(usInvestorWallet, 100);
    });

    it('should not allow seize without specifying a partition', async function () {
      await expectRevert.unspecified(
        this.token.seize(usInvestorWallet, issuerWallet, 50, 'test seize'),
      );
    });

    it('Should seize tokens correctly by partition', async function () {
      const partition = await this.token.partitionOf(usInvestorWallet, 0);
      const result = await this.token.seizeByPartition(
        usInvestorWallet,
        issuerWallet,
        50,
        'test seize',
        partition,
      );

      const usInvestorBalance = await this.token.balanceOf(usInvestorWallet);
      const usInvestorPartitionBalance = await this.token.balanceOfByPartition(
        usInvestorWallet,
        partition,
      );
      assert.equal(usInvestorBalance, 50);
      assert.equal(usInvestorPartitionBalance, 50);
      const issuerWalletBalance = await this.token.balanceOf(issuerWallet);
      assert.equal(issuerWalletBalance, 50);
      const issuerWalletPartitionBalance = await this.token.balanceOfByPartition(
        issuerWallet,
        partition,
      );
      assert.equal(issuerWalletPartitionBalance, 50);
      assert.equal(result.logs.length, 4);
      assert.equal(result.logs[0].event, 'Seize');
      assert.equal(result.logs[1].event, 'Transfer');
      assert.equal(result.logs[2].event, 'SeizeByPartition');
      assert.equal(result.logs[2].args.from, usInvestorWallet);
      assert.equal(result.logs[2].args.to, issuerWallet);
      assert.equal(result.logs[2].args.value, 50);
      assert.equal(result.logs[2].args.partition, partition);
      assert.equal(result.logs[3].event, 'TransferByPartition');
      assert.equal(result.logs[3].args.from, usInvestorWallet);
      assert.equal(result.logs[3].args.to, issuerWallet);
      assert.equal(result.logs[3].args.value, 50);
      assert.equal(result.logs[3].args.partition, partition);
    });

    it('Cannot seize more than balance', async function () {
      const partition = await this.token.partitionOf(usInvestorWallet, 0);
      await expectRevert.unspecified(
        this.token.seizeByPartition(
          usInvestorWallet,
          issuerWallet,
          150,
          'test seize',
          partition,
        ),
      );
    });
  });
});
