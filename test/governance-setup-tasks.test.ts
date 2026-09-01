import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenRegulated } from './utils/fixture';
import { DSConstants } from '../utils/globals';

describe('Governance setup tasks (BC-2133)', function () {
  async function deployWithTimelocks() {
    const contracts = await deployDSTokenRegulated();
    const [, proposer] = await hre.ethers.getSigners();
    const { masterTimelock, complianceTimelock, rolesTimelock } = await hre.run('deploy-timelocks', {
      proposers: proposer.address,
      executors: 'permissionless',
    });
    return { ...contracts, masterTimelock, complianceTimelock, rolesTimelock, proposer };
  }

  it('Should wire timelocks without handover and pass verification', async function () {
    const { dsToken, trustService, complianceConfigurationService, masterTimelock, complianceTimelock, rolesTimelock } =
      await loadFixture(deployWithTimelocks);
    const [master] = await hre.ethers.getSigners();

    await hre.run('setup-governance', {
      token: await dsToken.getAddress(),
      masterTimelock: await masterTimelock.getAddress(),
      complianceTimelock: await complianceTimelock.getAddress(),
      rolesTimelock: await rolesTimelock.getAddress(),
    });

    // discovery + enforcement wired consistently
    expect(await dsToken.getDSService(DSConstants.services.COMPLIANCE_RULES_TIMELOCK)).to.equal(await complianceTimelock.getAddress());
    expect(await complianceConfigurationService.getDSService(DSConstants.services.COMPLIANCE_RULES_TIMELOCK)).to.equal(await complianceTimelock.getAddress());
    expect(await trustService.getRolesGovernor()).to.equal(await rolesTimelock.getAddress());

    // no handover: deployer keeps MASTER
    expect(await trustService.getRole(master)).to.equal(DSConstants.roles.MASTER);
  });

  it('Should hand over MASTER and every owner() to the master timelock', async function () {
    const { dsToken, trustService, complianceConfigurationService, masterTimelock, complianceTimelock, rolesTimelock } =
      await loadFixture(deployWithTimelocks);
    const [master] = await hre.ethers.getSigners();
    const masterTimelockAddress = await masterTimelock.getAddress();

    await hre.run('setup-governance', {
      token: await dsToken.getAddress(),
      masterTimelock: masterTimelockAddress,
      complianceTimelock: await complianceTimelock.getAddress(),
      rolesTimelock: await rolesTimelock.getAddress(),
      handover: true,
    });

    // MASTER moved to the timelock, deployer fully out
    expect(await trustService.getRole(masterTimelockAddress)).to.equal(DSConstants.roles.MASTER);
    expect(await trustService.getRole(master)).to.equal(DSConstants.roles.NONE);
    expect(await dsToken.owner()).to.equal(masterTimelockAddress);
    expect(await complianceConfigurationService.owner()).to.equal(masterTimelockAddress);

    // deployer has no authority left anywhere
    await expect(dsToken.setDSService(DSConstants.services.MASTER_TIMELOCK, master.address)).revertedWith('Insufficient trust level');
    await expect(trustService.setRolesGovernor(master.address)).revertedWith('Not enough permissions');
    await expect(complianceConfigurationService.setTotalInvestorsLimit(1)).revertedWith('Insufficient trust level');
  });

  it('Should abort handover when a governed contract is Ownable but not owned by the signer', async function () {
    // A contract that keeps an owner outside the timelock retains an independent
    // _authorizeUpgrade path, so completing the handover would misreport the result.
    const { dsToken, trustService, bulkOperator, masterTimelock, complianceTimelock, rolesTimelock, proposer } =
      await loadFixture(deployWithTimelocks);
    const [master] = await hre.ethers.getSigners();

    await dsToken.setDSService(DSConstants.services.BULK_OPERATOR, await bulkOperator.getAddress());
    await bulkOperator.transferOwnership(proposer.address);

    await expect(
      hre.run('setup-governance', {
        token: await dsToken.getAddress(),
        masterTimelock: await masterTimelock.getAddress(),
        complianceTimelock: await complianceTimelock.getAddress(),
        rolesTimelock: await rolesTimelock.getAddress(),
        handover: true,
      }),
    ).rejectedWith(/Refusing to hand over[\s\S]*BULK_OPERATOR/);

    // aborted before touching anything: MASTER and owner() are untouched
    expect(await trustService.getRole(master)).to.equal(DSConstants.roles.MASTER);
    expect(await dsToken.owner()).to.equal(master.address);
  });

  it('Should proceed when the unowned contract is explicitly acknowledged via --skip-services', async function () {
    const { dsToken, trustService, bulkOperator, masterTimelock, complianceTimelock, rolesTimelock, proposer } =
      await loadFixture(deployWithTimelocks);
    const masterTimelockAddress = await masterTimelock.getAddress();

    await dsToken.setDSService(DSConstants.services.BULK_OPERATOR, await bulkOperator.getAddress());
    await bulkOperator.transferOwnership(proposer.address);

    await hre.run('setup-governance', {
      token: await dsToken.getAddress(),
      masterTimelock: masterTimelockAddress,
      complianceTimelock: await complianceTimelock.getAddress(),
      rolesTimelock: await rolesTimelock.getAddress(),
      handover: true,
      skipServices: 'BULK_OPERATOR',
    });

    expect(await trustService.getRole(masterTimelockAddress)).to.equal(DSConstants.roles.MASTER);
    expect(await dsToken.owner()).to.equal(masterTimelockAddress);
    // the skipped contract keeps its owner, as acknowledged
    expect(await bulkOperator.owner()).to.equal(proposer.address);
  });

  it('Should fail verification when enforcement and discovery drift', async function () {
    const { dsToken, complianceConfigurationService, masterTimelock, complianceTimelock, rolesTimelock } =
      await loadFixture(deployWithTimelocks);

    await hre.run('setup-governance', {
      token: await dsToken.getAddress(),
      masterTimelock: await masterTimelock.getAddress(),
      complianceTimelock: await complianceTimelock.getAddress(),
      rolesTimelock: await rolesTimelock.getAddress(),
    });

    // introduce drift: token discovery entry points elsewhere than CCS enforcement
    await complianceConfigurationService.setDSService(DSConstants.services.COMPLIANCE_RULES_TIMELOCK, await rolesTimelock.getAddress());

    await expect(
      hre.run('verify-governance', {
        token: await dsToken.getAddress(),
        complianceTimelock: await complianceTimelock.getAddress(),
      }),
    ).to.be.rejectedWith(/Governance verification failed/);
  });
});
