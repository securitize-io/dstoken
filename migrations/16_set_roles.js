const TrustService = artifacts.require("TrustService");
const configurationManager = require("./utils/configurationManager");
const roles = require("../utils/globals").roles;

module.exports = async function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  const trustService = await TrustService.at(
    configurationManager.getProxyAddressForContractName("TrustService")
  );

  console.log("Give issuer permissions to token issuer");
  await trustService.setRole(
    configurationManager.getProxyAddressForContractName("TokenIssuer"),
    roles.ISSUER
  );
  console.log("Give issuer permissions to wallet registrar");
  await trustService.setRole(
    configurationManager.getProxyAddressForContractName("WalletRegistrar"),
    roles.ISSUER
  );
  if (!configurationManager.noOmnibusWallet) {
    console.log("Give issuer permissions to Omnibus TBE Controller");
    await trustService.setRole(
      configurationManager.getProxyAddressForContractName("OmnibusTBEController"),
      roles.ISSUER
    );
  }
  console.log("Give issuer permissions to transaction relayer");
  await trustService.setRole(
    configurationManager.getProxyAddressForContractName("TransactionRelayer"),
    roles.ISSUER
  );
};
