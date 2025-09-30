/**
 * Copyright 2025 Securitize Inc. All rights reserved.
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

import "./BaseDSContract.sol";
import "./CommonUtils.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 @dev Based on SimpleWallet (https://github.com/christianlundkvist/simple-multisig) and uses EIP-712 standard validate a signature
*/

contract TransactionRelayer is BaseDSContract, EIP712Upgradeable {
    using Address for address;

    string public constant NAME = "TransactionRelayer";

    // keccak256("ExecutePreApprovedTransaction(address destination,bytes32 data,uint256 nonce,bytes32 senderInvestor,uint256 blockLimit)")
    bytes32 public constant TXTYPE_HASH = 0x103eaa9a7f02c07fe1be89fcbaf6f0591b7ee351d8bef38fb2e3e71ce08a26c0;

    string public constant CONTRACT_VERSION = "5";

    mapping(bytes32 investorHash => uint256 nonce) internal noncePerInvestor;

    event InvestorNonceUpdated(string investorId, uint256 newNonce);
    struct ExecutePreApprovedTransaction {
        address destination;
        bytes data;
        string senderInvestor;
        uint256 nonce;
        uint256 blockLimit;
    }

    function initialize() public onlyProxy initializer {
        __BaseDSContract_init();
        __EIP712_init(NAME, CONTRACT_VERSION);
    }

    // Note that address recovered from signatures must be strictly increasing, in order to prevent duplicates
    function execute(
        uint8 /*sigV*/,
        bytes32 /*sigR*/,
        bytes32 /*sigS*/,
        address /*destination*/,
        uint256 /*value*/,
        bytes memory /*data*/,
        address /*executor*/,
        uint256 /*gasLimit*/
    ) public pure {
        require(false, "not implemented");
    }

    // Note that address recovered from signatures must be strictly increasing, in order to prevent duplicates
    function executeByInvestor(
        uint8 /*sigV*/,
        bytes32 /*sigR*/,
        bytes32 /*sigS*/,
        string memory /*senderInvestor*/,
        address /*destination*/,
        uint256 /*value*/,
        bytes memory /*data*/,
        address /*executor*/,
        uint256 /*gasLimit*/
    ) public pure {
        require(false, "not implemented");
    }

    /**
     * @dev Legacy entrypoint kept for ABI compatibility.
     */
    function executeByInvestorWithBlockLimit(
        uint8 /*sigV*/,
        bytes32 /*sigR*/,
        bytes32 /*sigS*/,
        string memory /*senderInvestor*/,
        address /*destination*/,
        address /*executor*/,
        bytes memory /*data*/,
        uint256[] memory /*params*/
    ) public pure {
        require(false, "not implemented");
    }

    /**
     * @dev Validates una firma EIP-712 y ejecuta la transacción preaprobada.
     * @param signature Firma compacta de 65 bytes.
     * @param txData Datos firmados y metadatos necesarios para ejecutar la llamada.
     */
    function executePreApprovedTransaction(
        bytes memory signature,
        ExecutePreApprovedTransaction calldata txData
    ) public {
        require(txData.blockLimit >= block.number, "Transaction too old");
        _executePreApprovedTransaction(signature, txData);
    }


    function nonceByInvestor(string memory investorId) public view returns (uint256) {
        return noncePerInvestor[CommonUtils.encodeString(investorId)];
    }
    /**
     * @dev Legacy entrypoint kept for ABI compatibility.
     */
    function updateDomainSeparator(uint256) public pure {
        revert("not implemented");
    }

    function setInvestorNonce(string memory investorId, uint256 newNonce) public onlyMaster {
        bytes32 investorKey = CommonUtils.encodeString(investorId);
        uint256 investorNonce = noncePerInvestor[investorKey];
        require(newNonce > investorNonce, "New nonce should be greater than old");
        noncePerInvestor[investorKey] = newNonce;
        emit InvestorNonceUpdated(investorId, newNonce);
    }

    function _executePreApprovedTransaction(
        bytes memory signature,
        ExecutePreApprovedTransaction calldata txData
    ) private {
        bytes32 investorKey = CommonUtils.encodeString(txData.senderInvestor);
        uint256 currentNonce = noncePerInvestor[investorKey];

        require(txData.nonce == currentNonce, "Invalid nonce");

        bytes32 digest = _hashTx(txData);
        address recovered = ECDSA.recover(digest, signature);
        uint256 approverRole = getTrustService().getRole(recovered);
        require(approverRole == ROLE_ISSUER || approverRole == ROLE_MASTER, 'Invalid signature');

        noncePerInvestor[investorKey] = currentNonce + 1;
        Address.functionCall(txData.destination, txData.data);
    }

    /// @dev Computes the digest to sign (EIP-712)
    function _hashTx(ExecutePreApprovedTransaction calldata txData) private view returns (bytes32) {
        bytes32 dataHash = keccak256(txData.data);
        bytes32 senderInvestorHash = keccak256(bytes(txData.senderInvestor));
        bytes32 structHash = keccak256(
            abi.encode(
                TXTYPE_HASH,
                txData.destination,
                dataHash,
                txData.nonce,
                senderInvestorHash,
                txData.blockLimit
            )
        );

        return _hashTypedDataV4(structHash);
    }
}
