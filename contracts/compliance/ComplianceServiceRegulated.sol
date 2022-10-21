pragma solidity ^0.8.13;

import "./ComplianceServiceWhitelisted.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

library ComplianceServiceLibrary {
    uint256 internal constant DS_TOKEN = 0;
    uint256 internal constant REGISTRY_SERVICE = 1;
    uint256 internal constant WALLET_MANAGER = 2;
    uint256 internal constant COMPLIANCE_CONFIGURATION_SERVICE = 3;
    uint256 internal constant LOCK_MANAGER = 4;
    uint256 internal constant COMPLIANCE_SERVICE = 5;
    uint256 internal constant OMNIBUS_TBE_CONTROLLER = 6;
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
    string internal constant HOLD_UP = "Hold-up";
    string internal constant HOLD_UP_1Y = "Hold-up 1y";
    string internal constant DESTINATION_RESTRICTED = "Destination restricted";
    string internal constant MAX_INVESTORS_IN_CATEGORY = "Max investors in category";
    string internal constant ONLY_ACCREDITED = "Only accredited";
    string internal constant ONLY_US_ACCREDITED = "Only us accredited";
    string internal constant NOT_ENOUGH_INVESTORS = "Not enough investors";

    struct CompletePreTransferCheckArgs {
        address from;
        address to;
        uint256 value;
        uint256 fromInvestorBalance;
        uint256 fromRegion;
        bool isPlatformWalletTo;
    }

    using SafeMath for uint256;

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

    function isNewInvestor(address[] memory _services, address _to, uint256 _balanceOfInvestorTo) internal view returns (bool) {
        IDSOmnibusTBEController omnibusTBEController = IDSOmnibusTBEController(_services[OMNIBUS_TBE_CONTROLLER]);

        // Return whether this investor has 0 balance and is not an omnibus TBE wallet
        return _balanceOfInvestorTo == 0 && !isOmnibusTBE(omnibusTBEController, _to);
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
            return compConfService.getMaxUSInvestorsPercentage().mul(complianceService.getTotalInvestorsCount()).div(100);
        }

        return Math.min(compConfService.getUSInvestorsLimit(), compConfService.getMaxUSInvestorsPercentage().mul(complianceService.getTotalInvestorsCount()).div(100));
    }

    function isOmnibusTBE(IDSOmnibusTBEController _omnibusTBE, address _from) public view returns (bool) {
        if (address(_omnibusTBE) != address(0)) {
            return _omnibusTBE.getOmnibusWallet() == _from;
        }
        return false;
    }

    function checkHoldUp(
        address[] memory _services,
        address _from,
        uint256 _value,
        bool _isUSLockPeriod,
        bool _isPlatformWalletFrom
    ) internal view returns (bool) {
        ComplianceServiceRegulated complianceService = ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]);
        uint64 lockPeriod;
        if (_isUSLockPeriod) {
            lockPeriod = uint64(IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getUSLockPeriod());
        } else {
            lockPeriod = uint64(IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getNonUSLockPeriod());
        }

        return
        !_isPlatformWalletFrom &&
        complianceService.getComplianceTransferableTokens(_from, uint64(now), lockPeriod) < _value;
    }

    function maxInvestorsInCategoryForNonAccredited(
        address[] memory _services,
        address _from,
        address _to,
        uint256 _value,
        uint256 fromInvestorBalance,
        uint256 toInvestorBalance
    ) internal view returns (bool) {
        uint256 nonAccreditedInvestorLimit = IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getNonAccreditedInvestorsLimit();
        return
        nonAccreditedInvestorLimit != 0 &&
        ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getTotalInvestorsCount().sub(
            ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getAccreditedInvestorsCount()
        ) >=
        nonAccreditedInvestorLimit &&
        isNewInvestor(_services, _to, toInvestorBalance) &&
        (isAccredited(_services, _from) || fromInvestorBalance > _value);
    }

    function newPreTransferCheck(
        address[] memory _services,
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
        address[] memory _services,
        address _from,
        address _to,
        uint256 _value
    ) public view returns (uint256 code, string memory reason) {
        return doPreTransferCheckRegulated(_services, _from, _to, _value, IDSToken(_services[DS_TOKEN]).balanceOf(_from), IDSToken(_services[DS_TOKEN]).isPaused());
    }

    function doPreTransferCheckRegulated(
        address[] memory _services,
        address _from,
        address _to,
        uint256 _value,
        uint256 _balanceFrom,
        bool _paused
    ) internal view returns (uint256 code, string memory reason) {

        if (_balanceFrom < _value) {
            return (15, NOT_ENOUGH_TOKENS);
        }

        uint256 fromInvestorBalance = balanceOfInvestor(_services, _from);
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

        if (_paused && !(isOmnibusTBE(IDSOmnibusTBEController(_services[OMNIBUS_TBE_CONTROLLER]), _from))) {
            return (10, TOKEN_PAUSED);
        }

        CompletePreTransferCheckArgs memory args = CompletePreTransferCheckArgs(_from, _to, _value, fromInvestorBalance, fromRegion, isPlatformWalletTo);
        return completeTransferCheck(_services, args);
    }

    function completeTransferCheck(
        address[] memory _services,
        CompletePreTransferCheckArgs memory _args
    ) internal view returns (uint256 code, string memory reason) {
        (string memory investorFrom, string memory investorTo) = IDSRegistryService(_services[REGISTRY_SERVICE]).getInvestors(_args.from, _args.to);
        if (
            !CommonUtils.isEmptyString(investorFrom) && CommonUtils.isEqualString(investorFrom, investorTo)
        ) {
            return (0, VALID);
        }

        if (!ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).checkWhitelisted(_args.to)) {
            return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
        }

        uint256 toRegion = getCountryCompliance(_services, _args.to);
        if (toRegion == FORBIDDEN) {
            return (26, DESTINATION_RESTRICTED);
        }

        if (isOmnibusTBE(IDSOmnibusTBEController(_services[OMNIBUS_TBE_CONTROLLER]), _args.from)) {
            return(0, VALID);
        }

        bool isPlatformWalletFrom = IDSWalletManager(_services[WALLET_MANAGER]).isPlatformWallet(_args.from);
        if (
            !isPlatformWalletFrom &&
        IDSLockManager(_services[LOCK_MANAGER]).getTransferableTokens(_args.from, uint64(now)) < _args.value
        ) {
            return (16, TOKENS_LOCKED);
        }

        if (_args.fromRegion == US) {
            if (checkHoldUp(_services, _args.from, _args.value, true, isPlatformWalletFrom)) {
                return (32, HOLD_UP_1Y);
            }

            if (
                _args.fromInvestorBalance > _args.value &&
                _args.fromInvestorBalance.sub(_args.value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinUSTokens()
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
            if (_args.fromInvestorBalance.sub(_args.value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinEUTokens() &&
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
                isNewInvestor(_services, _args.to, toInvestorBalance) &&
                (!CommonUtils.isEqualString(getCountry(_services, _args.from), toCountry) || (_args.fromInvestorBalance > _args.value))
            ) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }
        } else if (toRegion == EU) {
            if (
                isRetail(_services, _args.to) &&
                ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getEURetailInvestorsCount(toCountry) >=
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getEURetailInvestorsLimit() &&
                isNewInvestor(_services, _args.to, toInvestorBalance) &&
                (!CommonUtils.isEqualString(getCountry(_services, _args.from), toCountry) ||
                (_args.fromInvestorBalance > _args.value && isRetail(_services, _args.from)))
            ) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }

            if (
                toInvestorBalance.add(_args.value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinEUTokens()
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
                isNewInvestor(_services, _args.to, toInvestorBalance)
            ) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }

            if (
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getUSAccreditedInvestorsLimit() != 0 &&
                isAccreditedTo &&
                ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getUSAccreditedInvestorsCount() >=
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getUSAccreditedInvestorsLimit() &&
                isNewInvestor(_services, _args.to, toInvestorBalance) &&
                (_args.fromRegion != US || !isAccredited(_services, _args.from) || _args.fromInvestorBalance > _args.value)
            ) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }

            if (
                toInvestorBalance.add(_args.value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinUSTokens()
            ) {
                return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
            }
        }

        if (!isAccreditedTo) {
            if (maxInvestorsInCategoryForNonAccredited(_services, _args.from, _args.to, _args.value, _args.fromInvestorBalance, toInvestorBalance)) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }
        }

        if (
            IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getTotalInvestorsLimit() != 0 &&
            _args.fromInvestorBalance > _args.value &&
            ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getTotalInvestorsCount() >=
            IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getTotalInvestorsLimit() &&
            isNewInvestor(_services, _args.to, toInvestorBalance)
        ) {
            return (40, MAX_INVESTORS_IN_CATEGORY);
        }

        if (
            _args.fromInvestorBalance == _args.value &&
            !isNewInvestor(_services, _args.to, toInvestorBalance) &&
            ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]).getTotalInvestorsCount() <=
            IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumTotalInvestors()
        ) {
            return (71, NOT_ENOUGH_INVESTORS);
        }

        if (
            !isPlatformWalletFrom &&
        _args.fromInvestorBalance.sub(_args.value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumHoldingsPerInvestor() &&
        _args.fromInvestorBalance > _args.value
        ) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }

        if (
            !_args.isPlatformWalletTo &&
        toInvestorBalance.add(_args.value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumHoldingsPerInvestor()
        ) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }

        if (
            isMaximumHoldingsPerInvestorOk(
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMaximumHoldingsPerInvestor(),
                toInvestorBalance, _args.value)
        ) {
            return (52, AMOUNT_OF_TOKENS_ABOVE_MAX);
        }

        return (0, VALID);
    }


    function preIssuanceCheck(
        address[] memory _services,
        address _to,
        uint256 _value
    ) public view returns (uint256 code, string memory reason) {
        ComplianceServiceRegulated complianceService = ComplianceServiceRegulated(_services[COMPLIANCE_SERVICE]);
        IDSComplianceConfigurationService complianceConfigurationService = IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]);
        IDSWalletManager walletManager = IDSWalletManager(_services[WALLET_MANAGER]);
        string memory toCountry = IDSRegistryService(_services[REGISTRY_SERVICE]).getCountry(IDSRegistryService(_services[REGISTRY_SERVICE]).getInvestor(_to));
        uint256 toRegion = complianceConfigurationService.getCountryCompliance(toCountry);

        if (toRegion == FORBIDDEN) {
            return (26, DESTINATION_RESTRICTED);
        }

        if (!complianceService.checkWhitelisted(_to)) {
            return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
        }

        uint256 balanceOfInvestorTo = balanceOfInvestor(_services, _to);
        if (isNewInvestor(_services, _to, balanceOfInvestorTo)) {
            // verify global non accredited limit
            if (!isAccredited(_services, _to)) {
                if (
                    complianceConfigurationService.getNonAccreditedInvestorsLimit() != 0 &&
                    complianceService.getTotalInvestorsCount().sub(complianceService.getAccreditedInvestorsCount()) >=
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
                    isAccredited(_services, _to) &&
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

        if (
            !walletManager.isPlatformWallet(_to) &&
        balanceOfInvestorTo.add(_value) < complianceConfigurationService.getMinimumHoldingsPerInvestor()
        ) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }
        if (isMaximumHoldingsPerInvestorOk(
                complianceConfigurationService.getMaximumHoldingsPerInvestor(),
                balanceOfInvestorTo,
                _value)
        ) {
            return (52, AMOUNT_OF_TOKENS_ABOVE_MAX);
        }

        return (0, VALID);
    }

    function isMaximumHoldingsPerInvestorOk(uint256 _maximumHoldingsPerInvestor, uint256 _balanceOfInvestorTo, uint256 _value) internal pure returns (bool) {
        return _maximumHoldingsPerInvestor != 0 && _balanceOfInvestorTo.add(_value) > _maximumHoldingsPerInvestor;
    }

    function isBlockFlowbackEndTimeOk(uint256 _blockFlowBackEndTime) private view returns (bool){
        return  (_blockFlowBackEndTime == 0 || _blockFlowBackEndTime > now);
    }
}

