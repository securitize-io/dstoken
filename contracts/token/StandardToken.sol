pragma solidity ^0.8.20;

import "../data-stores/TokenDataStore.sol";
import "../omnibus/OmnibusTBEController.sol";

//SPDX-License-Identifier: GPL-3.0
abstract contract StandardToken is IDSToken, TokenDataStore, BaseDSContract {
    event Pause();
    event Unpause();

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier whenPaused() {
        require(paused, "Contract is not paused");
        _;
    }

    function __StandardToken_init() public onlyProxy onlyInitializing {
        __BaseDSContract_init();
    }

    function pause() public onlyTransferAgentOrAbove whenNotPaused {
        paused = true;
        emit Pause();
    }

    function unpause() public onlyTransferAgentOrAbove whenPaused {
        paused = false;
        emit Unpause();
    }

    function isPaused() public view override returns (bool) {
        return paused;
    }

    /**
     * @dev Gets the balance of the specified address.
     * @param _owner The address to query the the balance of.
     * @return An uint256 representing the amount owned by the passed address.
     */
    function balanceOf(address _owner) public view returns (uint256) {
        return tokenData.walletsBalances[_owner];
    }

    function totalSupply() public view returns (uint256) {
        return tokenData.totalSupply;
    }

    /**
     * @dev transfer token for a specified address
     * @param _to The address to transfer to.
     * @param _value The amount to be transferred.
     */
    function transfer(address _to, uint256 _value) public virtual returns (bool) {
        return transferImpl(msg.sender, _to, _value);
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) public virtual returns (bool) {
        IDSOmnibusTBEController tbeController = getOmnibusTBEController();
        if (!(msg.sender == address(tbeController) && _from == tbeController.getOmnibusWallet())) {
            require(_value <= allowances[_from][msg.sender], "Not enough allowance");
            allowances[_from][msg.sender] -= _value;
        }
        return transferImpl(_from, _to, _value);
    }

    function transferImpl(
        address _from,
        address _to,
        uint256 _value
    ) internal returns (bool) {
        require(_to != address(0));
        require(_value <= tokenData.walletsBalances[_from]);

        tokenData.walletsBalances[_from] -= _value;
        tokenData.walletsBalances[_to] += _value;

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
        allowances[msg.sender][_spender] = allowances[msg.sender][_spender] + _addedValue;
        emit Approval(msg.sender, _spender, allowances[msg.sender][_spender]);
        return true;
    }

    function decreaseApproval(address _spender, uint256 _subtractedValue) public returns (bool) {
        uint256 oldValue = allowances[msg.sender][_spender];
        if (_subtractedValue > oldValue) {
            allowances[msg.sender][_spender] = 0;
        } else {
            allowances[msg.sender][_spender] = oldValue - _subtractedValue;
        }
        emit Approval(msg.sender, _spender, allowances[msg.sender][_spender]);
        return true;
    }
}
