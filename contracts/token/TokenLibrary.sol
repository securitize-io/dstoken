pragma solidity ^0.5.0;

import "../service/ServiceConsumer.sol";

library TokenLibrary {
    event OmnibusDeposit(address indexed omnibusWallet, address to, uint256 value, uint8 assetTrackingMode);
    event OmnibusWithdraw(address indexed omnibusWallet, address from, uint256 value, uint8 assetTrackingMode);

    uint internal constant COMPLIANCE_SERVICE = 0;
    uint internal constant REGISTRY_SERVICE = 1;
    uint internal constant OMNIBUS_NO_ACTION = 0;
    uint internal constant OMNIBUS_DEPOSIT = 1;
    uint internal constant OMNIBUS_WITHDRAW = 2;
    using SafeMath for uint256;

    struct TokenData
    {
        mapping(address => uint256) walletsBalances;
        mapping(string => uint256) investorsBalances;
        uint256 totalSupply;
        uint256 totalIssued;
    }

    struct SupportedFeatures {
        uint256 value;
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

    function issueTokensCustom(TokenData storage _tokenData, address[] memory _services, IDSLockManager _lockManager, address _to, uint256 _value, uint256 _issuanceTime, uint256 _valueLocked, uint256 _releaseTime, string memory _reason, uint256 _cap)
        public
        returns (bool)
    {
        //Check input values
        require(_to != address(0));
        require(_value > 0);
        require(_valueLocked <= _value, "valueLocked must be smaller than value");
        //Make sure we are not hitting the cap
        require(_cap == 0 || _tokenData.totalIssued.add(_value) <= _cap, "Token Cap Hit");

        //Check issuance is allowed (and inform the compliance manager, possibly adding locks)
        IDSComplianceService(_services[COMPLIANCE_SERVICE]).validateIssuance(_to, _value, _issuanceTime);

        //Adding and subtracting is done through safemath
        _tokenData.totalSupply = _tokenData.totalSupply.add(_value);
        _tokenData.totalIssued = _tokenData.totalIssued.add(_value);
        _tokenData.walletsBalances[_to] = _tokenData.walletsBalances[_to].add(_value);
        updateInvestorBalance(_tokenData, IDSRegistryService(_services[REGISTRY_SERVICE]), _to, _value, true);

        if (_valueLocked > 0) {
            _lockManager.addManualLockRecord(_to, _valueLocked, _reason, _releaseTime);
        }
        return true;
    }

    modifier validSeizeParameters(TokenData storage _tokenData, address _from, address _to, uint256 _value) {
        require(_from != address(0));
        require(_to != address(0));
        require(_value <= _tokenData.walletsBalances[_from]);

        _;
    }

    function burn(TokenData storage _tokenData, address[] memory _services, address _who, uint256 _value) public {
        require(_value <= _tokenData.walletsBalances[_who]);
        // no need to require value <= totalSupply, since that would imply the
        // sender's balance is greater than the totalSupply, which *should* be an assertion failure

        IDSComplianceService(_services[COMPLIANCE_SERVICE]).validateBurn(_who, _value);

        _tokenData.walletsBalances[_who] = _tokenData.walletsBalances[_who].sub(_value);
        updateInvestorBalance(_tokenData, IDSRegistryService(_services[REGISTRY_SERVICE]), _who, _value, false);
        _tokenData.totalSupply = _tokenData.totalSupply.sub(_value);
    }

    function seize(TokenData storage _tokenData, address[] memory _services, address _from, address _to, uint256 _value) public  validSeizeParameters(_tokenData, _from, _to, _value) {
        IDSRegistryService registryService = IDSRegistryService(_services[REGISTRY_SERVICE]);
        IDSComplianceService(_services[COMPLIANCE_SERVICE]).validateSeize(_from, _to, _value);
        _tokenData.walletsBalances[_from] = _tokenData.walletsBalances[_from].sub(_value);
        _tokenData.walletsBalances[_to] = _tokenData.walletsBalances[_to].add(_value);
        updateInvestorBalance(_tokenData, registryService, _from, _value, false);
        updateInvestorBalance(_tokenData, registryService, _to, _value, true);
    }

    function omnibusBurn(TokenData storage _tokenData, address[] memory _services, address _omnibusWallet, address _who, uint256 _value) public {
        IDSRegistryService registryService = IDSRegistryService(_services[REGISTRY_SERVICE]);
        IDSOmnibusWalletController omnibusController = IDSRegistryService(_services[REGISTRY_SERVICE]).getOmnibusWalletController(_omnibusWallet);
        IDSComplianceService(_services[COMPLIANCE_SERVICE]).validateOmnibusBurn(_omnibusWallet, _who, _value);
        _tokenData.walletsBalances[_omnibusWallet] = _tokenData.walletsBalances[_omnibusWallet].sub(_value);
        omnibusController.burn(_who, _value);
        decreaseInvestorBalanceOnOmnibusSeizeOrBurn(_tokenData, registryService, omnibusController, _omnibusWallet, _who, _value);
        _tokenData.totalSupply = _tokenData.totalSupply.sub(_value);
    }

    function omnibusSeize(TokenData storage _tokenData, address[] memory _services, address _omnibusWallet, address _from, address _to, uint256 _value)
        public validSeizeParameters(_tokenData, _omnibusWallet, _to, _value)
    {
        IDSRegistryService registryService = IDSRegistryService(_services[REGISTRY_SERVICE]);
        IDSOmnibusWalletController omnibusController = registryService.getOmnibusWalletController(_omnibusWallet);

        IDSComplianceService(_services[COMPLIANCE_SERVICE]).validateOmnibusSeize(_omnibusWallet, _from, _to, _value);
        _tokenData.walletsBalances[_omnibusWallet] = _tokenData.walletsBalances[_omnibusWallet].sub(_value);
        _tokenData.walletsBalances[_to] = _tokenData.walletsBalances[_to].add(_value);
        omnibusController.seize(_from, _value);
        decreaseInvestorBalanceOnOmnibusSeizeOrBurn(_tokenData, registryService, omnibusController, _omnibusWallet, _from, _value);
        updateInvestorBalance(_tokenData, registryService, _to, _value, true);
    }

    function decreaseInvestorBalanceOnOmnibusSeizeOrBurn(TokenData storage _tokenData, IDSRegistryService _registryService, IDSOmnibusWalletController _omnibusController, address _omnibusWallet, address _from, uint256 _value) internal {
        if (_omnibusController.isHolderOfRecord()) {
            updateInvestorBalance(_tokenData, _registryService, _omnibusWallet, _value, false);
        } else {
            updateInvestorBalance(_tokenData, _registryService, _from, _value, false);
        }
    }

    function applyOmnibusBalanceUpdatesOnTransfer(TokenData storage _tokenData, IDSRegistryService _registryService, address _from, address _to, uint256 _value) public returns (uint) {
      if (_registryService.isOmnibusWallet(_to)) {
            IDSOmnibusWalletController omnibusWalletController = _registryService.getOmnibusWalletController(_to);
            omnibusWalletController.deposit(_from, _value);
            emit OmnibusDeposit(_to, _from, _value, omnibusWalletController.getAssetTrackingMode());

            if (omnibusWalletController.isHolderOfRecord()) {
                updateInvestorBalance(_tokenData, _registryService, _from, _value, false);
                updateInvestorBalance(_tokenData, _registryService, _to, _value, true);
            }
            return OMNIBUS_DEPOSIT;
        } else if (_registryService.isOmnibusWallet(_from)) {
            IDSOmnibusWalletController omnibusWalletController = _registryService.getOmnibusWalletController(_from);
            omnibusWalletController.withdraw(_to, _value);
            emit OmnibusWithdraw(_from, _to, _value, omnibusWalletController.getAssetTrackingMode());

            if (omnibusWalletController.isHolderOfRecord()) {
                updateInvestorBalance(_tokenData, _registryService, _from, _value, false);
                updateInvestorBalance(_tokenData, _registryService, _to, _value, true);
            }
            return OMNIBUS_WITHDRAW;
        }
        return OMNIBUS_NO_ACTION;
    }

    function updateInvestorBalance(TokenData storage _tokenData, IDSRegistryService _registryService ,address _wallet, uint256 _value, bool _increase) internal returns (bool) {
        string memory investor = _registryService.getInvestor(_wallet);
        if (keccak256(abi.encodePacked(investor)) != keccak256("")) {
            uint256 balance = _tokenData.investorsBalances[investor];
            if (_increase) {
                balance = balance.add(_value);
            } else {
                balance = balance.sub(_value);
            }
            _tokenData.investorsBalances[investor] = balance;
        }

        return true;
    }
}
