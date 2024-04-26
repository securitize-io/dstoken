import { Contract } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

export const printContractAddresses = async (name: string, contract: Contract, hre: HardhatRuntimeEnvironment): Promise<string> => {
  const contractAddress = await contract.getAddress();
  console.log(`${name} Proxy address: ${contractAddress}`);

  const implementation = await hre.upgrades.erc1967.getImplementationAddress(contractAddress);
  console.log(`${name} Implementation address: ${implementation}`);

  return contractAddress;
};

export const getComplianceContractName = (complianceType: string): string => {
  switch (complianceType) {
    case 'WHITELIST':
      return 'ComplianceServiceWhitelisted';
    case 'PARTITIONED':
      return 'ComplianceServiceRegulatedPartitioned';
    default:
      return 'ComplianceServiceRegulated';
  }
}

export const getLockManagerContractName = (lockManagerType: string): string => {
  switch (lockManagerType) {
    case 'WALLET':
      return 'LockManager';
    case 'PARTITIONED':
      return 'InvestorLockManagerPartitioned';
    default:
      return 'InvestorLockManager';
  }
}

export const getTBEControllerContractName = (complianceType: string): string => {
  switch (complianceType) {
    case 'WHITELIST':
      return 'OmnibusTBEControllerWhitelisted';
    default:
      return 'OmnibusTBEController';
  }
}

export const isPartitioned = (complianceType: string): boolean => {
  return complianceType === 'PARTITIONED';
}
