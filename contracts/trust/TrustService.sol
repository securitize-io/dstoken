pragma solidity ^0.5.0;

import "../utils/ProxyTarget.sol";
import "./IDSTrustService.sol";
import "../data-stores/TrustServiceDataStore.sol";

/**
 * @title TrustService
 * @dev A trust service which allows role-based access control for other contracts.
 * @dev Implements IDSTrustService.
 */
contract TrustService is ProxyTarget, Initializable, IDSTrustService, TrustServiceDataStore {
    function initialize() public initializer onlyFromProxy {
        IDSTrustService.initialize();
        VERSIONS.push(2);
        owner = msg.sender;
        roles[msg.sender] = MASTER;
    }

    /**
   * @dev Allow invoking of functions only by the user who has the MASTER role.
   */
    modifier onlyMaster() {
        require(roles[msg.sender] == MASTER);
        _;
    }

    /**
   * @dev Allow invoking of functions only by the users who have the MASTER role or the ISSUER role.
   */
    modifier onlyMasterOrIssuer() {
        require(roles[msg.sender] == MASTER || roles[msg.sender] == ISSUER);
        _;
    }

    /**
   * @dev Sets or removes a role for a wallet. (internal)
   * @param _address The wallet whose role needs to be set or removed.
   * @param _role The role to be set. NONE (0) indicates role removal.
   * @return A boolean that indicates if the operation was successful.
   */
    function setRoleImpl(address _address, uint8 _role) internal returns (bool) {
        uint8 old_role = roles[_address];

        require(old_role == NONE || _role == NONE, "No direct role-to-role change");

        roles[_address] = _role;

        if (old_role == NONE) {
            emit DSTrustServiceRoleAdded(_address, _role, msg.sender);
        } else {
            emit DSTrustServiceRoleRemoved(_address, old_role, msg.sender);
        }

        return true;
    }

    /**
   * @dev Transfers the ownership (MASTER role) of the contract.
   * @param _address The address which the ownership needs to be transferred to.
   * @return A boolean that indicates if the operation was successful.
   */
    function setServiceOwner(address _address) public onlyMaster returns (bool) {
        require(setRoleImpl(owner, NONE));
        owner = _address;
        require(setRoleImpl(_address, MASTER));
        return true;
    }

    /**
   * @dev Sets a role for a wallet.
   * @dev Should not be used for setting MASTER (use setServiceOwner) or role removal (use removeRole).
   * @param _address The wallet whose role needs to be set.
   * @param _role The role to be set.
   * @return A boolean that indicates if the operation was successful.
   */
    function setRole(address _address, uint8 _role) public onlyMasterOrIssuer returns (bool) {
        require(_role == ISSUER || _role == EXCHANGE);

        return setRoleImpl(_address, _role);
    }

    /**
   * @dev Removes the role for a wallet.
   * @dev Should not be used to remove MASTER (use setServiceOwner).
   * @param _address The wallet whose role needs to be removed.
   * @return A boolean that indicates if the operation was successful.
   */
    function removeRole(address _address) public onlyMasterOrIssuer returns (bool) {
        uint8 role = roles[_address];

        require(role == ISSUER || role == EXCHANGE);

        return setRoleImpl(_address, NONE);
    }

    /**
   * @dev Gets the role for a wallet.
   * @param _address The wallet whose role needs to be fetched.
   * @return A boolean that indicates if the operation was successful.
   */
    function getRole(address _address) public view returns (uint8) {
        return roles[_address];
    }
}
