pragma solidity ^0.8.13;

import "./ComplianceServiceRegulated.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";


library ComplianceServicePartitionedLibrary {
    uint256 internal constant NONE = 0;
    uint256 internal constant US = 1;
    uint256 internal constant EU = 2;
    uint256 internal constant FORBIDDEN = 4;
    uint256 internal constant JP = 8;
    uint256 internal constant DS_TOKEN = 0;
    uint256 internal constant REGISTRY_SERVICE = 1;
    uint256 internal constant WALLET_MANAGER = 2;
    uint256 internal constant COMPLIANCE_CONFIGURATION_SERVICE = 3;
    uint256 internal constant LOCK_MANAGER = 4;
    uint256 internal constant COMPLIANCE_SERVICE = 5;
    uint256 internal constant OMNIBUS_TBE_CONTROLLER = 6;
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

    function balanceOfInvestor(address[] memory _services, address _wallet) public view returns (uint256) {
        IDSRegistryService registry = IDSRegistryService(_services[REGISTRY_SERVICE]);
        IDSToken token = IDSToken(_services[DS_TOKEN]);

        return token.balanceOfInvestor(registry.getInvestor(_wallet));
    }

    function isNewInvestor(address[] memory _services, address _wallet, uint256 _balanceOfInvestor) internal view returns (bool) {
        IDSOmnibusTBEController omnibusTBEController = IDSOmnibusTBEController(_services[OMNIBUS_TBE_CONTROLLER]);

        return _balanceOfInvestor == 0 && !isOmnibusTBE(omnibusTBEController, _wallet);
    }

    function getCountry(address[] memory _services, address _wallet) internal view returns (string memory) {
        IDSRegistryService registry = IDSRegistryService(_services[REGISTRY_SERVICE]);

        return registry.getCountry(registry.getInvestor(_wallet));
    }

    function getCountryCompliance(address[] memory _services, address _wallet) internal view returns (uint256) {
        return IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getCountryCompliance(getCountry(_services, _wallet));
    }

    function isOmnibusTBE(IDSOmnibusTBEController _omnibusTBE, address _from) public view returns (bool) {
        if (address(_omnibusTBE) != address(0)) {
            return _omnibusTBE.getOmnibusWallet() == _from;
        }
        return false;
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

    function checkHoldUp(address[] memory _services, address _from, uint256 _value, bool _isPlatformWalletFrom) internal view returns (bool) {
        ComplianceServiceRegulatedPartitioned complianceService = ComplianceServiceRegulatedPartitioned(_services[COMPLIANCE_SERVICE]);
        return
        !_isPlatformWalletFrom &&
        complianceService.getComplianceTransferableTokens(_from, block.timestamp, false) < _value;
    }

    function maxInvestorsInCategoryForNonAccredited(address[] memory _services, address _from, address _to, uint256 _value, uint256 _fromInvestorBalance, uint256 _toInvestorBalance)
    internal
    view
    returns (bool)
    {
        return
        IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getNonAccreditedInvestorsLimit() != 0 &&
        ComplianceServiceRegulatedPartitioned(_services[COMPLIANCE_SERVICE]).getTotalInvestorsCount().sub(
            ComplianceServiceRegulatedPartitioned(_services[COMPLIANCE_SERVICE]).getAccreditedInvestorsCount()
        ) >=
        IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getNonAccreditedInvestorsLimit() &&
        isNewInvestor(_services, _to, _toInvestorBalance) &&
        (isAccredited(_services, _from) || _fromInvestorBalance > _value);
    }

    function newPreTransferCheck(address[] memory _services, address _from, address _to, uint256 _value, uint256 _balanceFrom, bool _paused)
    public
    view
    returns (uint256 code, string memory reason)
    {
        return doPreTransferCheckPartitioned(_services, _from, _to, _value, _balanceFrom, _paused);
    }

    function preTransferCheck(address[] memory _services, address _from, address _to, uint256 _value)
    public
    view
    returns (uint256 code, string memory reason)
    {
        return doPreTransferCheckPartitioned(_services, _from, _to, _value, IDSToken(_services[DS_TOKEN]).balanceOf(_from), IDSToken(_services[DS_TOKEN]).isPaused());
    }

    function doPreTransferCheckPartitioned(address[] memory _services, address _from, address _to, uint256 _value, uint256 _balanceFrom, bool _paused)
    public
    view
    returns (uint256 code, string memory reason)
    {
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
        return completePreTransferCheck(_services, args);
    }

    function completePreTransferCheck(address[] memory _services, CompletePreTransferCheckArgs memory _args) internal view
    returns (uint256 code, string memory reason)
    {
        (string memory investorFrom, string memory investorTo) = IDSRegistryService(_services[REGISTRY_SERVICE]).getInvestors(_args.from, _args.to);
        if (!CommonUtils.isEmptyString(investorFrom) && CommonUtils.isEqualString(investorFrom,investorTo)) {
            return (0, VALID);
        }

        if (!ComplianceServiceRegulatedPartitioned(_services[COMPLIANCE_SERVICE]).checkWhitelisted(_args.to)) {
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
            !isPlatformWalletFrom && IDSLockManager(_services[LOCK_MANAGER]).getTransferableTokens(_args.from, block.timestamp) < _args.value
        ) {
            return (16, TOKENS_LOCKED);
        }

        bool isNotBeneficiaryOrHolderOfRecord = true;

        if (_args.fromRegion == US) {
            if (checkHoldUp(_services, _args.from, _args.value, isPlatformWalletFrom)) {
                return (32, HOLD_UP_1Y);
            }

            if (
                (_args.fromInvestorBalance > _args.value &&
            _args.fromInvestorBalance.sub(_args.value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinUSTokens())
            ) {
                return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
            }

            if (IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceFullTransfer() && _args.fromInvestorBalance > _args.value) {
                return (50, ONLY_FULL_TRANSFER);
            }
        } else {
            if (checkHoldUp(_services, _args.from, _args.value, isPlatformWalletFrom)) {
                return (33, HOLD_UP);
            }

            if (
                toRegion == US &&
                !isPlatformWalletFrom &&
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getBlockFlowbackEndTime() != 0 &&
                ComplianceServiceRegulatedPartitioned(_services[COMPLIANCE_SERVICE]).getComplianceTransferableTokens(_args.from, block.timestamp, true) < _args.value
            ) {
                return (25, FLOWBACK);
            }

            if (IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getWorldWideForceFullTransfer() && _args.fromInvestorBalance >_args.value) {
                return (50, ONLY_FULL_TRANSFER);
            }
        }

        uint256 toInvestorBalance = balanceOfInvestor(_services, _args.to);
        string memory toCountry = getCountry(_services, _args.to);

        if (_args.fromRegion == EU && isNotBeneficiaryOrHolderOfRecord) {
            if (_args.fromInvestorBalance.sub(_args.value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinEUTokens() &&
                _args.fromInvestorBalance > _args.value) {
                return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
            }
        }

        bool isAccreditedTo = isAccredited(_services, _args.to);
        if (IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceAccredited() && !isAccreditedTo) {
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
                ComplianceServiceRegulatedPartitioned(_services[COMPLIANCE_SERVICE]).getEURetailInvestorsCount(toCountry) >=
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getEURetailInvestorsLimit() &&
                isNewInvestor(_services, _args.to, toInvestorBalance) &&
                (!CommonUtils.isEqualString(getCountry(_services, _args.from), toCountry) ||
                (_args.fromInvestorBalance > _args.value && isRetail(_services, _args.from)))
            ) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }

            if (
                isNotBeneficiaryOrHolderOfRecord &&
                toInvestorBalance.add(_args.value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinEUTokens()
            ) {
                return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
            }
        } else if (toRegion == US) {
            if (IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceAccreditedUS() &&
                !isAccreditedTo) {
                return (62, ONLY_US_ACCREDITED);
            }

            uint256 usInvestorsLimit = getUSInvestorsLimit(_services);
            if (
                usInvestorsLimit != 0 &&
                _args.fromInvestorBalance > _args.value &&
                ComplianceServiceRegulatedPartitioned(_services[COMPLIANCE_SERVICE]).getUSInvestorsCount() >= usInvestorsLimit &&
                isNewInvestor(_services, _args.to, toInvestorBalance)
            ) {
                return (41, ONLY_FULL_TRANSFER);
            }

            if (
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getUSAccreditedInvestorsLimit() != 0 &&
                isAccreditedTo &&
                ComplianceServiceRegulatedPartitioned(_services[COMPLIANCE_SERVICE]).getUSAccreditedInvestorsCount() >=
                IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getUSAccreditedInvestorsLimit() &&
                isNewInvestor(_services, _args.to, toInvestorBalance) &&
                (_args.fromRegion != US || !isAccredited(_services, _args.from) || _args.fromInvestorBalance > _args.value)
            ) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }

            if (
                isNotBeneficiaryOrHolderOfRecord && toInvestorBalance.add(_args.value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinUSTokens()
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
            ComplianceServiceRegulatedPartitioned(_services[COMPLIANCE_SERVICE]).getTotalInvestorsCount() >=
            IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getTotalInvestorsLimit() &&
            isNewInvestor(_services, _args.to, toInvestorBalance)
        ) {
            return (41, ONLY_FULL_TRANSFER);
        }

        if (
            isNotBeneficiaryOrHolderOfRecord &&
            _args.fromInvestorBalance == _args.value &&
            !isNewInvestor(_services, _args.to, toInvestorBalance) &&
            ComplianceServiceRegulatedPartitioned(_services[COMPLIANCE_SERVICE]).getTotalInvestorsCount() <=
            IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumTotalInvestors()
        ) {
            return (71, NOT_ENOUGH_INVESTORS);
        }

        if (
            isNotBeneficiaryOrHolderOfRecord &&
            !isPlatformWalletFrom &&
            _args.fromInvestorBalance.sub(_args.value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumHoldingsPerInvestor() &&
            _args.fromInvestorBalance > _args.value
        ) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }

        if (
            isNotBeneficiaryOrHolderOfRecord &&
            !_args.isPlatformWalletTo &&
            toInvestorBalance.add(_args.value) < IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumHoldingsPerInvestor()
        ) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }

        if (
            isNotBeneficiaryOrHolderOfRecord &&
            IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMaximumHoldingsPerInvestor() != 0 &&
            toInvestorBalance.add(_args.value) > IDSComplianceConfigurationService(_services[COMPLIANCE_CONFIGURATION_SERVICE]).getMaximumHoldingsPerInvestor()
        ) {
            return (52, AMOUNT_OF_TOKENS_ABOVE_MAX);
        }

        return (0, VALID);
    }

    function getLockTime(IDSComplianceConfigurationService _complianceConfiguration, uint256 _partitionRegion, bool _checkFlowback) public view returns (uint256) {
        if (_partitionRegion == US) {
            return _complianceConfiguration.getUSLockPeriod();
        } else {
            uint256 lockTime = _complianceConfiguration.getNonUSLockPeriod();
            if (_checkFlowback) {
                lockTime = Math.max(lockTime, _complianceConfiguration.getBlockFlowbackEndTime());
            }
            return lockTime;
        }
    }
}


/**
 *   @title Concrete compliance service for tokens with regulation
 *
 */
//SPDX-License-Identifier: UNLICENSED
contract ComplianceServiceRegulatedPartitioned is IDSComplianceServicePartitioned, ComplianceServiceRegulated {
    using SafeMath for uint256;

    function initialize() public override(ComplianceServiceRegulated, IDSComplianceServicePartitioned) initializer forceInitializeFromProxy {
        ComplianceServiceRegulated.initialize();
        IDSComplianceServicePartitioned.initialize();
        VERSIONS.push(7);
    }

    function preTransferCheck(address _from, address _to, uint256 _value) public view override(IDSComplianceService, ComplianceServiceRegulated) returns (uint256 code, string memory reason) {
        return ComplianceServicePartitionedLibrary.preTransferCheck(getServices(), _from, _to, _value);
    }

    function newPreTransferCheck(address _from, address _to, uint256 _value, uint256 _balanceFrom, bool _paused) public view override returns (uint256 code, string memory reason) {
        return ComplianceServicePartitionedLibrary.newPreTransferCheck(getServices(), _from, _to, _value, _balanceFrom, _paused);
    }

    function getLockTime(bool _checkFlowback, bytes32 _partition) internal view returns (uint256) {
        IDSComplianceConfigurationService complianceConfiguration = getComplianceConfigurationService();
        uint256 partitionRegion = getPartitionsManager().getPartitionRegion(_partition);
        return ComplianceServicePartitionedLibrary.getLockTime(complianceConfiguration, partitionRegion, _checkFlowback);
    }

    function getComplianceTransferableTokens(address _who, uint256 _time, bool _checkFlowback) public view override returns (uint256 transferable) {
        for (uint256 index = 0; index < getTokenPartitioned().partitionCountOf(_who); ++index) {
            bytes32 partition = getTokenPartitioned().partitionOf(_who, index);
            transferable = SafeMath.add(transferable, getComplianceTransferableTokens(_who, _time, _checkFlowback, partition));
        }
    }

    function getComplianceTransferableTokens(address _who, uint256 _time, bool _checkFlowback, bytes32 _partition) public view override returns (uint256) {
        require(_time != 0, "non zero time required");
        if (getPartitionsManager().getPartitionIssuanceDate(_partition).add(getLockTime(_checkFlowback, _partition)) > _time) {
            return 0;
        }

        return getLockManagerPartitioned().getTransferableTokens(_who, _time, _partition);
    }

    function getComplianceTransferableTokens(address _who, uint256 _time, address _to) public view override returns (uint256 transferable) {
        return getComplianceTransferableTokens(_who, _time, getRegion(_to) == US);
    }

    function getComplianceTransferableTokens(address _who, uint256 _time, address _to, bytes32 _partition) public view override returns (uint256) {
        return getComplianceTransferableTokens(_who, _time, getRegion(_to) == US, _partition);
    }

    function getRegion(address _who) internal view returns (uint256) {
        return getComplianceConfigurationService().getCountryCompliance(getRegistryService().getCountry(getRegistryService().getInvestor(_who)));
    }
}
