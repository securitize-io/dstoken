async function deployContractBehindProxy(
  abstractProxy,
  configurationManager,
  deployer,
  abstractContract,
  initializeParams = []
) {
  try {
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
  } catch (error) {
    console.error("There was an error deploying contract", error)
  }
}

async function upgradeProxyImplementation(
  abstractProxy,
  abstractProxyAddress,
  configurationManager,
  deployer,
  abstractContract
) {
  try {
    const contractName = abstractContract._json.contractName;

    await deployer.deploy(abstractContract);
    const deployedContract = await abstractContract.deployed();
    const deployedProxy = await abstractProxy.at(abstractProxyAddress);
    await deployedProxy.setTarget(deployedContract.address);
    
    console.log("New implementation address:", deployedContract.address);

    configurationManager.setProxyAddressForContractName(
      contractName,
      abstractProxyAddress
    );
  } catch (error) {
    console.error("There was an error upgrading contract", error)
  }
}

async function deployStandAloneContract(
  configurationManager,
  deployer,
  abstractContract,
  initializeParams = []
) {
  try {
    const contractName = abstractContract._json.contractName;

    await deployer.deploy(abstractContract);
    const deployedContract = await abstractContract.deployed();

    configurationManager.setProxyAddressForContractName(
      contractName,
      deployedProxy.address
    );

    const proxifiedContract = await abstractContract.at(deployedProxy.address);
    await proxifiedContract.initialize(...initializeParams);
  } catch (error) {
    console.error("There was an error deploying contract", error);
  }

}

module.exports = {
  deployContractBehindProxy,
  upgradeProxyImplementation
};
