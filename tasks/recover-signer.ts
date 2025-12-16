import { task } from "hardhat/config";
import { ethers } from "ethers";

task("recover-signer")
  .addParam("v", "The v component of the signature")
  .addParam("r", "The r component of the signature")
  .addParam("s", "The s component of the signature")
  .addParam("owner", "The owner address")
  .addParam("spender", "The spender address")
  .addParam("value", "The value to permit")
  .addParam("nonce", "The nonce")
  .addParam("deadline", "The deadline")
  .addParam("tokenName", "The token name")
  .addParam("tokenAddress", "The token address")
  .setAction(async (taskArgs, { ethers: hardhatEthers }) => {
    const domain = {
      version: "1",
      name: taskArgs.tokenName,
      verifyingContract: taskArgs.tokenAddress,
      chainId: (await hardhatEthers.provider.getNetwork()).chainId,
    };

    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const message = {
      owner: taskArgs.owner,
      spender: taskArgs.spender,
      value: taskArgs.value,
      nonce: taskArgs.nonce,
      deadline: taskArgs.deadline,
    };

    const sigBytes = ethers.concat([
      taskArgs.r,
      taskArgs.s,
      ethers.toBeHex(parseInt(taskArgs.v), 1),
    ]);
    const signer = ethers.verifyTypedData(domain, types, message, sigBytes);
    console.log(signer);
  });
