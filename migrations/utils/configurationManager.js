const argv = require('minimist')(process.argv.slice(2));

class ConfigurationManager {
  setConfiguration() {
    const decimals = parseInt(argv.decimals);

    if (
      argv.help ||
      !argv.name ||
      !argv.symbol ||
      isNaN(decimals) ||
      !argv.owners
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
      console.log('   --help - outputs this help');
      console.log('\n');
      process.exit();
    }

    this.decimals = decimals;
    this.name = argv.name;
    this.symbol = argv.symbol;
    // Get multisig wallet owners as an array
    this.owners = argv.owners.split(' ');
    this.requiredConfirmations = argv.required_confirmations || 2;
    this.complianceManagerType = argv.compliance || 'NORMAL';
    this.lockManagerType = argv.lock_manager || 'INVESTOR';
    this.noRegistry = argv.no_registry;

    return true;
  }

  getAbstractComplianceServiceContract(artifacts) {
    switch (this.complianceManagerType) {
      case 'NOT_REGULATED':
        return artifacts.require('ESComplianceServiceNotRegulatedVersioned');
      case 'WHITELIST':
        return artifacts.require('ESComplianceServiceWhitelistedVersioned');
      case 'NORMAL':
        return artifacts.require('ESComplianceServiceRegulatedVersioned');
      default:
        break;
    }
  }

  getAbstractLockManagerContract(artifacts) {
    switch (this.lockManagerType) {
      case 'WALLET':
        return artifacts.require('ESLockManagerVersioned');
      case 'INVESTOR':
        return artifacts.require('ESInvestorLockManagerVersioned');
    }
  }

  isTestMode() {
    return process.env.TEST_MODE === 'TRUE';
  }
}
module.exports = new ConfigurationManager();
