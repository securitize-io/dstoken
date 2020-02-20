pragma solidity ^0.5.0;

import "./IDSOmnibusWalletService.sol";
import "../data-stores/OmnibusServiceDataStore.sol";
import "../service/ServiceConsumer.sol";
import "../utils/ProxyTarget.sol";

contract OmnibusWalletService is ProxyTarget, Initializable, IDSOmnibusWalletService, ServiceConsumer, OmnibusServiceDataStore {
    using SafeMath for uint256;

    modifier enoughBalance(address _omnibusWallet, address _from, uint256 _value) {
        require(wallets[_omnibusWallet].balances[_from] >= _value, "Omnibus wallet withdraw: not enough tokens");
        _;
    }

    function initialize() public initializer onlyFromProxy {
        IDSOmnibusWalletService.initialize();
        ServiceConsumer.initialize();
        VERSIONS.push(1);
    }

    function setAssetTrackingMode(address _omnibusWallet, uint8 _assetTrackingMode) public {
        require(_assetTrackingMode == BENEFICIAL || _assetTrackingMode == HOLDER_OF_RECORD, "Invalid tracking mode value");

        wallets[_omnibusWallet].assetTrackingMode = _assetTrackingMode;
    }

    function getWalletAssetTrackingMode(address _omnibusWallet) public view returns (uint8) {
        return wallets[_omnibusWallet].assetTrackingMode;
    }

    function isHolderOfRecord(address _omnibusWallet) public view returns (bool) {
        return wallets[_omnibusWallet].assetTrackingMode == HOLDER_OF_RECORD;
    }

    function deposit(address _omnibusWallet, address _to, uint256 _value) public onlyToken {
        wallets[_omnibusWallet].balances[_to] = wallets[_omnibusWallet].balances[_to].add(_value);
        emit OmnibusDeposit(_omnibusWallet, _to, _value);
    }

    function withdraw(address _omnibusWallet, address _from, uint256 _value) public enoughBalance(_omnibusWallet, _from, _value) onlyToken {
        wallets[_omnibusWallet].balances[_from] = wallets[_omnibusWallet].balances[_from].sub(_value);
        emit OmnibusWithdraw(_omnibusWallet, _from, _value);
    }

    function seize(address _omnibusWallet, address _from, uint256 _value, string memory _reason) public enoughBalance(_omnibusWallet, _from, _value) onlyToken {
        wallets[_omnibusWallet].balances[_from] = wallets[_omnibusWallet].balances[_from].sub(_value);
        emit OmnibusSeize(_omnibusWallet, _from, _value, _reason);
    }

    function burn(address _omnibusWallet, address _who, uint256 _value, string memory _reason) public enoughBalance(_omnibusWallet, _who, _value) onlyToken {
        wallets[_omnibusWallet].balances[_who] = wallets[_omnibusWallet].balances[_who].sub(_value);
        emit OmnibusBurn(_omnibusWallet, _who, _value, _reason);
    }
}
