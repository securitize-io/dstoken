pragma solidity ^0.5.0;

import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";

contract IDSOmnibusWalletController is Initializable, VersionedContract {
    event OmnibusDeposit(address indexed omnibusWallet, address to, uint256 value);
    event OmnibusWithdraw(address indexed omnibusWallet, address from, uint256 value);
    event OmnibusTransfer(address indexed omnibusWallet, address from, address to, uint256 value);
    event OmnibusSeize(address indexed omnibusWallet, address from, uint256 value, string reason);
    event OmnibusBurn(address indexed omnibusWallet, address who, uint256 value, string reason);

    uint8 public constant BENEFICIARY = 0;
    uint8 public constant HOLDER_OF_RECORD = 1;

    constructor() internal {}

    function initialize() public isNotInitialized {
        VERSIONS.push(1);
    }

    modifier onlyOperatorOrAbove(address _operator) {
        require(false);
        _;
    }

    modifier enoughBalance(address _from, uint256 _value) {
        require(false);
        _;
    }

    function setAssetTrackingMode(uint8 _assetTrackingMode) public;

    function isHolderOfRecord() public view returns (bool);

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
        uint256 _value, /*onlyToken*/
        string memory _reason
    ) public;

    function burn(
        address _from,
        uint256 _value, /*onlyToken*/
        string memory _reason
    ) public;
}
