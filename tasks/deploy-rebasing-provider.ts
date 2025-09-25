import { subtask, types } from "hardhat/config";
import { printContractAddresses } from './utils/task.helper';

subtask("deploy-rebasing-provider", "Deploy the SecuritizeRebasingProvider as a proxy")
  .addOptionalParam("multiplier", "Rebasing multiplier", "1000000000000000000") // 1e18
  .addOptionalParam("decimals", "Token decimals", 2, types.int) // default decimals
  .setAction(async ({ multiplier, decimals }, hre) => {
    await hre.run("compile");

    const SecuritizeRebasingProvider = await hre.ethers.getContractFactory("SecuritizeRebasingProvider");

    const proxy = await hre.upgrades.deployProxy(
      SecuritizeRebasingProvider,
      [multiplier, decimals],
      { initializer: "initialize" }
    );

    await proxy.waitForDeployment();

    await printContractAddresses('Rebasing provider', proxy, hre);

    return proxy;
  });

