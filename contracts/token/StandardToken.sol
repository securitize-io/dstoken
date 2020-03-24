pragma solidity ^0.5.0;

import "./BasicToken.sol";
import "../service/ServiceConsumer.sol";

contract StandardToken is IERC20, VersionedContract, ServiceConsumer, TokenDataStore {
    event Pause();
    event Unpause();

    constructor() internal {}

    function initialize() public isNotInitialized {
        ServiceConsumer.initialize();
        VERSIONS.push(2);
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier whenPaused() {
        require(paused, "Contract is not paused");
        _;
    }

    function pause() public onlyOwner whenNotPaused {
        paused = true;
        emit Pause();
    }

    function unpause() public onlyOwner whenPaused {
        paused = false;
        emit Unpause();
    }

    function isPaused() public view returns (bool) {
        return paused;
    }

    /**
  * @dev transfer token for a specified address
  * @param _to The address to transfer to.
  * @param _value The amount to be transferred.
  */
    function transfer(address _to, uint256 _value) public returns (bool) {
        require(_to != address(0));
        require(_value <= tokenData.walletsBalances[msg.sender]);

        tokenData.walletsBalances[msg.sender] = tokenData.walletsBalances[msg.sender].sub(_value);
        tokenData.walletsBalances[_to] = tokenData.walletsBalances[_to].add(_value);

        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    /**
  * @dev Gets the balance of the specified address.
  * @param _owner The address to query the the balance of.
  * @return An uint256 representing the amount owned by the passed address.
  */
    function balanceOf(address _owner) public view returns (uint256) {
        return tokenData.walletsBalances[_owner];
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(_to != address(0));
        require(_value <= tokenData.walletsBalances[_from]);
        require(_value <= allowances[_from][msg.sender]);

        tokenData.walletsBalances[_from] = tokenData.walletsBalances[_from].sub(_value);
        tokenData.walletsBalances[_to] = tokenData.walletsBalances[_to].add(_value);
        allowances[_from][msg.sender] = allowances[_from][msg.sender].sub(_value);
        emit Transfer(_from, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) public returns (bool) {
        allowances[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function allowance(address _owner, address _spender) public view returns (uint256) {
        return allowances[_owner][_spender];
    }

    function increaseApproval(address _spender, uint256 _addedValue) public returns (bool) {
        allowances[msg.sender][_spender] = allowances[msg.sender][_spender].add(_addedValue);
        emit Approval(msg.sender, _spender, allowances[msg.sender][_spender]);
        return true;
    }

    function decreaseApproval(address _spender, uint256 _subtractedValue) public returns (bool) {
        uint256 oldValue = allowances[msg.sender][_spender];
        if (_subtractedValue > oldValue) {
            allowances[msg.sender][_spender] = 0;
        } else {
            allowances[msg.sender][_spender] = oldValue.sub(_subtractedValue);
        }
        emit Approval(msg.sender, _spender, allowances[msg.sender][_spender]);
        return true;
    }
}
