pragma solidity ^0.8.13;

import "../token/StandardToken.sol";
import "../utils/ProxyTarget.sol";
import "../utils/Initializable.sol";
import "../token/DSToken.sol";

// mock class using StandardToken
//SPDX-License-Identifier: UNLICENSED
contract StandardTokenMock is ProxyTarget, Initializable, DSToken {
    function initialize(address _initialAccount, uint256 _initialBalance) public initializer forceInitializeFromProxy {
        DSToken.initialize('mock', 'MOCK', 2);

        VERSIONS.push(2);
        tokenData.walletsBalances[_initialAccount] = _initialBalance;
        tokenData.totalSupply = _initialBalance;
    }
}
