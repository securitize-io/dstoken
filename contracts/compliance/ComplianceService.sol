pragma solidity ^0.5.0;

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
    function initialize() public onlyFromProxy {
        IDSComplianceService.initialize();
        ServiceConsumer.initialize();
        VERSIONS.push(4);
    }

    function validateTransfer(address _from, address _to, uint256 _value) public onlyToken returns (bool) {
        uint256 code;
        string memory reason;

        (code, reason) = preTransferCheck(_from, _to, _value);
        require(code == 0, reason);
        require(recordTransfer(_from, _to, _value));

        return true;
    }

    function validateOmnibusInternalTransfer(address _omnibusWallet, address _from, address _to, uint256 _value)
        public
        onlyOmnibusWalletController(_omnibusWallet, IDSOmnibusWalletController(msg.sender))
        returns (bool)
    {
        uint256 code;
        string memory reason;

        (code, reason) = preInternalTransferCheck(_from, _to, _value, _omnibusWallet);
        require(code == 0, reason);

        if (!getRegistryService().getOmnibusWalletController(_omnibusWallet).isHolderOfRecord()) {
            require(recordTransfer(_from, _to, _value));
        }

        return true;
    }

    function validateIssuance(address _to, uint256 _value, uint256 _issuanceTime) public onlyToken returns (bool) {
        require(!getRegistryService().isOmnibusWallet(_to));

        uint256 code;
        string memory reason;

        (code, reason) = preIssuanceCheck(_to, _value);
        require(code == 0, reason);
        require(recordIssuance(_to, _value, _issuanceTime));

        return true;
    }

    function validateBurn(address _who, uint256 _value) public onlyToken returns (bool) {
        require(!getRegistryService().isOmnibusWallet(_who));
        require(recordBurn(_who, _value));

        return true;
    }

    function validateOmnibusBurn(address _omnibusWallet, address _who, uint256 _value) public onlyToken returns (bool) {
        IDSRegistryService registryService = getRegistryService();
        require(registryService.isOmnibusWallet(_omnibusWallet));
        require(!registryService.isOmnibusWallet(_who));
        require(registryService.getOmnibusWalletController(_omnibusWallet).balanceOf(_who) >= _value);

        require(recordOmnibusBurn(_omnibusWallet, _who, _value));

        return true;
    }

    function validateSeize(address _from, address _to, uint256 _value) public onlyToken returns (bool) {
        IDSWalletManager walletManager = getWalletManager();
        require(!getRegistryService().isOmnibusWallet(_from));
        require(walletManager.getWalletType(_to) == walletManager.ISSUER());
        require(recordSeize(_from, _to, _value));

        return true;
    }

    function validateOmnibusSeize(address _omnibusWallet, address _from, address _to, uint256 _value) public onlyToken returns (bool) {
        IDSRegistryService registryService = getRegistryService();
        IDSWalletManager walletManager = getWalletManager();
        require(registryService.isOmnibusWallet(_omnibusWallet));
        require(!registryService.isOmnibusWallet(_from));
        require(walletManager.getWalletType(_to) == walletManager.ISSUER());
        require(registryService.getOmnibusWalletController(_omnibusWallet).balanceOf(_from) >= _value);

        require(recordOmnibusSeize(_omnibusWallet, _from, _to, _value));

        return true;
    }

    function preTransferCheck(address _from, address _to, uint256 _value) public view returns (uint256 code, string memory reason) {
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

    function preInternalTransferCheck(address _from, address _to, uint256 _value, address) public view returns (uint256 code, string memory reason) {
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
    function recordIssuance(address _to, uint256 _value, uint256 _issuanceTime) internal returns (bool);

    function recordTransfer(address _from, address _to, uint256 _value) internal returns (bool);

    function recordBurn(address _who, uint256 _value) internal returns (bool);

    function recordOmnibusBurn(address _omnibusWallet, address _who, uint256 _value) internal returns (bool);

    function recordSeize(address _from, address _to, uint256 _value) internal returns (bool);

    function recordOmnibusSeize(address _omnibusWallet, address _from, address _to, uint256 _value) internal returns (bool);

    function checkTransfer(address _from, address _to, uint256 _value) internal view returns (uint256, string memory);
}
