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

import "../service/ServiceConsumer.sol";
import "../rebasing/ISecuritizeRebasingProvider.sol";
import "../rebasing/RebasingLibrary.sol";


library TokenLibrary {
    event OmnibusDeposit(address indexed omnibusWallet, address to, uint256 value, uint8 assetTrackingMode);
    event OmnibusWithdraw(address indexed omnibusWallet, address from, uint256 value, uint8 assetTrackingMode);
    event Issue(address indexed to, uint256 value, uint256 valueLocked);

    uint256 internal constant COMPLIANCE_SERVICE = 0;
    uint256 internal constant REGISTRY_SERVICE = 1;
    uint256 internal constant OMNIBUS_NO_ACTION = 0;
    uint256 internal constant OMNIBUS_DEPOSIT = 1;
    uint256 internal constant OMNIBUS_WITHDRAW = 2;

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
        uint8 _tokenDecimals;
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

        uint256 multiplier = _params._rebasingProvider.multiplier();
        uint256 totalIssuedTokens = RebasingLibrary.convertSharesToTokens(_tokenData.totalIssued, multiplier, _params._tokenDecimals);

        //Make sure we are not hitting the cap
        require(_params._cap == 0 || totalIssuedTokens + _params._value <= _params._cap, "Token Cap Hit");

        //Check issuance is allowed (and inform the compliance manager, possibly adding locks)
        IDSComplianceService(_services[COMPLIANCE_SERVICE]).validateIssuance(_params._to, _params._value, _params._issuanceTime);
        

        uint256 shares = RebasingLibrary.convertTokensToShares(_params._value, multiplier, _params._tokenDecimals);

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
        ISecuritizeRebasingProvider _rebasingProvider,
        uint8 _tokenDecimals   
    ) public returns (uint256) {

        uint256 multiplier = _rebasingProvider.multiplier();
        uint256 totalIssuedTokens = RebasingLibrary.convertSharesToTokens(_tokenData.totalIssued, multiplier, _tokenDecimals);

        //Make sure we are not hitting the cap. Cap in visible tokens
        require(_cap == 0 || totalIssuedTokens + _value <= _cap, "Token Cap Hit");

        //Check and inform issuance is allowed
        IDSComplianceService(_services[COMPLIANCE_SERVICE]).validateIssuanceWithNoCompliance(_to, _value, _issuanceTime);

        uint256 shares = RebasingLibrary.convertTokensToShares(_value, multiplier, _tokenDecimals);

        // Almacenamos internamente en shares
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
        ISecuritizeRebasingProvider _rebasingProvider, 
        uint8 _tokenDecimals
    ) public returns (uint256) {
        uint256 multiplier = _rebasingProvider.multiplier();
        uint256 sharesToBurn = RebasingLibrary.convertTokensToShares(_value, multiplier, _tokenDecimals);   
        
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

    /**
     * Deprecated
     */
    function omnibusBurn(
        TokenData storage _tokenData, 
        address[] memory _services, 
        address _omnibusWallet, 
        address _who, 
        uint256 _value, 
        ISecuritizeRebasingProvider _rebasingProvider, 
        uint8 _tokenDecimals
    ) public {
        IDSRegistryService registryService = IDSRegistryService(_services[REGISTRY_SERVICE]);
        IDSOmnibusWalletController omnibusController = IDSRegistryService(_services[REGISTRY_SERVICE]).getOmnibusWalletController(_omnibusWallet);

        uint256 multiplier = _rebasingProvider.multiplier();
        require(multiplier > 0, "Invalid rebasing multiplier");

        uint256 sharesToBurn = RebasingLibrary.convertTokensToShares(_value, multiplier, _tokenDecimals);
        require(sharesToBurn <= _tokenData.walletsBalances[_omnibusWallet], "Not enough balance");

        _tokenData.walletsBalances[_omnibusWallet] -= sharesToBurn;
        _tokenData.totalSupply -= sharesToBurn;

        omnibusController.burn(_who, _value); // visible tokens
        decreaseInvestorBalanceOnOmnibusSeizeOrBurn(_tokenData, registryService, omnibusController, _omnibusWallet, _who, sharesToBurn);
    }

    /**
     * Deprecated
     */
    function omnibusSeize(TokenData storage _tokenData, address[] memory _services, address _omnibusWallet, address _from, address _to, uint256 _value)
    public
    validSeizeParameters(_tokenData, _omnibusWallet, _to, _value)
    {
        IDSRegistryService registryService = IDSRegistryService(_services[REGISTRY_SERVICE]);
        IDSOmnibusWalletController omnibusController = registryService.getOmnibusWalletController(_omnibusWallet);

        _tokenData.walletsBalances[_omnibusWallet] -= _value;
        _tokenData.walletsBalances[_to] += _value;
        omnibusController.seize(_from, _value);
        decreaseInvestorBalanceOnOmnibusSeizeOrBurn(_tokenData, registryService, omnibusController, _omnibusWallet, _from, _value);
        updateInvestorBalance(_tokenData, registryService, _to, _value, CommonUtils.IncDec.Increase);
    }

    /**
     * Deprecated
     */
    function decreaseInvestorBalanceOnOmnibusSeizeOrBurn(
        TokenData storage _tokenData,
        IDSRegistryService _registryService,
        IDSOmnibusWalletController _omnibusController,
        address _omnibusWallet,
        address _from,
        uint256 _value
    ) internal {
        if (_omnibusController.isHolderOfRecord()) {
            updateInvestorBalance(_tokenData, _registryService, _omnibusWallet, _value, CommonUtils.IncDec.Decrease);
        } else {
            updateInvestorBalance(_tokenData, _registryService, _from, _value, CommonUtils.IncDec.Decrease);
        }
    }
    
    /**
     * Deprecated
     */
    function applyOmnibusBalanceUpdatesOnTransfer(TokenData storage _tokenData, IDSRegistryService _registryService, address _from, address _to, uint256 _value)
    public
    returns (uint256)
    {
        if (_registryService.isOmnibusWallet(_to)) {
            IDSOmnibusWalletController omnibusWalletController = _registryService.getOmnibusWalletController(_to);
            omnibusWalletController.deposit(_from, _value);
            emit OmnibusDeposit(_to, _from, _value, omnibusWalletController.getAssetTrackingMode());

            if (omnibusWalletController.isHolderOfRecord()) {
                updateInvestorBalance(_tokenData, _registryService, _from, _value, CommonUtils.IncDec.Decrease);
                updateInvestorBalance(_tokenData, _registryService, _to, _value, CommonUtils.IncDec.Increase);
            }
            return OMNIBUS_DEPOSIT;
        } else if (_registryService.isOmnibusWallet(_from)) {
            IDSOmnibusWalletController omnibusWalletController = _registryService.getOmnibusWalletController(_from);
            omnibusWalletController.withdraw(_to, _value);
            emit OmnibusWithdraw(_from, _to, _value, omnibusWalletController.getAssetTrackingMode());

            if (omnibusWalletController.isHolderOfRecord()) {
                updateInvestorBalance(_tokenData, _registryService, _from, _value, CommonUtils.IncDec.Decrease);
                updateInvestorBalance(_tokenData, _registryService, _to, _value, CommonUtils.IncDec.Increase);
            }
            return OMNIBUS_WITHDRAW;
        }
        return OMNIBUS_NO_ACTION;
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
