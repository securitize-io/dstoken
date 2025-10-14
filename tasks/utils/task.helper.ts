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
