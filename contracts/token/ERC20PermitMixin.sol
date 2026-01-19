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

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {NoncesUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/NoncesUpgradeable.sol";

/**
 * @title ERC20PermitMixin
 * @notice Adds EIP-2612 permit support to any token with a compatible _approve() method.
 * @dev Designed for Securitize DSToken / StandardToken architecture. Compatible with rebasing and upgradeable proxies.
 */
abstract contract ERC20PermitMixin is Initializable, EIP712Upgradeable, IERC20Permit, NoncesUpgradeable {
    using ECDSA for bytes32;

    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)")
    bytes32 private constant PERMIT_TYPEHASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the EIP712 domain separator (should be called during token initialize()).
     * @param name_ The token name (must match ERC20 name for consistent signatures).
     */
    function __ERC20PermitMixin_init(string memory name_) internal onlyInitializing {
        __EIP712_init(name_, "1");
        __Nonces_init();
    }

    /**
     * @dev Returns the name that will be used for EIP712 domain separation.
     * @notice Overrides the default EIP712 name implementation to use the token's actual name.
     * @return The token name as a string, retrieved via the abstract _name() function.
     */
    function _EIP712Name() internal view virtual override returns (string memory) {
        return _name();  // Calls abstract function implemented by StandardToken
    }

    /**
     * @inheritdoc IERC20Permit
     */
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual override {
        require(block.timestamp <= deadline, "Permit: expired deadline");

        bytes32 structHash = keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, _useNonce(owner), deadline));

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, v, r, s);
        require(signer == owner, "Permit: invalid signature");

        _approve(owner, spender, value); // Delegates to inheriting contract
    }

    /**
     * @inheritdoc IERC20Permit
     */
    function DOMAIN_SEPARATOR() external view override returns (bytes32) {
        return _domainSeparatorV4();
    }

    /// @inheritdoc IERC20Permit
    function nonces(address owner) public view virtual override(IERC20Permit, NoncesUpgradeable) returns (uint256) {
        return super.nonces(owner);
    }

    /**
     * @dev Must be implemented by the inheriting token (e.g., StandardToken) to actually update allowances.
     */
    function _approve(address owner, address spender, uint256 value) internal virtual;

    /**
     * @dev Must be implemented by the inheriting token (e.g., StandardToken) to get name.
     */
    function _name() internal view virtual returns (string memory);
}
