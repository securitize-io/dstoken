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

import "./IDSComplianceService.sol";

abstract contract IDSComplianceServicePartitioned is IDSComplianceService {

    function initialize() public virtual override;

    function getComplianceTransferableTokens(
        address _who,
        uint256 _time,
        bool _checkFlowback
    ) public view virtual returns (uint256 transferable);

    function getComplianceTransferableTokens(
        address _who,
        uint256 _time,
        bool _checkFlowback,
        bytes32 _partition
    ) public view virtual returns (uint256);

    function getComplianceTransferableTokens(
        address _who,
        uint256 _time,
        address _to
    ) public view virtual returns (uint256 transferable);

    function getComplianceTransferableTokens(
        address _who,
        uint256 _time,
        address _to,
        bytes32 _partition
    ) public view virtual returns (uint256);
}
