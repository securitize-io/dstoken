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

import {ComplianceServiceWhitelisted} from "./ComplianceServiceWhitelisted.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {CommonUtils} from "../utils/CommonUtils.sol";
import {IDSRegistryService} from "../registry/IDSRegistryService.sol";
import {IDSToken} from "../token/IDSToken.sol";
import {IDSComplianceConfigurationService} from "./IDSComplianceConfigurationService.sol";
import {IDSWalletManager} from "./IDSWalletManager.sol";
import {IDSLockManager} from "./IDSLockManager.sol";

library ComplianceServiceLibrary {
    uint256 internal constant DS_TOKEN = 0;
    uint256 internal constant REGISTRY_SERVICE = 1;
    uint256 internal constant WALLET_MANAGER = 2;
    uint256 internal constant COMPLIANCE_CONFIGURATION_SERVICE = 3;
    uint256 internal constant LOCK_MANAGER = 4;
    uint256 internal constant COMPLIANCE_SERVICE = 5;
    uint256 internal constant DEPRECATED_OMNIBUS_TBE_CONTROLLER = 6; // Deprecated, kept for backward compatibility
    uint256 internal constant NONE = 0;
    uint256 internal constant US = 1;
    uint256 internal constant EU = 2;
    uint256 internal constant FORBIDDEN = 4;
    uint256 internal constant JP = 8;
    string internal constant TOKEN_PAUSED = "Token paused";
    string internal constant NOT_ENOUGH_TOKENS = "Not enough tokens";
    string internal constant VALID = "Valid";
    string internal constant TOKENS_LOCKED = "Tokens locked";
    string internal constant ONLY_FULL_TRANSFER = "Only full transfer";
    string internal constant FLOWBACK = "Flowback";
    string internal constant WALLET_NOT_IN_REGISTRY_SERVICE = "Wallet not in registry service";
    string internal constant AMOUNT_OF_TOKENS_UNDER_MIN = "Amount of tokens under min";
    string internal constant AMOUNT_OF_TOKENS_ABOVE_MAX = "Amount of tokens above max";
    string internal constant HOLD_UP = "Under lock-up";
    string internal constant DESTINATION_RESTRICTED = "Destination restricted";
    string internal constant MAX_INVESTORS_IN_CATEGORY = "Max investors in category";
    string internal constant ONLY_ACCREDITED = "Only accredited";
    string internal constant ONLY_US_ACCREDITED = "Only us accredited";
    string internal constant NOT_ENOUGH_INVESTORS = "Not enough investors";
    string internal constant INVESTOR_LIQUIDATE_ONLY = "Investor liquidate only";

    struct CompletePreTransferCheckArgs {
        address from;
        address to;
        uint256 value;
        uint256 fromInvestorBalance;
        uint256 fromRegion;
        bool isPlatformWalletTo;
    }

    function isRetail(address[] memory _services, address _wallet) internal view returns (bool) {
        IDSRegistryService registry = IDSRegistryService(_services[REGISTRY_SERVICE]);

        return !registry.isQualifiedInvestor(_wallet);
    }

    function isAccredited(address[] memory _services, address _wallet) internal view returns (bool) {
        IDSRegistryService registry = IDSRegistryService(_services[REGISTRY_SERVICE]);

        return registry.isAccreditedInvestor(_wallet);
    }

    function balanceOfInvestor(address[] memory _services, address _wallet) internal view returns (uint256) {
        IDSRegistryService registry = IDSRegistryService(_services[REGISTRY_SERVICE]);
        IDSToken token = IDSToken(_services[DS_TOKEN]);

        return token.balanceOfInvestor(registry.getInvestor(_wallet));
    }

    function isNewInvestor(uint256 _balanceOfInvestorTo) internal pure returns (bool) {
        // Return whether this investor has 0 balance
        return _balanceOfInvestorTo == 0;
    }

    function getCountry(address[] memory _services, address _wallet) internal view returns (string memory) {
        IDSRegistryService registry = IDSRegistryService(_services[REGISTRY_SERVICE]);

        return registry.getCountry(registry.getInvestor(_wallet));
    }

    function getCountryCompliance(address[] memory _services, address _wallet) internal view returns (uint256) {
        return IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getCountryCompliance(getCountry(_services, _wallet));
    }

    function getUSInvestorsLimit(address[] memory _services) internal view returns (uint256) {
        ComplianceServiceRegulated complianceService = ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]);
        IDSComplianceConfigurationService compConfService = IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]);

        if (compConfService.getMaxUSInvestorsPercentage() == 0) {
            return compConfService.getUSInvestorsLimit();
        }

        if (compConfService.getUSInvestorsLimit() == 0) {
            return compConfService.getMaxUSInvestorsPercentage() * (complianceService.getTotalInvestorsCount()) / 100;
        }

        return Math.min(compConfService.getUSInvestorsLimit(), compConfService.getMaxUSInvestorsPercentage() * (complianceService.getTotalInvestorsCount()) / 100);
    }

    function checkHoldUp(
        address[] memory _services,
        address _from,
        uint256 _value,
        bool _isUSLockPeriod,
        bool _isPlatformWalletFrom
    ) internal view returns (bool) {
        ComplianceServiceRegulated complianceService = ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]);
        uint256 lockPeriod;
        if (_isUSLockPeriod) {
            lockPeriod = IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getUSLockPeriod();
        } else {
            lockPeriod = IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getNonUSLockPeriod();
        }

        return
        !_isPlatformWalletFrom &&
        complianceService.getComplianceTransferableTokens(_from, block.timestamp, uint64(lockPeriod)) < _value;
    }

    function maxInvestorsInCategoryForNonAccredited(
        address[] memory _services,
        address _from,
        uint256 _value,
        uint256 fromInvestorBalance,
        uint256 toInvestorBalance
    ) internal view returns (bool) {
        uint256 nonAccreditedInvestorLimit = IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getNonAccreditedInvestorsLimit();
        return
        nonAccreditedInvestorLimit != 0 &&
        ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getTotalInvestorsCount() -
            ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getAccreditedInvestorsCount()
        >=
        nonAccreditedInvestorLimit &&
        isNewInvestor(toInvestorBalance) &&
        (isAccredited(_services, _from) || fromInvestorBalance > _value);
    }

    function newPreTransferCheck(
        address[] calldata _services,
        address _from,
        address _to,
        uint256 _value,
        uint256 _balanceFrom,
        bool _paused
    ) public view returns (uint256 code, string memory reason) {
        return doPreTransferCheckRegulated
        (_services, _from, _to, _value, _balanceFrom, _paused);
    }

    function preTransferCheck(
        address[] calldata _services,
        address _from,
        address _to,
        uint256 _value
    ) public view returns (uint256 code, string memory reason) {
        return doPreTransferCheckRegulated(_services, _from, _to, _value, IDSToken(_services[DS_TOKEN]).balanceOf(_from), IDSToken(_services[DS_TOKEN]).isPaused());
    }

    function doPreTransferCheckRegulated(
        address[] calldata _services,
        address _from,
        address _to,
        uint256 _value,
        uint256 _balanceFrom,
        bool _paused
    ) internal view returns (uint256 code, string memory reason) {

        if (_balanceFrom < _value) {
            return (15, NOT_ENOUGH_TOKENS);
        }

        uint256 fromInvestorBalance = balanceOfInvestor(_services, _from); // tokens
        uint256 fromRegion = getCountryCompliance(_services, _from);
        bool isPlatformWalletTo = IDSWalletManager(_services[WALLET_MANAGER]).isPlatformWallet(_to);
        if (isPlatformWalletTo) {
            if (
                ((IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceFullTransfer()
                && (fromRegion == US)) ||
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getWorldWideForceFullTransfer()) &&
                fromInvestorBalance > _value
            ) {
                return (50, ONLY_FULL_TRANSFER);
            }
            return (0, VALID);
        }

        if (_paused ) {
            return (10, TOKEN_PAUSED);
        }

        CompletePreTransferCheckArgs memory args = CompletePreTransferCheckArgs(_from, _to, _value, fromInvestorBalance, fromRegion, isPlatformWalletTo);
        return completeTransferCheck(_services, args);
    }

    function completeTransferCheck(
        address[] calldata _services,
        CompletePreTransferCheckArgs memory _args
    ) internal view returns (uint256 code, string memory reason) {
        (string memory investorFrom, string memory investorTo) = IDSRegistryService(_services[REGISTRY_SERVICE]).getInvestors(_args.from, _args.to);
        if (
            !CommonUtils.isEmptyString(investorFrom) && CommonUtils.isEqualString(investorFrom, investorTo)
        ) {
            return (0, VALID);
        }

        if (IDSLockManager(_services[LOCK_MANAGER]).isInvestorLiquidateOnly(investorTo)) {
            return (90, INVESTOR_LIQUIDATE_ONLY);
        }

        if (!ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).checkWhitelisted(_args.to)) {
            return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
        }

        uint256 toRegion = getCountryCompliance(_services, _args.to);
        if (toRegion == FORBIDDEN) {
            return (26, DESTINATION_RESTRICTED);
        }

        bool isPlatformWalletFrom = IDSWalletManager(_services[WALLET_MANAGER]).isPlatformWallet(_args.from);
        if (
            !isPlatformWalletFrom &&
        IDSLockManager(_services[LOCK_MANAGER]).getTransferableTokens(_args.from, block.timestamp) < _args.value
        ) {
            return (16, TOKENS_LOCKED);
        }

        if (_args.fromRegion == US) {
            if (checkHoldUp(_services, _args.from, _args.value, true, isPlatformWalletFrom)) {
                return (32, HOLD_UP);
            }

            if (
                _args.fromInvestorBalance > _args.value &&
                _args.fromInvestorBalance - _args.value < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinUSTokens()
            ) {
                return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
            }

            if (
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceFullTransfer() &&
                _args.fromInvestorBalance > _args.value
            ) {
                return (50, ONLY_FULL_TRANSFER);
            }
        } else {
            if (checkHoldUp(_services, _args.from, _args.value, false, isPlatformWalletFrom)) {
                return (33, HOLD_UP);
            }

            if (
                toRegion == US &&
                !isPlatformWalletFrom &&
                isBlockFlowbackEndTimeOk(IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getBlockFlowbackEndTime())
            ) {
                return (25, FLOWBACK);
            }

            if (
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getWorldWideForceFullTransfer() &&
                _args.fromInvestorBalance > _args.value
            ) {
                return (50, ONLY_FULL_TRANSFER);
            }
        }

        uint256 toInvestorBalance = balanceOfInvestor(_services, _args.to);
        string memory toCountry = getCountry(_services, _args.to);

        if (_args.fromRegion == EU) {
            if (_args.fromInvestorBalance - _args.value < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinEUTokens() &&
                _args.fromInvestorBalance > _args.value) {
                return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
            }
        }

        bool isAccreditedTo = isAccredited(_services, _args.to);
        if (
            IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceAccredited() && !isAccreditedTo
        ) {
            return (61, ONLY_ACCREDITED);
        }

        if (toRegion == JP) {
            if (
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getJPInvestorsLimit() != 0 &&
                ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getJPInvestorsCount() >=
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getJPInvestorsLimit() &&
                isNewInvestor(toInvestorBalance) &&
                (!CommonUtils.isEqualString(getCountry(_services, _args.from), toCountry) || (_args.fromInvestorBalance > _args.value))
            ) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }
        } else if (toRegion == EU) {
            if (
                isRetail(_services, _args.to) &&
                ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getEURetailInvestorsCount(toCountry) >=
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getEURetailInvestorsLimit() &&
                isNewInvestor(toInvestorBalance) &&
                (!CommonUtils.isEqualString(getCountry(_services, _args.from), toCountry) ||
                (_args.fromInvestorBalance > _args.value && isRetail(_services, _args.from)))
            ) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }

            if (
                toInvestorBalance + _args.value < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinEUTokens()
            ) {
                return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
            }
        } else if (toRegion == US) {
            if (
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceAccreditedUS() &&
                !isAccreditedTo
            ) {
                return (62, ONLY_US_ACCREDITED);
            }

            uint256 usInvestorsLimit = getUSInvestorsLimit(_services);
            if (
                usInvestorsLimit != 0 &&
                _args.fromInvestorBalance > _args.value &&
                ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getUSInvestorsCount() >= usInvestorsLimit &&
                isNewInvestor(toInvestorBalance)
            ) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }

            if (
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getUSAccreditedInvestorsLimit() != 0 &&
                isAccreditedTo &&
                ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getUSAccreditedInvestorsCount() >=
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getUSAccreditedInvestorsLimit() &&
                isNewInvestor(toInvestorBalance) &&
                (_args.fromRegion != US || !isAccredited(_services, _args.from) || _args.fromInvestorBalance > _args.value)
            ) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }

            if (
                toInvestorBalance + _args.value < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinUSTokens()
            ) {
                return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
            }
        }

        if (!isAccreditedTo) {
            if (maxInvestorsInCategoryForNonAccredited(_services, _args.from, _args.value, _args.fromInvestorBalance, toInvestorBalance)) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }
        }

        if (
            IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getTotalInvestorsLimit() != 0 &&
            _args.fromInvestorBalance > _args.value &&
            ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getTotalInvestorsCount() >=
            IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getTotalInvestorsLimit() &&
            isNewInvestor(toInvestorBalance)
        ) {
            return (40, MAX_INVESTORS_IN_CATEGORY);
        }

        if (
            _args.fromInvestorBalance == _args.value &&
            !isNewInvestor(toInvestorBalance) &&
            ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getTotalInvestorsCount() <=
            IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumTotalInvestors()
        ) {
            return (71, NOT_ENOUGH_INVESTORS);
        }

        if (
            !isPlatformWalletFrom &&
        _args.fromInvestorBalance - _args.value < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumHoldingsPerInvestor() &&
        _args.fromInvestorBalance > _args.value
        ) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }

        if (
            !_args.isPlatformWalletTo &&
        toInvestorBalance + _args.value < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumHoldingsPerInvestor()
        ) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }

        if (
            !_args.isPlatformWalletTo &&
            isMaximumHoldingsPerInvestorOk(
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMaximumHoldingsPerInvestor(),
                toInvestorBalance, _args.value)
        ) {
            return (52, AMOUNT_OF_TOKENS_ABOVE_MAX);
        }

        return (0, VALID);
    }


    function preIssuanceCheck(
        address[] calldata _services,
        address _to,
        uint256 _value
    ) public view returns (uint256 code, string memory reason) {
        ComplianceServiceRegulated complianceService = ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]);
        IDSComplianceConfigurationService complianceConfigurationService = IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]);
        string memory toCountry = IDSRegistryService(_services[REGISTRY_SERVICE]).getCountry(IDSRegistryService(_services[REGISTRY_SERVICE]).getInvestor(_to));
        uint256 toRegion = complianceConfigurationService.getCountryCompliance(toCountry);

        if (toRegion == FORBIDDEN) {
            return (26, DESTINATION_RESTRICTED);
        }

        if (!complianceService.checkWhitelisted(_to)) {
            return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
        }

        if (IDSLockManager(_services[LOCK_MANAGER]).isInvestorLiquidateOnly(IDSRegistryService(_services[REGISTRY_SERVICE]).getInvestor(_to))) {
            return (90, INVESTOR_LIQUIDATE_ONLY);
        }

        uint256 balanceOfInvestorTo = balanceOfInvestor(_services, _to);
        bool isAccreditedTo = isAccredited(_services, _to);

        if (
            complianceConfigurationService.getForceAccredited() &&
            !isAccreditedTo
        ) {
            return (61, ONLY_ACCREDITED);
        }

        if (isNewInvestor(balanceOfInvestorTo)) {
            // verify global non accredited limit
            if (!isAccreditedTo) {
                if (
                    complianceConfigurationService.getNonAccreditedInvestorsLimit() != 0 &&
                    complianceService.getTotalInvestorsCount() - complianceService.getAccreditedInvestorsCount() >=
                    complianceConfigurationService.getNonAccreditedInvestorsLimit()
                ) {
                    return (40, MAX_INVESTORS_IN_CATEGORY);
                }
            }
            // verify global investors limit
            if (
                complianceConfigurationService.getTotalInvestorsLimit() != 0 &&
                complianceService.getTotalInvestorsCount() >= complianceConfigurationService.getTotalInvestorsLimit()
            ) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }

            if (toRegion == US) {
                // verify US investors limit is not exceeded
                if (complianceConfigurationService.getUSInvestorsLimit() != 0 && complianceService.getUSInvestorsCount() >= complianceConfigurationService.getUSInvestorsLimit()) {
                    return (40, MAX_INVESTORS_IN_CATEGORY);
                }
                // verify accredited US limit is not exceeded
                if (
                    complianceConfigurationService.getUSAccreditedInvestorsLimit() != 0 &&
                    isAccreditedTo &&
                    complianceService.getUSAccreditedInvestorsCount() >= complianceConfigurationService.getUSAccreditedInvestorsLimit()
                ) {
                    return (40, MAX_INVESTORS_IN_CATEGORY);
                }
            } else if (toRegion == EU) {
                if (
                    isRetail(_services, _to) &&
                    complianceService.getEURetailInvestorsCount(getCountry(_services, _to)) >= complianceConfigurationService.getEURetailInvestorsLimit()
                ) {
                    return (40, MAX_INVESTORS_IN_CATEGORY);
                }
            } else if (toRegion == JP) {
                if (complianceConfigurationService.getJPInvestorsLimit() != 0 && complianceService.getJPInvestorsCount() >= complianceConfigurationService.getJPInvestorsLimit()) {
                    return (40, MAX_INVESTORS_IN_CATEGORY);
                }
            }
        }

        if (toRegion == US) {
            if (
                complianceConfigurationService.getForceAccreditedUS() &&
                !isAccreditedTo
            ) {
                return (62, ONLY_US_ACCREDITED);
            }
        }

        uint256 minimumHoldingsRequirement = complianceConfigurationService.getMinimumHoldingsPerInvestor();
        if (toRegion == US) {
            minimumHoldingsRequirement = complianceConfigurationService.getMinUSTokens();
        }

        if (
            !IDSWalletManager(_services[WALLET_MANAGER]).isPlatformWallet(_to) &&
        balanceOfInvestorTo + _value < minimumHoldingsRequirement
        ) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }
        // remains in tokens because maximun holdings per investor is set in tokens
        if (
            !walletManager.isPlatformWallet(_to) &&
            isMaximumHoldingsPerInvestorOk(
                complianceConfigurationService.getMaximumHoldingsPerInvestor(),
                balanceOfInvestorTo,
                _value)
        ) {
            return (52, AMOUNT_OF_TOKENS_ABOVE_MAX);
        }

        return (0, VALID);
    }

    function isMaximumHoldingsPerInvestorOk(uint256 _maximumHoldingsPerInvestor, uint256 _balanceOfInvestorTo, uint256 _value) internal pure returns (bool) {
        return _maximumHoldingsPerInvestor != 0 && _balanceOfInvestorTo + _value > _maximumHoldingsPerInvestor;
    }

    function isBlockFlowbackEndTimeOk(uint256 _blockFlowBackEndTime) private view returns (bool){
        return  (_blockFlowBackEndTime == 0 || _blockFlowBackEndTime > block.timestamp);
    }
}

