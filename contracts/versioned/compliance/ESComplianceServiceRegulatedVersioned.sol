pragma solidity ^0.4.23;

import "./ESComplianceServiceWhitelistedVersioned.sol";

library ESComplianceServiceLibrary {
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

  function isRetail(ESComplianceServiceRegulatedVersioned _complianceService, address _wallet) internal view returns (bool) {
    return getRegistryService(_complianceService).getAttributeValue(getRegistryService(_complianceService).getInvestor(_wallet), getRegistryService(_complianceService).QUALIFIED()) != getRegistryService(_complianceService).APPROVED();
  }

  function isAccredited(ESComplianceServiceRegulatedVersioned _complianceService, address _wallet) internal view returns (bool) {
    return getRegistryService(_complianceService).getAttributeValue(getRegistryService(_complianceService).getInvestor(_wallet), getRegistryService(_complianceService).ACCREDITED()) != getRegistryService(_complianceService).APPROVED();
  }

  function balanceOfInvestor(ESComplianceServiceRegulatedVersioned _complianceService, address _wallet) internal view returns (uint) {
    return getToken(_complianceService).balanceOfInvestor(getRegistryService(_complianceService).getInvestor(_wallet));
  }

  function isNewInvestor(ESComplianceServiceRegulatedVersioned _complianceService, address _wallet) internal view returns (bool) {
    return balanceOfInvestor(_complianceService, _wallet) == 0;
  }

  function getCountry(ESComplianceServiceRegulatedVersioned _complianceService, address _wallet) internal view returns (string) {
    return getRegistryService(_complianceService).getCountry(getRegistryService(_complianceService).getInvestor(_wallet));
  }

  function getCountryCompliance(ESComplianceServiceRegulatedVersioned _complianceService, address _wallet) internal view returns (uint) {
    return getComplianceConfigurationService(_complianceService).getCountryCompliance(getCountry(_complianceService, _wallet));
  }

  function getUsInvestorsLimit(ESComplianceServiceRegulatedVersioned _complianceService) public view returns (uint) {
    if (getComplianceConfigurationService(_complianceService).getMaxUsInvestorsPercentage() == 0) {
        return getComplianceConfigurationService(_complianceService).getUsInvestorsLimit();
    }

    if (getComplianceConfigurationService(_complianceService).getUsInvestorsLimit() == 0) {
        return getComplianceConfigurationService(_complianceService).getMaxUsInvestorsPercentage().mul(_complianceService.getTotalInvestorsCount()).div(100);
    }

    return Math.min256(getComplianceConfigurationService(_complianceService).getUsInvestorsLimit(), getComplianceConfigurationService(_complianceService).getMaxUsInvestorsPercentage().mul(_complianceService.getTotalInvestorsCount()).div(100));
  }

  function preTransferCheck(ESComplianceServiceRegulatedVersioned _complianceService, address _from, address _to, uint _value) public view returns (uint code, string reason) {
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
        if (_complianceService.getComplianceTransferableTokens(_from, uint64(now), uint64(365 days)) < _value) {
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
        if (getWalletManager(_complianceService).getWalletType(_from) != getWalletManager(_complianceService).PLATFORM() && _complianceService.getComplianceTransferableTokens(_from, uint64(now), uint64(getComplianceConfigurationService(_complianceService).getNonUsLockPeriod())) < _value) {
            return (33, HOLD_UP);
        }

        if (toRegion == US && !(getWalletManager(_complianceService).getWalletType(_from) == getWalletManager(_complianceService).PLATFORM()) &&
               (getComplianceConfigurationService(_complianceService).getBlockFlowbackEndTime() == 0 ||
                getComplianceConfigurationService(_complianceService).getBlockFlowbackEndTime() > now)) {
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

    if (toRegion == US) {
        if (getComplianceConfigurationService(_complianceService).getForceAccredited() && !isAccredited(_complianceService, _to)) {
            return (61, ONLY_ACCREDITED);
        }

        if (fromInvestorBalance > _value && _complianceService.getUSInvestorsCount() >= getUsInvestorsLimit(_complianceService) &&
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

    if (toRegion != US || !isAccredited(_complianceService, _to)) {
        if (getComplianceConfigurationService(_complianceService).getNonUsNonAccreditedInvestorsLimit() != 0 && _complianceService.getTotalInvestorsCount().sub(_complianceService.getUSAccreditedInvestorsCount()) >= getComplianceConfigurationService(_complianceService).getNonUsNonAccreditedInvestorsLimit() &&
            isNewInvestor(_complianceService, _to) &&
            ((fromRegion == US && isAccredited(_complianceService, _from)) || fromInvestorBalance > _value)) {
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

  function getToken(DSServiceConsumerInterfaceVersioned _service) public view returns (DSTokenInterfaceVersioned){
    return DSTokenInterfaceVersioned(_service.getDSService(_service.DS_TOKEN()));
  }

  function getTrustService(DSServiceConsumerInterfaceVersioned _service) public view returns (DSTrustServiceInterfaceVersioned) {
    return DSTrustServiceInterfaceVersioned(_service.getDSService(_service.TRUST_SERVICE()));
  }

  function getWalletManager(DSServiceConsumerInterfaceVersioned _service) public view returns (DSWalletManagerInterfaceVersioned) {
    return DSWalletManagerInterfaceVersioned(_service.getDSService(_service.WALLET_MANAGER()));
  }

  function getLockManager(DSServiceConsumerInterfaceVersioned _service) public view returns (DSLockManagerInterfaceVersioned) {
    return DSLockManagerInterfaceVersioned(_service.getDSService(_service.LOCK_MANAGER()));
  }

  function getComplianceService(DSServiceConsumerInterfaceVersioned _service) public view returns (DSComplianceServiceInterfaceVersioned) {
    return DSComplianceServiceInterfaceVersioned(_service.getDSService(_service.COMPLIANCE_SERVICE()));
  }

  function getRegistryService(DSServiceConsumerInterfaceVersioned _service) public view returns (DSRegistryServiceInterfaceVersioned) {
    return DSRegistryServiceInterfaceVersioned(_service.getDSService(_service.REGISTRY_SERVICE()));
  }

  function getIssuanceInformationManager(DSServiceConsumerInterfaceVersioned _service) public view returns (DSIssuanceInformationManagerInterfaceVersioned) {
    return DSIssuanceInformationManagerInterfaceVersioned(_service.getDSService(_service.ISSUANCE_INFORMATION_MANAGER()));
  }

  function getComplianceConfigurationService(DSServiceConsumerInterfaceVersioned _service) public view returns (DSComplianceConfigurationServiceInterfaceVersioned) {
    return DSComplianceConfigurationServiceInterfaceVersioned(_service.getDSService(_service.COMPLIANCE_CONFIGURATION_SERVICE()));
  }
}

/**
*   @title Concrete compliance service for tokens with no regulation
*
*   This simple compliance service is meant to be used for tokens outside of any specific regulations
*   it simply returns true for all checks.
*/

contract ESComplianceServiceRegulatedVersioned is ESComplianceServiceWhitelistedVersioned {
    using SafeMath for uint256;

    constructor(address _address, string _namespace) public ESComplianceServiceWhitelistedVersioned(_address, _namespace) {
        VERSIONS.push(1);
    }

    function recordBurn(address _who, uint _value) internal returns (bool) {
        if (_value != 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_who)) == _value) {
            adjustInvestorsCounts(_who, false);
        }

        return true;
    }

    function recordSeize(address _from, address /*_to*/, uint _value) internal returns (bool) {
        if (_value != 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_from)) == _value) {
            adjustInvestorsCounts(_from, false);
        }

        return true;
    }

    function adjustInvestorsCounts(address _wallet, bool _increase) internal {
        if (getWalletManager().getWalletType(_wallet) == getWalletManager().NONE()) {
            setUint(TOTAL_INVESTORS, _increase ? getUint(TOTAL_INVESTORS).add(1) : getUint(TOTAL_INVESTORS).sub(1));
            string memory country = getRegistryService().getCountry(getRegistryService().getInvestor(_wallet));
            uint countryCompliance = getComplianceConfigurationService().getCountryCompliance(country);
            if (countryCompliance == US) {
                setUint(US_INVESTORS_COUNT, _increase ? getUint(US_INVESTORS_COUNT).add(1) : getUint(US_INVESTORS_COUNT).sub(1));
                if (getRegistryService().getAttributeValue(getRegistryService().getInvestor(_wallet), getRegistryService().ACCREDITED()) != getRegistryService().APPROVED()) {
                    setUint(US_ACCREDITED_INVESTORS_COUNT, _increase ? getUint(US_ACCREDITED_INVESTORS_COUNT).add(1) : getUint(US_ACCREDITED_INVESTORS_COUNT).sub(1));
                }
            } else if (countryCompliance == EU && getRegistryService().getAttributeValue(getRegistryService().getInvestor(_wallet), getRegistryService().QUALIFIED()) != getRegistryService().APPROVED()) {
                setUint(EU_RETAIL_INVESTORS_COUNT, country, _increase ? getUint(EU_RETAIL_INVESTORS_COUNT, country).add(1) : getUint(EU_RETAIL_INVESTORS_COUNT, country).sub(1));
            }
        }
    }

    function createIssuanceInformation(string _investor, uint _value, uint _issuanceTime) internal returns (bool) {
        uint issuancesCount = getUint(ISSUANCES_COUNT, _investor);

        setUint(ISSUANCE_VALUE, _investor, issuancesCount, _value);
        setUint(ISSUANCE_TIMESTAMP, _investor, issuancesCount, _issuanceTime);
        setUint(ISSUANCES_COUNT, _investor, issuancesCount.add(1));

        return true;
    }

    function recordIssuance(address _to, uint _value, uint _issuanceTime) internal returns (bool){
        if (_value != 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_to)) == 0) {
            adjustInvestorsCounts(_to, true);
        }

        require(createIssuanceInformation(getRegistryService().getInvestor(_to), _value, _issuanceTime));

        return true;
    }

    function preTransferCheck(address _from, address _to, uint _value) view public returns (uint code, string reason) {
        (code, reason) = ESComplianceServiceLibrary.preTransferCheck(this, _from, _to, _value);

        if (code != 0) {
            return (code, reason);
        } else {
            return checkTransfer(_from, _to, _value);
        }
    }

    function getComplianceTransferableTokens(address _who, uint64 _time, uint64 _lockTime) public view returns (uint) {
        require(_time != 0, "time must be greater than zero");

        string memory investor = getRegistryService().getInvestor(_who);

        uint balanceOfHolder = getLockManager().getTransferableTokens(_who, _time);

        uint holderIssuancesCount = getUint(ISSUANCES_COUNT, investor);

        //No locks, go to base class implementation
        if (holderIssuancesCount == 0) {
            return balanceOfHolder;
        }

        uint totalLockedTokens = 0;
        for (uint i = 0; i < holderIssuancesCount; i++) {
            uint issuanceTimestamp = getUint(ISSUANCE_TIMESTAMP, investor, i);

            if (_lockTime > _time || issuanceTimestamp > SafeMath.sub(_time, _lockTime)) {
                totalLockedTokens = totalLockedTokens.add(getUint(ISSUANCE_VALUE, investor, i));
            }
        }

        //there may be more locked tokens than actual tokens, so the minimum between the two
        uint transferable = SafeMath.sub(balanceOfHolder, Math.min256(totalLockedTokens, balanceOfHolder));

        return transferable;
    }

    function preIssuanceCheck(address _to, uint) view public returns (uint code, string reason) {
        if (!checkWhitelisted(_to)) {
            return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
        }

        return locationSpecificCheckForIssuance(_to);
    }

    function locationSpecificCheckForIssuance(address _to) view internal returns (uint code, string reason) {
        string memory toInvestor = getRegistryService().getInvestor(_to);
        string memory toCountry = getRegistryService().getCountry(toInvestor);
        uint toRegion = getComplianceConfigurationService().getCountryCompliance(toCountry);

        if (toRegion == FORBIDDEN) {
            return (26, DESTINATION_RESTRICTED);
        }

        return (0, VALID);
    }

    function recordTransfer(address _from, address _to, uint _value) internal returns (bool) {
        if (_value != 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_from)) == _value) {
            adjustInvestorsCounts(_from, false);
        }

        if (_value != 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_to)) == 0) {
            adjustInvestorsCounts(_to, true);
        }

        return true;
    }

    function checkTransfer(address, address, uint) view internal returns (uint, string){
        return (0, VALID);
    }

    function getTotalInvestorsCount() public view returns (uint256) {
        return getUint(TOTAL_INVESTORS);
    }

    function getUSInvestorsCount() public view returns (uint){
        return getUint(US_INVESTORS_COUNT);
    }

    function getUSAccreditedInvestorsCount() public view returns (uint) {
        return getUint(US_ACCREDITED_INVESTORS_COUNT);
    }

    function getEURetailInvestorsCount(string _country) public view returns (uint){
        return getUint(EU_RETAIL_INVESTORS_COUNT, _country);
    }

    function setTotalInvestorsCount(uint256 _value) public onlyMaster returns (bool) {
        setUint(TOTAL_INVESTORS, _value);

        return true;
    }

    function setUsInvestorsCount(uint256 _value) public onlyMaster returns (bool) {
        setUint(US_INVESTORS_COUNT, _value);

        return true;
    }

    function setUSAccreditedInvestorsCount(uint256 _value) public onlyMaster returns (bool) {
         setUint(US_ACCREDITED_INVESTORS_COUNT, _value);

         return true;
    }

    function setEuRetailInvestorsCount(string _country, uint256 _value) public onlyMaster returns (bool) {
        setUint(EU_RETAIL_INVESTORS_COUNT, _country, _value);

        return true;
    }
}