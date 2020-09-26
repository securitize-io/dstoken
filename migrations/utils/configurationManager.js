const argv = require('minimist')(process.argv.slice(2));

const MAINNET_CHAIN_ID = 1;

class ConfigurationManager {
  constructor () {
    this.proxiesAddresses = {};
  }

  setConfiguration () {
    const decimals = parseInt(argv.decimals);
    console.log(argv);

    if (
      argv.help ||
      !argv.name ||
      !argv.symbol ||
      isNaN(decimals) ||
      !argv.owners ||
      (!argv.no_registry &&
        !argv.no_omnibus_wallet &&
        (!argv.omnibus_wallet_investor_id || !argv.omnibus_wallet))
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
      console.log(
        '   --multisig_wallet_type - multisig wallet type (ON-CHAIN,OFF-CHAIN) - if omitted, OFF-CHAIN is selected'
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
      console.log('   --help - outputs this help');
      console.log('\n');
      process.exit();
    }

    this.decimals = decimals;
    this.name = argv.name;
    this.symbol = argv.symbol;
    this.owners = argv.owners;
    // Get multisig wallet owners as an array
    this.owners = this.owners.split(' ');
    this.requiredConfirmations = argv.required_confirmations || 2;
    this.chainId = argv.chain_id || MAINNET_CHAIN_ID;
    this.multisigWalletType = argv.multisig_wallet_type || 'OFF-CHAIN';
    this.complianceManagerType = argv.compliance || 'NORMAL';
    this.lockManagerType = argv.lock_manager || 'INVESTOR';
    this.noRegistry = argv.no_registry;
    this.partitioned = argv.partitioned;
    if (this.partitioned) {
      this.complianceManagerType = 'PARTITIONED';
      this.lockManagerType = 'PARTITIONED';
    }

    if (this.noRegistry) {
      this.noOmnibusWallet = true;
    } else {
      this.noOmnibusWallet = argv.no_omnibus_wallet;
      this.omnibusWalletInvestorId = argv.omnibus_wallet_investor_id;
      this.omnibusWallet = `0x${argv.omnibus_wallet}`;
    }

    return true;
  }

  getAbstractComplianceServiceContract (artifacts) {
    switch (this.complianceManagerType) {
    case 'NOT_REGULATED':
      return artifacts.require('ComplianceServiceNotRegulated');
    case 'WHITELIST':
      return artifacts.require('ComplianceServiceWhitelisted');
    case 'NORMAL':
      return artifacts.require('ComplianceServiceRegulated');
    case 'PARTITIONED':
      return artifacts.require('ComplianceServiceRegulatedPartitioned');
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

  getAbstractTokenContract (artifacts) {
    if (this.partitioned) {
      return artifacts.require('DSTokenPartitioned');
    }
    return artifacts.require('DSToken');
  }

  setProxyAddressForContractName (contractName, address) {
    this.proxiesAddresses[contractName] = address;
  }

  getProxyAddressForContractName (contractName) {
    return this.proxiesAddresses[contractName];
  }

  isTestMode () {
    return process.env.TEST_MODE === 'TRUE';
  }

  isPartitioned () {
    return this.partitioned != undefined;
  }
}

module.exports = new ConfigurationManager();
