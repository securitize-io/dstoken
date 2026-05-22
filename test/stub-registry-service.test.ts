import hre from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("StubRegistryService", function () {
  async function fixture() {
    const [owner] = await hre.ethers.getSigners();
    const StubRegistry = await hre.ethers.getContractFactory("StubRegistryService");
    const stub = await hre.upgrades.deployProxy(StubRegistry);
    await stub.waitForDeployment();
    return { stub, owner };
  }

  describe("Initialization", function () {
    it("should deploy successfully", async function () {
      const { stub } = await loadFixture(fixture);
      expect(await stub.getAddress()).to.not.equal(hre.ethers.ZeroAddress);
    });

    it("should reject re-initialization", async function () {
      const { stub } = await loadFixture(fixture);
      await expect(stub.initialize()).to.be.revertedWithCustomError(stub, "InvalidInitialization");
    });

    it("should reject direct implementation initialization", async function () {
      const StubRegistry = await hre.ethers.getContractFactory("StubRegistryService");
      const implAddr = await hre.upgrades.deployImplementation(StubRegistry);
      const impl = StubRegistry.attach(implAddr as string);
      await expect(impl.initialize()).to.be.revertedWithCustomError(impl, "UUPSUnauthorizedCallContext");
    });
  });

  describe("View functions return empty/false", function () {
    it("getInvestor returns empty string", async function () {
      const { stub } = await loadFixture(fixture);
      const [signer] = await hre.ethers.getSigners();
      expect(await stub.getInvestor(await signer.getAddress())).to.equal("");
    });

    it("getCountry returns empty string", async function () {
      const { stub } = await loadFixture(fixture);
      expect(await stub.getCountry("anyInvestor")).to.equal("");
    });

    it("getCollisionHash returns empty string", async function () {
      const { stub } = await loadFixture(fixture);
      expect(await stub.getCollisionHash("anyInvestor")).to.equal("");
    });

    it("getAttributeValue returns 0", async function () {
      const { stub } = await loadFixture(fixture);
      expect(await stub.getAttributeValue("anyInvestor", 1)).to.equal(0);
    });

    it("getAttributeExpiry returns 0", async function () {
      const { stub } = await loadFixture(fixture);
      expect(await stub.getAttributeExpiry("anyInvestor", 1)).to.equal(0);
    });

    it("getAttributeProofHash returns empty string", async function () {
      const { stub } = await loadFixture(fixture);
      expect(await stub.getAttributeProofHash("anyInvestor", 1)).to.equal("");
    });

    it("getInvestorDetails returns empty strings", async function () {
      const { stub } = await loadFixture(fixture);
      const [signer] = await hre.ethers.getSigners();
      const [id, country] = await stub.getInvestorDetails(await signer.getAddress());
      expect(id).to.equal("");
      expect(country).to.equal("");
    });

    it("isInvestor returns false", async function () {
      const { stub } = await loadFixture(fixture);
      expect(await stub.isInvestor("anyInvestor")).to.be.false;
    });

    it("isWallet returns false", async function () {
      const { stub } = await loadFixture(fixture);
      const [signer] = await hre.ethers.getSigners();
      expect(await stub.isWallet(await signer.getAddress())).to.be.false;
    });

    it("isAccreditedInvestor(string) returns false", async function () {
      const { stub } = await loadFixture(fixture);
      expect(await stub["isAccreditedInvestor(string)"]("anyInvestor")).to.be.false;
    });

    it("isQualifiedInvestor(string) returns false", async function () {
      const { stub } = await loadFixture(fixture);
      expect(await stub["isQualifiedInvestor(string)"]("anyInvestor")).to.be.false;
    });

    it("isAccreditedInvestor(address) returns false", async function () {
      const { stub } = await loadFixture(fixture);
      const [signer] = await hre.ethers.getSigners();
      expect(await stub["isAccreditedInvestor(address)"](await signer.getAddress())).to.be.false;
    });

    it("isQualifiedInvestor(address) returns false", async function () {
      const { stub } = await loadFixture(fixture);
      const [signer] = await hre.ethers.getSigners();
      expect(await stub["isQualifiedInvestor(address)"](await signer.getAddress())).to.be.false;
    });

    it("getInvestors returns empty strings", async function () {
      const { stub } = await loadFixture(fixture);
      const [a, b] = await hre.ethers.getSigners();
      const [id1, id2] = await stub.getInvestors(await a.getAddress(), await b.getAddress());
      expect(id1).to.equal("");
      expect(id2).to.equal("");
    });
  });

  describe("State-changing functions are no-ops — return true", function () {
    it("registerInvestor returns true", async function () {
      const { stub } = await loadFixture(fixture);
      expect(await stub.registerInvestor.staticCall("id", "hash")).to.equal(true);
    });

    it("updateInvestor returns true", async function () {
      const { stub } = await loadFixture(fixture);
      expect(await stub.updateInvestor.staticCall("id", "hash", "US", [], [], [], [])).to.equal(true);
    });

    it("removeInvestor returns true", async function () {
      const { stub } = await loadFixture(fixture);
      expect(await stub.removeInvestor.staticCall("id")).to.equal(true);
    });

    it("setCountry returns true", async function () {
      const { stub } = await loadFixture(fixture);
      expect(await stub.setCountry.staticCall("id", "US")).to.equal(true);
    });

    it("setAttribute returns true", async function () {
      const { stub } = await loadFixture(fixture);
      expect(await stub.setAttribute.staticCall("id", 1, 1, 0, "hash")).to.equal(true);
    });

    it("addWallet returns true", async function () {
      const { stub } = await loadFixture(fixture);
      const [signer] = await hre.ethers.getSigners();
      expect(await stub.addWallet.staticCall(await signer.getAddress(), "id")).to.equal(true);
    });

    it("removeWallet returns true", async function () {
      const { stub } = await loadFixture(fixture);
      const [signer] = await hre.ethers.getSigners();
      expect(await stub.removeWallet.staticCall(await signer.getAddress(), "id")).to.equal(true);
    });
  });
});
