pragma solidity ^0.4.23;

import "./ESComplianceService.sol";

/**
*   @title Concrete compliance service for tokens with no regulation
*
*   This simple compliance service is meant to be used for tokens outside of any specific regulations
*   it simply returns true for all checks.
*/

contract ESComplianceServiceRegulated is DSComplianceServiceInterface, ESServiceConsumer {
    bool public isFund;
    bool public forceFullTransfer;
    uint public minUsTokens;
    uint public minEuTokens;

    bool public initialized = false;
    using SafeMath for uint256;


    constructor(address _address, string _namespace) public ESServiceConsumer(_address, _namespace) {}

    function initialize(bool _isFund, bool _forceFullTransfer, uint _minUsTokens, uint _minEuTokens) public returns (bool) {
        require(!initialized, "already initialized");

        initialized = true;

        isFund = _isFund;
        forceFullTransfer = _forceFullTransfer;
        minUsTokens = _minUsTokens;
        minEuTokens = _minEuTokens;

        return true;
    }


    function checkWhitelisted(address _who) view internal returns (bool) {
        return getWalletManager().getWalletType(_who) != getWalletManager().NONE() || keccak256(abi.encodePacked(getRegistryService().getInvestor(_who))) != keccak256("");
    }

    function validateIssuance(address _to, uint _value, uint _issuanceTime) onlyToken public {
        uint code;
        string memory reason;

        (code, reason) = preIssuanceCheck(_to, _value);
        require(code == 0, reason);
        require(recordIssuance(_to, _value, _issuanceTime));
    }

    function validate(address _from, address _to, uint _value) onlyToken public {
        uint code;
        string memory reason;

        (code, reason) = preTransferCheck(_from, _to, _value);
        require(code == 0, reason);
        require(recordTransfer(_from, _to, _value));
    }

    function validateBurn(address _who, uint _value) onlyToken public returns (bool){
        if (_value > 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_who)) == _value) {
            adjustInvestorCount(_who, false);
        }
        return true;
    }

    function validateSeize(address _from, address _to, uint _value) onlyToken public returns (bool){

        //Only allow seizing, if the target is an issuer wallet (can be overridden)
        require(getWalletManager().getWalletType(_to) == getWalletManager().ISSUER());

        if (_value > 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_from)) == _value) {
            adjustInvestorCount(_to, false);
        }

        return true;
    }

    function setCountryCompliance(string _country, uint _value) onlyIssuerOrAbove public returns (bool) {
        setUint(COUNTRIES, _country, _value);

        return true;
    }

    function getCountryCompliance(string _country) view public returns (uint) {
        return getUint(COUNTRIES, _country);
    }


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

    function createIssuanceInformation(string _investor, uint _value, uint _issuanceTime) internal returns (bool) {
        uint issuancesCount = getUint(ISSUANCES_COUNT, _investor);

        setUint(ISSUANCE_VALUE, _investor, issuancesCount, _value);
        setUint(ISSUANCE_TIMESTAMP, _investor, issuancesCount, _issuanceTime);
        setUint(ISSUANCES_COUNT, _investor, issuancesCount.add(1));

        return true;
    }

    function recordIssuance(address _to, uint _value, uint _issuanceTime) internal returns (bool){
        if (_value > 0 && getToken().balanceOfInvestor(getRegistryService().getInvestor(_to)) == 0) {
            adjustInvestorCount(_to, true);
        }

        require(createIssuanceInformation(getRegistryService().getInvestor(_to), _value, _issuanceTime));

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
        bool fromWalletIsPlatform = getWalletManager().getWalletType(_from) == getWalletManager().PLATFORM();
        if (getLockManager().getTransferableTokens(_from, uint64(now)) < _value
        && !fromWalletIsPlatform
        ) {
            return (16, TOKENS_LOCKED);
        }

        if (getWalletManager().getWalletType(_to) == getWalletManager().PLATFORM()) {
            return checkTransfer(_from, _to, _value);
        }


        if (!checkWhitelisted(_to)) {
            return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
        }

        string memory fromInvestor = getRegistryService().getInvestor(_from);
        string memory toInvestor = getRegistryService().getInvestor(_to);
        string memory fromCountry = getRegistryService().getCountry(fromInvestor);
        uint fromRegion = getCountryCompliance(fromCountry);
        string memory toCountry = getRegistryService().getCountry(toInvestor);
        uint toRegion = getCountryCompliance(toCountry);

        if (fromRegion == US) {
            if (getComplianceTransferableTokens(_from, uint64(now), uint64(365 days)) < _value) {
                return (32, HOLD_UP_1Y);
            }
            if (toRegion == US) {
                if (forceFullTransfer && getToken().balanceOfInvestor(fromInvestor) > _value) {
                    return (50, ONLY_FULL_TRANSFER);
                }
                if (isFund && getToken().balanceOfInvestor(fromInvestor) > _value && getUint(US_INVESTORS_COUNT) >= 99 &&
                getToken().balanceOfInvestor(toInvestor) == 0) {
                    return (41, ONLY_FULL_TRANSFER);
                }

                if (getToken().balanceOfInvestor(toInvestor).add(_value) < minUsTokens) {
                    return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
                }
            }
        } else if (fromRegion != US && toRegion == US && !fromWalletIsPlatform) {
            return (25, FLOWBACK);
        } else if (toRegion == FORBIDDEN) {
            return (26, DESTINATION_RESTRICTED);
        } else if (toRegion == EU && getRegistryService().getAttributeValue(toInvestor, getRegistryService().QUALIFIED()) != getRegistryService().APPROVED()) {
            if (getUint(EU_RETAIL_INVESTORS_COUNT, toCountry) >= 150 && (keccak256(abi.encodePacked(fromCountry)) != keccak256(abi.encodePacked(toCountry)) || getToken().balanceOfInvestor(fromInvestor) > _value) &&
            getToken().balanceOfInvestor(toInvestor) == 0) {
                return (40, MAX_INVESTORS_IN_CATEGORY);
            }

            if (getToken().balanceOfInvestor(toInvestor).add(_value) < minEuTokens) {
                return (51, AMOUNT_OF_TOKENS_UNDER_MIN);
            }
        }

        if (!isFund) {
            if (getToken().balanceOfInvestor(fromInvestor) > _value && getUint(TOTAL_INVESTORS) >= 1999 &&
            getToken().balanceOfInvestor(toInvestor) == 0) {
                return (41, ONLY_FULL_TRANSFER);
            }
        }

        return checkTransfer(_from, _to, _value);
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
        uint toRegion = getCountryCompliance(toCountry);

        if (toRegion == FORBIDDEN) {
            return (26, DESTINATION_RESTRICTED);
        }

        return (0, VALID);
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

    function checkTransfer(address, address, uint) pure internal returns (uint, string){
        return (0, VALID);
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
            uint issuanceTimestamp = getUint(ISSUANCE_TIMESTAMP, investor, i);

            if (_lockTime > _time || issuanceTimestamp > SafeMath.sub(_time, _lockTime)) {
                totalLockedTokens = totalLockedTokens.add(getUint(ISSUANCE_VALUE, investor, i));
            }
        }

        //there may be more locked tokens than actual tokens, so the minimum between the two
        uint transferable = SafeMath.sub(balanceOfHolder, Math.min256(totalLockedTokens, balanceOfHolder));

        return transferable;
    }

    function setTotalInvestors(uint256 _amount) public onlyMaster returns (bool) {
        setUint(TOTAL_INVESTORS, _amount);
        return true;
    }

    function getTotalInvestorCount() public view returns (uint256) {
        return getUint(TOTAL_INVESTORS);
    }

    function getUSInvestorsCount() public view returns (uint){
        return getUint(US_INVESTORS_COUNT);
    }

    function getEURetailInvestorCount(string _country) public view returns (uint){
        return getUint(EU_RETAIL_INVESTORS_COUNT, _country);
    }

    function setUsInvestorsCount(uint256 _amount) public onlyMaster returns (bool) {
        setUint(US_INVESTORS_COUNT, _amount);

        return true;
    }

    function setEuRetailInvestorsCount(string _country, uint256 _amount) public onlyMaster returns (bool) {
        setUint(EU_RETAIL_INVESTORS_COUNT, _country, _amount);

        return true;
    }
}