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

    it("should revert when token decimals are greater than 18 for token to share conversions", async function () {
      const { mock } = await loadFixture(deployRebasingLibraryMock);
      const multiplier = ethers.parseUnits("1", 18);
      const tokens = ethers.parseUnits("1", 18);

      await expect(mock.convertTokensToShares(tokens, multiplier, 19)).to.be.revertedWith(
        "Token decimals greater than 18 not supported"
      );
    });

    it("should revert with overflow when scaled tokens exceed uint256 max", async function () {
      const { mock } = await loadFixture(deployRebasingLibraryMock);
      const multiplier = ethers.parseUnits("1", 18);
      const maxTokens = ethers.MaxUint256;

      await expect(mock.convertTokensToShares(maxTokens, multiplier, 0)).to.be.revertedWithPanic(0x11);
    });   
    
    it("should revert when non-zero tokens round down to zero shares (unrealistic scenario)", async function () {
      const { mock } = await loadFixture(deployRebasingLibraryMock);
      // NOTE: This is an UNREALISTIC scenario kept for edge case documentation.
      //
      // With "round to nearest" logic, we need an extremely high multiplier
      // to make even 1 token with 0 decimals round down to 0 shares.
      //
      // Formula: shares = (tokens * scale * 1e18 + multiplier/2) / multiplier
      // For shares to be 0: tokens * scale * 1e18 + multiplier/2 < multiplier
      // With tokens=1, decimals=0 (scale=1e18): 1e36 + multiplier/2 < multiplier
      // Simplifying: 1e36 < multiplier/2 → multiplier > 2e36
      //
      // IMPORTANT: A multiplier of 2e36 is unrealistic because:
      // - Multipliers are expressed with 18 decimals precision
      // - A value of 2e36 represents an absolute multiplier value of 2,000,000,000,000,000,000
      // - In practice, multipliers would be in the range of 0.1 to 1000 (1e17 to 1000e18)
      // - This test uses a multiplier with effectively 36 decimals, far beyond realistic values
      const tinyTokens = 1n;
      const extremeMultiplier = 2n * 10n**36n + 1n; // Unrealistic: effectively 36 decimals

      await expect(mock.convertTokensToShares(tinyTokens, extremeMultiplier, 0)).to.be.revertedWith(
        "Shares amount too small"
      );
    });

    it("should NOT revert with realistic multipliers (18 decimals) even for tiny amounts", async function () {
      const { mock } = await loadFixture(deployRebasingLibraryMock);
      // This test demonstrates that with realistic multipliers (18 decimals),
      // the "round to nearest" logic ensures that tokens > 0 always results in shares > 0

      // Test with extremely high but realistic multiplier: 1,000,000 (1e6 in absolute value)
      const realisticHighMultiplier = ethers.parseUnits("1000000", 18); // 1e6 * 1e18 = 1e24
      const tinyTokens = 1n;

      // With decimals=0, scale=1e18:
      // shares = (1 * 1e18 * 1e18 + 1e24/2) / 1e24
      //        = (1e36 + 0.5e24) / 1e24
      //        = 1e36 / 1e24 (approximately, since 0.5e24 is negligible)
      //        = 1e12 (much greater than 0)
      const shares = await mock.convertTokensToShares(tinyTokens, realisticHighMultiplier, 0);
      expect(shares).to.be.gt(0);
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
