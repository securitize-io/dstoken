pragma solidity ^0.8.20;

import "./IDSComplianceService.sol";
import "../utils/CommonUtils.sol";
import "../data-stores/ComplianceServiceDataStore.sol";
import "../utils/BaseDSContract.sol";

/**
 *   @title Compliance service main implementation.
 *
 *   Combines the different implementation files for the compliance service and serves as a base class for
 *   concrete implementation.
 *
 *   To create a concrete implementation of a compliance service, one should inherit from this contract,
 *   and implement the five functions - recordIssuance,checkTransfer,recordTransfer,recordBurn and recordSeize.
 *   The rest of the functions should only be overridden in rare circumstances.
 */
//SPDX-License-Identifier: GPL-3.0
abstract contract ComplianceService is IDSComplianceService, ComplianceServiceDataStore, BaseDSContract {

    function initialize() public virtual override onlyProxy onlyInitializing {
        __BaseDSContract_init();
    }

    function validateTransfer(
        address _from,
        address _to,
        uint256 _value
    ) public override onlyToken returns (bool) {
        uint256 code;
        string memory reason;

        (code, reason) = preTransferCheck(_from, _to, _value);
        require(code == 0, reason);

        return recordTransfer(_from, _to, _value);
    }

    function validateTransfer(
        address _from,
        address _to,
        uint256 _value,
        bool _paused,
        uint256 _balanceFrom
    ) public virtual override onlyToken returns (bool) {
        uint256 code;
        string memory reason;

        (code, reason) = newPreTransferCheck(_from, _to, _value, _balanceFrom, _paused);
        require(code == 0, reason);

        return recordTransfer(_from, _to, _value);
    }

    function validateIssuance(
        address _to,
        uint256 _value,
        uint256 _issuanceTime
    ) public override onlyToken returns (bool) {
        uint256 code;
        string memory reason;

        uint256 authorizedSecurities = getComplianceConfigurationService().getAuthorizedSecurities();

        require(authorizedSecurities == 0 || getToken().totalSupply() + _value <= authorizedSecurities,
            MAX_AUTHORIZED_SECURITIES_EXCEEDED);

        (code, reason) = preIssuanceCheck(_to, _value);
        require(code == 0, reason);

        uint256 issuanceTime = validateIssuanceTime(_issuanceTime);
        return recordIssuance(_to, _value, issuanceTime);
    }

    function validateIssuanceWithNoCompliance(
        address _to,
        uint256 _value,
        uint256 _issuanceTime
    ) public override onlyToken returns (bool) {
        uint256 authorizedSecurities = getComplianceConfigurationService().getAuthorizedSecurities();

        require(authorizedSecurities == 0 || getToken().totalSupply() + _value <= authorizedSecurities,
            MAX_AUTHORIZED_SECURITIES_EXCEEDED);

        uint256 issuanceTime = validateIssuanceTime(_issuanceTime);
        return recordIssuance(_to, _value, issuanceTime);
    }

    function validateBurn(address _who, uint256 _value) public virtual override onlyToken returns (bool) {
        return recordBurn(_who, _value);
    }

    function validateSeize(
        address _from,
        address _to,
        uint256 _value
    ) public virtual override onlyToken returns (bool) {
        require(getWalletManager().isIssuerSpecialWallet(_to), "Target wallet type error");

        return recordSeize(_from, _to, _value);
    }

    /**
     * @dev Verify disallowBackDating compliance: if set to false returns _issuanceTime parameter, otherwise returns current timestamp
     * @param _issuanceTime.
     * @return issuanceTime
     */
    function validateIssuanceTime(uint256 _issuanceTime) public view override returns (uint256 issuanceTime) {
        if (!getComplianceConfigurationService().getDisallowBackDating()) {
            return _issuanceTime;
        }
        return block.timestamp;
    }

    function newPreTransferCheck(
        address _from,
        address _to,
        uint256 _value,
        uint256 _balanceFrom,
        bool _pausedToken
    ) public view virtual override returns (uint256 code, string memory reason) {
        if (_pausedToken) {
            return (10, TOKEN_PAUSED);
        }

        if (_balanceFrom < _value) {
            return (15, NOT_ENOUGH_TOKENS);
        }

        if (getLockManager().getTransferableTokens(_from, block.timestamp) < _value) {
            return (16, TOKENS_LOCKED);
        }

        return checkTransfer(_from, _to, _value);
    }

    function preTransferCheck(
        address _from,
        address _to,
        uint256 _value
    ) public view virtual override returns (uint256 code, string memory reason) {
        if (getToken().isPaused()) {
            return (10, TOKEN_PAUSED);
        }

        if (getToken().balanceOf(_from) < _value) {
            return (15, NOT_ENOUGH_TOKENS);
        }

        if (getLockManager().getTransferableTokens(_from, block.timestamp) < _value) {
            return (16, TOKENS_LOCKED);
        }

        return checkTransfer(_from, _to, _value);
    }

    function preInternalTransferCheck(
        address _from,
        address _to,
        uint256 _value
    ) public view virtual override returns (uint256 code, string memory reason) {
        if (getToken().isPaused()) {
            return (10, TOKEN_PAUSED);
        }

        return checkTransfer(_from, _to, _value);
    }

    function preIssuanceCheck(
        address, /*_to*/
        uint256 /*_value*/
    ) public view virtual override returns (uint256 code, string memory reason) {
        return (0, VALID);
    }

    function adjustInvestorCountsAfterCountryChange(
        string memory, /*_id*/
        string memory, /*_country*/
        string memory /*_prevCountry*/
    ) public virtual override returns (bool) {
        return true;
    }

    // These functions should be implemented by the concrete compliance manager
    function recordIssuance(
        address _to,
        uint256 _value,
        uint256 _issuanceTime
    ) internal virtual returns (bool);

    function recordTransfer(
        address _from,
        address _to,
        uint256 _value
    ) internal virtual returns (bool);

    function recordBurn(address _who, uint256 _value) internal virtual returns (bool);

    function recordSeize(
        address _from,
        address _to,
        uint256 _value
    ) internal virtual returns (bool);

    function checkTransfer(
        address _from,
        address _to,
        uint256 _value
    ) internal view virtual returns (uint256, string memory);
}
