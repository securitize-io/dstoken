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

import "../service/ServiceConsumer.sol";
import {ISecuritizeRebasingProvider} from "../rebasing/ISecuritizeRebasingProvider.sol";
import "../rebasing/RebasingLibrary.sol";


library TokenLibrary {
    event Issue(address indexed to, uint256 value, uint256 valueLocked);

    uint256 internal constant COMPLIANCE_SERVICE = 0;
    uint256 internal constant REGISTRY_SERVICE = 1;
    uint256 internal constant DEPRECATED_OMNIBUS_NO_ACTION = 0; // Deprecated, keep for backwards compatibility
    uint256 internal constant DEPRECATED_OMNIBUS_DEPOSIT = 1; // Deprecated, keep for backwards compatibility
    uint256 internal constant DEPRECATED_OMNIBUS_WITHDRAW = 2; // Deprecated, keep for backwards compatibility

    struct TokenData {
        mapping(address => uint256) walletsBalances;
        mapping(string => uint256) investorsBalances;
        uint256 totalSupply;
        uint256 totalIssued;
    }

    struct SupportedFeatures {
        uint256 value;
    }

    struct IssueParams {
        address _to;
        uint256 _value;
        uint256 _issuanceTime;
        uint256[] _valuesLocked;
        uint64[] _releaseTimes;
        string _reason;
        uint256 _cap;
        ISecuritizeRebasingProvider _rebasingProvider;
    }

    function setFeature(SupportedFeatures storage supportedFeatures, uint8 featureIndex, bool enable) public {
        uint256 base = 2;
        uint256 mask = base**featureIndex;

        // Enable only if the feature is turned off and disable only if the feature is turned on
        if (enable && (supportedFeatures.value & mask == 0)) {
            supportedFeatures.value = supportedFeatures.value ^ mask;
        } else if (!enable && (supportedFeatures.value & mask >= 1)) {
            supportedFeatures.value = supportedFeatures.value ^ mask;
        }
    }

    function issueTokensCustom(
        TokenData storage _tokenData,
        address[] memory _services,
        IDSLockManager _lockManager,
        IssueParams memory _params       
    ) public returns (uint256) {
        //Check input values
        require(_params._to != address(0), "Invalid address");
        require(_params._value > 0, "Value is zero");
        require(_params._valuesLocked.length == _params._releaseTimes.length, "Wrong length of parameters");

        uint256 totalIssuedTokens = _params._rebasingProvider.convertSharesToTokens(_tokenData.totalIssued);

        //Make sure we are not hitting the cap
        require(_params._cap == 0 || totalIssuedTokens + _params._value <= _params._cap, "Token Cap Hit");

        //Check issuance is allowed (and inform the compliance manager, possibly adding locks)
        IDSComplianceService(_services[COMPLIANCE_SERVICE]).validateIssuance(_params._to, _params._value, _params._issuanceTime);
        
        uint256 shares =  _params._rebasingProvider.convertTokensToShares(_params._value);

        _tokenData.totalSupply += shares;
        _tokenData.totalIssued += shares;
        _tokenData.walletsBalances[_params._to] += shares;

        updateInvestorBalance(_tokenData, IDSRegistryService(_services[REGISTRY_SERVICE]), _params._to, shares, CommonUtils.IncDec.Increase);

        uint256 totalLocked = 0;
        for (uint256 i = 0; i < _params._valuesLocked.length; i++) {
            totalLocked += _params._valuesLocked[i];
            _lockManager.addManualLockRecord(_params._to, _params._valuesLocked[i], _params._reason, _params._releaseTimes[i]);
        }
        require(totalLocked <= _params._value, "valueLocked must be smaller than value");
        emit Issue(_params._to, _params._value, totalLocked);
        return shares;
    }

    function issueTokensWithNoCompliance(
        TokenData storage _tokenData,
        address[] memory _services,
        address _to,
        uint256 _value,
        uint256 _issuanceTime,
        uint256 _cap,
        ISecuritizeRebasingProvider _rebasingProvider 
    ) public returns (uint256) {
        uint256 totalIssuedTokens = _rebasingProvider.convertSharesToTokens(_tokenData.totalIssued);

        //Make sure we are not hitting the cap. Cap in visible tokens
        require(_cap == 0 || totalIssuedTokens + _value <= _cap, "Token Cap Hit");

        //Check and inform issuance is allowed
        IDSComplianceService(_services[COMPLIANCE_SERVICE]).validateIssuanceWithNoCompliance(_to, _value, _issuanceTime);

        uint256 shares = _rebasingProvider.convertTokensToShares(_value);

        _tokenData.totalSupply += shares;
        _tokenData.totalIssued += shares;
        _tokenData.walletsBalances[_to] += shares;

        updateInvestorBalance(
            _tokenData,
            IDSRegistryService(_services[REGISTRY_SERVICE]),
            _to,
            shares,
            CommonUtils.IncDec.Increase
        );

        emit Issue(_to, _value, 0);
        return shares;
    }

    modifier validSeizeParameters(TokenData storage _tokenData, address _from, address _to, uint256 _shares) {
        require(_from != address(0), "Invalid address");
        require(_to != address(0), "Invalid address");
        require(_shares <= _tokenData.walletsBalances[_from], "Not enough balance");

        _;
    }

    function burn(
        TokenData storage _tokenData,
        address[] memory _services,
        address _who,
        uint256 _value,
        ISecuritizeRebasingProvider _rebasingProvider
    ) public returns (uint256) {
        uint256 sharesToBurn = _rebasingProvider.convertTokensToShares(_value);

        require(sharesToBurn <= _tokenData.walletsBalances[_who], "Not enough balance");
        // no need to require value <= totalSupply, since that would imply the
        // sender's balance is greater than the totalSupply, which *should* be an assertion failure

        IDSComplianceService(_services[COMPLIANCE_SERVICE]).validateBurn(_who, _value);

        _tokenData.walletsBalances[_who] -= sharesToBurn;
        updateInvestorBalance(
            _tokenData,
            IDSRegistryService(_services[REGISTRY_SERVICE]),
            _who,
            sharesToBurn,
            CommonUtils.IncDec.Decrease
        );

        _tokenData.totalSupply -= sharesToBurn;
        return sharesToBurn;
    }

    function seize(
        TokenData storage _tokenData, 
        address[] memory _services, 
        address _from, 
        address _to, 
        uint256 _value, 
        uint256 _shares
)
    public
    validSeizeParameters(_tokenData, _from, _to, _shares)
    {
        IDSRegistryService registryService = IDSRegistryService(_services[REGISTRY_SERVICE]);
        IDSComplianceService(_services[COMPLIANCE_SERVICE]).validateSeize(_from, _to, _value);

        _tokenData.walletsBalances[_from] -= _shares;
        _tokenData.walletsBalances[_to] += _shares;
        updateInvestorBalance(_tokenData, registryService, _from, _shares, CommonUtils.IncDec.Decrease);
        updateInvestorBalance(_tokenData, registryService, _to, _shares, CommonUtils.IncDec.Increase);
    }

    function updateInvestorBalance(TokenData storage _tokenData, IDSRegistryService _registryService, address _wallet, uint256 _shares, CommonUtils.IncDec _increase) internal returns (bool) {
        string memory investor = _registryService.getInvestor(_wallet);
        if (!CommonUtils.isEmptyString(investor)) {
            uint256 balance = _tokenData.investorsBalances[investor];
            if (_increase == CommonUtils.IncDec.Increase) {
                balance += _shares;
            } else {
                balance -= _shares;
            }
            _tokenData.investorsBalances[investor] = balance;
        }

        return true;
    }
}
