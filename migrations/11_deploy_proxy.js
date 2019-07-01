const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const DSToken = artifacts.require('DSTokenVersioned');
const Proxy = artifacts.require('ProxyVersioned');

const configurationManager = require('./utils/configurationManager');

module.exports = async function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  const storage = await DSEternalStorage.deployed();
  const token = await DSToken.deployed();

  const deployedProxy = await deployer.deploy(Proxy);
  await deployedProxy.setTarget(token.address);

  const proxyToken = await DSToken.at(deployedProxy.address);
  await proxyToken.initialize(
    configurationManager.name,
    configurationManager.symbol,
    configurationManager.decimals,
    storage.address,
    `${configurationManager.name}Token`
  );
};
