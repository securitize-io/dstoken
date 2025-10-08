import { task } from "hardhat/config";

task("contract-call")
  .addParam("contractName", "The contract to use")
  .addParam("contractAddress", "The contract address")
  .addParam("method", "The method name")
  .addVariadicPositionalParam("params", "The method params", [])
  .setAction(async (taskArgs, { ethers }) => {
    const router = await ethers.getContractAt(
      taskArgs.contractName,
      taskArgs.contractAddress,
    );
    console.log(await router[taskArgs.method](...taskArgs.params));
  });
