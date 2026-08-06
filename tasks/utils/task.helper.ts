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

/**
 * Resolves a --signer value to one of the configured signers. Accepts an index into the account
 * list or an address, so a runbook can say `--signer 6` or name the wallet explicitly.
 */
export async function resolveSigner(hre: HardhatRuntimeEnvironment, value?: string): Promise<any> {
  const signers = await hre.ethers.getSigners();
  if (!value) return signers[0];

  if (/^\d+$/.test(value)) {
    const index = Number(value);
    if (index >= signers.length) {
      throw new Error(
        `--signer ${index} was requested but only ${signers.length} signers are configured ` +
          `(indices 0-${signers.length - 1}). Check the private keys set in .env.`,
      );
    }
    return signers[index];
  }

  const match = signers.find((s) => s.address.toLowerCase() === value.toLowerCase());
  if (!match) {
    throw new Error(
      `--signer ${value} is not among the configured signers ` +
        `(${signers.map((s) => s.address).join(', ')}). Add its private key to .env.`,
    );
  }
  return match;
}
