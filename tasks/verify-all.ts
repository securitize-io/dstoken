import { task, types } from 'hardhat/config';


task('verify-all', 'Verify DS Protocol')
  .addParam('token', 'DS Token address', '0x123', types.string)
  .setAction(async (args, { run, ethers }) => {
    const dsToken = await ethers.getContractAt('DSToken', args.token);
    const implementation = await dsToken.getImplementationAddress();

    console.log(`Verifying token implementation ${implementation}`);
    await run("verify:verify", {
      address: implementation,
      constructorArguments: [],
    });

    const trust = await ethers.getContractAt('BaseDSContract', await dsToken.getDSService(1));
    const trustImplementation = await trust.getImplementationAddress();
    console.log(`Verifying trust implementation ${trustImplementation}`);
    await run("verify:verify", {
      address: trustImplementation,
      constructorArguments: [],
    });

    const registry = await ethers.getContractAt('BaseDSContract', await dsToken.getDSService(4));
    const registryImplementation = await registry.getImplementationAddress();
    console.log(`Verifying registry implementation ${registryImplementation}`);
    await run("verify:verify", {
      address: registryImplementation,
      constructorArguments: [],
    });

    const compliance = await ethers.getContractAt('BaseDSContract', await dsToken.getDSService(8));
    const complianceImplementation = await compliance.getImplementationAddress();
    console.log(`Verifying compliance implementation ${complianceImplementation}`);
    await run("verify:verify", {
      address: complianceImplementation,
      constructorArguments: [],
    });

    const walletM = await ethers.getContractAt('BaseDSContract', await dsToken.getDSService(32));
    const walletMImplementation = await walletM.getImplementationAddress();
    console.log(`Verifying walletM implementation ${walletMImplementation}`);
    await run("verify:verify", {
      address: walletMImplementation,
      constructorArguments: [],
    });

    const lock = await ethers.getContractAt('BaseDSContract', await dsToken.getDSService(64));
    const lockImplementation = await lock.getImplementationAddress();
    console.log(`Verifying lock implementation ${lockImplementation}`);
    await run("verify:verify", {
      address: lockImplementation,
      constructorArguments: [],
    });

    const ccs = await ethers.getContractAt('BaseDSContract', await dsToken.getDSService(256));
    const ccsImplementation = await ccs.getImplementationAddress();
    console.log(`Verifying ccs implementation ${ccsImplementation}`);
    await run("verify:verify", {
      address: ccsImplementation,
      constructorArguments: [],
    });

    const tokenIssuer = await ethers.getContractAt('BaseDSContract', await dsToken.getDSService(512));
    const tokenIssuerImplementation = await tokenIssuer.getImplementationAddress();
    console.log(`Verifying tokenIssuer implementation ${tokenIssuerImplementation}`);
    await run("verify:verify", {
      address: tokenIssuerImplementation,
      constructorArguments: [],
    });

    const walletR = await ethers.getContractAt('BaseDSContract', await dsToken.getDSService(1024));
    const walletRImplementation = await walletR.getImplementationAddress();
    console.log(`Verifying walletR implementation ${walletRImplementation}`);
    await run("verify:verify", {
      address: walletRImplementation,
      constructorArguments: [],
    });

    return;
  });
