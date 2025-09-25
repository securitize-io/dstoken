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
pragma solidity 0.8.22;

import "../registry/IDSRegistryService.sol";
import "../token/IDSToken.sol";
import "../trust/IDSTrustService.sol";
import "../nav/ISecuritizeNavProvider.sol";
import "../utils/BaseDSContract.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

interface IUSDCBridge {
    /**
    * @notice Bridge USDC between blockchain
    * @dev chain Id is not EVM chain id, please refer to https://wormhole.com/docs/build/reference/chain-ids/
    * @param targetChainId chain id
    * @param recipient - Target address USDC recipient
    * @param value - Amount to be bridged
    */
    function sendUSDCCrossChainDeposit(uint16 targetChainId, address recipient, uint256 value) external;
}


abstract contract BaseSecuritizeSwap is BaseDSContract, PausableUpgradeable {
    IDSToken public dsToken;
    IERC20 public stableCoinToken;
    ISecuritizeNavProvider public navProvider;
    address public issuerWallet;
    IUSDCBridge public USDCBridge;
    uint16 public bridgeChainId;
    uint256[44] private __gap;

    function initialize(
        address _dsToken,
        address _stableCoin,
        address _navProvider,
        address _issuerWallet,
        uint16 _bridgeChainId,
        address _USDCBridge
    ) public virtual {
        __BaseDSContract_init();
        dsToken = IDSToken(_dsToken);
        stableCoinToken = IERC20(_stableCoin);
        issuerWallet = _issuerWallet;
        navProvider = ISecuritizeNavProvider(_navProvider);
        bridgeChainId = _bridgeChainId;
        USDCBridge = IUSDCBridge(_USDCBridge);
    }

    event Swap(
        address indexed _from,
        uint256 _dsTokenValue,
        uint256 _stableCoinValue,
        address indexed _newWalletTo
    );

    event Buy(
        address indexed _from,
        uint256 _stableCoinAmount,
        uint256 _dsTokenAmount,
        uint256 _navRate
    );

    event DocumentSigned (
        address indexed _from,
        bytes32 _agreementHash
    );

    /**
     * @dev It does a swap between a Stable Coin ERC-20 token and DSToken.
     * @param _senderInvestorId investor sender (blockchainId). BlockchainId should be created by main-api
     * @param _newInvestorWallet: address of the investor. It should be previously approved
     * @param _investorCountry: investor country
     * @param _investorAttributeIds attributes to set.
     * @param _investorAttributeValues values to set.
     * @param _investorAttributeExpirations expiration values.
     * @param _valueDsToken tokens to mint to investor's new wallet
     * @param _valueStableCoin send to issuer's wallet
     * @param _blockLimit max block number when pre-approved transaction does not work anymore
     * @param _issuanceTime time in seconds to issue tokens.
     * @param _agreementHash hash of PDF document created before starting swap operation.
     */
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
    ) external virtual;

    /**
     * @dev It does a swap between a Stable Coin ERC-20 token and DSToken.
     * @param _dsTokenAmount the amount of DSTokens to mint to investor's new wallet
     * @param _maxStableCoinAmount maximum expected amount of stable coin to be paid by the investor
     */
    function buy(uint256 _dsTokenAmount, uint256 _maxStableCoinAmount) external virtual;

    /**
     * @dev Validates off-chain EIP-712 message signature and executes encoded transaction data.
     * @param sigV V signature
     * @param sigR R signature
     * @param sigS S signature
     * @param senderInvestor investor id created by registryService
     * @param destination address
     * @param data encoded transaction data. For example issue token
     * @param params array. params[0] = value, params[1] = gasLimit
     */
    function executePreApprovedTransaction(
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        string memory senderInvestor,
        address destination,
        address executor,
        bytes memory data,
        uint256[] memory params
    ) virtual public;

    /**
    * @dev Returns nonces per investor
    * @param _investorId investor (blockchainId).
    */
    function nonceByInvestor(string memory _investorId) virtual public view returns (uint256);

    /**
    * @dev Returns current version of smart contract
    */
    function getVersion() virtual public pure returns (uint256);

    /**
    * @dev Calculates the DSToken amount using current NAV rate.
    * @param _stableCoinAmount the amount of stable coins
    * @return (uint256 dsTokenAmount, uint256 currentNavRate) The amount of DSToken received and the NAV rate at the time of calculation
    */
    function calculateDsTokenAmount(uint256 _stableCoinAmount) virtual public view returns (uint256, uint256);
}
