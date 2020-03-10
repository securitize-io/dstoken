const crypto = require("crypto");
const deployContracts = require("../utils").deployContracts;
const assertRevert = require("../utils/assertRevert");
const roles = require("../../utils/globals").roles;
const complianceType = require("../../utils/globals").complianceType;
const lockManagerType = require("../../utils/globals").lockManagerType;
const fixtures = require("../fixtures");
const attributeType = fixtures.AttributeType;
const attributeStatus = fixtures.AttributeStatus;
const investorId = fixtures.InvestorId;

let investorFullName = "olegvoytenko";
let investorBirthDate = "28091994";
let investorIdNumber = "MT753328";
let investorCountry = "Ukraine";

let generatedInvestorId = generateInvestorId(
  investorFullName,
  investorBirthDate,
  investorIdNumber
);
let investorCollisionHash = generateCollisionHash(
  investorFullName,
  investorBirthDate
);

let attributeTypes = [
  attributeType.KYC_APPROVED,
  attributeType.ACCREDITED,
  attributeType.QUALIFIED,
  attributeType.PROFESSIONAL
];
let attributeStatuses = [
  attributeStatus.PENDING,
  attributeStatus.APPROVED,
  attributeStatus.REJECTED
];

const expiry = "10072018";
const proofHash = generateRandomInvestorId();

