import { INVESTORS } from './fixture';
import { expect } from 'chai';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers, Signature } from 'ethers';
import hre from 'hardhat';

export const setCounters = async (txCounters, complianceService) => {
  const currentCounters = await getCounters(complianceService);
  Object.keys(txCounters).forEach(key => {
    INVESTORS.Counters[key] = txCounters[key] + currentCounters[key];
  });
};

export const getCounters = async (complianceService) => {
  const totalInvestorsCount = await complianceService.getTotalInvestorsCount();
  const usTotalInvestorsCount = await complianceService.getUSInvestorsCount();
  const accreditedInvestorsCount = await complianceService.getAccreditedInvestorsCount();
  const usAccreditedInvestorsCount = await complianceService.getUSAccreditedInvestorsCount();
  const jpTotalInvestorsCount = await complianceService.getJPInvestorsCount();

  return {
    totalInvestorsCount: parseInt(totalInvestorsCount),
    usTotalInvestorsCount: parseInt(usTotalInvestorsCount),
    accreditedInvestorsCount: parseInt(accreditedInvestorsCount),
    usAccreditedInvestorsCount: parseInt(usAccreditedInvestorsCount),
    jpTotalInvestorsCount: parseInt(jpTotalInvestorsCount)
  };
};

export const assertCounters = async (complianceService) => {
  const currentCounters = await getCounters(complianceService);
  expect(currentCounters.totalInvestorsCount).to.equal(INVESTORS.Counters.totalInvestorsCount);
  expect(currentCounters.usTotalInvestorsCount).to.equal(INVESTORS.Counters.usTotalInvestorsCount);
  expect(currentCounters.accreditedInvestorsCount).to.equal(INVESTORS.Counters.accreditedInvestorsCount);
  expect(currentCounters.usAccreditedInvestorsCount).to.equal(INVESTORS.Counters.usAccreditedInvestorsCount);
  expect(currentCounters.jpTotalInvestorsCount).to.equal(INVESTORS.Counters.jpTotalInvestorsCount);
};

export const getCountersDelta = (txCounters) => {
  Object.keys(txCounters).forEach(key => {
    INVESTORS.Counters[key] = Math.abs(INVESTORS.Counters[key] - Math.abs(txCounters[key]));
  });
};

export const registerInvestor = async (investorId: string, wallet: string | HardhatEthersSigner, registryService: any) => {
  await registryService.registerInvestor(investorId, '');
  await registryService.addWallet(wallet, investorId);
};

export const EIP712_TR_NAME = 'Securitize Transaction Relayer for pre-approved transactions';
export const EIP712_TR_VERSION = '5';
export const SALT_TR = '0x6e31104f5170e59a0a98ebdeb5ba99f8b32ef7b56786b1722f81a5fa19dd1629';
export const TR_DOMAIN_DATA = {
  name: EIP712_TR_NAME,
  version: EIP712_TR_VERSION,
  salt: SALT_TR
};

export const EIP712_MS_NAME = 'Securitize Off-Chain Multisig Wallet';
export const EIP712_MS_VERSION = '1';
export const SALT_MS = '0x3ee892349ae4bbe61dce18f95115b5dc02daf49204cc602458cd4c1f540d56d7';
export const MS_DOMAIN_DATA = {
  name: EIP712_MS_NAME,
  version: EIP712_MS_VERSION,
  salt: SALT_MS
};

export const transactionRelayerPreApproval = async (
  hsm: HardhatEthersSigner,
  transactionRelayerAddress: string,
  message: any,
  domainData: ethers.TypedDataDomain = TR_DOMAIN_DATA
) => {

  domainData.verifyingContract = transactionRelayerAddress;
  domainData.chainId = (await hre.ethers.provider.getNetwork()).chainId;

  const types = {
    TransactionRelayer: [
      { name: 'destination', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
      { name: 'nonce', type: 'uint256' },
      { name: 'executor', type: 'address' },
      { name: 'gasLimit', type: 'uint256' },
      { name: 'investorId', type: 'string' },
      { name: 'blockLimit', type: 'uint256' }
    ]
  };

  const signatureRaw = await hsm.signTypedData(domainData, types, message);
  return ethers.Signature.from(signatureRaw);
};

export const multisigPreApproval = async (
  signers: HardhatEthersSigner[],
  multisigAddress: string,
  message: any,
  domainData: ethers.TypedDataDomain = MS_DOMAIN_DATA
): Promise<Signature[]> => {

  domainData.verifyingContract = multisigAddress;
  domainData.chainId = (await hre.ethers.provider.getNetwork()).chainId;

  const types = {
    MultiSigTransaction: [
      { name: 'destination', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
      { name: 'nonce', type: 'uint256' },
      { name: 'executor', type: 'address' },
      { name: 'gasLimit', type: 'uint256' }
    ]
  };

  const promises = signers.map(async (signer) => {
    const signatureRaw = await signer.signTypedData(domainData, types, message);
    return ethers.Signature.from(signatureRaw);
  });

  return Promise.all(promises);
};
