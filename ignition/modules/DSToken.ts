import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { configurationManager } from '../utils/configurationManager'

export default buildModule('DSToken', (m) => {
  const tokenLib = m.library('TokenLibrary');

  const token = m.contract('DSToken', [configurationManager.name, configurationManager.symbol, configurationManager.decimals], {
    libraries: {
      TokenLibrary: tokenLib,
    }
  });

  return { token }
});
