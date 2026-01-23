import { INVESTORS } from './fixture';
import { expect } from 'chai';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers, Signature } from 'ethers';
import hre from 'hardhat';
import { ISecuritizeRebasingProvider } from '../../typechain-types';

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

export const EIP712_TR_NAME = 'TransactionRelayer';
export const EIP712_TR_VERSION = '6';
export const TR_DOMAIN_DATA = {
  name: EIP712_TR_NAME,
  version: EIP712_TR_VERSION
};

export const buildPermitSignature = async (
  owner: HardhatEthersSigner,
  message: any,
  tokenName: string,
  tokenAddress: string,
) => {
  const domain: ethers.TypedDataDomain = {
    version: '1',
    name: tokenName,
    verifyingContract: tokenAddress,
    chainId: (await hre.ethers.provider.getNetwork()).chainId,
  };

  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const signature = await owner.signTypedData(domain, types, message);
  const { v, r, s } = ethers.Signature.from(signature);
  return { v, r, s };
}

export const transactionRelayerPreApproval = async (
  hsm: HardhatEthersSigner,
  transactionRelayerAddress: string,
  message: any,
  domainData: ethers.TypedDataDomain = TR_DOMAIN_DATA,
  typesOverride?: Record<string, { name: string; type: string }[]>
) => {

  const domain: ethers.TypedDataDomain = {
    ...domainData,
    verifyingContract: transactionRelayerAddress
  };

  if (domain.chainId === undefined) {
    domain.chainId = (await hre.ethers.provider.getNetwork()).chainId;
  }

  const types = typesOverride ?? {
    ExecutePreApprovedTransaction: [
      { name: 'destination', type: 'address' },
      { name: 'data', type: 'bytes' },
      { name: 'nonce', type: 'uint256' },
      { name: 'senderInvestor', type: 'string' },
      { name: 'blockLimit', type: 'uint256' }
    ]
  };

  return hsm.signTypedData(domain, types, message);
};


type RebasingProviderType = Pick<ISecuritizeRebasingProvider, 'convertTokensToShares' | 'convertSharesToTokens'>;

export const convertTokensToShares = async (rebasingProvider: RebasingProviderType, amount: bigint | number) => {
  const value = typeof amount === 'bigint' ? amount : BigInt(amount);
  return BigInt(await rebasingProvider.convertTokensToShares(value));
};

export const convertSharesToTokens = async (rebasingProvider: RebasingProviderType, shares: bigint) => {
  return BigInt(await rebasingProvider.convertSharesToTokens(shares));
};

export const roundedTokens = async (rebasingProvider: RebasingProviderType, ...amounts: Array<number | bigint>) => {
  let totalShares = 0n;
  for (const amount of amounts) {
    totalShares += await convertTokensToShares(rebasingProvider, amount);
  }
  return convertSharesToTokens(rebasingProvider, totalShares);
};
