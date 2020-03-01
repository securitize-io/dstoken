const MINUTES = 60;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;
const WEEKS = 7 * DAYS;
const YEARS = 365 * DAYS;

module.exports = {
  InvestorId: {
    GENERAL_INVESTOR_ID_1: "generalInvestorId1",
    GENERAL_INVESTOR_COLLISION_HASH_1: "generalInvestorCollisionHash1",
    GENERAL_INVESTOR_ID_2: "generalInvestorId2",
    GENERAL_INVESTOR_COLLISION_HASH_2: "generalInvestorCollisionHash2",
    US_INVESTOR_ID: "usInvestorId",
    US_INVESTOR_COLLISION_HASH: "usInvestorCollisionHash",
    US_INVESTOR_ID_2: "usInvestorId2",
    US_INVESTOR_COLLISION_HASH_2: "usInvestorCollisionHash2",
    US_INVESTOR_ID_3: "usInvestorId3",
    US_INVESTOR_COLLISION_HASH_3: "usInvestorCollisionHash3",
    SPAIN_INVESTOR_ID: "spainInvestorId",
    SPAIN_INVESTOR_COLLISION_HASH: "spainInvestorCollisionHash",
    GERMANY_INVESTOR_ID: "germanyInvestorId",
    GERMANY_INVESTOR_COLLISION_HASH: "germanyInvestorCollisionHash",
    GERMANY_INVESTOR_ID_2: "germanyInvestorId2",
    GERMANY_INVESTOR_COLLISION_HASH_2: "germanyInvestorCollisionHash2",
    CHINA_INVESTOR_ID: "chinaInvestorId",
    CHINA_INVESTOR_COLLISION_HASH: "chinaInvestorCollisionHash",
    ISRAEL_INVESTOR_ID: "israelInvestorId",
    ISRAEL_INVESTOR_COLLISION_HASH: "israelInvestorCollisionHash",
    OMNIBUS_WALLET_INVESTOR_ID_1: "omnibusWalletInvestorId1",
    OMNIBUS_WALLET_INVESTOR_ID_2: "omnibusWalletInvestorId2"
  },
  AttributeType: {
    NONE: 0,
    KYC_APPROVED: 1,
    ACCREDITED: 2,
    QUALIFIED: 4,
    PROFESSIONAL: 8
  },
  AttributeStatus: {
    PENDING: 0,
    APPROVED: 1,
    REJECTED: 2
  },
  Country: {
    FRANCE: "france",
    USA: "usa",
    SPAIN: "spain",
    GERMANY: "germany",
    CHINA: "china",
    ISRAEL: "israel"
  },
  Compliance: {
    NONE: 0,
    US: 1,
    EU: 2,
    FORBIDDEN: 4
  },
  Address: {
    ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
    OMNIBUS_WALLET_ADDRESS_1: "0x92A9298531775c942EFcFE0d4fd6cCf5F0ED8553"
  },
  Time: {
    MINUTES,
    HOURS,
    DAYS,
    WEEKS,
    YEARS
  }
};
