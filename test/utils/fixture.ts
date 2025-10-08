import hre from 'hardhat';
import { DSConstants } from '../../utils/globals';

console.log = function() {
};
hre.upgrades.silenceWarnings();

export const deployDSTokenRegulated = async () => {
  const name = 'Token Example 1';
  const symbol = 'TX1';
  const contracts = await hre.run('deploy-all', { name, symbol, decimals: 2 });
  return { ...contracts };
};

export const deployDSTokenWhitelisted = () => {
  const name = 'Token Example 1';
  const symbol = 'TX1';
  const compliance = 'WHITELISTED';
  return hre.run('deploy-all', { name, symbol, decimals: 2, compliance });
};

export const deployDSTokenWithBlackList = () => {
  const name = 'Token Example 1';
  const symbol = 'TX1';
  const compliance = 'WHITELISTED_BLACKLIST';
  return hre.run('deploy-all', { name, symbol, decimals: 2, compliance });
};

export const deployDSTokenRegulatedWithRebasing = async () => {
  const name = 'Token Example 1';
  const symbol = 'TX1';
  const multiplier = '1500000000000000000';
  const contracts = await hre.run('deploy-all', { name, symbol, decimals: 2, multiplier });
  return { ...contracts };
};
export const deployDSTokenRegulatedWithRebasingAndSixDecimal = async () => {
  const name = 'Token Example 1';
  const symbol = 'TX1';
  const multiplier = '1730000000000000000';
  const contracts = await hre.run('deploy-all', { name, symbol, decimals: 6, multiplier });
  return { ...contracts };
};

export const deployDSTokenRegulatedWithRebasingAndEighteenDecimal = async () => {
  const name = 'Token Example 1';
  const symbol = 'TX1';
  const multiplier = '1250000000000000000';
  const contracts = await hre.run('deploy-all', { name, symbol, decimals: 18, multiplier });
  return { ...contracts };
};

export const MINUTES = 60;
export const HOURS = 60 * MINUTES;
export const DAYS = 24 * HOURS;
export const WEEKS = 7 * DAYS;
export const YEARS = 365 * DAYS;

export const attributeTypes = [
  DSConstants.attributeType.KYC_APPROVED,
  DSConstants.attributeType.ACCREDITED,
  DSConstants.attributeType.QUALIFIED,
  DSConstants.attributeType.PROFESSIONAL
];
export const attributeStatuses = [
  DSConstants.attributeStatus.PENDING,
  DSConstants.attributeStatus.APPROVED,
  DSConstants.attributeStatus.REJECTED
];

export const INVESTORS = {
  INVESTOR_ID: {
    INVESTOR_ID_1: 'generalInvestorId1',
    INVESTOR_COLLISION_HASH_1: 'generalInvestorCollisionHash1',
    INVESTOR_ID_2: 'generalInvestorId2',
    INVESTOR_COLLISION_HASH_2: 'generalInvestorCollisionHash2',
    US_INVESTOR_ID: 'usInvestorId',
    US_INVESTOR_COLLISION_HASH: 'usInvestorCollisionHash',
    US_INVESTOR_ID_2: 'usInvestorId2',
    US_INVESTOR_COLLISION_HASH_2: 'usInvestorCollisionHash2',
    US_INVESTOR_ID_3: 'usInvestorId3',
    US_INVESTOR_COLLISION_HASH_3: 'usInvestorCollisionHash3',
    SPAIN_INVESTOR_ID: 'spainInvestorId',
    SPAIN_INVESTOR_COLLISION_HASH: 'spainInvestorCollisionHash',
    GERMANY_INVESTOR_ID: 'germanyInvestorId',
    GERMANY_INVESTOR_COLLISION_HASH: 'germanyInvestorCollisionHash',
    GERMANY_INVESTOR_ID_2: 'germanyInvestorId2',
    GERMANY_INVESTOR_COLLISION_HASH_2: 'germanyInvestorCollisionHash2',
    CHINA_INVESTOR_ID: 'chinaInvestorId',
    CHINA_INVESTOR_COLLISION_HASH: 'chinaInvestorCollisionHash',
    ISRAEL_INVESTOR_ID: 'israelInvestorId',
    ISRAEL_INVESTOR_COLLISION_HASH: 'israelInvestorCollisionHash',
    INVESTOR_TO_BE_ISSUED_WHEN_PAUSED: 'investorToBeIssuedWhileTokenPaused'
  },
  Country: {
    FRANCE: 'france',
    USA: 'usa',
    SPAIN: 'spain',
    GERMANY: 'germany',
    CHINA: 'china',
    ISRAEL: 'israel',
    JAPAN: 'japan'
  },
  Compliance: {
    NONE: 0,
    US: 1,
    EU: 2,
    FORBIDDEN: 4,
    JP: 8
  },
  Address: {
    ZERO_ADDRESS: '0x0000000000000000000000000000000000000000'
  },
  Time: {
    MINUTES,
    HOURS,
    DAYS,
    WEEKS,
    YEARS
  },
  AssetTrackingMode: {
    BENEFICIARY: 0,
    HOLDER_OF_RECORD: 1
  },
  Counters: {
    totalInvestorsCount: 0,
    accreditedInvestorsCount: 0,
    usTotalInvestorsCount: 0,
    usAccreditedInvestorsCount: 0,
    jpTotalInvestorsCount: 0
  }
};
