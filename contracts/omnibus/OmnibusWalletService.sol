pragma solidity ^0.5.0;

import "./IDSOmnibusWalletService.sol";
import "../data-stores/OmnibusServiceDataStore.sol";
import "../service/ServiceConsumer.sol";
import "../utils/ProxyTarget.sol";

contract OmnibusWalletService is ProxyTarget, Initializable, IDSOmnibusWalletService, ServiceConsumer, OmnibusServiceDataStore {
    using SafeMath for uint256;

    function initialize() public initializer onlyFromProxy {
        IDSOmnibusWalletService.initialize();
        ServiceConsumer.initialize();
        VERSIONS.push(1);
    }

    function setAssetTrackingMode(address _omnibusWallet, uint8 _assetTrackingMode) public {
        require(_assetTrackingMode == BENEFICIAL || _assetTrackingMode == HOLDER_OF_RECORD, "Invalid tracking mode value");

        wallets[_omnibusWallet].assetTrackingMode = _assetTrackingMode;
    }

    function getWalletAssetTrackingMode(address _omnibusWallet) public returns (uint8) {
        return wallets[_omnibusWallet].assetTrackingMode;
    }

    function deposit(address _omnibusWallet, string memory _investorId, uint256 _value) public onlyToken {
        wallets[_omnibusWallet].balances[_investorId] = wallets[_omnibusWallet].balances[_investorId].add(_value);
    }
}
