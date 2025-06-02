/**
 * Copyright 2024 Securitize Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

pragma solidity 0.8.20;

import "./BaseSecuritizeSwap.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../utils/BaseDSContract.sol";

contract SecuritizeSwap is BaseSecuritizeSwap {
    using Address for address;
    // EIP712 Precomputed hashes:
    // keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract,bytes32 salt)")
    bytes32 constant EIP712_DOMAIN_TYPE_HASH = 0xd87cd6ef79d4e2b95e15ce8abf732db51ec771f1ca2edccf22a46c729ac56472;

    // keccak256("SecuritizeSwap")
    bytes32 constant NAME_HASH = 0x5183e5178b4530d2fd10dfc0fff5d171f113e3becc98b45ca5513d6472888e3c;

    // keccak256("ExecutePreApprovedTransaction(string memory _senderInvestor, address _destination,address _executor,bytes _data, uint256[] memory _params)")
    bytes32 constant TXTYPE_HASH = 0xee963d66f92bd81c2e9b743fdab1cc81cd81a67f7626663992ce230ad0c71b51;

    //keccak256("2")
    bytes32 constant VERSION_HASH = 0xad7c5bef027816a800da1736444fb58a807ef4c9603b7848673f7e3a68eb14a5;

    bytes32 constant SALT = 0xc7c09cf61ec4558aac49f42b32ffbafd87af4676341e61db3c383153955f6f39;

    mapping(string => uint256) internal noncePerInvestor;
    bytes32 public DOMAIN_SEPARATOR;

    function initialize(
        address _dsToken,
        address _stableCoin,
        address _navProvider,
        address _issuerWallet,
        uint8 _bridgeChainId,
        address _USDCBridge
    ) public override initializer onlyProxy {
        BaseSecuritizeSwap.initialize(_dsToken, _stableCoin, _navProvider, _issuerWallet, _bridgeChainId, _USDCBridge);
        __BaseDSContract_init();

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPE_HASH,
                NAME_HASH,
                VERSION_HASH,
                block.chainid,
                this,
                SALT
            )
        );
    }

    /**
    * @dev Pauses SecuritizeSwap.
    */
    function pause() public onlyOwner {
        _pause();
    }

    /**
    * @dev Unpauses SecuritizeSwap.
    */
    function unpause() public onlyOwner {
        _unpause();
    }

    function nonceByInvestor(string memory _investorId) override public view returns (uint256) {
        return noncePerInvestor[_investorId];
    }

    function swap(
        string memory _senderInvestorId,
        address _newInvestorWallet,
        string memory _investorCountry,
        uint8[] memory _investorAttributeIds,
        uint256[] memory _investorAttributeValues,
        uint256[] memory _investorAttributeExpirations,
        uint256 _valueDsToken,
        uint256 _valueStableCoin,
        uint256 _blockLimit,
        uint256 _issuanceTime,
        bytes32 _agreementHash
    ) public override whenNotPaused onlyIssuerOrAbove {
        require(_blockLimit >= block.number, "Transaction too old");
        require(stableCoinToken.balanceOf(_newInvestorWallet) >= _valueStableCoin, "Not enough stable tokens balance");

        //Investor does not exist
        if (!IDSRegistryService(getDSService(REGISTRY_SERVICE)).isInvestor(_senderInvestorId)) {
            _registerNewInvestor (
                _senderInvestorId,
                _investorCountry,
                _investorAttributeIds,
                _investorAttributeValues,
                _investorAttributeExpirations
            );
        }

        //Check if new wallet should be added
        string memory investorWithNewWallet = IDSRegistryService(getDSService(REGISTRY_SERVICE)).getInvestor(_newInvestorWallet);
        if(CommonUtils.isEmptyString(investorWithNewWallet)) {
            IDSRegistryService(getDSService(REGISTRY_SERVICE)).addWallet(_newInvestorWallet, _senderInvestorId);
        } else {
            require(CommonUtils.isEqualString(_senderInvestorId, investorWithNewWallet), "Wallet does not belong to investor");
        }

        executeUSDCTransfer(_valueStableCoin);

        dsToken.issueTokensCustom(_newInvestorWallet, _valueDsToken, _issuanceTime, 0, "", 0);

        emit DocumentSigned (_newInvestorWallet, _agreementHash);
        emit Swap(msg.sender, _valueDsToken, _valueStableCoin, _newInvestorWallet);
    }

    function buy(uint256 _dsTokenAmount, uint256 _maxStableCoinAmount) public override whenNotPaused {
        require(IDSRegistryService(getDSService(REGISTRY_SERVICE)).isWallet(msg.sender), "Investor not registered");
        require(_dsTokenAmount > 0, "DSToken amount must be greater than 0");
        require(navProvider.rate() > 0, "NAV Rate must be greater than 0");

        uint256 stableCoinAmount = calculateStableCoinAmount(_dsTokenAmount);
        require(stableCoinAmount <= _maxStableCoinAmount, "The amount of stable coins is bigger than max expected");
        require(stableCoinToken.balanceOf(msg.sender) >= stableCoinAmount, "Not enough stable coin balance");

        dsToken.issueTokensCustom(msg.sender, _dsTokenAmount, block.timestamp, 0, "", 0);

        emit Buy(msg.sender, _dsTokenAmount, stableCoinAmount, navProvider.rate());
    }

    function getVersion() override public pure returns (uint256) {
        return 2;
    }

    function executePreApprovedTransaction(
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        string memory senderInvestor,
        address destination,
        address executor,
        bytes memory data,
        uint256[] memory params
    ) public override whenNotPaused {
        require(params.length == 2, "Incorrect params length");
        doExecuteByInvestor(sigV, sigR, sigS, senderInvestor, destination, data, executor, params);
    }

    /**
     * @dev Update the NAV rate provider implementation.
     * @param _navProvider The NAV rate provider implementation address
     */
    function updateNavProvider(address _navProvider) public onlyOwner {
        require(_navProvider != address(0), "NAV provider cannot be zero address");
        navProvider = ISecuritizeNavProvider(_navProvider);
    }


    function doExecuteByInvestor(
        uint8 _securitizeHsmSigV,
        bytes32 _securitizeHsmSigR,
        bytes32 _securitizeHsmSigS,
        string memory _senderInvestorId,
        address _destination,
        bytes memory _data,
        address _executor,
        uint256[] memory _params
    ) internal {
        bytes32 txInputHash = keccak256(
            abi.encode(
                TXTYPE_HASH,
                _destination,
                _params[0], //value
                keccak256(_data),
                noncePerInvestor[_senderInvestorId],
                _executor,
                _params[1], //gasLimit
                keccak256(abi.encodePacked(_senderInvestorId))
            )
        );
        bytes32 totalHash = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, txInputHash)
        );

        address recovered = ecrecover(totalHash, _securitizeHsmSigV, _securitizeHsmSigR, _securitizeHsmSigS);
        require(recovered != address(0), "Invalid signature");
        // Check that the recovered address is an issuer
        uint256 approverRole = IDSTrustService(getDSService(TRUST_SERVICE)).getRole(recovered);
        require(approverRole == ROLE_ISSUER || approverRole == ROLE_MASTER, "Insufficient trust level");
        noncePerInvestor[_senderInvestorId] = noncePerInvestor[_senderInvestorId] + 1;
        Address.functionCall(_destination, _data);
    }

    function _registerNewInvestor (
        string memory _senderInvestorId,
        string memory _investorCountry,
        uint8[] memory _investorAttributeIds,
        uint256[] memory _investorAttributeValues,
        uint256[] memory _investorAttributeExpirations
    ) private returns (bool) {
        IDSRegistryService registryService = IDSRegistryService(getDSService(REGISTRY_SERVICE));

        require(_investorAttributeIds.length == _investorAttributeValues.length &&
        _investorAttributeValues.length == _investorAttributeExpirations.length,
            "Investor params incorrect length"
        );
        registryService.registerInvestor(_senderInvestorId, "");
        registryService.setCountry(_senderInvestorId, _investorCountry);
        for (uint256 i = 0; i < _investorAttributeIds.length; i++) {
            registryService.setAttribute(
                _senderInvestorId,
                _investorAttributeIds[i],
                _investorAttributeValues[i],
                _investorAttributeExpirations[i],
                "");
        }
        return true;
    }

    function calculateDsTokenAmount(uint256 _stableCoinAmount) public override view returns (uint256, uint256) {
        uint256 currentNavRate = navProvider.rate();
        uint256 dsTokenAmount = _stableCoinAmount * 10 ** ERC20(address(dsToken)).decimals() / currentNavRate;
        return (dsTokenAmount, currentNavRate);
    }

    function calculateStableCoinAmount(uint256 _dsTokenAmount) public view returns (uint256) {
        return _dsTokenAmount * navProvider.rate() / (10 ** ERC20(address(dsToken)).decimals());
    }

    function executeUSDCTransfer(uint256 value) private {
        if (bridgeChainId != 0 && address(USDCBridge) != address(0)) {
            stableCoinToken.transferFrom(msg.sender, address(this), value);
            stableCoinToken.approve(address(USDCBridge), value);
            USDCBridge.sendUSDCCrossChainDeposit(bridgeChainId, issuerWallet, value);
        } else {
            stableCoinToken.transferFrom(msg.sender, issuerWallet, value);
        }
    }
}
