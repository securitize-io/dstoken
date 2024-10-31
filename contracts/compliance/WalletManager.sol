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

pragma solidity ^0.8.20;

import "./IDSWalletManager.sol";
import "../data-stores/WalletManagerDataStore.sol";
import "../utils/BaseDSContract.sol";

/**
 * @title WalletManager
 * @dev A wallet manager which allows marking special wallets in the system.
 * @dev Implements DSTrustServiceInterface and ESServiceConsumer.
 */

contract WalletManager is IDSWalletManager, WalletManagerDataStore, BaseDSContract {
    function initialize() public override onlyProxy initializer {
        __BaseDSContract_init();
    }

    /**
   * @dev Sets a wallet to be an special wallet. (internal)
   * @param _wallet The address of the wallet.
   * @param _type The type of the wallet.
   * @return A boolean that indicates if the operation was successful.
   */
    function setSpecialWallet(address _wallet, uint8 _type) internal override returns (bool) {
        require(CommonUtils.isEmptyString(getRegistryService().getInvestor(_wallet)), "Wallet belongs to investor");

        uint8 oldType = getWalletType(_wallet);
        require(oldType == NONE || _type == NONE, "Direct wallet type change is not allowed");

        walletsTypes[_wallet] = _type;

        if (oldType == NONE) {
            emit DSWalletManagerSpecialWalletAdded(_wallet, _type, msg.sender);
        } else {
            emit DSWalletManagerSpecialWalletRemoved(_wallet, oldType, msg.sender);
        }

        return true;
    }

    /**
   * @dev Sets a wallet to be an issuer wallet.
   * @param _wallet The address of the wallet.
   * @return A boolean that indicates if the operation was successful.
   */
    function addIssuerWallet(address _wallet) public override onlyIssuerOrAbove returns (bool) {
        return setSpecialWallet(_wallet, ISSUER);
    }

    /**
    * @dev Sets an array of wallets to be issuer wallets.
    * @param _wallets The address of the wallet.
    * @return A boolean that indicates if the operation was successful.
   */
    function addIssuerWallets(address[] memory _wallets) public override onlyIssuerOrAbove returns (bool) {
        require(_wallets.length <= 30, "Exceeded the maximum number of wallets");
        for (uint i = 0; i < _wallets.length; i++) {
            addIssuerWallet(_wallets[i]);
        }
        return true;
    }

    /**
   * @dev Sets a wallet to be an platform wallet.
   * @param _wallet The address of the wallet.
   * @return A boolean that indicates if the operation was successful.
   */
    function addPlatformWallet(address _wallet) public override onlyIssuerOrAbove returns (bool) {
        return setSpecialWallet(_wallet, PLATFORM);
    }

    /**
    * @dev Sets an array of wallets to be platform wallet.
    * @param _wallets The address of the wallet.
    * @return A boolean that indicates if the operation was successful.
   */
    function addPlatformWallets(address[] memory _wallets) public override onlyIssuerOrAbove returns (bool) {
        require(_wallets.length <= 30, "Exceeded the maximum number of wallets");
        for (uint i = 0; i < _wallets.length; i++) {
            addPlatformWallet(_wallets[i]);
        }
        return true;
    }

    /**
   * @dev Sets a wallet to be an exchange wallet.
   * @param _wallet The address of the wallet.
   * @param _owner The address of the owner.
   * @return A boolean that indicates if the operation was successful.
   */
    function addExchangeWallet(address _wallet, address _owner) public override onlyIssuerOrAbove returns (bool) {
        require(getTrustService().getRole(_owner) == EXCHANGE, "Owner is not an exchange");
        return setSpecialWallet(_wallet, EXCHANGE);
    }

    function isSpecialWallet(address _wallet) external override view returns (bool) {
        return walletsTypes[_wallet] != NONE;
    }

    function isIssuerSpecialWallet(address _wallet) external override view returns (bool) {
        return walletsTypes[_wallet] == ISSUER;
    }

    function isPlatformWallet(address _wallet) external override view returns (bool) {
        return walletsTypes[_wallet] == PLATFORM;
    }

    function getWalletType(address _wallet) public view override returns (uint8) {
        return walletsTypes[_wallet];
    }

    /**
   * @dev Removes a special wallet.
   * @param _wallet The address of the wallet.
   * @return A boolean that indicates if the operation was successful.
   */
    function removeSpecialWallet(address _wallet) public override onlyIssuerOrAbove returns (bool) {
        return setSpecialWallet(_wallet, NONE);
    }
}
