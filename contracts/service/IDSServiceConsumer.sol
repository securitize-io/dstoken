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

pragma solidity ^0.8.20;

import "../omnibus/IDSOmnibusWalletController.sol";

abstract contract IDSServiceConsumer {

    uint256 public constant TRUST_SERVICE = 1;
    uint256 public constant DS_TOKEN = 2;
    uint256 public constant REGISTRY_SERVICE = 4;
    uint256 public constant COMPLIANCE_SERVICE = 8;
    uint256 public constant UNUSED_1 = 16;
    uint256 public constant WALLET_MANAGER = 32;
    uint256 public constant LOCK_MANAGER = 64;
    uint256 public constant PARTITIONS_MANAGER = 128;
    uint256 public constant COMPLIANCE_CONFIGURATION_SERVICE = 256;
    uint256 public constant TOKEN_ISSUER = 512;
    uint256 public constant WALLET_REGISTRAR = 1024;
    uint256 public constant OMNIBUS_TBE_CONTROLLER = 2048;
    uint256 public constant TRANSACTION_RELAYER = 4096;
    uint256 public constant TOKEN_REALLOCATOR = 8192;
    uint256 public constant ISSUER_MULTICALL = 8194;
    uint256 public constant TA_MULTICALL = 8195;
    uint256 public constant SECURITIZE_SWAP = 16384;
    uint256 public constant REBASING_PROVIDER = 8196;
    
    function getDSService(uint256 _serviceId) public view virtual returns (address);

    function setDSService(
        uint256 _serviceId,
        address _address /*onlyMaster*/
    ) public virtual returns (bool);

    event DSServiceSet(uint256 serviceId, address serviceAddress);
}
