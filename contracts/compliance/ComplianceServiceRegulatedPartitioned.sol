pragma solidity ^0.5.0;

import "./ComplianceServiceRegulated.sol";
import "../zeppelin/math/Math.sol";

library ComplianceServicePartitionedLibrary {
  uint internal constant NONE = 0;
  uint internal constant US = 1;
  uint internal constant EU = 2;
  uint internal constant FORBIDDEN = 4;
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

  function preTransferCheck(ComplianceServiceRegulatedPartitioned _complianceService, address _from, address _to, uint _value) public view returns (uint code, string memory reason) {
    if (getToken(_complianceService).isPaused()) {
      return (10, TOKEN_PAUSED);
    }

    if (getToken(_complianceService).balanceOf(_from) < _value) {
      return (15, NOT_ENOUGH_TOKENS);
    }

    if (keccak256(abi.encodePacked(getRegistryService(_complianceService).getInvestor(_from))) != keccak256("") &&
        keccak256(abi.encodePacked(getRegistryService(_complianceService).getInvestor(_from))) == keccak256(abi.encodePacked(getRegistryService(_complianceService).getInvestor(_to)))) {
            return (0, VALID);
    }

    uint fromInvestorBalance = balanceOfInvestor(_complianceService, _from);

    if (getWalletManager(_complianceService).getWalletType(_to) == getWalletManager(_complianceService).PLATFORM()) {
        if (getComplianceConfigurationService(_complianceService).getForceFullTransfer() && fromInvestorBalance > _value) {
            return (50, ONLY_FULL_TRANSFER);
        }

        return (0, VALID);
    }

    if (getWalletManager(_complianceService).getWalletType(_from) != getWalletManager(_complianceService).PLATFORM() && getLockManager(_complianceService).getTransferableTokens(_from, uint64(now)) < _value) {
        return (16, TOKENS_LOCKED);
    }


    if (!_complianceService.checkWhitelisted(_to)) {
        return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
    }

    uint fromRegion = getCountryCompliance(_complianceService, _from);
    uint toRegion = getCountryCompliance(_complianceService, _to);

    if (fromRegion == US) {
        if (_complianceService.getComplianceTransferableTokens(_from, now, false) < _value) {
            return (32, HOLD_UP_1Y);
        }

        if (fromInvestorBalance > _value &&
            fromInvestorBalance.sub(_value) < getComplianceConfigurationService(_complianceService).getMinUsTokens()) {
           return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }

        if (getComplianceConfigurationService(_complianceService).getForceFullTransfer() && fromInvestorBalance > _value) {
            return (50, ONLY_FULL_TRANSFER);
        }
    } else {
        if (getWalletManager(_complianceService).getWalletType(_from) != getWalletManager(_complianceService).PLATFORM() && _complianceService.getComplianceTransferableTokens(_from, now, false) < _value) {
            return (33, HOLD_UP);
        }

        if (toRegion == US && !(getWalletManager(_complianceService).getWalletType(_from) == getWalletManager(_complianceService).PLATFORM()) &&
               getComplianceConfigurationService(_complianceService).getBlockFlowbackEndTime() != 0 && // TODO:! SHOULD BE PERIOD INSTEAD OF ENDTIME
               _complianceService.getComplianceTransferableTokens(_from, now, true) < _value) {
            return (25, FLOWBACK);
        }
    }

    if (toRegion == FORBIDDEN) {
        return (26, DESTINATION_RESTRICTED);
    }

    if (toRegion == EU) {
        if (isRetail(_complianceService, _to) && _complianceService.getEURetailInvestorsCount(getCountry(_complianceService, _to)) >= getComplianceConfigurationService(_complianceService).getEuRetailLimit() &&
            isNewInvestor(_complianceService, _to) &&
            (keccak256(abi.encodePacked(getCountry(_complianceService, _from))) != keccak256(abi.encodePacked(getCountry(_complianceService, _to))) ||
            (fromInvestorBalance > _value && isRetail(_complianceService, _from)))) {
            return (40, MAX_INVESTORS_IN_CATEGORY);
        }

        if (balanceOfInvestor(_complianceService, _to).add(_value) < getComplianceConfigurationService(_complianceService).getMinEuTokens()) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }
    }

    if (fromRegion == EU) {
        if (fromInvestorBalance.sub(_value) < getComplianceConfigurationService(_complianceService).getMinEuTokens() &&
            fromInvestorBalance > _value) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }
    }

    if (getComplianceConfigurationService(_complianceService).getForceAccredited() && !isAccredited(_complianceService, _to)) {
      return (61, ONLY_ACCREDITED);
    }

    if (toRegion == US) {
        if (getComplianceConfigurationService(_complianceService).getForceAccreditedUS() && !isAccredited(_complianceService, _to)) {
          return (61, ONLY_ACCREDITED);
        }

        uint usInvestorsLimit = getUsInvestorsLimit(_complianceService);
        if (usInvestorsLimit != 0 && fromInvestorBalance > _value && _complianceService.getUSInvestorsCount() >= usInvestorsLimit &&
            isNewInvestor(_complianceService, _to)) {
            return (41, ONLY_FULL_TRANSFER);
        }

        if (getComplianceConfigurationService(_complianceService).getUsAccreditedInvestorsLimit() != 0 && isAccredited(_complianceService, _to) && _complianceService.getUSAccreditedInvestorsCount() >= getComplianceConfigurationService(_complianceService).getUsAccreditedInvestorsLimit() &&
            isNewInvestor(_complianceService, _to) &&
            (fromRegion != US || (fromInvestorBalance > _value && isAccredited(_complianceService, _from)))) {
            return (40, MAX_INVESTORS_IN_CATEGORY);
        }

        if (balanceOfInvestor(_complianceService, _to).add(_value) < getComplianceConfigurationService(_complianceService).getMinUsTokens()) {
            return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }
    }

    if (!isAccredited(_complianceService, _to)) {
        if (getComplianceConfigurationService(_complianceService).getNonAccreditedInvestorsLimit() != 0 && _complianceService.getTotalInvestorsCount().sub(_complianceService.getAccreditedInvestorsCount()) >= getComplianceConfigurationService(_complianceService).getNonAccreditedInvestorsLimit() &&
            isNewInvestor(_complianceService, _to) &&
            (isAccredited(_complianceService, _from) || fromInvestorBalance > _value)) {
            return (40, MAX_INVESTORS_IN_CATEGORY);
        }
    }

    if (getComplianceConfigurationService(_complianceService).getTotalInvestorsLimit() != 0 && fromInvestorBalance > _value &&
        _complianceService.getTotalInvestorsCount() >= getComplianceConfigurationService(_complianceService).getTotalInvestorsLimit() &&
        balanceOfInvestor(_complianceService, _to) == 0) {
        return (41, ONLY_FULL_TRANSFER);
    }

    if (balanceOfInvestor(_complianceService, _from) == _value && !isNewInvestor(_complianceService, _to) &&
        _complianceService.getTotalInvestorsCount() <= getComplianceConfigurationService(_complianceService).getMinimumTotalInvestors()) {
        return (71, NOT_ENOUGH_INVESTORS);
    }

    if (getWalletManager(_complianceService).getWalletType(_from) != getWalletManager(_complianceService).PLATFORM() &&
        fromInvestorBalance.sub(_value) < getComplianceConfigurationService(_complianceService).getMinimumHoldingsPerInvestor()) {
        return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
    }

    if (getWalletManager(_complianceService).getWalletType(_to) != getWalletManager(_complianceService).PLATFORM() &&
        balanceOfInvestor(_complianceService, _to).add(_value) < getComplianceConfigurationService(_complianceService).getMinimumHoldingsPerInvestor()) {
        return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
    }

    if (getComplianceConfigurationService(_complianceService).getMaximumHoldingsPerInvestor() != 0 &&
        balanceOfInvestor(_complianceService, _to).add(_value) > getComplianceConfigurationService(_complianceService).getMaximumHoldingsPerInvestor()) {
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

contract ComplianceServiceRegulatedPartitioned is ComplianceServiceRegulated, IDSComplianceServicePartitioned {
    using SafeMath for uint256;

    function initialize() public initializer onlyFromProxy {
        super.initialize();
        VERSIONS.push(1);
    }

    function preTransferCheck(address _from, address _to, uint _value) view public returns (uint code, string memory reason) {
        (code, reason) = ComplianceServicePartitionedLibrary.preTransferCheck(this, _from, _to, _value);

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
          lockTime = Math.max(lockTime, getComplianceConfigurationService().getBlockFlowbackEndTime()); // TODO:! should be period instead of endtime
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