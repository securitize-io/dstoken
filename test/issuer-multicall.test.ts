import hre from "hardhat";
import { expect } from "chai";
import {
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {
    deployDSTokenRegulated,
    INVESTORS,
} from "./utils/fixture";
import { DSConstants } from "../utils/globals";

describe("Token Issuer Unit Tests", function () {
    console.log("Running issuer multicall test");
    it("Issuer Multicall proxy should be deployed and have Issuer Role", async function () {
        const { issuerMulticall, trustService } = await loadFixture(
            deployDSTokenRegulated
        );
        expect(await trustService.getRole(issuerMulticall.target)).equal(
            DSConstants.roles.ISSUER
        );
    });

    it("Should issue tokens to a new investor without locks successfully", async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, tokenIssuer, lockManager, issuerMulticall } =
            await loadFixture(deployDSTokenRegulated);
        const params = [
            INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
            investor.address,
            [100, 1],
            "a",
            [],
            [],
            INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
            "US",
            [0, 0, 0],
            [0, 0, 0],
        ];
        const functionData = tokenIssuer.interface.encodeFunctionData(
            "issueTokens",
            params
        );
        await issuerMulticall.multicall([tokenIssuer.getAddress()], [functionData]);
        expect(await dsToken.balanceOf(investor)).to.equal(100);
        const locksCount = await lockManager.lockCount(investor);
        expect(locksCount).to.equal(0);
    });

    it("Transfer Agent should not be able to issue tokens", async function () {
        const [investor, transferAgent] = await hre.ethers.getSigners();
        const { dsToken, tokenIssuer, issuerMulticall, trustService } =
            await loadFixture(deployDSTokenRegulated);
        const params = [
            INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
            investor.address,
            [100, 1],
            "a",
            [],
            [],
            INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
            "US",
            [0, 0, 0],
            [0, 0, 0],
        ];
        const functionData = tokenIssuer.interface.encodeFunctionData(
            "issueTokens",
            params
        );
        await trustService.setRole(transferAgent, DSConstants.roles.TRANSFER_AGENT);
        expect(await trustService.getRole(transferAgent)).equal(
            DSConstants.roles.TRANSFER_AGENT
        );
        await expect(
            issuerMulticall
                .connect(transferAgent)
                .multicall([tokenIssuer.getAddress()], [functionData])
        ).to.be.revertedWith("Insufficient trust level");
    });

    it("Exchange should not be able to issue tokens", async function () {
        const [investor, exchange] = await hre.ethers.getSigners();
        const { dsToken, tokenIssuer, issuerMulticall, trustService } =
            await loadFixture(deployDSTokenRegulated);
        const params = [
            INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
            investor.address,
            [100, 1],
            "a",
            [],
            [],
            INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
            "US",
            [0, 0, 0],
            [0, 0, 0],
        ];
        const functionData = tokenIssuer.interface.encodeFunctionData(
            "issueTokens",
            params
        );
        await trustService.setRole(exchange, DSConstants.roles.EXCHANGE);
        expect(await trustService.getRole(exchange)).equal(
            DSConstants.roles.EXCHANGE
        );
        await expect(
            issuerMulticall
                .connect(exchange)
                .multicall([tokenIssuer.getAddress()], [functionData])
        ).to.be.revertedWith("Insufficient trust level");
    });

    it("Issuer should be able to issue through the Multicall Proxy  multiple issuance", async function () {
        const [owner, investor1, investor2] = await hre.ethers.getSigners();
        const { dsToken, tokenIssuer, issuerMulticall } = await loadFixture(
            deployDSTokenRegulated
        );

        const params1 = [
            INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
            investor1.address,
            [100, 1],
            "a",
            [],
            [],
            INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
            "US",
            [0, 0, 0],
            [0, 0, 0],
        ];
        const functionData1 = tokenIssuer.interface.encodeFunctionData(
            "issueTokens",
            params1
        );
        const params2 = [
            INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
            investor2.address,
            [100, 1],
            "a",
            [],
            [],
            INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
            "US",
            [0, 0, 0],
            [0, 0, 0],
        ];
        const functionData2 = tokenIssuer.interface.encodeFunctionData(
            "issueTokens",
            params2
        );
        const targets = [tokenIssuer.target, tokenIssuer.target];
        await issuerMulticall.multicall(targets, [functionData1, functionData2]);
        expect(await dsToken.balanceOf(investor1)).to.equal(100);
        expect(await dsToken.balanceOf(investor2)).to.equal(100);
    });

    it("A complete transaction bulk should revert when a unique transaction fails, transaction in position 1 fails", async function () {
        const [owner, investor1, investor2, noneWallet] =
            await hre.ethers.getSigners();
        const { dsToken, tokenIssuer, issuerMulticall } = await loadFixture(
            deployDSTokenRegulated
        );

        expect(await dsToken.balanceOf(owner)).to.equal(0);
        expect(await dsToken.balanceOf(investor2)).to.equal(0);
        expect(await dsToken.balanceOf(noneWallet)).to.equal(0);

        const params = [];
        params.push(
            tokenIssuer.interface.encodeFunctionData("issueTokens", [
                "NewInvestor",
                owner.address,
                [100, 1],
                "IssueNewInvestor",
                [],
                [],
                "NewInvestorCollisionHash",
                "US",
                [],
                [],
            ])
        );

        params.push(
            tokenIssuer.interface.encodeFunctionData("issueTokens", [
                "NewInvestorAssert",
                noneWallet.address,
                [100, 1],
                "IssueNewInvestorAssert",
                [],
                [],
                "NewInvestorCollisionAssertHash",
                "US",
                [0, 0],
                [0, 0],
            ])
        );

        params.push(
            tokenIssuer.interface.encodeFunctionData("issueTokens", [
                "NewInvestor",
                investor2.address,
                [100, 1],
                "IssueNewInvestor",
                [],
                [],
                "NewInvestorCollisionHash",
                "US",
                [0, 0, 0],
                [0, 0, 0],
            ])
        );

        const targets = [];
        for (let i = 0; i < 3; i++) {
            targets.push(tokenIssuer.target);
        }
        await expect(issuerMulticall.multicall(targets, params)).to
            .revertedWithCustomError(issuerMulticall, 'MulticallFailed')
            .withArgs(1, "Wrong length of parameters");

        expect(await dsToken.balanceOf(owner)).to.equal(0);
        expect(await dsToken.balanceOf(investor2)).to.equal(0);
        expect(await dsToken.balanceOf(noneWallet)).to.equal(0);
    });

    it("A complete transaction bulk should revert when a unique transaction fails, transaction in position 2 fails", async function () {
        const [owner, investor1, investor2, noneWallet] =
            await hre.ethers.getSigners();
        const { dsToken, tokenIssuer, issuerMulticall } = await loadFixture(
            deployDSTokenRegulated
        );

        expect(await dsToken.balanceOf(owner)).to.equal(0);
        expect(await dsToken.balanceOf(investor2)).to.equal(0);
        expect(await dsToken.balanceOf(noneWallet)).to.equal(0);

        const params = [];
        params.push(
            tokenIssuer.interface.encodeFunctionData("issueTokens", [
                "NewInvestor",
                owner.address,
                [100, 1],
                "IssueNewInvestor",
                [],
                [],
                "NewInvestorCollisionHash",
                "US",
                [],
                [],
            ])
        );

        params.push(
            tokenIssuer.interface.encodeFunctionData("issueTokens", [
                "NewInvestor",
                investor2.address,
                [100, 1],
                "IssueNewInvestor",
                [],
                [],
                "NewInvestorCollisionHash",
                "US",
                [0, 0, 0],
                [0, 0, 0],
            ])
        );

        params.push(
            tokenIssuer.interface.encodeFunctionData("issueTokens", [
                "NewInvestorAssert",
                noneWallet.address,
                [100, 1],
                "IssueNewInvestorAssert",
                [],
                [],
                "NewInvestorCollisionAssertHash",
                "US",
                [0, 0],
                [0, 0],
            ])
        );

        const targets = [];
        for (let i = 0; i < 3; i++) {
            targets.push(tokenIssuer.target);
        }
        await expect(issuerMulticall.multicall(targets, params)).to
            .revertedWithCustomError(issuerMulticall, 'MulticallFailed')
            .withArgs(2, "Wrong length of parameters");

        expect(await dsToken.balanceOf(owner)).to.equal(0);
        expect(await dsToken.balanceOf(investor2)).to.equal(0);
        expect(await dsToken.balanceOf(noneWallet)).to.equal(0);
    });

    describe('Implementation Security', function() {
        it('SHOULD fail when trying to initialize implementation contract directly', async () => {
            const implementation = await hre.ethers.deployContract('IssuerMulticall');
            await expect(implementation.initialize()).to.revertedWithCustomError(implementation, 'UUPSUnauthorizedCallContext');
        });
    });
});
