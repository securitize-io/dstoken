pragma solidity 0.5.17;

import "../utils/ProxyTarget.sol";
import "./IDSComplianceService.sol";
import "../service/ServiceConsumer.sol";
import "../data-stores/ComplianceServiceDataStore.sol";

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
contract ComplianceService is ProxyTarget, Initializable, IDSComplianceService, ServiceConsumer, ComplianceServiceDataStore {
    function initialize() public forceInitializeFromProxy {
        IDSComplianceService.initialize();
        ServiceConsumer.initialize();
        VERSIONS.push(6);
    }

    function validateTransfer(
        address _from,
        address _to,
        uint256 _value
    ) public onlyToken returns (bool) {
        uint256 code;
        string memory reason;

        (code, reason) = preTransferCheck(_from, _to, _value);
        require(code == 0, reason);

        return recordTransfer(_from, _to, _value);
    }

    function validateIssuance(
        address _to,
        uint256 _value,
        uint256 _issuanceTime
    ) public onlyToken returns (bool) {
        uint256 code;
        string memory reason;

        uint256 authorizedSecurities = getComplianceConfigurationService().getAuthorizedSecurities();

        require(authorizedSecurities == 0 || getToken().totalSupply().add(_value) <= authorizedSecurities,
            MAX_AUTHORIZED_SECURITIES_EXCEEDED);

        (code, reason) = preIssuanceCheck(_to, _value);
        require(code == 0, reason);

        return recordIssuance(_to, _value, _issuanceTime);
    }

    function validateBurn(address _who, uint256 _value) public onlyToken returns (bool) {
        return recordBurn(_who, _value);
    }

    function validateSeize(
        address _from,
        address _to,
        uint256 _value
    ) public onlyToken returns (bool) {
        IDSWalletManager walletManager = getWalletManager();
        require(walletManager.getWalletType(_to) == walletManager.ISSUER(), "Target wallet type error");

        return recordSeize(_from, _to, _value);
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

        if (getLockManager().getTransferableTokens(_from, uint64(now)) < _value) {
            return (16, TOKENS_LOCKED);
        }

        return checkTransfer(_from, _to, _value);
    }

    function preInternalTransferCheck(
        address _from,
        address _to,
        uint256 _value
    ) public view returns (uint256 code, string memory reason) {
        if (getToken().isPaused()) {
            return (10, TOKEN_PAUSED);
        }

        return checkTransfer(_from, _to, _value);
    }

    function preIssuanceCheck(
        address, /*_to*/
        uint256 /*_value*/
    ) public view returns (uint256 code, string memory reason) {
        return (0, VALID);
    }

    function adjustInvestorCountsAfterCountryChange(
        string memory, /*_id*/
        string memory, /*_country*/
        string memory /*_prevCountry*/
    ) public returns (bool) {
        return true;
    }

    // These functions should be implemented by the concrete compliance manager
    function recordIssuance(
        address _to,
        uint256 _value,
        uint256 _issuanceTime
    ) internal returns (bool);

    function recordTransfer(
        address _from,
        address _to,
        uint256 _value
    ) internal returns (bool);

    function recordBurn(address _who, uint256 _value) internal returns (bool);

    function recordSeize(
        address _from,
        address _to,
        uint256 _value
    ) internal returns (bool);

    function checkTransfer(
        address _from,
        address _to,
        uint256 _value
    ) internal view returns (uint256, string memory);
}
