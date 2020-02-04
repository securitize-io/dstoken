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

    /**
  * @dev transfer token for a specified address
  * @param _to The address to transfer to.
  * @param _value The amount to be transferred.
  */
    function transfer(address _to, uint256 _value) public returns (bool) {
        require(_to != address(0));
        require(_value <= walletsBalances[msg.sender]);

        walletsBalances[msg.sender] = walletsBalances[msg.sender].sub(_value);
        walletsBalances[_to] = walletsBalances[_to].add(_value);

        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    /**
  * @dev Gets the balance of the specified address.
  * @param _owner The address to query the the balance of.
  * @return An uint256 representing the amount owned by the passed address.
  */
    function balanceOf(address _owner) public view returns (uint256) {
        return walletsBalances[_owner];
    }
}
