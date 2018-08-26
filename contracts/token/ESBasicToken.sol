pragma solidity ^0.4.23;


import "../zeppelin/token/ERC20/ERC20Basic.sol";
import "../zeppelin/math/SafeMath.sol";
import "../storage/EternalStorageClient.sol";


/**
 * @title Basic token
 * @dev Basic version of StandardToken, with no allowances.
 */
contract ESBasicToken is ERC20Basic, EternalStorageClient {

  using SafeMath for uint256;

  string public constant TOTAL_SUPPLY = "totalSupply";
  string public constant BALANCES = "balances";

  /**
  * @dev total number of tokens in existence
  */
  function totalSupply() public view returns (uint256) {
    return getUint(TOTAL_SUPPLY);
  }

  /**
  * @dev transfer token for a specified address
  * @param _to The address to transfer to.
  * @param _value The amount to be transferred.
  */
  function transfer(address _to, uint256 _value) public returns (bool) {
    require(_to != address(0));
    require(_value <= getUint(BALANCES, msg.sender));

    setUint(BALANCES, msg.sender, getUint(BALANCES, msg.sender).sub(_value));
    setUint(BALANCES, _to, getUint(BALANCES, _to).add(_value));
    emit Transfer(msg.sender, _to, _value);
    return true;
  }

  /**
  * @dev Gets the balance of the specified address.
  * @param _owner The address to query the the balance of.
  * @return An uint256 representing the amount owned by the passed address.
  */
  function balanceOf(address _owner) public view returns (uint256) {
    return getUint(BALANCES, _owner);
  }
}
