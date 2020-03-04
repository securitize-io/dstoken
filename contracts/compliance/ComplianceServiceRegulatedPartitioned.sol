pragma solidity ^0.5.0;

import "./ComplianceServiceRegulated.sol";
import "../zeppelin/math/Math.sol";

library ComplianceServicePartitionedLibrary {
  uint internal constant NONE = 0;
  uint internal constant US = 1;
  uint internal constant EU = 2;
  uint internal constant FORBIDDEN = 4;
  uint256 internal constant DS_TOKEN = 0;
  uint256 internal constant REGISTRY_SERVICE = 1;
  uint256 internal constant WALLET_MANAGER = 2;
  uint256 internal constant COMPLIANCE_CONFIGURATION_SERVICE = 3;
  uint256 internal constant LOCK_MANAGER = 4;
  uint256 internal constant COMPLIANCE_SERVICE = 5;
  string internal constant TOKEN_PAUSED = "Token Paused";
  string internal constant NOT_ENOUGH_TOKENS = "Not Enough Tokens";
  string internal constant VALID = "Valid";
  string internal constant TOKENS_LOCKED = "Tokens Locked";
  string internal constant ONLY_FULL_TRANSFER = "Only Full Transfer";
  string internal constant FLOWBACK = "Flowback";
  string internal constant WALLET_NOT_IN_REGISTRY_SERVICE = "Wallet not in registry Service";
  string internal constant AMOUNT_OF_TOKENS_UNDER_MIN = "Amount of tokens under min";
  string internal constant AMOUNT_OF_TOKENS_ABOVE_MAX = "Amount of tokens above max";
  string internal constant HOLD_UP = "Hold-up";
  string internal constant HOLD_UP_1Y = "Hold-up 1y";
  string internal constant DESTINATION_RESTRICTED = "Destination restricted";
  string internal constant MAX_INVESTORS_IN_CATEGORY = "Max Investors in category";
  string internal constant ONLY_ACCREDITED = "Only accredited";
  string internal constant NOT_ENOUGH_INVESTORS = "Not enough investors";

  using SafeMath for uint256;

  function isRetail(ComplianceServiceRegulatedPartitioned _complianceService, address _wallet) internal view returns (bool) {
    return getRegistryService(_complianceService).getAttributeValue(getRegistryService(_complianceService).getInvestor(_wallet), getRegistryService(_complianceService).QUALIFIED()) != getRegistryService(_complianceService).APPROVED();
  }

  function isAccredited(ComplianceServiceRegulatedPartitioned _complianceService, address _wallet) internal view returns (bool) {
    return getRegistryService(_complianceService).getAttributeValue(getRegistryService(_complianceService).getInvestor(_wallet), getRegistryService(_complianceService).ACCREDITED()) == getRegistryService(_complianceService).APPROVED();
  }

  function balanceOfInvestor(ComplianceServiceRegulatedPartitioned _complianceService, address _wallet) internal view returns (uint) {
    return getToken(_complianceService).balanceOfInvestor(getRegistryService(_complianceService).getInvestor(_wallet));
  }

  function isNewInvestor(ComplianceServiceRegulatedPartitioned _complianceService, address _wallet) internal view returns (bool) {
    return balanceOfInvestor(_complianceService, _wallet) == 0;
  }

  function getCountry(ComplianceServiceRegulatedPartitioned _complianceService, address _wallet) internal view returns (string memory) {
    return getRegistryService(_complianceService).getCountry(getRegistryService(_complianceService).getInvestor(_wallet));
  }

  function getCountryCompliance(ComplianceServiceRegulatedPartitioned _complianceService, address _wallet) internal view returns (uint) {
    return getComplianceConfigurationService(_complianceService).getCountryCompliance(getCountry(_complianceService, _wallet));
  }

  function getUsInvestorsLimit(ComplianceServiceRegulatedPartitioned _complianceService) public view returns (uint) {
    if (getComplianceConfigurationService(_complianceService).getMaxUsInvestorsPercentage() == 0) {
        return getComplianceConfigurationService(_complianceService).getUsInvestorsLimit();
    }

    if (getComplianceConfigurationService(_complianceService).getUsInvestorsLimit() == 0) {
        return getComplianceConfigurationService(_complianceService).getMaxUsInvestorsPercentage().mul(_complianceService.getTotalInvestorsCount()).div(100);
    }

    return Math.min(getComplianceConfigurationService(_complianceService).getUsInvestorsLimit(), getComplianceConfigurationService(_complianceService).getMaxUsInvestorsPercentage().mul(_complianceService.getTotalInvestorsCount()).div(100));
  }

  function preTransferCheck(address[] memory services, address _from, address _to, uint _value) public view returns (uint code, string memory reason) {
    ComplianceServiceRegulatedPartitioned complianceService = ComplianceServiceRegulatedPartitioned(services[COMPLIANCE_SERVICE]);
    if (getToken(complianceService).isPaused()) {
      return (10, TOKEN_PAUSED);
    }

    if (getToken(complianceService).balanceOf(_from) < _value) {
      return (15, NOT_ENOUGH_TOKENS);
    }

    if (keccak256(abi.encodePacked(IDSRegistryService(services[REGISTRY_SERVICE]).getInvestor(_from))) != keccak256("") &&
        keccak256(abi.encodePacked(IDSRegistryService(services[REGISTRY_SERVICE]).getInvestor(_from))) == keccak256(abi.encodePacked(IDSRegistryService(services[REGISTRY_SERVICE]).getInvestor(_to)))) {
            return (0, VALID);
    }

    uint fromInvestorBalance = balanceOfInvestor(complianceService, _from);

    if (IDSWalletManager(services[WALLET_MANAGER]).getWalletType(_to) == IDSWalletManager(services[WALLET_MANAGER]).PLATFORM()) {
        if (IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceFullTransfer() && fromInvestorBalance > _value) {
            return (50, ONLY_FULL_TRANSFER);
        }

        return (0, VALID);
    }

    if (IDSWalletManager(services[WALLET_MANAGER]).getWalletType(_from) != IDSWalletManager(services[WALLET_MANAGER]).PLATFORM() && IDSLockManager(services[LOCK_MANAGER]).getTransferableTokens(_from, uint64(now)) < _value) {
        return (16, TOKENS_LOCKED);
    }


    if (!complianceService.checkWhitelisted(_to)) {
        return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
    }

    uint fromRegion = getCountryCompliance(complianceService, _from);
    uint toRegion = getCountryCompliance(complianceService, _to);

    if (fromRegion == US) {
        if (complianceService.getComplianceTransferableTokens(_from, now, false) < _value) {
            return (32, HOLD_UP_1Y);
        }

        if (fromInvestorBalance > _value &&
            fromInvestorBalance.sub(_value) < IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinUsTokens()) {
           return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }

        if (IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceFullTransfer() && fromInvestorBalance > _value) {
            return (50, ONLY_FULL_TRANSFER);
        }
    } else {
        if (IDSWalletManager(services[WALLET_MANAGER]).getWalletType(_from) != IDSWalletManager(services[WALLET_MANAGER]).PLATFORM() && complianceService.getComplianceTransferableTokens(_from, now, false) < _value) {
            return (33, HOLD_UP);
        }

        if (toRegion == US && !(IDSWalletManager(services[WALLET_MANAGER]).getWalletType(_from) == IDSWalletManager(services[WALLET_MANAGER]).PLATFORM()) &&
               IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getBlockFlowbackEndTime() != 0 && // TODO: SHOULD BE PERIOD INSTEAD OF ENDTIME?
               complianceService.getComplianceTransferableTokens(_from, now, true) < _value) {
            return (25, FLOWBACK);
        }
    }

    if (toRegion == FORBIDDEN) {
        return (26, DESTINATION_RESTRICTED);
    }

    if (toRegion == EU) {
        if (isRetail(complianceService, _to) && complianceService.getEURetailInvestorsCount(getCountry(complianceService, _to)) >= IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getEuRetailLimit() &&
            isNewInvestor(complianceService, _to) &&
            (keccak256(abi.encodePacked(getCountry(complianceService, _from))) != keccak256(abi.encodePacked(getCountry(complianceService, _to))) ||
            (fromInvestorBalance > _value && isRetail(complianceService, _from)))) {
            return (40, MAX_INVESTORS_IN_CATEGORY);
        }

        if (balanceOfInvestor(complianceService, _to).add(_value) < IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinEuTokens()) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }
    }

    if (fromRegion == EU) {
        if (fromInvestorBalance.sub(_value) < IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinEuTokens() &&
            fromInvestorBalance > _value) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }
    }

    if (IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceAccredited() && !isAccredited(complianceService, _to)) {
      return (61, ONLY_ACCREDITED);
    }

    if (toRegion == US) {
        if (IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getForceAccreditedUS() && !isAccredited(complianceService, _to)) {
          return (61, ONLY_ACCREDITED);
        }

        uint usInvestorsLimit = getUsInvestorsLimit(complianceService);
        if (usInvestorsLimit != 0 && fromInvestorBalance > _value && complianceService.getUSInvestorsCount() >= usInvestorsLimit &&
            isNewInvestor(complianceService, _to)) {
            return (41, ONLY_FULL_TRANSFER);
        }

        if (IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getUsAccreditedInvestorsLimit() != 0 && isAccredited(complianceService, _to) && complianceService.getUSAccreditedInvestorsCount() >= IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getUsAccreditedInvestorsLimit() &&
            isNewInvestor(complianceService, _to) &&
            (fromRegion != US || (fromInvestorBalance > _value && isAccredited(complianceService, _from)))) {
            return (40, MAX_INVESTORS_IN_CATEGORY);
        }

        if (balanceOfInvestor(complianceService, _to).add(_value) < IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinUsTokens()) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }
    }

    if (!isAccredited(complianceService, _to)) {
        if (IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getNonAccreditedInvestorsLimit() != 0 && complianceService.getTotalInvestorsCount().sub(complianceService.getAccreditedInvestorsCount()) >= IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getNonAccreditedInvestorsLimit() &&
            isNewInvestor(complianceService, _to) &&
            (isAccredited(complianceService, _from) || fromInvestorBalance > _value)) {
            return (40, MAX_INVESTORS_IN_CATEGORY);
        }
    }

    if (IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getTotalInvestorsLimit() != 0 && fromInvestorBalance > _value &&
        complianceService.getTotalInvestorsCount() >= IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getTotalInvestorsLimit() &&
        balanceOfInvestor(complianceService, _to) == 0) {
        return (41, ONLY_FULL_TRANSFER);
    }

    if (balanceOfInvestor(complianceService, _from) == _value && !isNewInvestor(complianceService, _to) &&
        complianceService.getTotalInvestorsCount() <= IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumTotalInvestors()) {
        return (71, NOT_ENOUGH_INVESTORS);
    }

    if (IDSWalletManager(services[WALLET_MANAGER]).getWalletType(_from) != IDSWalletManager(services[WALLET_MANAGER]).PLATFORM() &&
        fromInvestorBalance.sub(_value) < IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumHoldingsPerInvestor()) {
        return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
    }

    if (IDSWalletManager(services[WALLET_MANAGER]).getWalletType(_to) != IDSWalletManager(services[WALLET_MANAGER]).PLATFORM() &&
        balanceOfInvestor(complianceService, _to).add(_value) < IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getMinimumHoldingsPerInvestor()) {
        return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
    }

    if (IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getMaximumHoldingsPerInvestor() != 0 &&
        balanceOfInvestor(complianceService, _to).add(_value) > IDSComplianceConfigurationService(services[COMPLIANCE_CONFIGURATION_SERVICE]).getMaximumHoldingsPerInvestor()) {
        return (52, AMOUNT_OF_TOKENS_ABOVE_MAX);
    }

    return (0, VALID);
  }

  function getToken(IDSServiceConsumer _service) public view returns (IDSToken){
    return IDSToken(_service.getDSService(_service.DS_TOKEN()));
  }

  function getTrustService(IDSServiceConsumer _service) public view returns (IDSTrustService) {
    return IDSTrustService(_service.getDSService(_service.TRUST_SERVICE()));
  }

  function getWalletManager(IDSServiceConsumer _service) public view returns (IDSWalletManager) {
    return IDSWalletManager(_service.getDSService(_service.WALLET_MANAGER()));
  }

  function getLockManager(IDSServiceConsumer _service) public view returns (IDSLockManager) {
    return IDSLockManager(_service.getDSService(_service.LOCK_MANAGER()));
  }

  function getComplianceService(IDSServiceConsumer _service) public view returns (IDSComplianceService) {
    return IDSComplianceService(_service.getDSService(_service.COMPLIANCE_SERVICE()));
  }

  function getRegistryService(IDSServiceConsumer _service) public view returns (IDSRegistryService) {
    return IDSRegistryService(_service.getDSService(_service.REGISTRY_SERVICE()));
  }

  function getComplianceConfigurationService(IDSServiceConsumer _service) public view returns (IDSComplianceConfigurationService) {
    return IDSComplianceConfigurationService(_service.getDSService(_service.COMPLIANCE_CONFIGURATION_SERVICE()));
  }

  function getPartitionsManager(IDSServiceConsumer _service) public view returns (IDSPartitionsManager) {
    return IDSPartitionsManager(_service.getDSService(_service.PARTITIONS_MANAGER()));
  }
}

