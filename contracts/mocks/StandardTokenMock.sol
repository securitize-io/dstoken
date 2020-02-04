pragma solidity ^0.5.0;

import "../token/StandardToken.sol";
import "../utils/ProxyTarget.sol";
import "../utils/Initializable.sol";

// mock class using StandardToken
contract StandardTokenMock is ProxyTarget, Initializable, StandardToken {
    function initialize(address _initialAccount, uint256 _initialBalance) public initializer onlyFromProxy {
        StandardToken.initialize();

        VERSIONS.push(1);
        walletsBalances[_initialAccount] = _initialBalance;
        totalSupply = _initialBalance;
    }
}
