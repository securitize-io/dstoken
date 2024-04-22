import minimist from 'minimist'
const argv = minimist(process.argv.slice(2), {
  string: ['name', 'omnibus_wallet', 'redemption_wallet','proxyDeploymentUtils'],
  boolean: ['partitioned'],
});

const MAINNET_CHAIN_ID = 1;

class ConfigurationManager {
  public readonly proxiesAddresses: {};
  public decimals: number;
  public name: string;
  public symbol: string;
  public owners: string[];
  public requiredConfirmations: number;
  public chainId: string;
  public complianceManagerType: string;
  public lockManagerType: string;
  public partitioned: boolean;
  public omnibusWallet: string;
  public redemptionWallet: string;

  setConfiguration () {
    const decimals = parseInt(argv.decimals);

    if (
      argv.help ||
      !argv.name ||
      !argv.symbol ||
      isNaN(decimals) ||
      !argv.owners ||
      (!argv.no_registry &&
        !argv.no_omnibus_wallet &&
        (/*! argv.omnibus_wallet_investor_id || */ !argv.omnibus_wallet))
    ) {
      console.log('Token Deployer');
      console.log(
        'Usage: truffle migrate [OPTIONS] --name <token name>' +
          ' --symbol <token symbol> --decimals <token decimals>'
      );
      console.log('   --reset - re-deploys the contracts');
      console.log('   --no_registry - skip registry service');
      console.log(
        '   --compliance TYPE - compliance service type (NOT_REGULATED,WHITELIST,NORMAL) - if omitted, NORMAL is selected'
      );
      console.log(
        '   --lock_manager TYPE - lock manager type (WALLET,INVESTOR) - if omitted, INVESTOR is selected'
      );
      console.log(
        '   --owners - a space seperated string of owner addresses that own the multisig wallet'
      );
      console.log(
        '   --required_confirmations - the number of required confirmations to execute a multisig wallet transaction'
      );
      console.log(
        '   --chain_id - the chainId of the network where the multisig wallet will be deployed'
      );
      console.log('   --no_omnibus_wallet - skip omnibus wallet');
      console.log(
        '   --omnibus_wallet_investor_id - the investor id of the omnibus wallet in the registry'
      );
      console.log(
        '   --omnibus_wallet - the address of the omnibus wallet in the registry'
      );
      console.log(
        '   --partitioned - add partitions support'
      );
      console.log(
        '   --redemption_wallet - the address of the redemption wallet'
      );
      console.log('   --help - outputs this help');
      console.log('\n');
      process.exit();
    }

    this.decimals = decimals;
    this.name = argv.name;
    this.symbol = argv.symbol;
    this.owners = argv.owners.split(' ');
    this.requiredConfirmations = argv.required_confirmations || 2;
    this.chainId = argv.chain_id || MAINNET_CHAIN_ID;
    this.complianceManagerType = argv.compliance || 'NORMAL';
    this.lockManagerType = argv.lock_manager || 'INVESTOR';
    this.partitioned = argv.partitioned;
    if (this.partitioned) {
      this.complianceManagerType = 'PARTITIONED';
      this.lockManagerType = 'PARTITIONED';
    }
    this.omnibusWallet = argv.omnibus_wallet;
    this.redemptionWallet = argv.redemption_wallet;

    return true;
  }

  getAbstractComplianceServiceContract () {
    switch (this.complianceManagerType) {
    case 'NOT_REGULATED':
      return 'ComplianceServiceNotRegulated';
    case 'WHITELIST':
      return 'ComplianceServiceWhitelisted';
    case 'NORMAL':
      return 'ComplianceServiceRegulated';
    case 'PARTITIONED':
      return 'ComplianceServiceRegulatedPartitioned';
    default:
      break;
    }
  }
  getOmnibusTbeControllerContractName () {
    switch (this.complianceManagerType) {
    case 'NOT_REGULATED':
      return 'OmnibusTBEControllerWhitelisted';
    case 'WHITELIST':
      return 'OmnibusTBEControllerWhitelisted';
    case 'NORMAL':
      return 'OmnibusTBEController';
    case 'PARTITIONED':
      return 'OmnibusTBEController';
    default:
      break;
    }
  }

  getAbstractOmnibusTbeControllerContract (artifacts) {
    switch (this.complianceManagerType) {
    case 'NOT_REGULATED':
      return artifacts.require('OmnibusTBEControllerWhitelisted');
    case 'WHITELIST':
      return artifacts.require('OmnibusTBEControllerWhitelisted');
    case 'NORMAL':
      return artifacts.require('OmnibusTBEController');
    case 'PARTITIONED':
      return artifacts.require('OmnibusTBEController');
    default:
      break;
    }
  }
  getAbstractLockManagerContract (artifacts) {
    switch (this.lockManagerType) {
    case 'WALLET':
      return artifacts.require('LockManager');
    case 'PARTITIONED':
      return artifacts.require('InvestorLockManagerPartitioned');
    default:
      return artifacts.require('InvestorLockManager');
    }
  }

  getAbstractTokenContract () {
    if (this.partitioned) {
      return 'DSTokenPartitioned';
    }
    return 'DSToken';
  }

  setProxyAddressForContractName (contractName, address) {
    this.proxiesAddresses[contractName] = address;
  }

  isPartitioned () {
    return this.partitioned;
  }
}

export const configurationManager = new ConfigurationManager();
