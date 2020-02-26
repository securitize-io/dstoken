pragma solidity ^0.5.0;

import "./IDSOmnibusWalletController.sol";
import "../data-stores/OmnibusControllerDataStore.sol";
import "../service/ServiceConsumer.sol";
import "../utils/ProxyTarget.sol";

contract OmnibusWalletController is ProxyTarget, Initializable, IDSOmnibusWalletController, ServiceConsumer, OmnibusControllerDataStore {
    using SafeMath for uint256;

    modifier onlyOperator(address _operator) {
        require()
        _;
    }

    modifier enoughBalance(address _from, uint256 _value) {
        require(balances[_from] >= _value, "Omnibus wallet withdraw: not enough tokens");
        _;
    }

    function initialize(address _omnibusWallet) public initializer onlyFromProxy {
        IDSOmnibusWalletController.initialize();
        ServiceConsumer.initialize();
        VERSIONS.push(1);

        omnibusWallet = _omnibusWallet;
    }

    function setAssetTrackingMode(uint8 _assetTrackingMode) public {
        require(_assetTrackingMode == BENEFICIARY || _assetTrackingMode == HOLDER_OF_RECORD, "Invalid tracking mode value");

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
        emit OmnibusDeposit(omnibusWallet, _to, _value);
    }

    function withdraw(address _from, uint256 _value) public enoughBalance(_from, _value) onlyToken {
        balances[_from] = balances[_from].sub(_value);
        emit OmnibusWithdraw(omnibusWallet, _from, _value);
    }

    function seize(address _from, uint256 _value, string memory _reason) public enoughBalance(_from, _value) onlyToken {
        balances[_from] = balances[_from].sub(_value);
        emit OmnibusSeize(omnibusWallet, _from, _value, _reason);
    }

    function burn(address _who, uint256 _value, string memory _reason) public enoughBalance(_who, _value) onlyToken {
        balances[_who] = balances[_who].sub(_value);
        emit OmnibusBurn(omnibusWallet, _who, _value, _reason);
    }
}
