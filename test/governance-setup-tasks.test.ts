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

  it('Should transfer BulkOperator ownership during handover', async function () {
    // Audit #8: BulkOperator is an Ownable BaseDSContract holding ROLE_ISSUER, and the handover
    // enumerates targets through getDSService. Without a service id it was skipped entirely, so
    // the pre-handover key kept an upgrade path into a live issuance identity.
    const { dsToken, bulkOperator, masterTimelock, complianceTimelock, rolesTimelock } =
      await loadFixture(deployWithTimelocks);
    const masterTimelockAddress = await masterTimelock.getAddress();

    // it must be discoverable in the first place
    expect(await dsToken.getDSService(DSConstants.services.BULK_OPERATOR)).to.equal(await bulkOperator.getAddress());

    await hre.run('setup-governance', {
      token: await dsToken.getAddress(),
      masterTimelock: masterTimelockAddress,
      complianceTimelock: await complianceTimelock.getAddress(),
      rolesTimelock: await rolesTimelock.getAddress(),
      handover: true,
    });

    expect(await bulkOperator.owner()).to.equal(masterTimelockAddress);
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

  it('Should not surrender ROLE_MASTER when an owner transfer cannot be completed', async function () {
    // Audit #2: the irreversible step must be gated on the rest having succeeded. Previously the
    // skipped entry was only reported by the post-handover verification, once the signer had
    // already lost the standing to fix it.
    const { dsToken, trustService, walletRegistrar, masterTimelock, complianceTimelock, rolesTimelock, proposer } =
      await loadFixture(deployWithTimelocks);
    const [master] = await hre.ethers.getSigners();

    // mirrors live state: a registered service owned by an unrelated key
    await walletRegistrar.transferOwnership(proposer.address);

    await expect(
      hre.run('setup-governance', {
        token: await dsToken.getAddress(),
        masterTimelock: await masterTimelock.getAddress(),
        complianceTimelock: await complianceTimelock.getAddress(),
        rolesTimelock: await rolesTimelock.getAddress(),
        handover: true,
      }),
    ).rejectedWith(/Refusing to hand over[\s\S]*WALLET_REGISTRAR/);

    // the signer retains MASTER, so the mismatch is still fixable
    expect(await trustService.getRole(master)).to.equal(DSConstants.roles.MASTER);
    expect(await trustService.getRole(await masterTimelock.getAddress())).to.equal(DSConstants.roles.NONE);
    // and nothing was transferred, so there is no half-applied state to unpick
    expect(await dsToken.owner()).to.equal(master.address);
  });

  it('Should assert timelock delays, catching one reduced to zero after setup', async function () {
    // Audit #9: updateDelay accepts any value including zero. The delay itself is not bypassable —
    // schedule rejects anything below the current minDelay and cancellers keep their authority for
    // the whole window — but a delay already reduced to zero is unrecoverable, and verification
    // previously only printed the value.
    const { dsToken, masterTimelock, complianceTimelock, rolesTimelock } = await loadFixture(deployWithTimelocks);
    const args = {
      token: await dsToken.getAddress(),
      masterTimelock: await masterTimelock.getAddress(),
      complianceTimelock: await complianceTimelock.getAddress(),
      rolesTimelock: await rolesTimelock.getAddress(),
    };
    await hre.run('setup-governance', args);

    const deployedDelay = Number(await masterTimelock.getMinDelay());

    // matching the deployed value passes
    await hre.run('verify-governance', { ...args, expectedMasterDelay: deployedDelay });

    // a value other than the deployed one fails, which is what catches a post-setup mutation
    await expect(
      hre.run('verify-governance', { ...args, expectedMasterDelay: 0 }),
    ).rejectedWith(/Governance verification failed/);
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
