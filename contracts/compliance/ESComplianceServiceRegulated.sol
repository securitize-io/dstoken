pragma solidity ^0.4.23;
import "./ESComplianceService.sol";

/**
*   @title Concrete compliance service for tokens with no regulation
*
*   This simple compliance service is meant to be used for tokens outside of any specific regulations
*   it simply returns true for all checks.
*/

contract ESComplianceServiceRegulated is ESComplianceService {
    bool public fund = true;
    bool public fullTransfer = true;
    uint public minEuTokens = 0;
    
    constructor(address _address, string _namespace) public ESComplianceService(_address, _namespace) {}

    function adjustInvestorCount(address _wallet, bool _increase) internal {
      if (getWalletManager().getWalletType(_wallet) == getWalletManager().NONE()) {
        setUint(TOTAL_INVESTORS, _increase ? getUint(TOTAL_INVESTORS).add(1) : getUint(TOTAL_INVESTORS).sub(1));
        string memory country = getRegistryService().getCountry(getRegistryService().getInvestor(_wallet));
        uint countryCompliance = getCountryCompliance(country);
        if (countryCompliance == US) {
          setUint(US_INVESTORS_COUNT, _increase ? getUint(US_INVESTORS_COUNT).add(1) : getUint(US_INVESTORS_COUNT).sub(1));
        } else if (countryCompliance == EU && getRegistryService().getAttributeValue(getRegistryService().getInvestor(_wallet), getRegistryService().QUALIFIED()) != getRegistryService().APPROVED()) {
          setUint(EU_RETAIL_INVESTORS_COUNT, country, _increase ? getUint(EU_RETAIL_INVESTORS_COUNT, country).add(1) : getUint(EU_RETAIL_INVESTORS_COUNT, country).sub(1));
        }
      }
    }

    function createIssuanceInformation(string _investor, uint _value) internal returns (bool) {
      uint issuancesCount = getUint(ISSUANCES_COUNT,_investor);

      setUint(ISSUANCE_VALUE,_investor,issuancesCount,_value);
      setUint(ISSUANCE_TIMESTAMP,_investor,issuancesCount,now);
      setUint(ISSUANCES_COUNT,_investor,issuancesCount.add(1));

      return true;
    }

    function recordIssuance(address _to, uint _value) internal returns (bool){
        if (_value > 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_to)) == 0) {
            adjustInvestorCount(_to, true);
        }

        require(createIssuanceInformation(getRegistryService().getInvestor(_to), _value));

        return true;
    }

    function preTransferCheck(address _from, address _to, uint _value) view public returns (uint code, string reason) {
      if (getToken().isPaused()) {
        return (10, TOKEN_PAUSED);
      }

      if (getToken().balanceOf(_from) < _value) {
        return (15, NOT_ENOUGH_TOKENS);
      }

      if (keccak256(abi.encodePacked(getRegistryService().getInvestor(_from))) != keccak256("") &&
          keccak256(abi.encodePacked(getRegistryService().getInvestor(_from))) == keccak256(abi.encodePacked(getRegistryService().getInvestor(_to)))) {
        return checkTransfer(_from, _to, _value);
      }

      if (getLockManager().getTransferableTokens(_from, uint64(now)) < _value) {
        return (16, TOKENS_LOCKED);
      }

      if (getWalletManager().getWalletType(_to) == getWalletManager().PLATFORM()) {
        return checkTransfer(_from, _to, _value);
      }

      if (getWalletManager().getWalletType(_to) == getWalletManager().NONE() && keccak256(abi.encodePacked(getRegistryService().getInvestor(_to))) == keccak256("")) {
        return (20, WALLET_NOT_IN_TEGISTRY_SERVICE);
      }

      return locationSpecificCheck(_from, _to, _value);
    }

    function preIssuanceCheck(address _to, uint _value) view public returns (uint code, string reason) {
      return locationSpecificCheckForIssuance(_to);
    }

    function locationSpecificCheckForIssuance(address _to) view internal returns (uint code, string reason) {
      string memory toInvestor = getRegistryService().getInvestor(_to);
      string memory toCountry = getRegistryService().getCountry(toInvestor);
      uint toRegion = getCountryCompliance(toCountry);

      if (toRegion == FORBIDDEN) {
        return (26, DESTINATION_RESTRICTED);
      }

      return (0, VALID);
    }

    function locationSpecificCheck(address _from, address _to, uint _value) view internal returns (uint code, string reason) {
      string memory fromInvestor = getRegistryService().getInvestor(_from);
      string memory toInvestor = getRegistryService().getInvestor(_to);
      string memory fromCountry = getRegistryService().getCountry(fromInvestor);
      uint fromRegion = getCountryCompliance(fromCountry);
      string memory toCountry = getRegistryService().getCountry(toInvestor);
      uint toRegion = getCountryCompliance(toCountry);

      if (fromRegion == US && toRegion == US) {
        if (getComplianceTransferableTokens(_from, uint64(now), uint64(1 years)) < _value) {
          return (32, HOLD_UP_1Y);
        }

        if (fund) {
          if (getToken().balanceOfInvestor(fromInvestor) > _value && getUint("usInvestorsCount") >= 99 &&
              getToken().balanceOfInvestor(toInvestor) == 0) {
            return (41, ONLY_FULL_TRANSFER);
          }

          if (fullTransfer && getToken().balanceOfInvestor(fromInvestor) > _value) {
            return (50, ONLY_FULL_TRANSFER);
          }
        }
      } else if (fromRegion != US && toRegion == US) {
        return (25, FLOWBACK);
      } else if (toRegion == FORBIDDEN) {
        return (26, DESTINATION_RESTRICTED);
      } else if (toRegion == EU && getRegistryService().getAttributeValue(toInvestor, getRegistryService().QUALIFIED()) != getRegistryService().APPROVED()) {
        if (getUint(EU_RETAIL_INVESTORS_COUNT, toCountry) >= 150 && (keccak256(fromCountry) != keccak256(toCountry) || getToken().balanceOfInvestor(fromInvestor) > _value) &&
          getToken().balanceOfInvestor(toInvestor) == 0) {
          return (40, MAX_INVESTORS_IN_CATEGORY);
        }

        if (getToken().balanceOfInvestor(toInvestor).add(_value) < minEuTokens) {
          return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
        }
      }

      if (!fund) {
        if (getToken().balanceOfInvestor(fromInvestor) > _value && getUint(TOTAL_INVESTORS) >= 1999 &&
            getToken().balanceOfInvestor(toInvestor) == 0) {
          return (41, ONLY_FULL_TRANSFER);
        }
      }

      return checkTransfer(_from, _to, _value);
    }

    function recordTransfer(address _from, address _to, uint _value) internal returns (bool) {
         if (_value > 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_from)) == _value) {
            adjustInvestorCount(_from, false);
         }

         if (_value > 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_to)) == 0) {
            adjustInvestorCount(_to, true);
         }

         return true;
    }

    function checkTransfer(address, address, uint) view internal returns (uint, string){
        return (0, VALID);
    }

    function recordBurn(address _who, uint _value) internal returns (bool){
        if (_value > 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_who)) == _value) {
            adjustInvestorCount(_who, false);
        }

        return true;
    }
    function recordSeize(address _from, address _to, uint _value) internal returns (bool){
        require(getWalletManager().getWalletType(_to) == getWalletManager().ISSUER());

        if (_value > 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_from)) == _value) {
            adjustInvestorCount(_to, false);
        }

        return true;
    }

    function getComplianceTransferableTokens(address _who, uint64 _time, uint64 _lockTime) public view returns (uint) {
      require(_time > 0, "time must be greater than zero");

      string memory investor = getRegistryService().getInvestor(_who);

      uint balanceOfHolder = getLockManager().getTransferableTokens(_who, _time);

      uint holderIssuancesCount = getUint(ISSUANCES_COUNT, investor);

      //No locks, go to base class implementation
      if (holderIssuancesCount == 0) {
        return balanceOfHolder;
      }

      uint totalLockedTokens = 0;
      for (uint i = 0; i < holderIssuancesCount; i++) {
        uint issuanceTimestamp = getUint(ISSUANCE_TIMESTAMP,investor,i);

        if (_lockTime > _time || issuanceTimestamp > SafeMath.sub(_time, _lockTime)) {
          totalLockedTokens = totalLockedTokens.add(getUint(ISSUANCE_VALUE, investor, i));
        }
      }

      //there may be more locked tokens than actual tokens, so the minimum between the two
      uint transferable = SafeMath.sub(balanceOfHolder, Math.min256(totalLockedTokens, balanceOfHolder));

      return transferable;
    }
}