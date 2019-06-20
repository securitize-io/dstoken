const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const DSToken = artifacts.require('DSTokenVersioned');
const Proxy = artifacts.require('ProxyVersioned');

const argv = require('minimist')(process.argv.slice(2));

module.exports = async function(deployer) {
  const storage = await DSEternalStorage.deployed();
  const token = await DSToken.deployed();

  const deployedProxy = await deployer.deploy(Proxy);
  await deployedProxy.setTarget(token.address);

  const proxyToken = await DSToken.at(deployedProxy.address);
  await proxyToken.initialize(
    argv.name,
    argv.symbol,
    parseInt(argv.decimals),
    storage.address,
    `${argv.name}Token`
  );
};
