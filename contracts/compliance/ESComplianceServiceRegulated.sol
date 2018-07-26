pragma solidity ^0.4.23;
import "./ESComplianceService.sol";

/**
*   @title Concrete compliance service for tokens with no regulation
*
*   This simple compliance service is meant to be used for tokens outside of any specific regulations
*   it simply returns true for all checks.
*/

contract ESComplianceServiceRegulated is ESComplianceService {

    constructor(address _address, string _namespace) public ESComplianceService(_address, _namespace) {}

    function adjustInvestorCount(address _wallet, bool _increase) internal {
      if (getWalletManager().getWalletType(_wallet) == getWalletManager().NONE()) {
        setUint("totalInvestors", _increase ? getUint("totalInvestors").add(1) : getUint("totalInvestors").sub(1));
        string memory country = getRegistryService().getCountry(getRegistryService().getInvestor(_wallet));
        uint countryCompliance = getCountryCompliance(country);
        if (countryCompliance == US) {
          setUint("usInvestorsCount", _increase ? getUint("usInvestorsCount").add(1) : getUint("usInvestorsCount").sub(1));
        } else if (countryCompliance == EU) {//&& TODO: ADAM getRegistryService().isRetail(_wallet)) {
          setUint("euRetailInvestorsCount", country, _increase ? getUint("euRetailInvestorsCount", country).add(1) : getUint("euRetailInvestorsCount", country).sub(1));
        }
      }
    }

    function createIssuanceInformation(address _to, uint _value) internal returns (bool) {
      uint issuancesCount = getUint("issuancesCount",_to);

      setUint("issuanceValue",_to,issuancesCount,_value);
      setUint("issuanceTimestamp",_to,issuancesCount,now);
      setUint("issuancesCount",_to,issuancesCount.add(1));

      return true;
    }

    function recordIssuance(address _to, uint _value) internal returns (bool){
        if (_value > 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_to)) == 0) {
            adjustInvestorCount(_to, true);
        }

        require(createIssuanceInformation(_to, _value));

        return true;
    }

    function preTransferCheck(address _from, address _to, uint _value) view public returns (uint code, string reason) {
      if (getToken().isPaused()) {
        return (10, "Token Paused");
      }

      if (getToken().balanceOf(_from) < _value) {
        return (15, "Not Enough Tokens");
      }

      if (getLockManager().getTransferableTokens(_from, uint64(now)) < _value) {
        return (16, "Tokens Locked");
      }

      if (getWalletManager().getWalletType(_to) == getWalletManager().PLATFORM()) {
        return checkTransfer(_from, _to, _value);
      }

      if (getWalletManager().getWalletType(_to) == getWalletManager().NONE() && keccak256(abi.encodePacked(getRegistryService().getInvestor(_to))) == keccak256("")) {
        return (20, "Wallet not in registry Service");
      }

      return locationSpecificCheck(_from, _to, _value);
    }

    function locationSpecificCheck(address _from, address _to, uint _value) returns (uint code, string reason) {
      string memory fromCountry = getRegistryService().getCountry(getRegistryService().getInvestor(_from));
      uint fromRegion = getCountryCompliance(fromCountry);
      string memory toCountry = getRegistryService().getCountry(getRegistryService().getInvestor(_to));
      uint toRegion = getCountryCompliance(toCountry);

      if (fromRegion == US && toRegion == US) {
        if (getComplianceTransferableTokens(_from, uint64(now), uint64(1 years)) < _value) {
          return (32, "Hold-up 1y");
        }

        if (true) { // TODO: ADAM isFund
          if (getToken().balanceOfInvestor(getRegistryService().getInvestor(_from)) > _value && getUint("usInvestorsCount") >= 99 &&
              getToken().balanceOfInvestor(getRegistryService().getInvestor(_to)) == 0) {
            return (41, "Only Full Transfer");
          }

          if (false && getToken().balanceOf(_from) > _value) { // TODO: ADAM getComplianceInformation(FULLTRANSFER)
            return (50, "Only Full Transfer");
          }
        }
      } else if (fromRegion != US && toRegion == US) {
        return (25, "Flowback");
      } else if (toRegion == FORBIDDEN) {
        return (26, "Destination restricted");
      } else if (toRegion == EU) { // TODO: ADAM && getRegistryService().isRetail(_to)
        if (getUint("euRetailInvestorsCount", toCountry) >= 150 && (keccak256(fromCountry) != keccak256(toCountry) || getToken().balanceOfInvestor(getRegistryService().getInvestor(_from)) > _value) &&
          getToken().balanceOfInvestor(getRegistryService().getInvestor(_to)) == 0) {
          return (40, "Max Investors in category");
        }

        if (getToken().balanceOf(_to).add(_value) < 1000000) { //TODO: ADAM getComplianceInformation(MINEUTOKENS); // per wallet? per investor
          return (51, "Amount of tokens under min");
        }
      }

      if (false) { // TODO: ADAM !isFund
        if (getToken().balanceOfInvestor(getRegistryService().getInvestor(_from)) > _value && getUint("totalInvestors") >= 1999 &&
            getToken().balanceOfInvestor(getRegistryService().getInvestor(_to)) == 0) {
          return (41, "Only Full Transfer");
        }
      }

      return checkTransfer(_from, _to, _value);
    }

    function recordTransfer(address, address, uint) internal returns (bool){
        return true;
    }

    function checkTransfer(address, address, uint) view internal returns (uint, string){
        return (0, "Valid");
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

      uint balanceOfHolder = getLockManager().getTransferableTokens(_who, _time);

      uint holderIssuancesCount = getUint("issuancesCount", _who);

      //No locks, go to base class implementation
      if (holderIssuancesCount == 0) {
        return balanceOfHolder;
      }

      uint totalLockedTokens = 0;
      for (uint i = 0; i < holderIssuancesCount; i++) {
        uint issuanceTimestamp = getUint("issuanceTimestamp",_who,i);

        if (_lockTime > _time || issuanceTimestamp > SafeMath.sub(_time, _lockTime)) {
          totalLockedTokens = totalLockedTokens.add(getUint("issuanceValue", _who, i));
        }
      }

      //there may be more locked tokens than actual tokens, so the minimum between the two
      uint transferable = SafeMath.sub(balanceOfHolder, Math.min256(totalLockedTokens, balanceOfHolder));

      return balanceOfHolder;
    }
}