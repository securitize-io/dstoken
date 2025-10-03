import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";

import { deployDSTokenRegulated } from "./utils/fixture";

async function deployRebasingLibraryMock() {
  const mock = await ethers.deployContract("RebasingLibraryMock");
  return { mock };
}

describe("Rebasing", function () {
  describe("RebasingLibrary", function () {
    it("should never inflate totals across many conversions 6 decimal", async function () {
      const { mock } = await loadFixture(deployRebasingLibraryMock);
      const multiplier = ethers.parseUnits("1.73222", 18);
      const decimals = 6;

      let totalShares = 0n;
      let totalTokensIn = 0n;

      // Simulate 1000 small deposits
      for (let i = 0n; i < 10000n; i++) {
        const tokens = 1_000_00n + i;
        const shares = await mock.convertTokensToShares(tokens, multiplier, decimals);
        totalTokensIn += tokens;
        totalShares += shares;
      }

      const totalTokensOut = await mock.convertSharesToTokens(totalShares, multiplier, decimals);

      expect(totalTokensOut).to.be.lte(totalTokensIn);
    });

    it("should never inflate totals across many conversions 2 decimal", async function () {
      const { mock } = await loadFixture(deployRebasingLibraryMock);
      const multiplier = ethers.parseUnits("1.73222", 18);
      const decimals = 2;

      let totalShares = 0n;
      let totalTokensIn = 0n;

      // Simulate 1000 small deposits
      for (let i = 0n; i < 10000n; i++) {
        const tokens = 1n + i;
        const shares = await mock.convertTokensToShares(tokens, multiplier, decimals);
        totalTokensIn += tokens;
        totalShares += shares;
      }

      const totalTokensOut = await mock.convertSharesToTokens(totalShares, multiplier, decimals);

      expect(totalTokensOut).to.be.lte(totalTokensIn);
    });

    it("Should never inflate totals across many conversions 18 decimals", async function () {
      const { mock } = await loadFixture(deployRebasingLibraryMock);
      const multiplier = ethers.parseUnits("1.765446", 18);
      const decimals = 18;

      let totalShares = 0n;
      let totalTokensIn = 0n;

      // Simulate 1000 small deposits
      for (let i = 0n; i < 1000n; i++) {
        const tokens = 1_000_000_000_000_000n + i;
        const shares = await mock.convertTokensToShares(tokens, multiplier, decimals);
        totalTokensIn += tokens;
        totalShares += shares;
      }

      const totalTokensOut = await mock.convertSharesToTokens(totalShares, multiplier, decimals);

      expect(totalTokensOut).to.lte(totalTokensIn);
    });

    it("Should lose 1 wei across many (1000) conversions with 18 decimals", async function () {
      const { mock } = await loadFixture(deployRebasingLibraryMock);
      const multiplier = ethers.parseUnits("1.7", 18);
      const decimals = 18;

      let totalShares = 0n;
      let totalTokensIn = 0n;

      // Simulate 1000 small deposits
      for (let i = 0n; i < 1000n; i++) {
        const tokens = 1_000_000_000_000_000n + i;
        const shares = await mock.convertTokensToShares(tokens, multiplier, decimals);
        totalTokensIn += tokens;
        totalShares += shares;
      }

      const totalTokensOut = await mock.convertSharesToTokens(totalShares, multiplier, decimals);
      expect(totalTokensOut).to.equal(totalTokensIn + 1n);
    });  
  });

  describe("SecuritizeRebasingProvider", function () {
    const initialMultiplier = ethers.parseUnits("1", 18);
    const newMultiplier = ethers.parseUnits("1.5", 18);

    const deployFixture = async () => {
      const { rebasingProvider } = await deployDSTokenRegulated();
      return { rebasingProvider };
    };

    it("should initialize with correct multiplier", async function () {
      const { rebasingProvider } = await loadFixture(deployFixture);
      const stored = await rebasingProvider.multiplier();
      expect(stored).to.equal(initialMultiplier);
    });

    it("should update the multiplier and emit event", async function () {
      const { rebasingProvider } = await loadFixture(deployFixture);
      const [owner] = await ethers.getSigners();

      await expect(rebasingProvider.connect(owner).setMultiplier(newMultiplier))
        .to.emit(rebasingProvider, "RebasingRateUpdated")
        .withArgs(initialMultiplier, newMultiplier);

      const updated = await rebasingProvider.multiplier();
      expect(updated).to.equal(newMultiplier);
    });

    it("should fail when trying to initialize implementation contract directly", async function () {
      const implementation = await ethers.deployContract("SecuritizeRebasingProvider");
      await expect(implementation.initialize(1, 18)).to.revertedWithCustomError(
        implementation,
        "UUPSUnauthorizedCallContext"
      );
    });
  });
});
