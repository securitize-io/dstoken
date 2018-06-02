pragma solidity ^0.4.23;


import "./ERC20Basic.sol";
import "../../math/SafeMath.sol";
import "../../storage/EternalStorageUser.sol";


/**
 * @title Basic token
 * @dev Basic version of StandardToken, with no allowances.
 */
contract ESBasicToken is ERC20Basic, EternalStorageUser {
  using SafeMath for uint256;

  /**
  * @dev total number of tokens in existence
  */
  function totalSupply() public view returns (uint256) {
    return getUint(keccak256("totalSupply"));
  }

  /**
  * @dev transfer token for a specified address
  * @param _to The address to transfer to.
  * @param _value The amount to be transferred.
  */
  function transfer(address _to, uint256 _value) public returns (bool) {
    require(_to != address(0));
    require(_value <= getUint(keccak256("balances", msg.sender)));

    setUint(keccak256("balances", msg.sender), getUint(keccak256("balances", msg.sender)).sub(_value));
    setUint(keccak256("balances", _to), getUint(keccak256("balances", _to)).add(_value));
    emit Transfer(msg.sender, _to, _value);
    return true;
  }

  /**
  * @dev Gets the balance of the specified address.
  * @param _owner The address to query the the balance of.
  * @return An uint256 representing the amount owned by the passed address.
  */
  function balanceOf(address _owner) public view returns (uint256) {
    return getUint(keccak256("balances", _owner));
  }
}
