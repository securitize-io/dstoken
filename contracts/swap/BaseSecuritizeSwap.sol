pragma solidity ^0.8.20;

import "../token/IDSToken.sol";

//SPDX-License-Identifier: GPL-3.0
abstract contract BaseSecuritizeSwap {
    IDSToken public dsToken;
    IERC20 public stableCoinToken;
    address public issuerWallet;

    function initialize(address _dsToken, address _stableCoin, address _issuerWallet) public virtual;
}
