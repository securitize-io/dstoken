module.exports = {
  services: {
    TRUST_SERVICE: 1,
    DS_TOKEN: 2,
    REGISTRY_SERVICE: 4,
    COMPLIANCE_SERVICE: 8,
    COMMS_SERVICE: 16,
    WALLET_MANAGER: 32,
    LOCK_MANAGER: 64,
    ISSUANCE_INFORMATION_MANAGER: 128,
    COMPLIANCE_CONFIGURATION_SERVICE: 256,
  },
  countries: {
    FRANCE: 'France',
    USA: 'USA',
  },
  investorStatusIds: {
    NONE: 0,
    KYC_APPROVED: 1,
    ACCREDITED: 2,
    QUALIFIED: 4,
    PROFESSIONAL: 8,
  },
  investorStatuses: {
    PENDING: 0,
    APPROVED: 1,
    REJECTED: 2,
  },
  compliances: {
    US: 1,
    EU: 2,
  },
};
