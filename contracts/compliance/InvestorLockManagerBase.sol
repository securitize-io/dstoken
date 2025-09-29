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

import {InvestorLockManagerDataStore} from "../data-stores/InvestorLockManagerDataStore.sol";
import {BaseDSContract} from "../utils/BaseDSContract.sol";
import {IDSLockManager} from "./IDSLockManager.sol";

abstract contract InvestorLockManagerBase is IDSLockManager, InvestorLockManagerDataStore, BaseDSContract {
    event InvestorFullyLocked(string investorId);
    event InvestorFullyUnlocked(string investorId);
    event InvestorLiquidateOnlySet(string investorId, bool enabled);

    function initialize() public virtual override;

    function lockInvestor(string calldata _investorId) public override onlyTransferAgentOrAbove returns (bool) {
        require(!investorsLocked[_investorId], "Investor is already locked");
        investorsLocked[_investorId] = true;
        emit InvestorFullyLocked(_investorId);
        return true;
    }

    function unlockInvestor(string calldata _investorId) public override onlyTransferAgentOrAbove returns (bool) {
        require(investorsLocked[_investorId], "Investor is not locked");
        delete investorsLocked[_investorId];
        emit InvestorFullyUnlocked(_investorId);
        return true;
    }

    function isInvestorLocked(string calldata _investorId) public override view returns (bool) {
        return investorsLocked[_investorId];
    }

    function setInvestorLiquidateOnly(string memory _investorId, bool _enabled) public override onlyTransferAgentOrAbove returns (bool) {
        require(investorsLiquidateOnly[_investorId] != _enabled, "already in this state");
        investorsLiquidateOnly[_investorId] = _enabled;
        emit InvestorLiquidateOnlySet(_investorId, _enabled);
        return true;
    }

    function isInvestorLiquidateOnly(string calldata _investorId) public override view returns (bool) {
        return investorsLiquidateOnly[_investorId];
    }
}
