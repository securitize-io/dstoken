pragma solidity ^0.5.0;

import "./IDSOmnibusWalletController.sol";
import "../data-stores/OmnibusControllerDataStore.sol";
import "../service/ServiceConsumer.sol";
import "../utils/ProxyTarget.sol";

contract OmnibusWalletController is ProxyTarget, Initializable, IDSOmnibusWalletController, ServiceConsumer, OmnibusControllerDataStore {
    using SafeMath for uint256;

    modifier enoughBalance(address _from, uint256 _value) {
        require(balances[_from] >= _value, "Omnibus wallet withdraw: not enough tokens");
        _;
    }

    function initialize() public initializer onlyFromProxy {
        IDSOmnibusWalletController.initialize();
        ServiceConsumer.initialize();
        VERSIONS.push(1);
    }

    function setAssetTrackingMode(uint8 _assetTrackingMode) public {
        require(_assetTrackingMode == BENEFICIARY || _assetTrackingMode == HOLDER_OF_RECORD, "Invalid tracking mode value");

        assetTrackingMode = _assetTrackingMode;
    }

    function getWalletAssetTrackingMode(address _omnibusWallet) public view returns (uint8) {
        return assetTrackingMode;
    }

    function isHolderOfRecord(address _omnibusWallet) public view returns (bool) {
        return assetTrackingMode == HOLDER_OF_RECORD;
    }

    function getInvestorBalance(address _from) public view returns (uint256) {
        return balances[_from];
    }

    function deposit(address _to, uint256 _value) public onlyToken {
        balances[_to] = balances[_to].add(_value);
        emit OmnibusDeposit(address(this), _to, _value);
    }

    function withdraw(address _from, uint256 _value) public enoughBalance(_from, _value) onlyToken {
        balances[_from] = balances[_from].sub(_value);
        emit OmnibusWithdraw(address(this), _from, _value);
    }

    function seize(address _from, uint256 _value, string memory _reason) public enoughBalance(_from, _value) onlyToken {
        balances[_from] = balances[_from].sub(_value);
        emit OmnibusSeize(address(this), _from, _value, _reason);
    }

    function burn(address _who, uint256 _value, string memory _reason) public enoughBalance(_who, _value) onlyToken {
        balances[_who] = balances[_who].sub(_value);
        emit OmnibusBurn(address(this), _who, _value, _reason);
    }
}
