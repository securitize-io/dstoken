const { assert } = require("chai");

const deployContracts = require("../utils").deployContracts;
const roles = require("../../utils/globals").roles;
const complianceType = require("../../utils/globals").complianceType;
const lockManagerType = require("../../utils/globals").lockManagerType;

const { expectRevert } = require("@openzeppelin/test-helpers");

contract(
  "Issuer MultiCall Proxy Contract",
  function ([owner, wallet, , exchangeWallet, noneWallet]) {
    describe("Multicall Operations", function () {
      beforeEach(async function () {
        await deployContracts(
          this,
          artifacts,
          complianceType.PARTITIONED,
          lockManagerType.PARTITIONED,
          undefined,
          true
        );
        await this.trustService.setRole(this.issuer.address, roles.ISSUER);
        await this.trustService.setRole(
          this.issuerMulticall.address,
          roles.ISSUER
        );
      });

      it("Issuer Multicall proxy should be deployed and have Issuer Role", async function () {
        assert.notEqual(this.issuerMulticall.address, "0x0");
        const role = await this.trustService.getRole(
          this.issuerMulticall.address
        );
        assert.equal(role, roles.ISSUER);
      });
      it("Issuer should be able to issue through the Multicall Proxy", async function () {
        const functionData = this.issuer.contract.methods
          .issueTokens(
            "NewInvestor",
            wallet,
            [100, 1],
            "IssueNewInvestor",
            [],
            [],
            "NewInvestorCollisionHash",
            "US",
            [],
            []
          )
          .encodeABI();
        const targets = [this.issuer.address];

        await this.issuerMulticall.multicall(targets, [functionData]);

        assert.equal(await this.token.balanceOf.call(wallet), 100);
        const partition = await this.token.partitionOf(wallet, 0);
        const numOfLocks = await this.lockManager.lockCount(wallet, partition);
        assert.equal(numOfLocks, 0);
      });
      it("Non-Issuer should not be able to issue through the Multicall Proxy", async function () {
        const functionData = this.issuer.contract.methods
          .issueTokens(
            "NewInvestor",
            wallet,
            [100, 1],
            "IssueNewInvestor",
            [],
            [],
            "NewInvestorCollisionHash",
            "US",
            [],
            []
          )
          .encodeABI();
        const targets = [this.issuer.address];
        await expectRevert(
          this.issuerMulticall.multicall(targets, [functionData], {
            from: exchangeWallet,
          }),
          "Insufficient trust level."
        );
        assert.equal(await this.token.balanceOf.call(wallet), 0);
      });
      it("Issuer should be able to issue through the Multicall Proxy  multiple issuance", async function () {
        const functionData = [];
        functionData.push(
          this.issuer.contract.methods
            .issueTokens(
              "NewInvestor",
              wallet,
              [100, 1],
              "IssueNewInvestor",
              [],
              [],
              "NewInvestorCollisionHash",
              "US",
              [],
              []
            )
            .encodeABI()
        );
        functionData.push(
          this.issuer.contract.methods
            .issueTokens(
              "NewInvestor2",
              owner,
              [100, 1],
              "IssueNewInvestor2",
              [],
              [],
              "NewInvestorCollisionHash2",
              "US",
              [],
              []
            )
            .encodeABI()
        );
        const targets = [this.issuer.address, this.issuer.address];
        await this.issuerMulticall.multicall(targets, functionData);
        assert.equal(await this.token.balanceOf.call(wallet), 100);
        assert.equal(await this.token.balanceOf.call(owner), 100);
      });
      it("Complete bulk should revert when a transaction fails, transaction in position 1 is the one that fails", async function () {
        const functionData = [];
        functionData.push(
          this.issuer.contract.methods
            .issueTokens(
              "NewInvestor",
              wallet,
              [100, 1],
              "IssueNewInvestor",
              [],
              [],
              "NewInvestorCollisionHash",
              "US",
              [],
              []
            )
            .encodeABI()
        );

        functionData.push(
          this.issuer.contract.methods
            .issueTokens(
              "NewInvestorAssert",
              noneWallet,
              [100, 1],
              "IssueNewInvestorAssert",
              [],
              [],
              "NewInvestorCollisionAssertHash",
              "US",
              [0, 0],
              [0, 0]
            )
            .encodeABI()
        );

        functionData.push(
          this.issuer.contract.methods
            .issueTokens(
              "NewInvestor2",
              owner,
              [100, 1],
              "IssueNewInvestor2",
              [],
              [],
              "NewInvestorCollisionHash2",
              "US",
              [],
              []
            )
            .encodeABI()
        );

        const targets = [
          this.issuer.address,
          this.issuer.address,
          this.issuer.address,
        ];
        try {
          await this.issuerMulticall.multicall(targets, functionData);
          assert.fail("Expected multicall to revert");
        } catch (error) {
          const decodedError = decodeMulticallFailed(error.data.result);
          assert.equal(decodedError, 1);
        }
        assert.equal(await this.token.balanceOf.call(wallet), 0);
        assert.equal(await this.token.balanceOf.call(owner), 0);
        assert.equal(await this.token.balanceOf.call(noneWallet), 0);
      });
      it("Complete bulk should revert when a transaction fails, transaction in position 2 is the one that fails", async function () {
        const functionData = [];
        functionData.push(
          this.issuer.contract.methods
            .issueTokens(
              "NewInvestor",
              wallet,
              [100, 1],
              "IssueNewInvestor",
              [],
              [],
              "NewInvestorCollisionHash",
              "US",
              [],
              []
            )
            .encodeABI()
        );

        functionData.push(
          this.issuer.contract.methods
            .issueTokens(
              "NewInvestor2",
              owner,
              [100, 1],
              "IssueNewInvestor2",
              [],
              [],
              "NewInvestorCollisionHash2",
              "US",
              [],
              []
            )
            .encodeABI()
        );

        functionData.push(
          this.issuer.contract.methods
            .issueTokens(
              "NewInvestorAssert",
              noneWallet,
              [100, 1],
              "IssueNewInvestorAssert",
              [],
              [],
              "NewInvestorCollisionAssertHash",
              "US",
              [0, 0],
              [0, 0]
            )
            .encodeABI()
        );

        const targets = [
          this.issuer.address,
          this.issuer.address,
          this.issuer.address,
        ];
        try {
          await this.issuerMulticall.multicall(targets, functionData);
          assert.fail("Expected multicall to revert");
        } catch (error) {
          const decodedError = decodeMulticallFailed(error.data.result);
          assert.equal(decodedError, 2);
        }
        assert.equal(await this.token.balanceOf.call(wallet), 0);
        assert.equal(await this.token.balanceOf.call(owner), 0);
        assert.equal(await this.token.balanceOf.call(noneWallet), 0);
      });
      function decodeMulticallFailed(revertData) {
        try {
          const sliced = "0x" + revertData.slice(10);
          const decodedData =  web3.eth.abi.decodeParameters(['uint256'], sliced);
          return decodedData[0];
        } catch (decodeError) {
          return null;
        }
      }
    });
  }
);

