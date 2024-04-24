import { ethers, upgrades } from 'hardhat';
import { configurationManager } from '../ignition/utils/configurationManager';

async function deployDSToken() {
  configurationManager.setConfiguration();
  const TokenLib = await ethers.getContractFactory('TokenLibrary');
  const tokenLib = await TokenLib.deploy();

  const DSToken = await ethers.getContractFactory('DSToken', {
    libraries: {
      TokenLibrary: tokenLib,
    }
  });

  const dsToken = await upgrades.deployProxy(
    DSToken,
    [ configurationManager.name, configurationManager.symbol, configurationManager.decimals ],
    { kind: 'uups', unsafeAllow: ['external-library-linking'] }
  );

  await dsToken.waitForDeployment();

  const tokenAddress = await dsToken.getAddress();
  console.log(`DSToken Proxy address: ${ tokenAddress }`);

  const implementation = await upgrades.erc1967.getImplementationAddress(tokenAddress);
  console.log(`DSToken Implementation address: ${ implementation }`);
}

deployDSToken()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
