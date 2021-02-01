pragma solidity 0.5.17;

import "./IDSOmnibusWalletController.sol";
import "../data-stores/OmnibusControllerDataStore.sol";
import "../service/ServiceConsumer.sol";
import "../utils/ProxyTarget.sol";

contract OmnibusWalletController is ProxyTarget, Initializable, IDSOmnibusWalletController, ServiceConsumer, OmnibusControllerDataStore {
    using SafeMath for uint256;

    modifier onlyOperatorOrAbove {
        IDSTrustService trustService = getTrustService();
        require(
            trustService.getRole(msg.sender) == trustService.ISSUER() ||
                trustService.getRole(msg.sender) == trustService.MASTER() ||
                trustService.isResourceOwner(omnibusWallet, msg.sender) ||
                trustService.isResourceOperator(omnibusWallet, msg.sender),
            "Insufficient trust level"
        );
        _;
    }

    modifier enoughBalance(address _who, uint256 _value) {
        require(balances[_who] >= _value, "Not enough balance");
        _;
    }

    function initialize(address _omnibusWallet) public initializer forceInitializeFromProxy {
        IDSOmnibusWalletController.initialize();
        ServiceConsumer.initialize();
        VERSIONS.push(2);

        omnibusWallet = _omnibusWallet;
    }

    function setAssetTrackingMode(uint8 _assetTrackingMode) public onlyOperatorOrAbove {
        require(_assetTrackingMode == BENEFICIARY || _assetTrackingMode == HOLDER_OF_RECORD, "Invalid tracking mode value");
        require(getToken().balanceOf(omnibusWallet) == 0, "Omnibus wallet must be empty");

        assetTrackingMode = _assetTrackingMode;
    }

    function getAssetTrackingMode() public view returns (uint8) {
        return assetTrackingMode;
    }

    function isHolderOfRecord() public view returns (bool) {
        return assetTrackingMode == HOLDER_OF_RECORD;
    }

    function balanceOf(address _who) public view returns (uint256) {
        return balances[_who];
    }

    function deposit(address _to, uint256 _value) public onlyToken {
        balances[_to] = balances[_to].add(_value);
    }

    function withdraw(address _from, uint256 _value) public enoughBalance(_from, _value) onlyToken {
        balances[_from] = balances[_from].sub(_value);
    }

    function transfer(address _from, address _to, uint256 _value) public onlyOperatorOrAbove enoughBalance(_from, _value) {
        balances[_from] = balances[_from].sub(_value);
        balances[_to] = balances[_to].add(_value);

        if (assetTrackingMode == BENEFICIARY) {
            getToken().updateOmnibusInvestorBalance(omnibusWallet, _from, _value, CommonUtils.IncDec.Decrease);
            getToken().updateOmnibusInvestorBalance(omnibusWallet, _to, _value, CommonUtils.IncDec.Increase);
        }

        getToken().emitOmnibusTransferEvent(omnibusWallet, _from, _to, _value);
    }

    function seize(address _from, uint256 _value) public enoughBalance(_from, _value) onlyToken {
        balances[_from] = balances[_from].sub(_value);
    }

    function burn(address _who, uint256 _value) public enoughBalance(_who, _value) onlyToken {
        balances[_who] = balances[_who].sub(_value);
    }
}
