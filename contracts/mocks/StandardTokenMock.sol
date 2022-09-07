pragma solidity ^0.8.13;

import "../token/StandardToken.sol";
import "../utils/ProxyTarget.sol";
import "../utils/Initializable.sol";

// mock class using StandardToken
//SPDX-License-Identifier: UNLICENSED
contract StandardTokenMock is ProxyTarget, Initializable, StandardToken {
    function initialize(address _initialAccount, uint256 _initialBalance) public initializer forceInitializeFromProxy {
        StandardToken.initialize();

        VERSIONS.push(2);
        tokenData.walletsBalances[_initialAccount] = _initialBalance;
        tokenData.totalSupply = _initialBalance;
    }
}
