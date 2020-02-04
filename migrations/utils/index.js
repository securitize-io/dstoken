async function deployContractBehindProxy(
  abstractProxy,
  configurationManager,
  deployer,
  abstractContract,
  initializeParams = []
) {
  const contractName = abstractContract._json.contractName;

  await deployer.deploy(abstractContract);
  const deployedContract = await abstractContract.deployed();
  const deployedProxy = await deployer.deploy(abstractProxy);
  await deployedProxy.setTarget(deployedContract.address);

  configurationManager.setProxyAddressForContractName(
    contractName,
    deployedProxy.address
  );

  const proxifiedContract = await abstractContract.at(deployedProxy.address);
  await proxifiedContract.initialize(...initializeParams);
}

module.exports = {
  deployContractBehindProxy
};
