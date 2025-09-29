/**
 * Copyright 2025 Securitize Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

pragma solidity 0.8.22;

/**
 * @title IDSTrustService
 * @dev An interface for a trust service which allows role-based access control for other contracts.
 */

abstract contract IDSTrustService {

    function initialize() public virtual;

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
    uint8 public constant TRANSFER_AGENT = 8;

    /**
     * @dev Transfers the ownership (MASTER role) of the contract.
     * @param _address The address which the ownership needs to be transferred to.
     * @return A boolean that indicates if the operation was successful.
     */
    function setServiceOwner(
        address _address /*onlyMaster*/
    ) public virtual returns (bool);

    /**
     * @dev Sets a role for an array of wallets.
     * @dev Should not be used for setting MASTER (use setServiceOwner) or role removal (use removeRole).
     * @param _addresses The array of wallet whose role needs to be set.
     * @param _roles The array of role to be set. The length and order must match with _addresses
     * @return A boolean that indicates if the operation was successful.
     */
    function setRoles(address[] calldata _addresses, uint8[] calldata _roles) public virtual returns (bool);

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
        string calldata _name,
        address _owner /*onlyMasterOrIssuer onlyNewEntity onlyNewEntityOwner*/
    ) public virtual;

    function changeEntityOwner(
        string calldata _name,
        address _oldOwner,
        address _newOwner /*onlyMasterOrIssuer onlyExistingEntityOwner*/
    ) public virtual;

    function addOperator(
        string calldata _name,
        address _operator /*onlyEntityOwnerOrAbove onlyNewOperator*/
    ) public virtual;

    function removeOperator(
        string calldata _name,
        address _operator /*onlyEntityOwnerOrAbove onlyExistingOperator*/
    ) public virtual;

    function addResource(
        string calldata _name,
        address _resource /*onlyMasterOrIssuer onlyExistingEntity onlyNewResource*/
    ) public virtual;

    function removeResource(
        string calldata _name,
        address _resource /*onlyMasterOrIssuer onlyExistingResource*/
    ) public virtual;

    function getEntityByOwner(address _owner) public view virtual returns (string memory);

    function getEntityByOperator(address _operator) public view virtual returns (string memory);

    function getEntityByResource(address _resource) public view virtual returns (string memory);

    function isResourceOwner(address _resource, address _owner) public view virtual returns (bool);

    function isResourceOperator(address _resource, address _operator) public view virtual returns (bool);
}
