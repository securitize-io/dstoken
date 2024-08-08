import { IERC20 } from "./../typechain-types/@openzeppelin/contracts/token/ERC20/IERC20";
import { expect } from "chai";
import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployDSTokenRegulated, INVESTORS } from "./utils/fixture";
import { DSConstants } from "../utils/globals";
import { sign } from "./utils/swap-sign-helper";

import hre from "hardhat";

import {
  SecuritizeSwap,
  RegistryService,
  TokenERC20,
  SecuritizeInternalNavProviderMock,
  DSToken,
  TrustService,
} from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import exp from "node:constants";
import { erc20 } from "../typechain-types/@openzeppelin/contracts/token";

const BLOCKCHAIN_ID_INVESTOR_01 = "investor_01";
const BLOCKCHAIN_ID_INVESTOR_02 = "investor_02";

const INVESTOR_COUNTRY = "US";

const USDC_TO_SWAP = 100;
const DSTOKEN_TO_SWAP = 50;

const AMOUNT_TO_BUY = BigInt(5000 * 10 ** 18);
const HASH =
  "0x2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b";

const hsmAddress = "0x2bD6C3D0d30AE1caa98404573FD76E8879de0EB7";
const hsmPrivateKey =
  "798269ec3fa0a85d8b14a704fe4abf2bf6461573a47af005a407aa1e54b809ce";

const GAS_LIMIT = 200000000;
const VALUE = 0;

const PERIOD = 31577600; // one year in seconds
const USDC_INITIAL_TOTAL_SUPPLY = "100000000000000000000000000000";
const USDC_SYMBOL = "USDC";

const KYC = 1;
const ACCREDITED = 2;
const QUALIFIED = 4;

