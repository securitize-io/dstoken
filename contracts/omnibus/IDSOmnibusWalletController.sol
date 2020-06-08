pragma solidity 0.5.17;

import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";


contract IDSOmnibusWalletController is Initializable, VersionedContract {
    uint8 public constant BENEFICIARY = 0;
    uint8 public constant HOLDER_OF_RECORD = 1;

    constructor() internal {}

    function initialize() public {
        VERSIONS.push(2);
    }

    modifier onlyOperatorOrAbove {
        require(false, "Not implemented");
        _;
    }

    modifier enoughBalance(address _who, uint256 _value) {
        require(false, "Not implemented");
        _;
    }

    function setAssetTrackingMode(uint8 _assetTrackingMode) public;

    function getAssetTrackingMode() public view returns (uint8);

    function isHolderOfRecord() public view returns (bool);

    function balanceOf(address _who) public view returns (uint256);

    function transfer(
        address _from,
        address _to,
        uint256 _value /*onlyOperator*/
    ) public;

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
