/**
 * Copyright 2024 Securitize Inc. All rights reserved.
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

import "./IDSServiceConsumer.sol";
import "../data-stores/ServiceConsumerDataStore.sol";
import "../token/IDSToken.sol";
import "../compliance/IDSWalletManager.sol";
import "../compliance/IDSLockManager.sol";
import "../compliance/IDSLockManagerPartitioned.sol";
import "../compliance/IDSComplianceService.sol";
import "../compliance/IDSPartitionsManager.sol";
import "../compliance/IDSComplianceConfigurationService.sol";
import "../registry/IDSRegistryService.sol";
import "../trust/IDSTrustService.sol";
import {ISecuritizeRebasingProvider} from "../rebasing/ISecuritizeRebasingProvider.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";



abstract contract ServiceConsumer is IDSServiceConsumer, ServiceConsumerDataStore, OwnableUpgradeable {

    // Bring role constants to save gas both in deployment (less bytecode) and usage
    uint8 public constant ROLE_NONE = 0;
    uint8 public constant ROLE_MASTER = 1;
    uint8 public constant ROLE_ISSUER = 2;
    uint8 public constant ROLE_EXCHANGE = 4;
    uint8 public constant ROLE_TRANSFER_AGENT = 8;

    function __ServiceConsumer_init() public virtual onlyInitializing {
        __Ownable_init(msg.sender);
    }

    modifier onlyMaster {
        IDSTrustService trustManager = getTrustService();
        require(owner() == msg.sender || trustManager.getRole(msg.sender) == ROLE_MASTER, "Insufficient trust level");
        _;
    }

    /**
   * @dev Allow invoking functions only by the users who have the MASTER role or the ISSUER role or the TRANSFER AGENT role.
   */
    modifier onlyIssuerOrTransferAgentOrAbove() {
        IDSTrustService trustManager = getTrustService();
        require(trustManager.getRole(msg.sender) == ROLE_TRANSFER_AGENT || trustManager.getRole(msg.sender) == ROLE_ISSUER || trustManager.getRole(msg.sender) == ROLE_MASTER, "Insufficient trust level");
        _;
    }

    modifier onlyIssuerOrAbove {
        IDSTrustService trustManager = getTrustService();
        require(trustManager.getRole(msg.sender) == ROLE_ISSUER || trustManager.getRole(msg.sender) == ROLE_MASTER, "Insufficient trust level");
        _;
    }

    modifier onlyTransferAgentOrAbove {
        IDSTrustService trustManager = getTrustService();
        require(trustManager.getRole(msg.sender) == ROLE_TRANSFER_AGENT || trustManager.getRole(msg.sender) == ROLE_MASTER, "Insufficient trust level");
        _;
    }

    modifier onlyExchangeOrAbove {
        IDSTrustService trustManager = getTrustService();
        require(
            trustManager.getRole(msg.sender) == ROLE_EXCHANGE
            || trustManager.getRole(msg.sender) == ROLE_ISSUER
            || trustManager.getRole(msg.sender) == ROLE_TRANSFER_AGENT
            || trustManager.getRole(msg.sender) == ROLE_MASTER,
            "Insufficient trust level"
        );
        _;
    }

    modifier onlyToken {
        require(msg.sender == getDSService(DS_TOKEN), "This function can only called by the associated token");
        _;
    }

    modifier onlyRegistry {
        require(msg.sender == getDSService(REGISTRY_SERVICE), "This function can only called by the registry service");
        _;
    }

    modifier onlyIssuerOrAboveOrToken {
        if (msg.sender != getDSService(DS_TOKEN)) {
            IDSTrustService trustManager = IDSTrustService(getDSService(TRUST_SERVICE));
            require(trustManager.getRole(msg.sender) == ROLE_ISSUER || trustManager.getRole(msg.sender) == ROLE_MASTER, "Insufficient trust level");
        }
        _;
    }

    modifier onlyTransferAgentOrAboveOrToken {
        if (msg.sender != getDSService(DS_TOKEN)) {
            IDSTrustService trustManager = IDSTrustService(getDSService(TRUST_SERVICE));
            require(trustManager.getRole(msg.sender) == ROLE_TRANSFER_AGENT || trustManager.getRole(msg.sender) == ROLE_MASTER, "Insufficient trust level");
        }
        _;
    }

    modifier onlyOwnerOrIssuerOrAbove {
        if(owner() != msg.sender) {
            IDSTrustService trustManager = getTrustService();
            require(trustManager.getRole(msg.sender) == ROLE_ISSUER || trustManager.getRole(msg.sender) == ROLE_MASTER, "Insufficient trust level");
        }
        _;
    }

    function getDSService(uint256 _serviceId) public view override returns (address) {
        return services[_serviceId];
    }

    function setDSService(uint256 _serviceId, address _address) public override onlyMaster returns (bool) {
        services[_serviceId] = _address;
        emit DSServiceSet(_serviceId, _address);
        return true;
    }

    function getToken() internal view returns (IDSToken) {
        return IDSToken(getDSService(DS_TOKEN));
    }

    function getTrustService() internal view returns (IDSTrustService) {
        return IDSTrustService(getDSService(TRUST_SERVICE));
    }

    function getWalletManager() internal view returns (IDSWalletManager) {
        return IDSWalletManager(getDSService(WALLET_MANAGER));
    }

    function getLockManager() internal view returns (IDSLockManager) {
        return IDSLockManager(getDSService(LOCK_MANAGER));
    }

    function getLockManagerPartitioned() internal view returns (IDSLockManagerPartitioned) {
        return IDSLockManagerPartitioned(getDSService(LOCK_MANAGER));
    }

    function getComplianceService() internal view returns (IDSComplianceService) {
        return IDSComplianceService(getDSService(COMPLIANCE_SERVICE));
    }

    function getRegistryService() internal view returns (IDSRegistryService) {
        return IDSRegistryService(getDSService(REGISTRY_SERVICE));
    }

    function getPartitionsManager() internal view returns (IDSPartitionsManager) {
        return IDSPartitionsManager(getDSService(PARTITIONS_MANAGER));
    }

    function getComplianceConfigurationService() internal view returns (IDSComplianceConfigurationService) {
        return IDSComplianceConfigurationService(getDSService(COMPLIANCE_CONFIGURATION_SERVICE));
    }

    function getRebasingProvider() internal view returns (ISecuritizeRebasingProvider) {
        return ISecuritizeRebasingProvider(getDSService(REBASING_PROVIDER));
    }
}
