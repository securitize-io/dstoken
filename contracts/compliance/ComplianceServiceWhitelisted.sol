pragma solidity 0.5.17;

import "./ComplianceService.sol";
import "../registry/IDSRegistryService.sol";

/**
*   @title Concrete compliance service for tokens with whitelisted wallets.
*
*   This simple compliance service is meant to be used for tokens that only need to be validated against an investor registry.
*/

contract ComplianceServiceWhitelisted is ComplianceService {
    function initialize() public initializer forceInitializeFromProxy {
        ComplianceService.initialize();
        VERSIONS.push(4);
    }
    function newPreTransferCheck(
        address _from,
        address _to,
        uint256 _value,
        bool _pausedToken,
        uint256 _balanceFrom
    ) public view returns (uint256 code, string memory reason) {
        if (_pausedToken) {
            return (10, TOKEN_PAUSED);
        }

        if (_balanceFrom < _value) {
            return (15, NOT_ENOUGH_TOKENS);
        }

        if (!isPlatformWallet(_from) && getLockManager().getTransferableTokens(_from, uint64(now)) < _value) {
            return (16, TOKENS_LOCKED);
        }

        return checkTransfer(_from, _to, _value);
    }

    function preTransferCheck(
        address _from,
        address _to,
        uint256 _value
    ) public view returns (uint256 code, string memory reason) {
        if (getToken().isPaused()) {
            return (10, TOKEN_PAUSED);
        }

        if (getToken().balanceOf(_from) < _value) {
            return (15, NOT_ENOUGH_TOKENS);
        }

        if (!isPlatformWallet(_from) && getLockManager().getTransferableTokens(_from, uint64(now)) < _value) {
            return (16, TOKENS_LOCKED);
        }

        return checkTransfer(_from, _to, _value);
    }

    function checkWhitelisted(address _who) public view returns (bool) {
        return isPlatformWallet(_who) || !CommonUtils.isEmptyString(getRegistryService().getInvestor(_who));
    }

    function recordIssuance(address, uint256, uint256) internal returns (bool) {
        return true;
    }

    function recordTransfer(address, address, uint256) internal returns (bool) {
        return true;
    }

    function checkTransfer(address, address _to, uint256) internal view returns (uint256, string memory) {
        if (!checkWhitelisted(_to)) {
            return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
        }

        return (0, VALID);
    }

    function preIssuanceCheck(address _to, uint256) public view returns (uint256, string memory) {
        if (!checkWhitelisted(_to)) {
            return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
        }

        return (0, VALID);
    }

    function recordBurn(address, uint256) internal returns (bool) {
        return true;
    }

    function recordSeize(address, address, uint256) internal returns (bool) {
        return true;
    }

    function isPlatformWallet(address _who) private view returns (bool) {
        uint8 walletType = getWalletManager().getWalletType(_who);
        return walletType == getWalletManager().PLATFORM();
    }

    function validateTransfer(
        address _from,
        address _to,
        uint256 _value,
        bool _paused,
        uint256 _balanceFrom
    ) public onlyToken returns (bool) {
        uint256 code;
        string memory reason;

        (code, reason) = newPreTransferCheck(_from, _to, _value, _paused, _balanceFrom);
        require(code == 0, reason);

        return recordTransfer(_from, _to, _value);
    }
}
