pragma solidity ^0.8.13;

import "../token/IDSToken.sol";

//SPDX-License-Identifier: UNLICENSED
abstract contract BaseSecuritizeSwap {
    IDSToken public dsToken;
    IERC20 public stableCoinToken;
    address public issuerWallet;

    function initialize(address _dsToken, address _stableCoin, address _issuerWallet) public virtual;

    event Swap(
        address indexed _from,
        uint256 _dsTokenValue,
        uint256 _stableCoinValue,
        address indexed _newWalletTo
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
        bytes32 _agreementHash
    ) external virtual;

    /**
     * @dev Validates off-chain signatures and executes transaction.
     * @param sigV V signature
     * @param sigR R signature
     * @param sigR R signature
     * @param senderInvestor investor id who executes the transaction. Could be registered or non-registered Investor
     * @param destination address
     * @param data encoded transaction data. For example issue token
     * @param params array of params. params[0] = value, params[1] = gasLimit, params[2] = blockLimit
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
}
