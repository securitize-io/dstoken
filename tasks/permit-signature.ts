import { task } from "hardhat/config";
import { ethers } from "ethers";

task("permit-signature")
  .addParam("privateKey", "The private key to sign")
  .addParam("owner", "The owner address")
  .addParam("spender", "The spender address")
  .addParam("value", "The value to permit")
  .addParam("tokenAddress", "The token address")
  .addParam("chainId", "The chain ID")
  .setAction(async (taskArgs, { ethers }) => {
    const wallet = new ethers.Wallet(taskArgs.privateKey, ethers.provider);

    const contract = await ethers.getContractAt(
      "DSToken",
      taskArgs.tokenAddress
    );

    const tokenName = await contract.name();
    taskArgs.tokenName = tokenName;
    console.log(`Token name: ${tokenName}`);

    // const nonceCo = await contract.nonces(taskArgs.owner);
    const nonceCo = await contract.nonces(taskArgs.owner);

    console.log(`Current nonce: ${nonceCo.toString()}`);

    const domain: ethers.TypedDataDomain = {
      version: "1",
      name: taskArgs.tokenName,
      verifyingContract: taskArgs.tokenAddress,
      chainId: taskArgs.chainId,
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

    // const deadline = Math.floor(Date.now() / 1000) + 3600;
    const deadline = 2765612062;
    console.log(`Using deadline: ${deadline}`);

    const message = {
      owner: taskArgs.owner,
      spender: taskArgs.spender,
      value: taskArgs.value,
      nonce: nonceCo.toString(),
      deadline,
    };

    const signature = await wallet.signTypedData(domain, types, message);
    const { v, r, s } = ethers.Signature.from(signature);
    console.log({ v, r, s });

    return { v, r, s };
  });