/**
*   @title Concrete compliance service for tokens with regulation
*
*/

contract ComplianceServiceRegulatedPartitioned is ComplianceServiceRegulated {
    using SafeMath for uint256;

    function initialize() public initializer onlyFromProxy {
        super.initialize();
        VERSIONS.push(1);
    }

    function preTransferCheck(address _from, address _to, uint256 _value) public view returns (uint256 code, string memory reason) {
        address[] memory services = new address[](6);

        services[0] = getDSService(DS_TOKEN);
        services[1] = getDSService(REGISTRY_SERVICE);
        services[2] = getDSService(WALLET_MANAGER);
        services[3] = getDSService(COMPLIANCE_CONFIGURATION_SERVICE);
        services[4] = getDSService(LOCK_MANAGER);
        services[5] = address(this);

        (code, reason) = ComplianceServicePartitionedLibrary.preTransferCheck(services, _from, _to, _value);

        // TODO: WHY DO WE NEED THIS PART INSTEAD OF RETURNING THE RESULT OF PRETRANSFERCHECK
        if (code != 0) {
            return (code, reason);
        } else {
            return checkTransfer(_from, _to, _value);
        }
    }

    function getLockTime(bool _checkFlowback, bytes32 _partition) internal view returns (uint) {
      uint region = getPartitionsManager().getPartitionRegion(_partition);
      if (region == US) {
          return getComplianceConfigurationService().getUsLockPeriod();
      } else {
        uint lockTime = getComplianceConfigurationService().getNonUsLockPeriod();
        if (_checkFlowback) {
          lockTime = Math.max(lockTime, getComplianceConfigurationService().getBlockFlowbackEndTime()); // TODO: should be period instead of endtime?
        }

        return lockTime;
      }
    }

    function getComplianceTransferableTokens(address _who, uint256 _time, bool _checkFlowback) public view returns (uint transferable) {
      uint countOfPartitions = getTokenPartitioned().partitionCountOf(_who);
      for (uint index = 0; index < countOfPartitions; ++index) {
        bytes32 partition = getTokenPartitioned().partitionOf(_who, index);
        transferable = SafeMath.add(transferable, getComplianceTransferableTokens(_who, _time, _checkFlowback, partition));
      }
    }

    function getComplianceTransferableTokens(address _who, uint256 _time, bool _checkFlowback, bytes32 _partition) public view returns (uint) {
      require(_time != 0, "time must be greater than zero");

      uint transferable = getLockManagerPartitioned().getTransferableTokens(_who, _time, _partition);

      if (getPartitionsManager().getPartitionIssuanceDate(_partition).add(getLockTime(_checkFlowback, _partition)) > _time) {
        return 0;
      }

      return transferable;
    }

    function getComplianceTransferableTokens(address _who, uint256 _time, address _to) public view returns (uint transferable) {
      return getComplianceTransferableTokens(_who, _time, getRegion(_to) == US);
    }

    function getComplianceTransferableTokens(address _who, uint256 _time, address _to, bytes32 _partition) public view returns (uint) {
      return getComplianceTransferableTokens(_who, _time, getRegion(_to) == US, _partition);
    }

    function getRegion(address _who) internal view returns(uint256) {
      return getComplianceConfigurationService().getCountryCompliance(getRegistryService().getCountry(getRegistryService().getInvestor(_who)));
    }
}