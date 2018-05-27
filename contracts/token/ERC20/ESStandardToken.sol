pragma solidity ^0.4.23;

import "./ESBasicToken.sol";
import "./ERC20.sol";

contract ESStandardToken is ERC20, ESBasicToken {

  mapping (address => mapping (address => uint256)) internal allowed;

  function transferFrom(
    address _from,
    address _to,
    uint256 _value
  )
    public
    returns (bool)
  {
    require(_to != address(0));
    require(_value <= _storage.getUint(keccak256("balances", _from)));
    require(_value <= _storage.getUint(keccak256("allowed", _from, msg.sender)));

    _storage.setUint(keccak256("balances", _from), _storage.getUint(keccak256("balances", _from)).sub(_value));
    _storage.setUint(keccak256("balances", _to), _storage.getUint(keccak256("balances", _to)).add(_value));
    _storage.setUint(keccak256("allowed", _from, msg.sender), _storage.getUint(keccak256("allowed", _from, msg.sender)).sub(_value));
    emit Transfer(_from, _to, _value);
    return true;
  }

  function approve(address _spender, uint256 _value) public returns (bool) {
    _storage.setUint(keccak256("allowed", msg.sender, _spender), _value);
    emit Approval(msg.sender, _spender, _value);
    return true;
  }

  function allowance(
    address _owner,
    address _spender
   )
    public
    view
    returns (uint256)
  {
    return _storage.getUint(keccak256("allowed", _owner, _spender));
  }

  function increaseApproval(
    address _spender,
    uint _addedValue
  )
    public
    returns (bool)
  {
    _storage.setUint(keccak256("allowed", msg.sender, _spender), _storage.getUint(keccak256("allowed", msg.sender, _spender)).add(_addedValue));
    emit Approval(msg.sender, _spender, _storage.getUint(keccak256("allowed", msg.sender, _spender)));
    return true;
  }

  function decreaseApproval(
    address _spender,
    uint _subtractedValue
  )
    public
    returns (bool)
  {
    uint oldValue = _storage.getUint(keccak256("allowed", msg.sender, _spender));
    if (_subtractedValue > oldValue) {
      _storage.setUint(keccak256("allowed", msg.sender, _spender), 0);
    } else {
      _storage.setUint(keccak256("allowed", msg.sender, _spender), oldValue.sub(_subtractedValue));
    }
    emit Approval(msg.sender, _spender, _storage.getUint(keccak256("allowed", msg.sender, _spender)));
    return true;
  }
}
