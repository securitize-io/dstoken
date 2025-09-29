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

import {CommonUtils} from "../utils/CommonUtils.sol";
import {IDSTrustService} from "./IDSTrustService.sol";
import {TrustServiceDataStore} from "../data-stores/TrustServiceDataStore.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";

/**
 * @title TrustService
 * @dev A trust service which allows role-based access control for other contracts.
 * @dev Implements IDSTrustService.
 */

contract TrustService is IDSTrustService, TrustServiceDataStore, UUPSUpgradeable {

    function initialize() public override onlyProxy initializer {
        owner = msg.sender;
        roles[msg.sender] = MASTER;
    }

    /**
     * @dev required by the OZ UUPS module
     */
    function _authorizeUpgrade(address) internal override onlyMaster {}

    /**
     * @dev returns proxy ERC1967 implementation address
     */
    function getImplementationAddress() external view returns (address) {
        return ERC1967Utils.getImplementation();
    }

    /**
     * @dev Returns the highest version that has been initialized. See {reinitializer}.
     */
    function getInitializedVersion() external view returns (uint64) {
        return _getInitializedVersion();
    }

    /**
   * @dev Allow invoking of functions only by the user who has the MASTER role.
   */
    modifier onlyMaster() {
        require(roles[msg.sender] == MASTER, "Not enough permissions");
        _;
    }

    /**
   * @dev Allow invoking of functions only by the users who have the MASTER role or the ISSUER role.
   */
    modifier onlyMasterOrIssuer() {
        require(roles[msg.sender] == MASTER || roles[msg.sender] == ISSUER, "Not enough permissions");
        _;
    }

    /**
   * @dev Allow invoking of functions only by the users who have the MASTER role or the ISSUER role or the TRANSFER AGENT role.
   */
    modifier onlyMasterOrIssuerOrTransferAgent() {
        require(roles[msg.sender] == MASTER || roles[msg.sender] == ISSUER || roles[msg.sender] == TRANSFER_AGENT, "Not enough permissions");
        _;
    }

    /**
   * @dev Allow setting roles only by the user who has the same role.
   */
    modifier onlySameRole(uint8 _role) {
        if (roles[msg.sender] != MASTER) {
            if (roles[msg.sender] == ISSUER) {
                require(_role == ISSUER || _role == EXCHANGE, "Not enough permissions. Only same role allowed");
            } else {
                require(roles[msg.sender] == _role, "Not enough permissions. Only same role allowed");
            }
        }
        _;
    }

    /**
   * @dev Allow setting roles only by the user who has the same role.
   */
    modifier onlySameRoleForAddress(address _address) {
        if (roles[msg.sender] != MASTER) {
            uint8 role = roles[_address];
            if (roles[msg.sender] == ISSUER) {
                require(role == ISSUER || role == EXCHANGE, "Not enough permissions. Only same role allowed");
            } else {
                require(roles[msg.sender] == role, "Not enough permissions. Only same role allowed");
            }
        }
        _;
    }


    /**
   * @dev Sets or removes a role for a wallet. (internal)
   * @param _address The wallet whose role needs to be set or removed.
   * @param _role The role to be set. NONE (0) indicates role removal.
   */
    function setRoleImpl(address _address, uint8 _role) internal {
        uint8 old_role = roles[_address];

        require(old_role == NONE || _role == NONE, "No direct role-to-role change");

        roles[_address] = _role;

        if (old_role == NONE) {
            emit DSTrustServiceRoleAdded(_address, _role, msg.sender);
        } else {
            emit DSTrustServiceRoleRemoved(_address, old_role, msg.sender);
        }
    }

    /**
   * @dev Transfers the ownership (MASTER role) of the contract.
   * @param _address The address which the ownership needs to be transferred to.
   * @return A boolean that indicates if the operation was successful.
   */
    function setServiceOwner(address _address) public override onlyMaster returns (bool) {
        require(_address != address(0), "Owner can not be zero address");
        setRoleImpl(owner, NONE);
        owner = _address;
        setRoleImpl(_address, MASTER);

        return true;
    }

    /**
   * @dev Sets roles to an array of wallets
   * @dev Should not be used for setting MASTER (use setServiceOwner) or role removal (use removeRole).
   * @param _addresses The array of wallet whose role needs to be set.
   * @param _roles The array of role to be set. Length and order must match wit _addresss
   * @return A boolean that indicates if the operation was successful.
   */
    function setRoles(address[] calldata _addresses, uint8[] calldata _roles) public override onlyMasterOrIssuerOrTransferAgent returns (bool) {
        require(_addresses.length <= 30, "Exceeded the maximum number of addresses");
        require(_addresses.length == _roles.length, "Wrong length of parameters");
        for (uint i = 0; i < _addresses.length; i++) {
            setRole(_addresses[i], _roles[i]);
        }
        return true;
    }

    /**
   * @dev Sets a role for a wallet.
   * @dev Should not be used for setting MASTER (use setServiceOwner) or role removal (use removeRole).
   * @param _address The wallet whose role needs to be set.
   * @param _role The role to be set.
   * @return A boolean that indicates if the operation was successful.
   */
    function setRole(address _address, uint8 _role) public override onlyMasterOrIssuerOrTransferAgent onlySameRole(_role) returns (bool) {
        require(_role == ISSUER || _role == EXCHANGE || _role == TRANSFER_AGENT, "Invalid target role");

        setRoleImpl(_address, _role);

        return true;
    }

    /**
   * @dev Removes the role for a wallet.
   * @dev Should not be used to remove MASTER (use setServiceOwner).
   * @param _address The wallet whose role needs to be removed.
   * @return A boolean that indicates if the operation was successful.
   */
    function removeRole(address _address) public override onlyMasterOrIssuerOrTransferAgent onlySameRoleForAddress(_address) returns (bool) {
        uint8 role = roles[_address];
        require(role != MASTER, "Cannot remove master");

        setRoleImpl(_address, NONE);

        return true;
    }

    /**
   * @dev Gets the role for a wallet.
   * @param _address The wallet whose role needs to be fetched.
   * @return A boolean that indicates if the operation was successful.
   */
    function getRole(address _address) public view override returns (uint8) {
        return roles[_address];
    }

}