/**
 *   @title Concrete compliance service for tokens with regulation
 *
 */
//SPDX-License-Identifier: UNLICENSED
contract ComplianceServiceRegulated is ComplianceServiceWhitelisted {
    function initialize() public virtual override initializer forceInitializeFromProxy {
        super.initialize();
        VERSIONS.push(13);
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
        if (!(ComplianceServiceLibrary.isOmnibusTBE(getOmnibusTBEController(), _from) ||
        ComplianceServiceLibrary.isOmnibusTBE(getOmnibusTBEController(), _to))) {
            if (compareInvestorBalance(_to, _value, 0)) {
                adjustTransferCounts(_to, CommonUtils.IncDec.Increase);
            }
        }

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

        return createIssuanceInformation(getRegistryService().getInvestor(_to), _value, _issuanceTime);
    }

    function recordBurn(address _who, uint256 _value) internal override returns (bool) {
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

        adjustInvestorsCountsByCountry(_country, _id, CommonUtils.IncDec.Increase);

        return true;
    }

    function adjustTotalInvestorsCounts(address _wallet, CommonUtils.IncDec _increase) internal {
        if (!getWalletManager().isSpecialWallet(_wallet)) {
            if (_increase == CommonUtils.IncDec.Increase) {
                totalInvestors = totalInvestors.add(1);
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
                accreditedInvestorsCount = accreditedInvestorsCount.add(1);
            }
            if (countryCompliance == US) {
                if(_increase == CommonUtils.IncDec.Increase) {
                    usAccreditedInvestorsCount = usAccreditedInvestorsCount.add(1);
                }
            }
        }

        if (countryCompliance == US) {
            if(_increase == CommonUtils.IncDec.Increase) {
                usInvestorsCount = usInvestorsCount.add(1);
            }
        } else if (countryCompliance == EU && !getRegistryService().isQualifiedInvestor(_id)) {
            if(_increase == CommonUtils.IncDec.Increase) {
                euRetailInvestorsCount[_country] = euRetailInvestorsCount[_country].add(1);
            }
        } else if (countryCompliance == JP) {
            if(_increase == CommonUtils.IncDec.Increase) {
                jpInvestorsCount = jpInvestorsCount.add(1);
            }
        }
    }

    function createIssuanceInformation(
        string memory _investor,
        uint256 _value,
        uint256 _issuanceTime
    ) internal returns (bool) {
        uint256 issuancesCount = issuancesCounters[_investor];

        issuancesValues[_investor][issuancesCount] = _value;
        issuancesTimestamps[_investor][issuancesCount] = _issuanceTime;
        issuancesCounters[_investor] = issuancesCount.add(1);

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
        uint64 _time,
        uint64 _lockTime
    ) public view returns (uint256) {
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

            if (_lockTime > _time || issuanceTimestamp > SafeMath.sub(_time, _lockTime)) {
                totalLockedTokens = totalLockedTokens.add(issuancesValues[investor][i]);
            }
        }

        //there may be more locked tokens than actual tokens, so the minimum between the two
        uint256 transferable = SafeMath.sub(balanceOfInvestor, Math.min(totalLockedTokens, balanceOfInvestor));

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

    function getEURetailInvestorsCount(string memory _country) public view returns (uint256) {
        return euRetailInvestorsCount[_country];
    }

    function getJPInvestorsCount() public view returns (uint256) {
        return jpInvestorsCount;
    }

    function setTotalInvestorsCount(uint256 _value) public onlyMasterOrTBEOmnibus returns (bool) {
        totalInvestors = _value;

        return true;
    }

    function setUSInvestorsCount(uint256 _value) public onlyMasterOrTBEOmnibus returns (bool) {
        usInvestorsCount = _value;

        return true;
    }

    function setUSAccreditedInvestorsCount(uint256 _value) public onlyMasterOrTBEOmnibus returns (bool) {
        usAccreditedInvestorsCount = _value;

        return true;
    }

    function setAccreditedInvestorsCount(uint256 _value) public onlyMasterOrTBEOmnibus returns (bool) {
        accreditedInvestorsCount = _value;

        return true;
    }

    function setEURetailInvestorsCount(string memory _country, uint256 _value) public onlyMasterOrTBEOmnibus returns (bool) {
        euRetailInvestorsCount[_country] = _value;

        return true;
    }

    function setJPInvestorsCount(uint256 _value) public onlyMasterOrTBEOmnibus returns (bool) {
        jpInvestorsCount = _value;

        return true;
    }

    function getServices() internal view returns (address[] memory services) {
        services = new address[](7);
        services[0] = getDSService(DS_TOKEN);
        services[1] = getDSService(REGISTRY_SERVICE);
        services[2] = getDSService(WALLET_MANAGER);
        services[3] = getDSService(COMPLIANCE_CONFIGURATION_SERVICE);
        services[4] = getDSService(LOCK_MANAGER);
        services[5] = address(this);
        services[6] = getDSService(OMNIBUS_TBE_CONTROLLER);
    }
}
