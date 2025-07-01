import { expect } from "chai";
import { ethers } from "hardhat";
import { deployDSTokenRegulated } from "./utils/fixture";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("SecuritizeRebasingProvider", () => {
  const initialMultiplier = ethers.parseUnits("1", 18); // 1e18
  const newMultiplier = ethers.parseUnits("1.5", 18); // 1.5e18

  const deployFixture = async () => {
    const { rebasingProvider } = await deployDSTokenRegulated();

    return {
      rebasingProvider,
    };
  };

  it("SHOULD initialize with correct multiplier", async () => {
    const { rebasingProvider } = await loadFixture(deployFixture);
    const stored = await rebasingProvider.multiplier();
    expect(stored).to.equal(initialMultiplier);
  });

  it("SHOULD update the multiplier and emit event", async () => {
    const { rebasingProvider } = await loadFixture(deployFixture);

    const [owner] = await ethers.getSigners();
    await expect(rebasingProvider.connect(owner).setMultiplier(newMultiplier))
      .to.emit(rebasingProvider, "RebasingRateUpdated")
      .withArgs(initialMultiplier, newMultiplier);

    const updated = await rebasingProvider.multiplier();

    expect(updated).to.equal(newMultiplier);
  });
});
