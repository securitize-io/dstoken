pragma solidity ^0.5.0;

import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";

contract IDSOmnibusWalletService is Initializable, VersionedContract {
    uint8 public constant BENEFICIAL = 0;
    uint8 public constant HOLDER_OF_RECORD = 1;

    constructor() internal {}

    function initialize() public isNotInitialized {
        VERSIONS.push(1);
    }

    function setAssetTrackingMode(address _omnibusWallet, uint8 _assetTrackingMode) public;
    function getWalletAssetTrackingMode(address omnibusWallet) public returns (uint8);
    function deposit(
        address _omnibusWallet,
        string memory _investorId,
        uint256 _value /*onlyToken*/
    ) public;
}