contract("RegistryService", function([
  owner,
  issuerWallet1,
  issuerWallet2,
  exchangeAccount,
  wallet1,
  wallet2,
  wallet3,
  exchangeWallet,
  additionalWallet,
  omnibusWallet
]) {
  before(async function() {
    await deployContracts(
      this,
      artifacts,
      complianceType.NORMAL,
      lockManagerType.WALLET,
      [omnibusWallet]
    );
  });

  describe("Registry service", function() {
    describe("Register the new investor flow", function() {
      describe("Register investor", function() {
        it(`Checking the role for the creator account - ${owner} - should be MASTER - ${roles.MASTER}`, async function() {
          const role = await this.trustService.getRole(owner);

          assert.equal(role.words[0], roles.MASTER);
        });

        it("Trying to register the new investor", async function() {
          const {logs} = await this.registryService.registerInvestor(
            generatedInvestorId,
            investorCollisionHash
          );

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, "DSRegistryServiceInvestorAdded");
          assert.equal(logs[0].args.investorId, generatedInvestorId);
          assert.equal(logs[0].args.sender, owner);
        });

        describe("Register investor: negative tests ", function() {
          it(`Trying to register the same account twice - should be an error`, async function() {
            await assertRevert(
              this.registryService.registerInvestor(
                generatedInvestorId,
                investorCollisionHash
              )
            );
          });

          it(`Trying to register the new investor using the account - ${wallet1} with NONE - ${roles.NONE} permissions - should be the error`, async function() {
            const newInvestorId = generateRandomInvestorId();
            const role = await this.trustService.getRole(wallet1);

            assert.equal(role.words[0], roles.NONE);
            await assertRevert(
              this.registryService.registerInvestor(
                newInvestorId,
                investorCollisionHash,
                {from: wallet1}
              )
            );
          });
        });
      });

      describe("SET | GET the country", function() {
        it("Trying to set the country for the investor", async function() {
          const {logs} = await this.registryService.setCountry(
            generatedInvestorId,
            investorCountry
          );

          assert.equal(logs.length, 1);
          assert.equal(
            logs[0].event,
            "DSRegistryServiceInvestorCountryChanged"
          );
          assert.equal(logs[0].args.investorId, generatedInvestorId);
          assert.equal(logs[0].args.sender, owner);
        });

        it("Trying to get the country for investor", async function() {
          const country = await this.registryService.getCountry(
            generatedInvestorId
          );

          assert.equal(country, investorCountry);
        });

        describe("SET | GET the country: negative tests", function() {
          it(`Trying to set the country using the account with NONE - ${roles.NONE} permissions - should be the error`, async function() {
            const newInvestorId = generateRandomInvestorId();
            const role = await this.trustService.getRole(wallet1);

            assert.equal(role.words[0], roles.NONE);
            await assertRevert(
              this.registryService.setCountry(newInvestorId, investorCountry, {
                from: wallet1
              })
            );
          });

          it("Trying to set the country for the investor with wrong ID - should be the error", async function() {
            const newInvestorId = generateRandomInvestorId();

            await assertRevert(
              this.registryService.setCountry(newInvestorId, investorCountry)
            );
          });

          // TODO: activate test
          it("Trying to get the country for the investor with wrong ID - should be empty", async function() {
            const newInvestorId = generateRandomInvestorId();

            const country = await this.registryService.getCountry(
              newInvestorId
            );
            assert.equal(country, "");
          });
        });
      });

      describe("Collision hash", function() {
        it("Trying to get the collision hash", async function() {
          const collisionHash = await this.registryService.getCollisionHash(
            generatedInvestorId
          );

          assert.equal(collisionHash, investorCollisionHash);
        });

        describe("Collision hash: negative tests", function() {
          it("Trying to get the collision hash for the investor with wrong ID - should be empty", async function() {
            const newInvestorId = generateRandomInvestorId();

            const collisionHash = await this.registryService.getCollisionHash(
              newInvestorId
            );

            assert.equal(collisionHash, "");
          });
        });
      });

      describe("Attributes", function() {
        it(`Trying to set and get the attributes`, async function() {
          for (let i = 0; i < attributeTypes.length; i++) {
            for (let j = 0; j < attributeStatuses.length; j++) {
              const {logs} = await this.registryService.setAttribute(
                generatedInvestorId,
                attributeTypes[i],
                attributeStatuses[j],
                expiry,
                proofHash
              );

              assert.equal(logs.length, 1);
              assert.equal(
                logs[0].event,
                "DSRegistryServiceInvestorAttributeChanged"
              );
              assert.equal(logs[0].args.investorId, generatedInvestorId);
              assert.equal(logs[0].args.sender, owner);

              const attributeValue = await this.registryService.getAttributeValue(
                generatedInvestorId,
                attributeTypes[i]
              );

              assert.equal(attributeValue.words[0], attributeStatuses[j]);
            }
          }
        });

        it(`Trying to get the attribute expire`, async function() {
          const attributeExpiry = await this.registryService.getAttributeExpiry(
            generatedInvestorId,
            attributeType.KYC_APPROVED
          );

          assert.equal(attributeExpiry, expiry);
        });

        it(`Trying to get the attribute proof hash`, async function() {
          const attributeProofHash = await this.registryService.getAttributeProofHash(
            generatedInvestorId,
            attributeType.KYC_APPROVED
          );

          assert.equal(attributeProofHash, proofHash);
        });

        describe("Attributes: negative tests", function() {
          it(`Trying to set the attribute using the account with NONE - ${roles.NONE} permissions - should be the error`, async function() {
            const role = await this.trustService.getRole(wallet1);

            assert.equal(role.words[0], roles.NONE);
            await assertRevert(
              this.registryService.setAttribute(
                generatedInvestorId,
                attributeType.KYC_APPROVED,
                attributeStatus.PENDING,
                expiry,
                proofHash,
                {from: wallet1}
              )
            );
          });

          it("Trying to set the attribute for the investor with wrong ID - should be the error", async function() {
            const newInvestorId = generateRandomInvestorId();

            await assertRevert(
              this.registryService.setAttribute(
                newInvestorId,
                attributeType.KYC_APPROVED,
                attributeStatus.PENDING,
                expiry,
                proofHash
              )
            );
          });

          it("Trying to get the attribute for the investor with wrong ID - should be empty", async function() {
            const newInvestorId = generateRandomInvestorId();

            const value = await this.registryService.getAttributeValue(
              newInvestorId,
              attributeType.KYC_APPROVED
            );

            assert.equal(value, roles.NONE);
          });
        });
      });

      describe("Wallets", function() {
        before(async function() {
          await this.trustService.setRole(issuerWallet1, roles.ISSUER);
          await this.registryService.addWallet(
            issuerWallet2,
            generatedInvestorId,
            {
              from: issuerWallet1
            }
          );
          await this.trustService.setRole(exchangeAccount, roles.EXCHANGE);
          await this.registryService.addWallet(
            exchangeWallet,
            generatedInvestorId,
            {
              from: exchangeAccount
            }
          );
        });
        it(`Trying to add the wallet - ${wallet2}`, async function() {
          const {logs} = await this.registryService.addWallet(
            wallet2,
            generatedInvestorId
          );

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, "DSRegistryServiceWalletAdded");
          assert.equal(logs[0].args.investorId, generatedInvestorId);
          assert.equal(logs[0].args.wallet, wallet2);
          assert.equal(logs[0].args.sender, owner);
        });

        it(`Trying to remove the wallet with MASTER - ${roles.MASTER} permissions`, async function() {
          const {logs} = await this.registryService.removeWallet(
            wallet2,
            generatedInvestorId
          );

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, "DSRegistryServiceWalletRemoved");
        });

        it(`Trying to remove the wallet with ISSUER - ${roles.ISSUER} permissions`, async function() {
          const role = await this.trustService.getRole(issuerWallet1);

          assert.equal(role.words[0], roles.ISSUER);

          const {logs} = await this.registryService.removeWallet(
            issuerWallet2,
            generatedInvestorId,
            {from: issuerWallet1}
          );

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, "DSRegistryServiceWalletRemoved");
        });

        it(`Trying to remove the wallet with EXCHANGE - ${roles.EXCHANGE} permissions (same one that created the wallet)`, async function() {
          const role = await this.trustService.getRole(exchangeAccount);

          assert.equal(role.words[0], roles.EXCHANGE);

          const {logs} = await this.registryService.removeWallet(
            exchangeWallet,
            generatedInvestorId,
            {from: exchangeAccount}
          );

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, "DSRegistryServiceWalletRemoved");
        });

        describe("Wallets: negative tests", function() {
          before(async function() {
            await this.registryService.addWallet(wallet2, generatedInvestorId);
            this.registryService.addWallet(
              exchangeWallet,
              generatedInvestorId,
              {
                from: exchangeAccount
              }
            );
          });

          it(`Trying to add the wallet with NONE permissions`, async function() {
            const role = await this.trustService.getRole(wallet1);

            assert.equal(role.words[0], roles.NONE);
            await assertRevert(
              this.registryService.addWallet(wallet3, generatedInvestorId, {
                from: wallet1
              })
            );
          });

          it(`Trying to add the same wallet - should be the error`, async function() {
            await assertRevert(
              this.registryService.addWallet(wallet2, generatedInvestorId)
            );
          });

          it(`Trying to remove the wallet from the investor that doesn't exist - should be the error`, async function() {
            const newInvestorId = generateRandomInvestorId();

            await assertRevert(
              this.registryService.removeWallet(wallet2, newInvestorId)
            );
          });

          it(`Trying to remove the wallet with the wrong investor - should be the error`, async function() {
            await assertRevert(
              this.registryService.removeWallet(wallet2, issuerWallet2)
            );
          });

          it(`Trying to remove the wallet that doesn't exist - should be the error`, async function() {
            await assertRevert(
              this.registryService.removeWallet(
                additionalWallet,
                generatedInvestorId
              )
            );
          });

          it(`Trying to remove the wallet by an exchange which didn't create it - should be the error`, async function() {
            this.trustService.setRole(additionalWallet, roles.EXCHANGE);
            await assertRevert(
              this.registryService.removeWallet(
                exchangeWallet,
                generatedInvestorId,
                {
                  from: additionalWallet
                }
              )
            );
          });

          it(`Trying to remove the wallet by a wallet without permissions - should be the error`, async function() {
            await assertRevert(
              this.registryService.removeWallet(
                exchangeWallet,
                generatedInvestorId,
                {
                  from: wallet2
                }
              )
            );
          });

          it(`A wallet trying to remove itself - should be the error`, async function() {
            await assertRevert(
              this.registryService.removeWallet(
                exchangeWallet,
                generatedInvestorId,
                {
                  from: exchangeWallet
                }
              )
            );
          });
        });
      });

      describe("Get the investor", function() {
        it("Trying to get the investor", async function() {
          const investorID = await this.registryService.getInvestor(wallet2);

          assert.equal(investorID, generatedInvestorId);
        });

        it("Trying to get the investor details", async function() {
          const investorDetails = await this.registryService.getInvestorDetails(
            wallet2
          );

          assert.equal(investorDetails[0], generatedInvestorId);
          assert.equal(investorDetails[1], investorCountry);
        });
        describe("Get the investor: negative tests", function() {
          // TODO: activate test
          it("Trying to get the investor using the wrong Wallet - should be empty", async function() {
            const investor = await this.registryService.getInvestor(
              additionalWallet
            );

            assert.equal(investor, "");
          });

          it("Trying to get the investor details using the wrong Wallet - should be empty", async function() {
            const investorDetails = await this.registryService.getInvestorDetails(
              additionalWallet
            );

            assert.deepEqual(investorDetails, {0: "", 1: ""});
          });
        });
      });
    });

    describe.skip("Omnibus controller", function() {
      before(async function() {
        await this.registryService.registerInvestor(
          investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
          investorId.OMNIBUS_WALLET_INVESTOR_ID_1
        );
      });

      it("Should add the omnibus controller", async function() {
        const {logs} = await this.registryService.addOmnibusWallet(
          investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
          omnibusWallet,
          this.omnibusController1.address
        );

        assert.equal(
          await this.registryService.isOmnibusWallet(omnibusWallet),
          true
        );
        assert.equal(await this.registryService.isWallet(omnibusWallet), true);
        // assert.equal(logs[1].event, "DSRegistryServiceOmnibusWalletAdded");
        // assert.equal(logs[1].args);
      });

      it("Should retrieve the omnibus controller", async function() {
        const controllerAddress = await this.registryService.getOmnibusWalletController(
          omnibusWallet
        );

        assert.equal(this.omnibusController1.address, controllerAddress);
      });

      it("Should remove the omnibus controller", async function() {
        const {logs} = this.registryService.removeOmnibusWallet(
          investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
          omnibusWallet
        );

        assert.equal(
          await this.registryService.isOmnibusWallet(omnibusWallet),
          false
        );
        assert.equal(await this.registryService.isWallet(omnibusWallet), false);
      });
    });
  });
});

function generateInvestorId(fullName, birthDay, idNumber) {
  const hashString = `${fullName}${birthDay}${idNumber}`;
  return crypto
    .createHash("sha256")
    .update(hashString)
    .digest("hex");
}

function generateRandomInvestorId() {
  const fullName = generateRandomString();
  const birthDay = generateRandomString();
  const idNumber = generateRandomString();
  const hashString = `${fullName}${birthDay}${idNumber}`;

  return crypto
    .createHash("sha256")
    .update(hashString)
    .digest("hex");
}

function generateCollisionHash(fullName, birthDay) {
  const hashString = `${fullName}${birthDay}`;
  return crypto
    .createHash("sha256")
    .update(hashString)
    .digest("hex");
}

function generateRandomString() {
  return (
    Math.random()
      .toString(36)
      .substring(2, 15) +
    Math.random()
      .toString(36)
      .substring(2, 15)
  );
}
