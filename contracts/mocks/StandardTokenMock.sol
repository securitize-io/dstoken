pragma solidity ^0.8.20;

import "../token/StandardToken.sol";
import "../utils/ProxyTarget.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../token/DSToken.sol";

// mock class using StandardToken
//SPDX-License-Identifier: UNLICENSED
contract StandardTokenMock is ProxyTarget, Initializable, StandardToken {
    function initialize(address _initialAccount, uint256 _initialBalance) public initializer forceInitializeFromProxy {
        StandardToken.initialize();

        VERSIONS.push(2);
        tokenData.walletsBalances[_initialAccount] = _initialBalance;
        tokenData.totalSupply = _initialBalance;
    }

    function balanceOfInvestor(string memory) public pure override returns (uint256) {
        revertFunction();
    }

    function burn(address, uint256, string memory) public pure override {
        revertFunction();
    }

    function emitOmnibusTBEEvent(address, int256, int256, int256, int256, int256) public pure override {
        revertFunction();
    }

    function emitOmnibusTBETransferEvent(address, string memory) public pure override {
        revertFunction();
    }

    function emitOmnibusTransferEvent(address, address, address, uint256) public pure override {
        revertFunction();
    }

    function getWalletAt(uint256) public pure override returns (address) {
        revertFunction();
    }

    function issueTokens(address, uint256) public pure override returns (bool) {
        revertFunction();
    }

    function issueTokensCustom(address, uint256, uint256, uint256, string memory, uint64) public pure override returns (bool) {
        revertFunction();
    }

    function issueTokensWithMultipleLocks(address, uint256, uint256, uint256[] memory, string memory, uint64[] memory) public pure override returns (bool) {
        revertFunction();
    }

    function issueTokensWithNoCompliance(address, uint256) public pure override {
        revertFunction();
    }

    function omnibusBurn(address, address, uint256, string memory) public pure override {
        revertFunction();
    }

    function omnibusSeize(address, address, address, uint256, string memory) public pure override {
        revertFunction();
    }

    function preTransferCheck(address, address, uint256) public pure override returns (uint256, string memory) {
        revertFunction();
    }

    function seize(address, address, uint256, string memory) public pure override {
        revertFunction();
    }

    function setCap(uint256) public pure override {
        revertFunction();
    }

    function updateInvestorBalance(address, uint256, CommonUtils.IncDec) internal pure override returns (bool) {
        revertFunction();
    }

    function updateOmnibusInvestorBalance(address, address, uint256, CommonUtils.IncDec) public pure override returns (bool) {
        revertFunction();
    }

    function walletCount() public pure override returns (uint256) {
        revertFunction();
    }

    function revertFunction() private pure {
        revert("not implemented");
    }
}
