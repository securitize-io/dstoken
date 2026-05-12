/**
 * Copyright 2025 Securitize Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

pragma solidity 0.8.22;

import {DSToken} from "./DSToken.sol";
import {IBankModule} from "../injective/IBankModule.sol";
import {Cosmos} from "../injective/CosmosTypes.sol";
import {ISecuritizeRebasingProvider} from "../rebasing/ISecuritizeRebasingProvider.sol";
import {TokenLibrary} from "./TokenLibrary.sol";
import {CommonUtils} from "../utils/CommonUtils.sol";

contract DSTokenMTS is DSToken {
    address internal constant BANK_CONTRACT = 0x0000000000000000000000000000000000000064;
    address internal constant ERC20_MODULE_ACCOUNT = 0x47EeB2eac350E1923b8CBDfA4396A077b36E62a0;

    IBankModule internal constant BANK = IBankModule(BANK_CONTRACT);

    string public mtsDenom;
    bool internal suppressPostTransferRecord;

    event MTSDenomUpdated(string oldDenom, string newDenom);

    receive() external payable {}

    /// @custom:oz-upgrades-unsafe-allow missing-initializer-call
    function initialize(
        string calldata _name,
        string calldata _symbol,
        uint8 _decimals
    ) public override onlyProxy initializer {
        __StandardToken_init(_name);

        name = _name;
        symbol = _symbol;
        decimals = _decimals;

        BANK.setMetadata(_name, _symbol, _decimals);
    }

    function setMTSDenom(string calldata _denom) external onlyMaster {
        emit MTSDenomUpdated(mtsDenom, _denom);
        mtsDenom = _denom;
    }

    function totalSupply() public view override returns (uint256) {
        return BANK.totalSupply(address(this));
    }

    function balanceOf(address _owner) public view override returns (uint256) {
        return BANK.balanceOf(address(this), _owner);
    }

    function transfer(address _to, uint256 _value) public override returns (bool) {
        _validateTransferView(msg.sender, _to, _value);

        suppressPostTransferRecord = true;
        require(BANK.transfer(msg.sender, _to, _value), "Bank transfer failed");
        suppressPostTransferRecord = false;

        bool observed = _syncObservedBankTransfer(msg.sender, _to, _value, true);
        emit Transfer(msg.sender, _to, _value);
        if (observed) {
            _emitTxShares(msg.sender, _to, _value);
        }
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public override returns (bool) {
        require(_value <= allowances[_from][msg.sender], "Not enough allowance");
        allowances[_from][msg.sender] -= _value;

        _validateTransferView(_from, _to, _value);
        suppressPostTransferRecord = true;
        require(BANK.transfer(_from, _to, _value), "Bank transfer failed");
        suppressPostTransferRecord = false;

        bool observed = _syncObservedBankTransfer(_from, _to, _value, true);
        emit Transfer(_from, _to, _value);
        if (observed) {
            _emitTxShares(_from, _to, _value);
        }
        return true;
    }

    function issueTokensWithMultipleLocks(
        address _to,
        uint256 _value,
        uint256 _issuanceTime,
        uint256[] memory _valuesLocked,
        string memory _reason,
        uint64[] memory _releaseTimes
    ) public override onlyIssuerOrAbove returns (bool) {
        ISecuritizeRebasingProvider rebasingProvider = getRebasingProvider();
        TokenLibrary.IssueParams memory params = TokenLibrary.IssueParams({
            _to: _to,
            _value: _value,
            _issuanceTime: _issuanceTime,
            _valuesLocked: _valuesLocked,
            _releaseTimes: _releaseTimes,
            _reason: _reason,
            _rebasingProvider: rebasingProvider
        });

        uint256 shares = TokenLibrary.issueTokensCustom(
            tokenData,
            getCommonServices(),
            getLockManager(),
            params
        );

        require(BANK.mint(_to, _value), "Bank mint failed");

        emit Transfer(address(0), _to, _value);
        emit TxShares(address(0), _to, shares, rebasingProvider.multiplier());

        _syncWalletList(_to);
        return true;
    }

    function burn(address _who, uint256 _value, string calldata _reason) public override onlyIssuerOrTransferAgentOrAbove {
        ISecuritizeRebasingProvider rebasingProvider = getRebasingProvider();
        uint256 shares = TokenLibrary.burn(tokenData, getCommonServices(), _who, _value, rebasingProvider);

        require(BANK.burn(_who, _value), "Bank burn failed");

        emit Burn(_who, _value, _reason);
        emit Transfer(_who, address(0), _value);
        emit TxShares(_who, address(0), shares, rebasingProvider.multiplier());
        _syncWalletList(_who);
    }

    function seize(address _from, address _to, uint256 _value, string calldata _reason) public override onlyTransferAgentOrAbove {
        getComplianceService().validateSeize(_from, _to, _value);

        suppressPostTransferRecord = true;
        require(BANK.transfer(_from, _to, _value), "Bank transfer failed");
        suppressPostTransferRecord = false;

        _syncWalletBalance(_from);
        _syncWalletBalance(_to);

        ISecuritizeRebasingProvider rebasingProvider = getRebasingProvider();
        uint256 shares = rebasingProvider.convertTokensToShares(_value);

        emit Seize(_from, _to, _value, _reason);
        emit Transfer(_from, _to, _value);
        emit TxShares(_from, _to, shares, rebasingProvider.multiplier());
    }

    function isTransferRestricted(
        address _from,
        address _to,
        Cosmos.Coin calldata _amount
    ) external view returns (bool) {
        if (!_isConfiguredDenom(_amount.denom)) {
            return false;
        }

        if (suppressPostTransferRecord) {
            return false;
        }

        if (_from == ERC20_MODULE_ACCOUNT || _to == ERC20_MODULE_ACCOUNT) {
            return false;
        }

        (uint256 code,) = _preTransferCheck(_from, _to, _amount.amount, _mirroredBalanceOf(_from));
        return code != 0;
    }

    function postTransfer(
        address _from,
        address _to,
        Cosmos.Coin calldata _amount
    ) external {
        if (!_isConfiguredDenom(_amount.denom)) {
            return;
        }

        if (suppressPostTransferRecord || _from == ERC20_MODULE_ACCOUNT || _to == ERC20_MODULE_ACCOUNT) {
            return;
        }

        if (_syncObservedBankTransfer(_from, _to, _amount.amount, true)) {
            _emitTxShares(_from, _to, _amount.amount);
        }
    }

    function _validateTransferView(address _from, address _to, uint256 _value) internal view {
        (uint256 code, string memory reason) = _preTransferCheck(
            _from,
            _to,
            _value,
            BANK.balanceOf(address(this), _from)
        );
        require(code == 0, reason);
    }

    function _preTransferCheck(
        address _from,
        address _to,
        uint256 _value,
        uint256 _balanceFrom
    ) internal view returns (uint256 code, string memory reason) {
        return getComplianceService().newPreTransferCheck(
            _from,
            _to,
            _value,
            _balanceFrom,
            paused
        );
    }

    function _syncObservedBankTransfer(
        address _from,
        address _to,
        uint256 _value,
        bool _recordCompliance
    ) internal returns (bool) {
        if (_from == _to) {
            return false;
        }

        uint256 fromBefore = _mirroredBalanceOf(_from);
        uint256 toBefore = _mirroredBalanceOf(_to);
        uint256 fromAfter = BANK.balanceOf(address(this), _from);
        uint256 toAfter = BANK.balanceOf(address(this), _to);

        if (fromBefore < _value || fromBefore - _value != fromAfter || toBefore + _value != toAfter) {
            return false;
        }

        if (_recordCompliance) {
            getComplianceService().recordTransferFromTokenHook(_from, _to, _value);
        }

        updateInvestorBalance(_from, _value, CommonUtils.IncDec.Decrease);
        updateInvestorBalance(_to, _value, CommonUtils.IncDec.Increase);

        ISecuritizeRebasingProvider rebasingProvider = getRebasingProvider();
        tokenData.walletsBalances[_from] = rebasingProvider.convertTokensToShares(fromAfter);
        tokenData.walletsBalances[_to] = rebasingProvider.convertTokensToShares(toAfter);

        _syncWalletListWithBalance(_from, fromAfter);
        _syncWalletListWithBalance(_to, toAfter);
        return true;
    }

    function _emitTxShares(address _from, address _to, uint256 _value) internal {
        ISecuritizeRebasingProvider rebasingProvider = getRebasingProvider();
        emit TxShares(_from, _to, rebasingProvider.convertTokensToShares(_value), rebasingProvider.multiplier());
    }

    function _syncWalletBalance(address _wallet) internal {
        uint256 bankBalance = BANK.balanceOf(address(this), _wallet);
        uint256 mirroredBalance = _mirroredBalanceOf(_wallet);

        if (bankBalance == mirroredBalance) {
            _syncWalletListWithBalance(_wallet, bankBalance);
            return;
        }

        if (bankBalance > mirroredBalance) {
            updateInvestorBalance(_wallet, bankBalance - mirroredBalance, CommonUtils.IncDec.Increase);
        } else {
            updateInvestorBalance(_wallet, mirroredBalance - bankBalance, CommonUtils.IncDec.Decrease);
        }

        tokenData.walletsBalances[_wallet] = getRebasingProvider().convertTokensToShares(bankBalance);
        _syncWalletListWithBalance(_wallet, bankBalance);
    }

    function _mirroredBalanceOf(address _wallet) internal view returns (uint256) {
        return getRebasingProvider().convertSharesToTokens(tokenData.walletsBalances[_wallet]);
    }

    function _syncWalletList(address _wallet) internal {
        _syncWalletListWithBalance(_wallet, BANK.balanceOf(address(this), _wallet));
    }

    function _syncWalletListWithBalance(address _wallet, uint256 _balance) internal {
        if (_balance == 0) {
            _removeWalletFromList(_wallet);
        } else {
            _addWalletToList(_wallet);
        }
    }

    function _addWalletToList(address _address) internal {
        uint256 existingIndex = walletsToIndexes[_address];
        if (existingIndex == 0) {
            uint256 index = walletsCount + 1;
            walletsList[index] = _address;
            walletsToIndexes[_address] = index;
            walletsCount = index;
        }
    }

    function _removeWalletFromList(address _address) internal {
        uint256 existingIndex = walletsToIndexes[_address];
        if (existingIndex != 0) {
            uint256 lastIndex = walletsCount;
            if (lastIndex != existingIndex) {
                address lastWalletAddress = walletsList[lastIndex];
                walletsList[existingIndex] = lastWalletAddress;
                walletsToIndexes[lastWalletAddress] = existingIndex;
            }

            delete walletsToIndexes[_address];
            delete walletsList[lastIndex];
            walletsCount = lastIndex - 1;
        }
    }

    function _isConfiguredDenom(string calldata _denom) internal view returns (bool) {
        return bytes(mtsDenom).length != 0 && keccak256(bytes(_denom)) == keccak256(bytes(mtsDenom));
    }
}
