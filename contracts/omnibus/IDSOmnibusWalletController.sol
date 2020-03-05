pragma solidity ^0.5.0;

import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";

contract IDSOmnibusWalletController is Initializable, VersionedContract {
    uint8 public constant BENEFICIARY = 0;
    uint8 public constant HOLDER_OF_RECORD = 1;

    constructor() internal {}

    function initialize() public isNotInitialized {
        VERSIONS.push(1);
    }

    function setAssetTrackingMode(uint8 _assetTrackingMode) public;

    function getWalletAssetTrackingMode() public view returns (uint8);

    function isHolderOfRecord() public view returns (bool);

    function getInvestorBalance(address _from) public view returns (uint256);

    function deposit(
        address _to,
        uint256 _value /*onlyToken*/
    ) public;

    function withdraw(
        address _from,
        uint256 _value /*onlyToken*/
    ) public;

    function seize(
        address _from,
        uint256 _value /*onlyToken*/
    ) public;

    function burn(
        address _from,
        uint256 _value /*onlyToken*/
    ) public;
}