/**
 *   @title Concrete compliance service for tokens with regulation
 *
 */

contract ComplianceServiceRegulated is ComplianceServiceWhitelisted {

    function initialize() public virtual override onlyProxy initializer {
        super.initialize();
    }

    function compareInvestorBalance(
        address _who,
        uint256 _value,
        uint256 _compareTo
    ) internal view returns (bool) {
        return (_value != 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_who)) == _compareTo);
    }

    function recordTransfer(
        address _from,
        address _to,
        uint256 _value
    ) internal override returns (bool) {
        if (compareInvestorBalance(_to, _value, 0)) {
            adjustTransferCounts(_to, CommonUtils.IncDec.Increase);
        }

        if (compareInvestorBalance(_from, _value, _value)) {
            adjustTotalInvestorsCounts(_from, CommonUtils.IncDec.Decrease);
        }

        cleanupInvestorIssuances(_from);
        cleanupInvestorIssuances(_to);
        return true;
    }

    function adjustTransferCounts(
        address _from,
        CommonUtils.IncDec _increase
    ) internal {
        adjustTotalInvestorsCounts(_from, _increase);
    }

    function recordIssuance(
        address _to,
        uint256 _value,
        uint256 _issuanceTime
    ) internal override returns (bool) {
        if (compareInvestorBalance(_to, _value, 0)) {
            adjustTotalInvestorsCounts(_to, CommonUtils.IncDec.Increase);
        }
        uint256 shares = getRebasingProvider().convertTokensToShares(_value);

        return createIssuanceInformation(getRegistryService().getInvestor(_to), shares, _issuanceTime);
    }

    function recordBurn(address _who, uint256 _value) internal override returns (bool) {

        if (compareInvestorBalance(_who, _value, _value)) {
            adjustTotalInvestorsCounts(_who, CommonUtils.IncDec.Decrease);
        }
        return true;
    }

    function recordSeize(
        address _from,
        address, /*_to*/
        uint256 _value
    ) internal override returns (bool) {
        return recordBurn(_from, _value);
    }

    function adjustInvestorCountsAfterCountryChange(
        string memory _id,
        string memory _country,
        string memory _prevCountry
    ) public override onlyRegistry returns (bool) {
        if (getToken().balanceOfInvestor(_id) == 0) {
            return false;
        }

        if (bytes(_prevCountry).length > 0) {
            adjustInvestorsCountsByCountry(_prevCountry, _id, CommonUtils.IncDec.Decrease);
        }

        adjustInvestorsCountsByCountry(_country, _id, CommonUtils.IncDec.Increase);

        return true;
    }

    function adjustTotalInvestorsCounts(address _wallet, CommonUtils.IncDec _increase) internal {
        if (!getWalletManager().isSpecialWallet(_wallet)) {
            if (_increase == CommonUtils.IncDec.Increase) {
                totalInvestors++;
            }
            else {
                totalInvestors--;
            }

            string memory id = getRegistryService().getInvestor(_wallet);
            string memory country = getRegistryService().getCountry(id);

            adjustInvestorsCountsByCountry(country, id, _increase);
        }
    }

    function adjustInvestorsCountsByCountry(
        string memory _country,
        string memory _id,
        CommonUtils.IncDec _increase
    ) internal {
        uint256 countryCompliance = getComplianceConfigurationService().getCountryCompliance(_country);

        if (getRegistryService().isAccreditedInvestor(_id)) {
            if(_increase == CommonUtils.IncDec.Increase) {
                accreditedInvestorsCount++;
            }
            else {
                accreditedInvestorsCount--;
            }

            if (countryCompliance == US) {
                if(_increase == CommonUtils.IncDec.Increase) {
                    usAccreditedInvestorsCount++;
                }
                else {
                    usAccreditedInvestorsCount--;
                }
            }
        }

        if (countryCompliance == US) {
            if(_increase == CommonUtils.IncDec.Increase) {
                usInvestorsCount++;
            }
            else {
                usInvestorsCount--;
            }
        } else if (countryCompliance == EU && !getRegistryService().isQualifiedInvestor(_id)) {
            if(_increase == CommonUtils.IncDec.Increase) {
                euRetailInvestorsCount[_country]++;
            }
            else {
                euRetailInvestorsCount[_country]--;
            }
        } else if (countryCompliance == JP) {
            if(_increase == CommonUtils.IncDec.Increase) {
                jpInvestorsCount++;
            }
            else {
                jpInvestorsCount--;
            }
        }
    }

    function createIssuanceInformation(
        string memory _investor,
        uint256 _shares,
        uint256 _issuanceTime
    ) internal returns (bool) {
        uint256 issuancesCount = issuancesCounters[_investor];

        issuancesValues[_investor][issuancesCount] = _shares;
        issuancesTimestamps[_investor][issuancesCount] = _issuanceTime;
        issuancesCounters[_investor] = issuancesCount + 1;

        return true;
    }

    function preTransferCheck(
        address _from,
        address _to,
        uint256 _value
    ) public view virtual override returns (uint256 code, string memory reason) {
        return ComplianceServiceLibrary.preTransferCheck(getServices(), _from, _to, _value);
    }

    function newPreTransferCheck(
        address _from,
        address _to,
        uint256 _value,
        uint256 _balanceFrom,
        bool _pausedToken
    ) public view virtual override returns (uint256 code, string memory reason) {
        return ComplianceServiceLibrary.newPreTransferCheck(getServices(), _from, _to, _value, _balanceFrom, _pausedToken);
    }

    function preInternalTransferCheck(
        address _from,
        address _to,
        uint256 _value)
    public view override returns (uint256 code, string memory reason) {
        return ComplianceServiceLibrary.preTransferCheck(getServices(), _from, _to, _value);
    }

    function getComplianceTransferableTokens(
        address _who,
        uint256 _time,
        uint64 _lockTime
    ) public view override returns (uint256) {
        require(_time != 0, "Time must be greater than zero");
        string memory investor = getRegistryService().getInvestor(_who);

        uint256 balanceOfInvestor = getLockManager().getTransferableTokens(_who, _time);

        uint256 investorIssuancesCount = issuancesCounters[investor];

        //No locks, go to base class implementation
        if (investorIssuancesCount == 0) {
            return balanceOfInvestor;
        }

        uint256 totalLockedTokens = 0;

        for (uint256 i = 0; i < investorIssuancesCount; i++) {
            uint256 issuanceTimestamp = issuancesTimestamps[investor][i];

            if (uint256(_lockTime) > _time || issuanceTimestamp > (_time - uint256(_lockTime))) {
                uint256 tokens = getRebasingProvider().convertSharesToTokens(issuancesValues[investor][i]);
                totalLockedTokens = totalLockedTokens + tokens;
            }
        }

        //there may be more locked tokens than actual tokens, so the minimum between the two
        uint256 transferable = balanceOfInvestor - Math.min(totalLockedTokens, balanceOfInvestor);

        return transferable;
    }

    function preIssuanceCheck(address _to, uint256 _value) public view override returns (uint256 code, string memory reason) {
        return ComplianceServiceLibrary.preIssuanceCheck(getServices(), _to, _value);
    }

    function getTotalInvestorsCount() public view returns (uint256) {
        return totalInvestors;
    }

    function getUSInvestorsCount() public view returns (uint256) {
        return usInvestorsCount;
    }

    function getUSAccreditedInvestorsCount() public view returns (uint256) {
        return usAccreditedInvestorsCount;
    }

    function getAccreditedInvestorsCount() public view returns (uint256) {
        return accreditedInvestorsCount;
    }

    function getEURetailInvestorsCount(string calldata _country) public view returns (uint256) {
        return euRetailInvestorsCount[_country];
    }

    function getJPInvestorsCount() public view returns (uint256) {
        return jpInvestorsCount;
    }

    function setTotalInvestorsCount(uint256 _value) public onlyMaster returns (bool) {
        totalInvestors = _value;

        return true;
    }

    function setUSInvestorsCount(uint256 _value) public onlyMaster returns (bool) {
        usInvestorsCount = _value;

        return true;
    }

    function setUSAccreditedInvestorsCount(uint256 _value) public onlyMaster returns (bool) {
        usAccreditedInvestorsCount = _value;

        return true;
    }

    function setAccreditedInvestorsCount(uint256 _value) public onlyMaster returns (bool) {
        accreditedInvestorsCount = _value;

        return true;
    }

    function setEURetailInvestorsCount(string calldata _country, uint256 _value) public onlyMaster returns (bool) {
        euRetailInvestorsCount[_country] = _value;

        return true;
    }

    function setJPInvestorsCount(uint256 _value) public onlyMaster returns (bool) {
        jpInvestorsCount = _value;

        return true;
    }

    function cleanupInvestorIssuances(address _who) internal {
        string memory investor = getRegistryService().getInvestor(_who);
        string memory country = getRegistryService().getCountry(investor);

        uint256 region = getComplianceConfigurationService().getCountryCompliance(country);

        uint256 lockTime;
        if (region == ComplianceServiceLibrary.US) {
            lockTime = getComplianceConfigurationService().getUSLockPeriod();
        } else {
            lockTime = getComplianceConfigurationService().getNonUSLockPeriod();
        }

        uint256 time = block.timestamp;

        uint256 currentIssuancesCount = issuancesCounters[investor];
        uint256 currentIndex = 0;

        if (currentIssuancesCount == 0) {
            return;
        }

        while (currentIndex < currentIssuancesCount) {
            uint256 issuanceTimestamp = issuancesTimestamps[investor][currentIndex];

            bool isNoLongerLocked = issuanceTimestamp <= (time - lockTime);

            if (isNoLongerLocked) {
                if (currentIndex != currentIssuancesCount - 1) {
                    issuancesTimestamps[investor][currentIndex] = issuancesTimestamps[investor][currentIssuancesCount - 1];
                    issuancesValues[investor][currentIndex] = issuancesValues[investor][currentIssuancesCount - 1];
                }

                delete issuancesTimestamps[investor][currentIssuancesCount - 1];
                delete issuancesValues[investor][currentIssuancesCount - 1];

                issuancesCounters[investor]--;
                currentIssuancesCount = issuancesCounters[investor];
            } else {
                currentIndex++;
            }
        }
    }

    function getServices() internal view returns (address[] memory services) {
        services = new address[](6);
        services[0] = getDSService(DS_TOKEN);
        services[1] = getDSService(REGISTRY_SERVICE);
        services[2] = getDSService(WALLET_MANAGER);
        services[3] = getDSService(COMPLIANCE_CONFIGURATION_SERVICE);
        services[4] = getDSService(LOCK_MANAGER);
        services[5] = address(this);
    }
}
