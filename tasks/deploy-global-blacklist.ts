import { task, types } from 'hardhat/config';
import { DSConstants } from '../utils/globals';
import { assertAddress, assertHasCode, parseAddressList, waitUntilIdle } from './utils/task.helper';

/**
 * BC-2643: deploys the shared "CET Global blacklist" used by GlobalWhitelisted tokens.
 *
 * A BlackListManager holds no reference to any token. It only needs a TrustService so that
 * addToBlacklist/removeFromBlacklist (onlyTransferAgentOrAbove, no owner bypass) can resolve roles,
 * so this task deploys a dedicated TrustService next to it. setDSService and upgrades are onlyMaster
 * (owner bypass), which is why --owner is handled separately from the TrustService roles.
 */
task('deploy-global-blacklist', 'Deploy a shared BlackListManager with its own dedicated TrustService (resumable)')
  .addParam('master', 'Address that becomes MASTER of the dedicated TrustService', undefined, types.string)
  .addOptionalParam('transferAgents', 'Comma-separated addresses granted the TRANSFER_AGENT role', undefined, types.string)
  .addOptionalParam('owner', 'Address that becomes owner() of the BlackListManager (the signer keeps it if omitted)', undefined, types.string)
  .addOptionalParam('trustService', 'Already deployed TrustService: skip its deployment (resume)', undefined, types.string)
  .addOptionalParam('blacklistManager', 'Already deployed BlackListManager: skip its deployment (resume)', undefined, types.string)
  .setAction(async (args, hre) => {
    // Validate everything before deploying anything.
    const master = assertAddress('--master', args.master, hre);
    const transferAgents = parseAddressList('--transfer-agents', args.transferAgents, hre);
    const owner = args.owner ? assertAddress('--owner', args.owner, hre) : undefined;
    const existingTrust = args.trustService ? assertAddress('--trust-service', args.trustService, hre) : undefined;
    const existingBlm = args.blacklistManager ? assertAddress('--blacklist-manager', args.blacklistManager, hre) : undefined;
    if (transferAgents.includes(master)) {
      throw new Error('--transfer-agents must not include --master: an address holds a single role');
    }
    if (existingTrust) await assertHasCode('--trust-service', existingTrust, hre);
    if (existingBlm) await assertHasCode('--blacklist-manager', existingBlm, hre);

    const [signer] = await hre.ethers.getSigners();
    const signerAddress = await signer.getAddress();

    // One in-flight transaction at a time: wait until the signer is idle before every send.
    const idle = () => waitUntilIdle(signerAddress, hre);
    const send = async (description: string, sendTx: () => Promise<any>) => {
      await idle();
      console.log(description);
      const tx = await sendTx();
      await tx.wait();
    };
    const skip = (description: string) => console.log(`Skipping (already done): ${description}`);

    let trustService;
    if (existingTrust) {
      console.log(`Reusing TrustService ${existingTrust}`);
      trustService = await hre.ethers.getContractAt('TrustService', existingTrust, signer);
    } else {
      await idle();
      trustService = await hre.run('deploy-trust-service'); // waits for deployment to be mined
    }

    let blacklistManager;
    if (existingBlm) {
      console.log(`Reusing BlackListManager ${existingBlm}`);
      blacklistManager = await hre.ethers.getContractAt('BlackListManager', existingBlm, signer);
    } else {
      await idle();
      blacklistManager = await hre.run('deploy-blacklist-manager'); // waits for deployment to be mined
    }
    const trustServiceAddress = await trustService.getAddress();
    const blacklistManagerAddress = await blacklistManager.getAddress();

    const connectMsg = 'Connecting blacklist manager to its dedicated trust service';
    if ((await blacklistManager.getDSService(DSConstants.services.TRUST_SERVICE)) === trustServiceAddress) {
      skip(connectMsg);
    } else {
      await send(connectMsg, () => blacklistManager.setDSService(DSConstants.services.TRUST_SERVICE, trustServiceAddress));
    }

    // The signer is MASTER of a new TrustService, so roles are granted first and MASTER is moved last.
    for (const transferAgent of transferAgents) {
      if (transferAgent === signerAddress) continue;
      const msg = `Granting transfer agent role to ${transferAgent}`;
      if ((await trustService.getRole(transferAgent)) === BigInt(DSConstants.roles.TRANSFER_AGENT)) {
        skip(msg);
      } else {
        await send(msg, () => trustService.setRole(transferAgent, DSConstants.roles.TRANSFER_AGENT));
      }
    }

    if (master !== signerAddress) {
      const msg = `Transferring TrustService MASTER to ${master}`;
      if ((await trustService.getRole(master)) === BigInt(DSConstants.roles.MASTER)) {
        skip(msg);
      } else {
        await send(msg, () => trustService.setServiceOwner(master));
      }
    }

    if (owner && owner !== signerAddress) {
      const msg = `Transferring BlackListManager ownership to ${owner}`;
      if ((await blacklistManager.owner()) === owner) {
        skip(msg);
      } else {
        await send(msg, () => blacklistManager.transferOwnership(owner));
      }
    }

    const result = {
      blackListManager: blacklistManagerAddress,
      trustService: trustServiceAddress,
      blackListManagerImplementation: await hre.upgrades.erc1967.getImplementationAddress(blacklistManagerAddress),
      trustServiceImplementation: await hre.upgrades.erc1967.getImplementationAddress(trustServiceAddress),
      master,
      transferAgents,
      owner: owner ?? signerAddress,
    };
    console.log(JSON.stringify(result, null, 2));
    return { ...result, blacklistManager, trustService };
  });
