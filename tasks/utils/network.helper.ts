import { HardhatRuntimeEnvironment } from 'hardhat/types';

/**
 * Chain ids the BC-2329 QA tooling is allowed to send transactions on.
 *
 * The role wallets used for this QA hold MASTER / ISSUER / TRANSFER_AGENT authority on other
 * deployments too, so the blast radius of a misdirected RPC URL is not limited to the token under
 * test. The network *names* in hardhat.config.ts are all testnets, but the URLs behind them come
 * from the environment and nothing stops one from pointing somewhere else. This guard checks the
 * chain id the node actually reports before anything is signed.
 */
const ALLOWED_CHAIN_IDS: Record<string, string> = {
  '31337': 'Hardhat / localhost',
  '11155111': 'Sepolia',
  '421614': 'Arbitrum Sepolia',
  '11155420': 'OP Sepolia',
  '43113': 'Avalanche Fuji',
};

export async function assertKnownTestnet(hre: HardhatRuntimeEnvironment, allowUnknownChain = false): Promise<string> {
  const chainId = (await hre.ethers.provider.getNetwork()).chainId.toString();
  const known = ALLOWED_CHAIN_IDS[chainId];

  if (known) {
    console.log(`Network: ${hre.network.name} → chainId ${chainId} (${known})`);
    return chainId;
  }

  if (allowUnknownChain) {
    console.log(
      `Network: ${hre.network.name} → chainId ${chainId}, NOT a known testnet. ` +
        `Proceeding because --allow-unknown-chain was passed.`,
    );
    return chainId;
  }

  throw new Error(
    `Refusing to send transactions on chainId ${chainId}: it is not one of the expected testnets ` +
      `(${Object.entries(ALLOWED_CHAIN_IDS).map(([id, name]) => `${id} ${name}`).join(', ')}).\n` +
      `The RPC URL for network "${hre.network.name}" is probably pointing somewhere unintended. ` +
      `Check it before continuing — the signers configured here hold real authority on other deployments. ` +
      `Pass --allow-unknown-chain only if you are certain this chain is correct.`,
  );
}
