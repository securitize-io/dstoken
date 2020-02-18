pragma solidity ^0.5.0;

import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";

contract IDSOmnibusWalletService is Initializable, VersionedContract {
    event OmnibusDeposit(address indexed omnibusWallet, address indexed to, uint256 value);
    event OmnibusWithdraw(address indexed omnibusWallet, address indexed from, uint256 value);
    event OmnibusSeize(address indexed omnibusWallet, address indexed from, uint256 value, string reason);

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
        address _to,
        uint256 _value /*onlyToken*/
    ) public;

    function withdraw(
        address _omnibusWallet,
        address _from,
        uint256 _value /*onlyToken*/
    ) public;

    function seize(
        address _omnibusWallet,
        address _from,
        uint256 _value, /*onlyToken*/
        string memory _reason
    ) public;
}
