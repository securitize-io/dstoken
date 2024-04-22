pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../utils/VersionedContract.sol";

//SPDX-License-Identifier: UNLICENSED
abstract contract IDSOmnibusWalletController is Initializable, VersionedContract {
    uint8 public constant BENEFICIARY = 0;
    uint8 public constant HOLDER_OF_RECORD = 1;

    function initialize(address _omnibusWallet) public virtual;

    function setAssetTrackingMode(uint8 _assetTrackingMode) public virtual;

    function getAssetTrackingMode() public view virtual returns (uint8);

    function isHolderOfRecord() public view virtual returns (bool);

    function balanceOf(address _who) public view virtual returns (uint256);

    function transfer(
        address _from,
        address _to,
        uint256 _value /*onlyOperator*/
    ) public virtual;

    function deposit(
        address _to,
        uint256 _value /*onlyToken*/
    ) public virtual;

    function withdraw(
        address _from,
        uint256 _value /*onlyToken*/
    ) public virtual;

    function seize(
        address _from,
        uint256 _value /*onlyToken*/
    ) public virtual;

    function burn(
        address _from,
        uint256 _value /*onlyToken*/
    ) public virtual;
}
