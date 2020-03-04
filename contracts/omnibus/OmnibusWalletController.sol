pragma solidity ^0.5.0;

import "./IDSOmnibusWalletController.sol";
import "../data-stores/OmnibusControllerDataStore.sol";
import "../service/ServiceConsumer.sol";
import "../utils/ProxyTarget.sol";

contract OmnibusWalletController is ProxyTarget, Initializable, IDSOmnibusWalletController, ServiceConsumer, OmnibusControllerDataStore {
    using SafeMath for uint256;

    modifier onlyOperatorOrAbove(address _operator) {
        IDSTrustService trustService = getTrustService();
        require(
            trustService.getRole(_operator) == trustService.ISSUER() ||
                trustService.getRole(_operator) == trustService.MASTER() ||
                trustService.isEntityOwner(omnibusWallet, _operator) ||
                trustService.isResourceOperator(omnibusWallet, _operator),
            "Insufficient trust level"
        );
        _;
    }

    modifier enoughBalance(address _from, uint256 _value) {
        require(balances[_from] >= _value, "Not enough balance");
        _;
    }

    function initialize(address _omnibusWallet) public initializer onlyFromProxy {
        IDSOmnibusWalletController.initialize();
        ServiceConsumer.initialize();
        VERSIONS.push(1);

        omnibusWallet = _omnibusWallet;
    }

    function setAssetTrackingMode(uint8 _assetTrackingMode) public onlyOperatorOrAbove(msg.sender) {
        require(_assetTrackingMode == BENEFICIARY || _assetTrackingMode == HOLDER_OF_RECORD, "Invalid tracking mode value");
        require(getToken().balanceOf(omnibusWallet) == 0, "Omnibus wallet must be empty");

        assetTrackingMode = _assetTrackingMode;
    }

    function getWalletAssetTrackingMode() public view returns (uint8) {
        return assetTrackingMode;
    }

    function isHolderOfRecord() public view returns (bool) {
        return assetTrackingMode == HOLDER_OF_RECORD;
    }

    function getInvestorBalance(address _from) public view returns (uint256) {
        return balances[_from];
    }

    function deposit(address _to, uint256 _value) public onlyToken {
        balances[_to] = balances[_to].add(_value);
    }

    function withdraw(address _from, uint256 _value) public enoughBalance(_from, _value) onlyToken {
        balances[_from] = balances[_from].sub(_value);
    }

    function transfer(address _from, address _to, uint256 _value) public onlyOperatorOrAbove(msg.sender) enoughBalance(_from, _value) {
        getComplianceService().validateOmnibusInternalTransfer(omnibusWallet, _from, _to, _value);
        balances[_from] = balances[_from].sub(_value);
        balances[_to] = balances[_to].add(_value);

        if (assetTrackingMode == BENEFICIARY) {
            getToken().updateOmnibusInvestorBalance(omnibusWallet, _from, _value, false);
            getToken().updateOmnibusInvestorBalance(omnibusWallet, _to, _value, true);
        }

        emit OmnibusTransfer(omnibusWallet, _from, _to);
    }

    function seize(address _from, uint256 _value, string memory _reason) public enoughBalance(_from, _value) onlyToken {
        balances[_from] = balances[_from].sub(_value);
    }

    function burn(address _who, uint256 _value, string memory _reason) public enoughBalance(_who, _value) onlyToken {
        balances[_who] = balances[_who].sub(_value);
    }
}
