import { INVESTORS } from './fixture';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

export const setCounters = async (txCounters, complianceService) => {
  const currentCounters = await getCounters(complianceService);
  Object.keys(txCounters).forEach(key => {
    INVESTORS.Counters[key] = txCounters[key] + currentCounters[key];
  });
}

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
    jpTotalInvestorsCount: parseInt(jpTotalInvestorsCount),
  };
}

export const assertCounters = async (complianceService) => {
  const currentCounters = await getCounters(complianceService);
  expect(currentCounters.totalInvestorsCount).to.equal(INVESTORS.Counters.totalInvestorsCount);
  expect(currentCounters.usTotalInvestorsCount).to.equal(INVESTORS.Counters.usTotalInvestorsCount);
  expect(currentCounters.accreditedInvestorsCount).to.equal(INVESTORS.Counters.accreditedInvestorsCount);
  expect(currentCounters.usAccreditedInvestorsCount).to.equal(INVESTORS.Counters.usAccreditedInvestorsCount);
  expect(currentCounters.jpTotalInvestorsCount).to.equal(INVESTORS.Counters.jpTotalInvestorsCount);
}

export const getCountersDelta = (txCounters) => {
  Object.keys(txCounters).forEach(key => {
    INVESTORS.Counters[key] = Math.abs(INVESTORS.Counters[key] - Math.abs(txCounters[key]));
  });
}

export const registerInvestor = async (investorId: string, wallet: string | HardhatEthersSigner, registryService: any) => {
  await registryService.registerInvestor(investorId, '');
  await registryService.addWallet(wallet, investorId);
}
