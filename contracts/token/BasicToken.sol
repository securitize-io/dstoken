pragma solidity ^0.5.0;

import "../utils/VersionedContract.sol";
import "../zeppelin/token/ERC20/IERC20.sol";
import "../data-stores/TokenDataStore.sol";
import "../service/ServiceConsumer.sol";

/**
 * @title Basic token
 * @dev Basic version of StandardToken, with no allowances.
 */
contract BasicToken is IERC20, VersionedContract, ServiceConsumer, TokenDataStore {
    constructor() internal {}

    function initialize() public isNotInitialized {
        ServiceConsumer.initialize();
        VERSIONS.push(2);
    }
}
