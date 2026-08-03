import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenRegulated } from './utils/fixture';
import { DSConstants } from '../utils/globals';

const MIN_DELAY = 2 * 24 * 60 * 60; // 2 days
const ZERO_BYTES32 = hre.ethers.ZeroHash;
const ZERO_ADDRESS = hre.ethers.ZeroAddress;

// Salt convention shared with the platform (see BC-2133 provider spec)
const operationSalt = (requestId: string) =>
  hre.ethers.solidityPackedKeccak256(['string', 'string'], ['securitize.governance.v1', requestId]);

describe('DSToken Governance (BC-2133)', function () {
  describe('Backward compatibility (governance not configured)', function () {
    it('Should have no roles governor and no compliance rules timelock by default', async function () {
      const { trustService, dsToken, complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);
      expect(await trustService.getRolesGovernor()).to.equal(ZERO_ADDRESS);
      expect(await dsToken.getDSService(DSConstants.services.COMPLIANCE_RULES_TIMELOCK)).to.equal(ZERO_ADDRESS);
      expect(await complianceConfigurationService.getDSService(DSConstants.services.COMPLIANCE_RULES_TIMELOCK)).to.equal(ZERO_ADDRESS);
    });

    it('Should keep legacy role management behavior', async function () {
      const [, issuer, exchange, transferAgent, stranger] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);

      await trustService.setRole(issuer, DSConstants.roles.ISSUER);
      await trustService.setRole(transferAgent, DSConstants.roles.TRANSFER_AGENT);

      // Issuer can still grant EXCHANGE directly
      await trustService.connect(issuer).setRole(exchange, DSConstants.roles.EXCHANGE);
      expect(await trustService.getRole(exchange)).to.equal(DSConstants.roles.EXCHANGE);

      // Unauthorized caller still rejected
      await expect(trustService.connect(stranger).setRole(stranger, DSConstants.roles.ISSUER))
        .revertedWith('Not enough permissions');
    });

    it('Should keep legacy compliance setter behavior (TRANSFER_AGENT allowed)', async function () {
      const [, transferAgent, stranger] = await hre.ethers.getSigners();
      const { trustService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);

      await trustService.setRole(transferAgent, DSConstants.roles.TRANSFER_AGENT);

      await complianceConfigurationService.connect(transferAgent).setTotalInvestorsLimit(100);
      expect(await complianceConfigurationService.getTotalInvestorsLimit()).to.equal(100);

      await expect(complianceConfigurationService.connect(stranger).setTotalInvestorsLimit(200))
        .revertedWith('Insufficient trust level');
    });
  });

  describe('setRolesGovernor', function () {
    it('Should fail when called by non-master', async function () {
      const [, stranger] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);
      await expect(trustService.connect(stranger).setRolesGovernor(stranger))
        .revertedWith('Not enough permissions');
    });

    it('Should set the roles governor and emit event', async function () {
      const [master, , governor] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);

      await expect(trustService.setRolesGovernor(governor))
        .emit(trustService, 'DSTrustServiceRolesGovernorSet').withArgs(ZERO_ADDRESS, governor.address, master.address);
      expect(await trustService.getRolesGovernor()).to.equal(governor.address);
    });

    it('Should restore legacy behavior when cleared', async function () {
      const [, issuer, wallet, governor] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);

      await trustService.setRole(issuer, DSConstants.roles.ISSUER);
      await trustService.setRolesGovernor(governor);
      await expect(trustService.connect(issuer).setRole(wallet, DSConstants.roles.ISSUER))
        .revertedWith('Not enough permissions');

      await trustService.setRolesGovernor(ZERO_ADDRESS);
      await trustService.connect(issuer).setRole(wallet, DSConstants.roles.ISSUER);
      expect(await trustService.getRole(wallet)).to.equal(DSConstants.roles.ISSUER);
    });
  });

  describe('Role management gating (governor set)', function () {
    async function gatedRolesFixture() {
      const contracts = await deployDSTokenRegulated();
      const [, issuer, transferAgent, governor] = await hre.ethers.getSigners();
      await contracts.trustService.setRole(issuer, DSConstants.roles.ISSUER);
      await contracts.trustService.setRole(transferAgent, DSConstants.roles.TRANSFER_AGENT);
      await contracts.trustService.setRolesGovernor(governor);
      return { ...contracts, issuer, transferAgent, governor };
    }

    it('Should reject setRole/setRoles/removeRole from ISSUER and TRANSFER_AGENT', async function () {
      const { trustService, issuer, transferAgent } = await loadFixture(gatedRolesFixture);
      const [, , , , wallet] = await hre.ethers.getSigners();

      await expect(trustService.connect(issuer).setRole(wallet, DSConstants.roles.ISSUER)).revertedWith('Not enough permissions');
      await expect(trustService.connect(issuer).setRole(wallet, DSConstants.roles.EXCHANGE)).revertedWith('Not enough permissions');
      await expect(trustService.connect(transferAgent).setRole(wallet, DSConstants.roles.TRANSFER_AGENT)).revertedWith('Not enough permissions');
      await expect(trustService.connect(issuer).setRoles([wallet.address], [DSConstants.roles.EXCHANGE])).revertedWith('Not enough permissions');
      await expect(trustService.connect(transferAgent).removeRole(transferAgent)).revertedWith('Not enough permissions');
    });

    it('Should allow the governor to set and remove any manageable role', async function () {
      const { trustService, governor } = await loadFixture(gatedRolesFixture);
      const [, , , , w1, w2, w3] = await hre.ethers.getSigners();

      await trustService.connect(governor).setRole(w1, DSConstants.roles.ISSUER);
      await trustService.connect(governor).setRole(w2, DSConstants.roles.EXCHANGE);
      await trustService.connect(governor).setRole(w3, DSConstants.roles.TRANSFER_AGENT);
      expect(await trustService.getRole(w1)).to.equal(DSConstants.roles.ISSUER);
      expect(await trustService.getRole(w2)).to.equal(DSConstants.roles.EXCHANGE);
      expect(await trustService.getRole(w3)).to.equal(DSConstants.roles.TRANSFER_AGENT);

      await trustService.connect(governor).removeRole(w2);
      expect(await trustService.getRole(w2)).to.equal(DSConstants.roles.NONE);
    });

    it('Should allow the governor to set roles in bulk', async function () {
      const { trustService, governor } = await loadFixture(gatedRolesFixture);
      const [, , , , w1, w2] = await hre.ethers.getSigners();

      await trustService.connect(governor).setRoles([w1.address, w2.address], [DSConstants.roles.EXCHANGE, DSConstants.roles.ISSUER]);
      expect(await trustService.getRole(w1)).to.equal(DSConstants.roles.EXCHANGE);
      expect(await trustService.getRole(w2)).to.equal(DSConstants.roles.ISSUER);
    });

    it('Should not allow the governor to grant MASTER or set the governor', async function () {
      const { trustService, governor } = await loadFixture(gatedRolesFixture);
      const [, , , , wallet] = await hre.ethers.getSigners();

      await expect(trustService.connect(governor).setRole(wallet, DSConstants.roles.MASTER)).revertedWith('Invalid target role');
      await expect(trustService.connect(governor).setRolesGovernor(governor)).revertedWith('Not enough permissions');
      await expect(trustService.connect(governor).setServiceOwner(governor)).revertedWith('Not enough permissions');
    });

    it('Should keep MASTER as escape hatch', async function () {
      const { trustService } = await loadFixture(gatedRolesFixture);
      const [, , , , wallet] = await hre.ethers.getSigners();

      await trustService.setRole(wallet, DSConstants.roles.TRANSFER_AGENT);
      expect(await trustService.getRole(wallet)).to.equal(DSConstants.roles.TRANSFER_AGENT);
      await trustService.removeRole(wallet);
      expect(await trustService.getRole(wallet)).to.equal(DSConstants.roles.NONE);
    });
  });

  describe('Compliance rules gating (timelock registered)', function () {
    async function gatedComplianceFixture() {
      const contracts = await deployDSTokenRegulated();
      const [, transferAgent, , complianceAdmin] = await hre.ethers.getSigners();
      await contracts.trustService.setRole(transferAgent, DSConstants.roles.TRANSFER_AGENT);
      await contracts.complianceConfigurationService.setDSService(DSConstants.services.COMPLIANCE_RULES_TIMELOCK, complianceAdmin);
      return { ...contracts, transferAgent, complianceAdmin };
    }

    it('Should reject compliance setters from TRANSFER_AGENT and strangers', async function () {
      const { complianceConfigurationService, transferAgent } = await loadFixture(gatedComplianceFixture);
      const [, , , , stranger] = await hre.ethers.getSigners();

      await expect(complianceConfigurationService.connect(transferAgent).setTotalInvestorsLimit(100)).revertedWith('Insufficient trust level');
      await expect(complianceConfigurationService.connect(transferAgent).setCountryCompliance('US', 1)).revertedWith('Insufficient trust level');
      await expect(complianceConfigurationService.connect(stranger).setTotalInvestorsLimit(100)).revertedWith('Insufficient trust level');
    });

    it('Should allow the registered compliance admin and MASTER (escape hatch)', async function () {
      const { complianceConfigurationService, complianceAdmin } = await loadFixture(gatedComplianceFixture);

      await complianceConfigurationService.connect(complianceAdmin).setTotalInvestorsLimit(150);
      expect(await complianceConfigurationService.getTotalInvestorsLimit()).to.equal(150);

      await complianceConfigurationService.setTotalInvestorsLimit(175); // MASTER
      expect(await complianceConfigurationService.getTotalInvestorsLimit()).to.equal(175);
    });

    it('Should restore legacy behavior when the timelock service is cleared', async function () {
      const { complianceConfigurationService, transferAgent } = await loadFixture(gatedComplianceFixture);

      await complianceConfigurationService.setDSService(DSConstants.services.COMPLIANCE_RULES_TIMELOCK, ZERO_ADDRESS);
      await complianceConfigurationService.connect(transferAgent).setTotalInvestorsLimit(300);
      expect(await complianceConfigurationService.getTotalInvestorsLimit()).to.equal(300);
    });
  });

  describe('End-to-end with TimelockController', function () {
    async function timelockFixture() {
      const contracts = await deployDSTokenRegulated();
      const [master, proposer] = await hre.ethers.getSigners();
      // proposer acts as the Fireblocks wallet: PROPOSER + CANCELLER + EXECUTOR
      const timelock = await hre.ethers.deployContract('TimelockController', [
        MIN_DELAY, [proposer.address], [proposer.address], master.address,
      ]);
      await contracts.trustService.setRolesGovernor(timelock);
      await contracts.complianceConfigurationService.setDSService(DSConstants.services.COMPLIANCE_RULES_TIMELOCK, timelock);
      // discovery entries on the token registry
      await contracts.dsToken.setDSService(DSConstants.services.ROLES_TIMELOCK, timelock);
      await contracts.dsToken.setDSService(DSConstants.services.COMPLIANCE_RULES_TIMELOCK, timelock);
      return { ...contracts, timelock, proposer };
    }

    it('Should execute setRole only after the delay', async function () {
      const { trustService, timelock, proposer } = await loadFixture(timelockFixture);
      const [, , wallet] = await hre.ethers.getSigners();

      const data = trustService.interface.encodeFunctionData('setRole', [wallet.address, DSConstants.roles.ISSUER]);
      const salt = operationSalt('request-1');
      const target = await trustService.getAddress();

      await timelock.connect(proposer).schedule(target, 0, data, ZERO_BYTES32, salt, MIN_DELAY);

      await expect(timelock.connect(proposer).execute(target, 0, data, ZERO_BYTES32, salt))
        .revertedWithCustomError(timelock, 'TimelockUnexpectedOperationState');

      await time.increase(MIN_DELAY + 1);
      await timelock.connect(proposer).execute(target, 0, data, ZERO_BYTES32, salt);
      expect(await trustService.getRole(wallet)).to.equal(DSConstants.roles.ISSUER);
    });

    it('Should execute a compliance rule change only after the delay', async function () {
      const { complianceConfigurationService, timelock, proposer } = await loadFixture(timelockFixture);

      const data = complianceConfigurationService.interface.encodeFunctionData('setCountryCompliance', ['KP', 1]);
      const salt = operationSalt('request-2');
      const target = await complianceConfigurationService.getAddress();

      await timelock.connect(proposer).schedule(target, 0, data, ZERO_BYTES32, salt, MIN_DELAY);
      await expect(timelock.connect(proposer).execute(target, 0, data, ZERO_BYTES32, salt))
        .revertedWithCustomError(timelock, 'TimelockUnexpectedOperationState');

      await time.increase(MIN_DELAY + 1);
      await timelock.connect(proposer).execute(target, 0, data, ZERO_BYTES32, salt);
      expect(await complianceConfigurationService.getCountryCompliance('KP')).to.equal(1);
    });

    it('Should support cancelling a scheduled operation', async function () {
      const { trustService, timelock, proposer } = await loadFixture(timelockFixture);
      const [, , wallet] = await hre.ethers.getSigners();

      const data = trustService.interface.encodeFunctionData('setRole', [wallet.address, DSConstants.roles.TRANSFER_AGENT]);
      const salt = operationSalt('request-3');
      const target = await trustService.getAddress();

      await timelock.connect(proposer).schedule(target, 0, data, ZERO_BYTES32, salt, MIN_DELAY);
      const id = await timelock.hashOperation(target, 0, data, ZERO_BYTES32, salt);
      await timelock.connect(proposer).cancel(id);

      await time.increase(MIN_DELAY + 1);
      await expect(timelock.connect(proposer).execute(target, 0, data, ZERO_BYTES32, salt))
        .revertedWithCustomError(timelock, 'TimelockUnexpectedOperationState');
      expect(await trustService.getRole(wallet)).to.equal(DSConstants.roles.NONE);
    });

    it('Should reject scheduling the same operation with the same salt twice (idempotency)', async function () {
      const { trustService, timelock, proposer } = await loadFixture(timelockFixture);
      const [, , wallet] = await hre.ethers.getSigners();

      const data = trustService.interface.encodeFunctionData('setRole', [wallet.address, DSConstants.roles.ISSUER]);
      const salt = operationSalt('request-4');
      const target = await trustService.getAddress();

      await timelock.connect(proposer).schedule(target, 0, data, ZERO_BYTES32, salt, MIN_DELAY);
      await expect(timelock.connect(proposer).schedule(target, 0, data, ZERO_BYTES32, salt, MIN_DELAY))
        .revertedWithCustomError(timelock, 'TimelockUnexpectedOperationState');

      // Same operation under a different request id is a distinct operation
      await timelock.connect(proposer).schedule(target, 0, data, ZERO_BYTES32, operationSalt('request-5'), MIN_DELAY);
    });

    it('Should compute operation ids deterministically from the salt convention', async function () {
      const { trustService, timelock, proposer } = await loadFixture(timelockFixture);
      const [, , wallet] = await hre.ethers.getSigners();

      const data = trustService.interface.encodeFunctionData('setRole', [wallet.address, DSConstants.roles.ISSUER]);
      const salt = operationSalt('request-6');
      const target = await trustService.getAddress();

      // Provider-side precomputation, before broadcasting
      const expectedId = hre.ethers.keccak256(
        hre.ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'uint256', 'bytes', 'bytes32', 'bytes32'],
          [target, 0, data, ZERO_BYTES32, salt],
        ),
      );

      await expect(timelock.connect(proposer).schedule(target, 0, data, ZERO_BYTES32, salt, MIN_DELAY))
        .emit(timelock, 'CallScheduled')
        .withArgs(expectedId, 0, target, 0, data, ZERO_BYTES32, MIN_DELAY);
    });
  });

  describe('Emergency toolbox invariant', function () {
    it('Should keep pause() instant for TRANSFER_AGENT with governance fully active', async function () {
      const contracts = await loadFixture(deployDSTokenRegulated);
      const [master, proposer, transferAgent] = await hre.ethers.getSigners();
      const timelock = await hre.ethers.deployContract('TimelockController', [
        MIN_DELAY, [proposer.address], [proposer.address], master.address,
      ]);
      await contracts.trustService.setRole(transferAgent, DSConstants.roles.TRANSFER_AGENT);
      await contracts.trustService.setRolesGovernor(timelock);
      await contracts.complianceConfigurationService.setDSService(DSConstants.services.COMPLIANCE_RULES_TIMELOCK, timelock);

      await contracts.dsToken.connect(transferAgent).pause();
      expect(await contracts.dsToken.isPaused()).to.equal(true);
    });

    it('Should require MASTER for unpause() even with governance fully active (TA can freeze, only Master can lift it)', async function () {
      const contracts = await loadFixture(deployDSTokenRegulated);
      const [master, proposer, transferAgent] = await hre.ethers.getSigners();
      const timelock = await hre.ethers.deployContract('TimelockController', [
        MIN_DELAY, [proposer.address], [proposer.address], master.address,
      ]);
      await contracts.trustService.setRole(transferAgent, DSConstants.roles.TRANSFER_AGENT);
      await contracts.trustService.setRolesGovernor(timelock);
      await contracts.complianceConfigurationService.setDSService(DSConstants.services.COMPLIANCE_RULES_TIMELOCK, timelock);

      await contracts.dsToken.connect(transferAgent).pause();
      expect(await contracts.dsToken.isPaused()).to.equal(true);

      await expect(contracts.dsToken.connect(transferAgent).unpause())
        .revertedWith('Insufficient trust level');

      await contracts.dsToken.connect(master).unpause();
      expect(await contracts.dsToken.isPaused()).to.equal(false);
    });
  });
});