describe("Securitize Swap test", () => {
  describe("Deploy", () => {
    it("SHOULD swap contract be initialized and initialized version to be 1", async () => {
      const { swap } = await loadFixture(deployDSTokenRegulated);
      expect(swap.target).to.not.be.undefined;
      expect(await swap.getInitializedVersion()).to.be.equal(1);
    });
    it("SHOULD usdc total supply be initialized", async () => {
      const { usdcMock } = await loadFixture(deployDSTokenRegulated);
      expect((await usdcMock.totalSupply()).toString()).to.be.equal(
        USDC_INITIAL_TOTAL_SUPPLY
      );
    });
    it("SHOULD owner be set", async () => {
      const { swap } = await loadFixture(deployDSTokenRegulated);
      const [owner] = await hre.ethers.getSigners();
      expect(await swap.owner()).to.be.equal(owner.address);
    });
  });
  describe("Buy", () => {
    const ratesToMap = [1];
    ratesToMap.forEach((rateToTest) => {
      describe(`Buy method with DSToken with Nav Rate ${rateToTest}`, () => {
        describe("[Buy Method] Interaction with Securitize Swap", () => {
          describe("[Buy Method] RegistryService integration", () => {
            it("SHOULD fail when investor is not in RegistryService", async () => {
              const { swap, navProviderMock, usdcMock } = await loadFixture(
                deployDSTokenRegulated
              );
              await navProviderMock.setRate(
                BigInt(rateToTest * 10 ** Number(await usdcMock.decimals()))
              );
              const [, noInvestor] = await hre.ethers.getSigners();
              const maxExpectedStableCoin =
                await swap.calculateStableCoinAmount(AMOUNT_TO_BUY);
              await expect(
                swap
                  .connect(noInvestor)
                  .buy(
                    AMOUNT_TO_BUY.toString(),
                    maxExpectedStableCoin,
                    await time.latestBlock()
                  )
              ).to.be.revertedWith("Investor not registered");
            });
          });
          describe("[Buy Method] Security Swap pausing features", () => {
            it("SHOULD fail - Contract Paused", async () => {
              const { swap, navProviderMock, usdcMock } = await loadFixture(
                deployDSTokenRegulated
              );
              await navProviderMock.setRate(
                BigInt(rateToTest * 10 ** Number(await usdcMock.decimals()))
              );
              await swap.pause();
              const maxExpectedStableCoin =
                await swap.calculateStableCoinAmount(AMOUNT_TO_BUY);
              await expect(
                swap.buy(
                  AMOUNT_TO_BUY.toString(),
                  maxExpectedStableCoin,
                  await time.latestBlock()
                )
              ).to.be.revertedWithCustomError(swap, "EnforcedPause");
            });
          });
          describe("[Buy Method] Security Buy", async () => {
            let swap: SecuritizeSwap,
              usdcMock: TokenERC20,
              dsToken: DSToken,
              registryService: RegistryService,
              navProviderMock: SecuritizeInternalNavProviderMock;
            let owner: HardhatEthersSigner,
              wallet: HardhatEthersSigner,
              investor1: HardhatEthersSigner,
              investor2: HardhatEthersSigner;
            let maxExpectedStableCoin: bigint;
            beforeEach(async () => {
              ({ swap, usdcMock, dsToken, registryService, navProviderMock } =
                await loadFixture(deployDSTokenRegulated));
              [owner, wallet, investor1, investor2] =
                await hre.ethers.getSigners();
              await navProviderMock.setRate(
                BigInt(rateToTest * 10 ** Number(await usdcMock.decimals()))
              );
              maxExpectedStableCoin = await swap.calculateStableCoinAmount(
                AMOUNT_TO_BUY
              );
              await usdcMock.transfer(investor1.address, AMOUNT_TO_BUY);
              await usdcMock.transfer(investor2.address, AMOUNT_TO_BUY);
              await registryService.registerInvestor(
                INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
                INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1
              );
              await registryService.registerInvestor(
                INVESTORS.INVESTOR_ID.INVESTOR_ID_2,
                INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_2
              );
              await registryService.addWallet(
                investor1.address,
                INVESTORS.INVESTOR_ID.INVESTOR_ID_1
              );
              await registryService.addWallet(
                investor2.address,
                INVESTORS.INVESTOR_ID.INVESTOR_ID_2
              );
            });
            it("SHOULD fail when DSToken amount is 0", async () => {
              await expect(
                swap
                  .connect(investor1)
                  .buy(0, maxExpectedStableCoin, await time.latestBlock())
              ).to.revertedWith("DSToken amount must be greater than 0");
            });
            it("SHOULD fail when trying to buy and NAV rate is 0", async () => {
              await navProviderMock.setRate(0);
              await expect(
                swap
                  .connect(investor1)
                  .buy(
                    AMOUNT_TO_BUY.toString(),
                    maxExpectedStableCoin,
                    await time.latestBlock()
                  )
              ).to.revertedWith("NAV Rate must be greater than 0");
            });
            it("SHOULD fail when investor has not enough stable coin balance", async () => {
              await usdcMock
                .connect(investor1)
                .approve(swap.target, AMOUNT_TO_BUY);
              await expect(
                swap
                  .connect(investor1)
                  .buy(
                    AMOUNT_TO_BUY,
                    maxExpectedStableCoin,
                    await time.latestBlock()
                  )
              ).to.revertedWith("Not enough stable coin balance");
            });
            it("SHOULD fail when investor tries to buy DSToken and conversion is bigger tha expected", async () => {
              await usdcMock
                .connect(investor1)
                .approve(swap.target, maxExpectedStableCoin);
              await expect(
                swap
                  .connect(investor1)
                  .buy(
                    AMOUNT_TO_BUY * 200n,
                    maxExpectedStableCoin,
                    await time.latestBlock()
                  )
              ).to.revertedWith(
                "The amount of stable coins is bigger than max expected"
              );
            });
            it("SHOULD process the buy", async () => {
              await usdcMock.transfer(investor1.address, maxExpectedStableCoin);
              await usdcMock
                .connect(investor1)
                .approve(swap.target, maxExpectedStableCoin);
              const securitizeUSDCBalance = await usdcMock.balanceOf(
                wallet.address
              );
              await swap
                .connect(investor1)
                .buy(
                  AMOUNT_TO_BUY,
                  maxExpectedStableCoin,
                  await time.latestBlock()
                );
              expect(await usdcMock.balanceOf(wallet.address)).to.be.equal(
                securitizeUSDCBalance + maxExpectedStableCoin
              );
              expect(await dsToken.balanceOf(investor1.address)).to.be.equal(
                AMOUNT_TO_BUY
              );
            });
            it(
              "SHOULD fail when NAV rate increases and stable coin amount is bigger than expected" +
                "with very high allowance",
              async () => {
                await usdcMock
                  .connect(investor1)
                  .approve(swap.target, 99999999999999);
                await navProviderMock.setRate(
                  BigInt(
                    2 * rateToTest * 10 ** Number(await usdcMock.decimals())
                  )
                );
                await expect(
                  swap
                    .connect(investor1)
                    .buy(
                      AMOUNT_TO_BUY,
                      maxExpectedStableCoin,
                      await time.latestBlock()
                    )
                ).to.revertedWith(
                  "The amount of stable coins is bigger than max expected"
                );
              }
            );
            it(
              "SHOULD fail when NAV rate increases and stable coin amount is bigger than expected with" +
                "very low allowance",
              async () => {
                await usdcMock.connect(investor1).approve(swap.target, 1);
                await navProviderMock.setRate(
                  BigInt(
                    2 * rateToTest * 10 ** Number(await usdcMock.decimals())
                  )
                );
                await expect(
                  swap
                    .connect(investor1)
                    .buy(
                      AMOUNT_TO_BUY,
                      maxExpectedStableCoin,
                      await time.latestBlock()
                    )
                ).to.revertedWith(
                  "The amount of stable coins is bigger than max expected"
                );
              }
            );
            it("SHOULD fail when NAV rate increases and stable coin amount is bigger than expected", async () => {
              await navProviderMock.setRate(
                BigInt(2 * rateToTest * 10 ** Number(await usdcMock.decimals()))
              );
              await expect(
                swap
                  .connect(investor1)
                  .buy(
                    AMOUNT_TO_BUY,
                    maxExpectedStableCoin,
                    await time.latestBlock()
                  )
              ).to.revertedWith(
                "The amount of stable coins is bigger than max expected"
              );
            });
            it("SHOULD process the buy when NAV rate decreases", async () => {
              await usdcMock.transfer(investor1.address, maxExpectedStableCoin);
              await usdcMock
                .connect(investor1)
                .approve(swap.target, maxExpectedStableCoin);
              const balanceUsdcBefore = await usdcMock.balanceOf(
                investor1.address
              );
              const allowanceBefore = await usdcMock.allowance(
                investor1.address,
                swap.target
              );
              const newRate = BigInt(
                0.5 * rateToTest * 10 ** Number(await usdcMock.decimals())
              );
              await navProviderMock.setRate(newRate);
              const stableCoinBalanceAfterDecrease =
                await swap.calculateStableCoinAmount(AMOUNT_TO_BUY);
              expect(stableCoinBalanceAfterDecrease).to.be.lessThan(
                maxExpectedStableCoin
              );
              await swap
                .connect(investor1)
                .buy(AMOUNT_TO_BUY, maxExpectedStableCoin, await time.latest());
              const balanceSecuritize = await usdcMock.balanceOf(
                wallet.address
              );
              expect(balanceSecuritize).to.be.equal(
                stableCoinBalanceAfterDecrease
              );

              const balanceUsdc = await usdcMock.balanceOf(investor1.address);
              expect(balanceUsdc).to.be.equal(
                balanceUsdcBefore - stableCoinBalanceAfterDecrease
              );

              const allowanceAfter = await usdcMock.allowance(
                investor1.address,
                swap.target
              );
              expect(allowanceAfter).to.be.equal(
                allowanceBefore - stableCoinBalanceAfterDecrease
              );

              const balanceDSToken = await dsToken.balanceOf(investor1.address);
              expect(balanceDSToken).to.be.equal(AMOUNT_TO_BUY);
            });
          });
        });
      });
    });
  });
  describe("Swap", () => {
    let swap: SecuritizeSwap;
    let usdcMock: TokenERC20;
    let dsToken: DSToken;
    let registryService: RegistryService;
    let trustService: TrustService;
    let navProviderMock: SecuritizeInternalNavProviderMock;
    let wallet: HardhatEthersSigner;
    let investor01: HardhatEthersSigner;
    let investor02: HardhatEthersSigner;
    let fakeAddress: HardhatEthersSigner;
    let functionData: string;
    let data: unknown[];
    let nonce: bigint;
    let signature: { v: any; r: any; s: any };
    let swapAddress: string;
    let chainId: number;
    beforeEach(async () => {
      ({
        swap,
        usdcMock,
        dsToken,
        registryService,
        navProviderMock,
        trustService,
      } = await loadFixture(deployDSTokenRegulated));
      [, wallet, investor01, investor02, fakeAddress] = await hre.ethers.getSigners();
      await usdcMock.transfer(investor01.address, AMOUNT_TO_BUY);
      await usdcMock.transfer(investor02.address, AMOUNT_TO_BUY);
      await registryService.registerInvestor(
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1
      );
      await registryService.registerInvestor(
        INVESTORS.INVESTOR_ID.INVESTOR_ID_2,
        INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_2
      );
      await registryService.addWallet(
        investor01.address,
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1
      );
      await registryService.addWallet(
        investor02.address,
        INVESTORS.INVESTOR_ID.INVESTOR_ID_2
      );

      nonce = await swap.nonceByInvestor(BLOCKCHAIN_ID_INVESTOR_01);
      const blockNumber = await hre.ethers.provider.getBlockNumber();

      data = [
        BLOCKCHAIN_ID_INVESTOR_01,
        fakeAddress.address,
        INVESTOR_COUNTRY,
        [KYC, ACCREDITED, QUALIFIED],
        [1, 1, 1],
        [0, 0, 0],
        DSTOKEN_TO_SWAP,
        USDC_TO_SWAP,
        blockNumber + 100,
        await time.latest(),
        HASH,
      ];
      functionData = swap.interface.encodeFunctionData("swap", data);
      swapAddress = await swap.getAddress();
      chainId = Number((await hre.ethers.provider.getNetwork()).chainId);
      signature = await sign(
        swapAddress,
        Number(nonce),
        swapAddress,
        BLOCKCHAIN_ID_INVESTOR_01,
        functionData,
        investor01.address,
        chainId,
        hsmPrivateKey,
        GAS_LIMIT,
        VALUE
      );
    });
    describe("Security Swap failure no permissions", () => {
      it("Security Swap failure no permissions", async () => {
        await expect(
          swap.executePreApprovedTransaction(
            signature.v,
            signature.r,
            signature.s,
            BLOCKCHAIN_ID_INVESTOR_01,
            swapAddress,
            fakeAddress.address,
            functionData,
            [VALUE, GAS_LIMIT]
          )
        ).to.be.revertedWith("Insufficient trust level");
      });
      it("SHOULD fail - Swap contract without issuer role", async () => {
        await expect(
          swap.executePreApprovedTransaction(
            signature.v,
            signature.r,
            signature.s,
            BLOCKCHAIN_ID_INVESTOR_01,
            swapAddress,
            fakeAddress.address,
            functionData,
            [VALUE, GAS_LIMIT]
          )
        ).to.be.revertedWith("Insufficient trust level");
      });
      it("SHOULD fail - Invalid signature", async () => {
        await expect(
          swap.executePreApprovedTransaction(
            "100",
            signature.r,
            signature.s,
            BLOCKCHAIN_ID_INVESTOR_01,
            swapAddress,
            fakeAddress.address,
            functionData,
            [VALUE, GAS_LIMIT]
          )
        ).to.be.revertedWith("Invalid signature");
      });
    });
    describe("Security Swap contract paused", () => {
      it("SHOULD fail - Contract Paused", async () => {
        await swap.pause();
        await expect(
          swap.executePreApprovedTransaction(
            signature.v,
            signature.r,
            signature.s,
            BLOCKCHAIN_ID_INVESTOR_01,
            swapAddress,
            fakeAddress.address,
            functionData,
            [VALUE, GAS_LIMIT]
          )
        ).to.be.revertedWithCustomError(swap, "EnforcedPause");
      });
    });
    describe("Security Swap failure data corruption", () => {
      it("SHOULD fail - PurchaseAmount has been changed", async () => {
        const blockNumber = await hre.ethers.provider.getBlockNumber();
        data = [
          BLOCKCHAIN_ID_INVESTOR_01,
          fakeAddress.address,
          INVESTOR_COUNTRY,
          [],
          [],
          [],
          DSTOKEN_TO_SWAP,
          USDC_TO_SWAP + USDC_TO_SWAP, // data changed
          blockNumber + 100,
          await time.latest(),
          HASH,
        ];
        functionData = swap.interface.encodeFunctionData("swap", data);

        const dataChanged = [
          BLOCKCHAIN_ID_INVESTOR_01,
          fakeAddress.address,
          INVESTOR_COUNTRY,
          [],
          [],
          [],
          DSTOKEN_TO_SWAP,
          USDC_TO_SWAP, // data changed
          blockNumber + 100,
          await time.latest(),
          HASH,
        ];
        const functionDataChanged = swap.interface.encodeFunctionData(
          "swap",
          dataChanged
        );
        const nonce = await swap.nonceByInvestor(BLOCKCHAIN_ID_INVESTOR_01);
        const signature = await sign(
          swapAddress,
          Number(nonce),
          swapAddress,
          BLOCKCHAIN_ID_INVESTOR_01,
          functionDataChanged,
          fakeAddress.address,
          chainId,
          hsmPrivateKey,
          GAS_LIMIT,
          VALUE
        );
        await expect(
          swap.executePreApprovedTransaction(
            signature.v,
            signature.r,
            signature.s,
            BLOCKCHAIN_ID_INVESTOR_01,
            swapAddress,
            fakeAddress.address,
            functionData,
            [VALUE, GAS_LIMIT]
          )
        ).to.be.revertedWith("Insufficient trust level");
      });
    });
    describe("Security Swap executeByInvestor interaction", () => {
      it("SHOULD swap contract has issuer role", async () => {
        const role = await trustService.getRole(swapAddress);
        expect(role).to.be.equal(DSConstants.roles.ISSUER);
      });
      it("SHOULD fail - Incorrect params length", async () => {
        await expect(
          swap.executePreApprovedTransaction(
            signature.v,
            signature.r,
            signature.s,
            BLOCKCHAIN_ID_INVESTOR_01,
            swapAddress,
            fakeAddress.address,
            functionData,
            [VALUE]
          )
        ).to.be.revertedWith("Incorrect params length");
      });
      it("SHOULD fail - Transaction too old", async () => {
        const blockNumber = await hre.ethers.provider.getBlockNumber();
        await trustService.setRole(hsmAddress, DSConstants.roles.ISSUER);
        data = [
          BLOCKCHAIN_ID_INVESTOR_01,
          fakeAddress.address,
          INVESTOR_COUNTRY,
          [KYC, ACCREDITED, QUALIFIED],
          [1, 1, 1],
          [0, 0, 0],
          DSTOKEN_TO_SWAP,
          USDC_TO_SWAP,
          blockNumber - 100, // transaction too old
          await time.latest(),
          HASH,
        ];
        functionData = swap.interface.encodeFunctionData("swap", data);
        const nonce = await swap.nonceByInvestor(BLOCKCHAIN_ID_INVESTOR_01);
        const signature = await sign(
          swapAddress,
          Number(nonce),
          swapAddress,
          BLOCKCHAIN_ID_INVESTOR_01,
          functionData,
          fakeAddress.address,
          chainId,
          hsmPrivateKey,
          GAS_LIMIT,
          VALUE
        );
        await expect(
          swap
            .connect(investor01)
            .executePreApprovedTransaction(
              signature.v,
              signature.r,
              signature.s,
              BLOCKCHAIN_ID_INVESTOR_01,
              swapAddress,
              fakeAddress.address,
              functionData,
              [VALUE, GAS_LIMIT]
            )
        ).to.be.revertedWith("Transaction too old");
      });
      it("SHOULD fail - Investor insufficient balance", async () => {
        await trustService.setRole(hsmAddress, DSConstants.roles.ISSUER);
        const blockNumber = await hre.ethers.provider.getBlockNumber();
        data = [
          BLOCKCHAIN_ID_INVESTOR_01,
          fakeAddress.address,
          INVESTOR_COUNTRY,
          [],
          [],
          [],
          DSTOKEN_TO_SWAP,
          USDC_TO_SWAP,
          blockNumber + 100,
          await time.latest(),
          HASH,
        ];
        functionData = swap.interface.encodeFunctionData("swap", data);
        const nonce = await swap.nonceByInvestor(BLOCKCHAIN_ID_INVESTOR_01);
        const signature = await sign(
          swapAddress,
          Number(nonce),
          swapAddress,
          BLOCKCHAIN_ID_INVESTOR_01,
          functionData,
          fakeAddress.address,
          chainId,
          hsmPrivateKey,
          GAS_LIMIT,
          VALUE
        );

        await expect(
          swap
            .connect(investor01)
            .executePreApprovedTransaction(
              signature.v,
              signature.r,
              signature.s,
              BLOCKCHAIN_ID_INVESTOR_01,
              swapAddress,
              fakeAddress.address,
              functionData,
              [VALUE, GAS_LIMIT]
            )
        ).to.revertedWith("Not enough stable tokens balance");
      });
      it("SHOULD fail - Insufficient allowance", async () => {
        await usdcMock.transfer(fakeAddress.address, USDC_TO_SWAP);
        await trustService.setRole(hsmAddress, DSConstants.roles.ISSUER);
        const blockNumber = await hre.ethers.provider.getBlockNumber();
        data = [
          BLOCKCHAIN_ID_INVESTOR_01,
          fakeAddress.address,
          INVESTOR_COUNTRY,
          [],
          [],
          [],
          DSTOKEN_TO_SWAP,
          USDC_TO_SWAP,
          blockNumber + 100,
          await time.latest(),
          HASH,
        ];
        functionData = swap.interface.encodeFunctionData("swap", data);
        const nonce = await swap.nonceByInvestor(BLOCKCHAIN_ID_INVESTOR_01);
        const signature = await sign(
          swapAddress,
          Number(nonce),
          swapAddress,
          BLOCKCHAIN_ID_INVESTOR_01,
          functionData,
          fakeAddress.address,
          chainId,
          hsmPrivateKey,
          GAS_LIMIT,
          VALUE
        );
        await expect(
          swap
            .connect(investor01)
            .executePreApprovedTransaction(
              signature.v,
              signature.r,
              signature.s,
              BLOCKCHAIN_ID_INVESTOR_01,
              swapAddress,
              fakeAddress.address,
              functionData,
              [VALUE, GAS_LIMIT]
            )
        ).to.revertedWithCustomError(usdcMock, "ERC20InsufficientAllowance");
      });
      it("SHOULD fail - Incorrect investor params", async () => {
        await trustService.setRole(hsmAddress, DSConstants.roles.ISSUER);
        await usdcMock.transfer(fakeAddress.address, USDC_TO_SWAP);
        await usdcMock.connect(fakeAddress).approve(swapAddress, USDC_TO_SWAP);
        const blockNumber = await hre.ethers.provider.getBlockNumber();
        const incorrectParams = [
          BLOCKCHAIN_ID_INVESTOR_01,
          fakeAddress.address,
          INVESTOR_COUNTRY,
          [KYC, ACCREDITED],
          [],
          [],
          DSTOKEN_TO_SWAP,
          USDC_TO_SWAP,
          blockNumber + 100,
          await time.latest(),
          HASH,
        ];
        functionData = swap.interface.encodeFunctionData(
          "swap",
          incorrectParams
        );
        nonce = await swap.nonceByInvestor(BLOCKCHAIN_ID_INVESTOR_01);
        const signature = await sign(
          swapAddress,
          Number(nonce),
          swapAddress,
          BLOCKCHAIN_ID_INVESTOR_01,
          functionData,
          fakeAddress.address,
          chainId,
          hsmPrivateKey,
          GAS_LIMIT,
          VALUE
        );
        await expect(
          swap
            .connect(investor01)
            .executePreApprovedTransaction(
              signature.v,
              signature.r,
              signature.s,
              BLOCKCHAIN_ID_INVESTOR_01,
              swapAddress,
              fakeAddress.address,
              functionData,
              [VALUE, GAS_LIMIT]
            )
        ).to.be.revertedWith("Investor params incorrect length");
      });
      it("SHOULD process the swap transaction with new investor and wallet", async () => {
        await usdcMock.transfer(fakeAddress.address, USDC_TO_SWAP);
        await usdcMock.connect(fakeAddress).approve(swapAddress, USDC_TO_SWAP);
        await trustService.setRole(hsmAddress, DSConstants.roles.ISSUER);
        const blockNumber = await hre.ethers.provider.getBlockNumber();
        data = [
          BLOCKCHAIN_ID_INVESTOR_01,
          fakeAddress.address,
          INVESTOR_COUNTRY,
          [KYC, ACCREDITED, QUALIFIED],
          [1, 1, 1],
          [0, 0, 0],
          DSTOKEN_TO_SWAP,
          USDC_TO_SWAP,
          blockNumber + 100,
          (await time.latest()) + PERIOD,
          HASH,
        ];
        functionData = swap.interface.encodeFunctionData("swap", data);
        const nonce = await swap.nonceByInvestor(BLOCKCHAIN_ID_INVESTOR_01);
        const signature = await sign(
          swapAddress,
          Number(nonce),
          swapAddress,
          BLOCKCHAIN_ID_INVESTOR_01,
          functionData,
          fakeAddress.address,
          chainId,
          hsmPrivateKey,
          GAS_LIMIT,
          VALUE
        );
        await swap
          .connect(investor01)
          .executePreApprovedTransaction(
            signature.v,
            signature.r,
            signature.s,
            BLOCKCHAIN_ID_INVESTOR_01,
            swapAddress,
            fakeAddress.address,
            functionData,
            [VALUE, GAS_LIMIT]
          );
        expect(await registryService.isInvestor(BLOCKCHAIN_ID_INVESTOR_01)).to
          .be.true;
        expect(await registryService.isWallet(fakeAddress.address)).to.be.true;
        expect(await registryService.getCountry(BLOCKCHAIN_ID_INVESTOR_01)).to.be.equal(INVESTOR_COUNTRY);
        expect(await registryService.getAttributeValue(BLOCKCHAIN_ID_INVESTOR_01,KYC)).to.be.equal(1);
        expect(await registryService.getAttributeValue(BLOCKCHAIN_ID_INVESTOR_01,ACCREDITED)).to.be.equal(1);
        expect(await registryService.getAttributeValue(BLOCKCHAIN_ID_INVESTOR_01,QUALIFIED)).to.be.equal(1);
        expect(await usdcMock.balanceOf(wallet)).to.be.equal(USDC_TO_SWAP);
        expect(await usdcMock.balanceOf(fakeAddress.address)).to.be.equal(0);
        expect(await dsToken.balanceOf(fakeAddress)).to.be.equal(DSTOKEN_TO_SWAP);  
      });
    });
  });
});
