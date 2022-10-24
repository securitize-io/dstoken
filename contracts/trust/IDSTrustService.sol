pragma solidity ^0.8.13;

import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";


/**
 * @title IDSTrustService
 * @dev An interface for a trust service which allows role-based access control for other contracts.
 */
//SPDX-License-Identifier: UNLICENSED
abstract contract IDSTrustService is Initializable, VersionedContract {

    function initialize() public virtual {
        VERSIONS.push(3);
    }

    /**
     * @dev Should be emitted when a role is set for a user.
     */
    event DSTrustServiceRoleAdded(address targetAddress, uint8 role, address sender);
    /**
     * @dev Should be emitted when a role is removed for a user.
     */
    event DSTrustServiceRoleRemoved(address targetAddress, uint8 role, address sender);

    // Role constants
    uint8 public constant NONE = 0;
    uint8 public constant MASTER = 1;
    uint8 public constant ISSUER = 2;
    uint8 public constant EXCHANGE = 4;

    /**
     * @dev Transfers the ownership (MASTER role) of the contract.
     * @param _address The address which the ownership needs to be transferred to.
     * @return A boolean that indicates if the operation was successful.
     */
    function setServiceOwner(
        address _address /*onlyMaster*/
    ) public virtual returns (bool);

    /**
     * @dev Sets a role for a wallet.
     * @dev Should not be used for setting MASTER (use setServiceOwner) or role removal (use removeRole).
     * @param _address The wallet whose role needs to be set.
     * @param _role The role to be set.
     * @return A boolean that indicates if the operation was successful.
     */
    function setRole(
        address _address,
        uint8 _role /*onlyMasterOrIssuer*/
    ) public virtual returns (bool);

    /**
     * @dev Removes the role for a wallet.
     * @dev Should not be used to remove MASTER (use setServiceOwner).
     * @param _address The wallet whose role needs to be removed.
     * @return A boolean that indicates if the operation was successful.
     */
    function removeRole(
        address _address /*onlyMasterOrIssuer*/
    ) public virtual returns (bool);

    /**
     * @dev Gets the role for a wallet.
     * @param _address The wallet whose role needs to be fetched.
     * @return A boolean that indicates if the operation was successful.
     */
    function getRole(address _address) public view virtual returns (uint8);

    function addEntity(
        string memory _name,
        address _owner /*onlyMasterOrIssuer onlyNewEntity onlyNewEntityOwner*/
    ) public virtual;

    function changeEntityOwner(
        string memory _name,
        address _oldOwner,
        address _newOwner /*onlyMasterOrIssuer onlyExistingEntityOwner*/
    ) public virtual;

    function addOperator(
        string memory _name,
        address _operator /*onlyEntityOwnerOrAbove onlyNewOperator*/
    ) public virtual;

    function removeOperator(
        string memory _name,
        address _operator /*onlyEntityOwnerOrAbove onlyExistingOperator*/
    ) public virtual;

    function addResource(
        string memory _name,
        address _resource /*onlyMasterOrIssuer onlyExistingEntity onlyNewResource*/
    ) public virtual;

    function removeResource(
        string memory _name,
        address _resource /*onlyMasterOrIssuer onlyExistingResource*/
    ) public virtual;

    function getEntityByOwner(address _owner) public view virtual returns (string memory);

    function getEntityByOperator(address _operator) public view virtual returns (string memory);

    function getEntityByResource(address _resource) public view virtual returns (string memory);

    function isResourceOwner(address _resource, address _owner) public view virtual returns (bool);

    function isResourceOperator(address _resource, address _operator) public view virtual returns (bool);
}
