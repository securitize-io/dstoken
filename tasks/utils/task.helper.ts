import { Contract } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

export const printContractAddresses = async (name: string, contract: Contract, hre: HardhatRuntimeEnvironment) => {
  const contractAddress = await contract.getAddress();
  console.log(`${name} Proxy address: ${contractAddress}`);

  const implementation = await hre.upgrades.erc1967.getImplementationAddress(contractAddress);
  console.log(`${name} Implementation address: ${implementation}`);
};

export const getTokenContractName = (complianceType: string): string => {
  switch (complianceType) {
    default:
      return 'DSToken';
  }
}

export const getComplianceContractName = (complianceType: string): string => {
  switch (complianceType) {
    case 'WHITELISTED':
      return 'ComplianceServiceWhitelisted';
    case 'GLOBAL_WHITELISTED':
      return 'ComplianceServiceGlobalWhitelisted';
    case 'BLACKLISTED':
    case 'PERMISSIONLESS':
      return 'ComplianceServicePermissionless';
    case 'REGULATED_MOCK':
      return 'ComplianceServiceRegulatedMock';
    default:
      return 'ComplianceServiceRegulated';
  }
}

export const getLockManagerContractName = (complianceType: string): string => {
  switch (complianceType) {
    default:
      return 'InvestorLockManager';
  }
}

export const assertAddress = (name: string, value: string | undefined, hre: HardhatRuntimeEnvironment): string => {
  if (!value || !hre.ethers.isAddress(value) || value === hre.ethers.ZeroAddress) {
    throw new Error(`${name} must be a valid non-zero address, got ${value}`);
  }
  return hre.ethers.getAddress(value);
};

export const parseAddressList = (name: string, value: string | undefined, hre: HardhatRuntimeEnvironment): string[] => {
  if (!value) return [];
  const list = value.split(',').map(item => item.trim()).filter(item => item.length > 0)
    .map(item => assertAddress(name, item, hre));
  return [...new Set(list)];
};

/**
 * Some RPCs (e.g. Sepolia with EIP-7702 delegated accounts) accept a single in-flight transaction per account.
 * Polls until the account has no pending transactions (pending nonce == latest nonce).
 */
export const waitUntilIdle = async (
  address: string,
  hre: HardhatRuntimeEnvironment,
  { timeoutMs = 120_000, pollMs = 2_000 }: { timeoutMs?: number; pollMs?: number } = {},
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const [latest, pending] = await Promise.all([
      hre.ethers.provider.getTransactionCount(address, 'latest'),
      hre.ethers.provider.getTransactionCount(address, 'pending'),
    ]);
    if (pending === latest) return;
    if (Date.now() >= deadline) {
      throw new Error(
        `${address} still has ${pending - latest} pending transaction(s) after ${timeoutMs / 1000}s (latest nonce ${latest}, pending nonce ${pending}). ` +
        'Wait for them to be mined or replace/cancel them, then re-run the task passing the already deployed addresses ' +
        '(--trust-service / --blacklist-manager) to resume.',
      );
    }
    await new Promise(resolve => setTimeout(resolve, pollMs));
  }
};

export const assertHasCode = async (name: string, address: string, hre: HardhatRuntimeEnvironment): Promise<void> => {
  if ((await hre.ethers.provider.getCode(address)) === '0x') {
    throw new Error(`No contract at ${name} (${address})`);
  }
};
