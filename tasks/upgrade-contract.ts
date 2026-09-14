import { task, types } from 'hardhat/config';

/**
 * Upgrades a UUPS proxy to a freshly compiled implementation.
 *
 * External libraries the implementation links against are redeployed by default,
 * since a new implementation needs its own linked copies. When a library is known
 * to be unchanged, pass its address through `--library-addresses` to reuse the one
 * already deployed and save the deployment gas.
 *
 * Examples:
 *   npx hardhat upgrade-contract --network amoy \
 *     --proxy 0x... --contract DSToken --libraries TokenLibrary --dry-run
 *
 *   npx hardhat upgrade-contract --network amoy \
 *     --proxy 0x... --contract ComplianceServiceRegulated \
 *     --library-addresses ComplianceServiceLibrary=0x... --gas-price 30
 */
task('upgrade-contract', 'Upgrade a UUPS proxy to a newly deployed implementation')
  .addParam('proxy', 'Address of the proxy to upgrade', undefined, types.string)
  .addParam('contract', 'Name of the new implementation contract', undefined, types.string)
  .addOptionalParam('libraries', 'Comma separated external libraries to deploy and link', '', types.string)
  .addOptionalParam(
    'libraryAddresses',
    'Comma separated `Name=0xAddress` pairs of already deployed libraries to link instead of deploying new ones',
    '',
    types.string,
  )
  .addOptionalParam('gasPrice', 'Gas price in gwei to use for every transaction', '', types.string)
  .addFlag('dryRun', 'Only run the upgrade safety checks, without sending any transaction')
  .setAction(async (args, hre) => {
    const { proxy, contract, dryRun } = args;

    const currentImplementation = await hre.upgrades.erc1967.getImplementationAddress(proxy);
    console.log(`Proxy:                  ${proxy}`);
    console.log(`Current implementation: ${currentImplementation}`);
    console.log(`New implementation:     ${contract}`);

    const txOverrides = args.gasPrice
      ? { gasPrice: hre.ethers.parseUnits(String(args.gasPrice), 'gwei') }
      : {};

    const libraryNames: string[] = String(args.libraries)
      .split(',')
      .map((name: string) => name.trim())
      .filter((name: string) => name.length > 0);

    const libraries: Record<string, string> = {};
    for (const pair of String(args.libraryAddresses).split(',').map((p: string) => p.trim()).filter(Boolean)) {
      const [libraryName, libraryAddress] = pair.split('=').map((p: string) => p.trim());
      if (!libraryName || !hre.ethers.isAddress(libraryAddress)) {
        throw new Error(`Invalid library address pair: ${pair}, expected Name=0xAddress`);
      }
      libraries[libraryName] = hre.ethers.getAddress(libraryAddress);
      console.log(`Reusing library ${libraryName} at ${libraries[libraryName]}`);
    }

    for (const libraryName of libraryNames) {
      // A dry run never deploys anything, so a placeholder address is enough to
      // build the factory and run the storage layout checks.
      if (dryRun) {
        libraries[libraryName] = hre.ethers.ZeroAddress.replace(/0$/, '1');
        continue;
      }

      const libraryFactory = await hre.ethers.getContractFactory(libraryName);
      const library = await libraryFactory.deploy(txOverrides);
      await library.waitForDeployment();
      libraries[libraryName] = await library.getAddress();
      console.log(`Deployed library ${libraryName} at ${libraries[libraryName]}`);
    }

    const factory = await hre.ethers.getContractFactory(contract, { libraries });
    const options = {
      kind: 'uups' as const,
      unsafeAllow: ['external-library-linking' as const],
      txOverrides,
    };

    await hre.upgrades.validateUpgrade(proxy, factory, options);
    console.log('Upgrade safety checks passed');

    if (dryRun) {
      console.log('Dry run requested, no transaction was sent');
      return currentImplementation;
    }

    const upgraded = await hre.upgrades.upgradeProxy(proxy, factory, options);
    await upgraded.waitForDeployment();

    const newImplementation = await hre.upgrades.erc1967.getImplementationAddress(proxy);
    console.log(`New implementation:     ${newImplementation}`);

    return newImplementation;
  });
