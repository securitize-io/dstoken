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
    TOKEN_ISSUER: 512
  },
  roles: {
    NONE: 0,
    MASTER: 1,
    ISSUER: 2,
    EXCHANGE: 4
  },
  complianceType: {
    NOT_REGULATED: 0,
    WHITELIST: 1,
    NORMAL: 2
  },
  lockManagerType: {
    WALLET: 0,
    INVESTOR: 1
  }
};
