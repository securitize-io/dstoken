pragma solidity ^0.5.0;

import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";


contract IDSWalletManager is Initializable, VersionedContract {
    constructor() internal {}

    function initialize() public {
        VERSIONS.push(2);
    }

    // Special wallets constants
    uint8 public constant NONE = 0;
    uint8 public constant ISSUER = 1;
    uint8 public constant PLATFORM = 2;
    uint8 public constant EXCHANGE = 4;

    /**
     * @dev should be emitted when a special wallet is added.
     */
    event DSWalletManagerSpecialWalletAdded(address wallet, uint8 walletType, address sender);
    /**
     * @dev should be emitted when a special wallet is removed.
     */
    event DSWalletManagerSpecialWalletRemoved(address wallet, uint8 walletType, address sender);
    /**
     * @dev should be emitted when the number of reserved slots is set for a wallet.
     */
    event DSWalletManagerReservedSlotsSet(address wallet, string country, uint8 accreditationStatus, uint256 slots, address sender);

    /**
     * @dev Sets a wallet to be an special wallet. (internal)
     * @param _wallet The address of the wallet.
     * @param _type The type of the wallet.
     * @return A boolean that indicates if the operation was successful.
     */
    function setSpecialWallet(address _wallet, uint8 _type) internal returns (bool);

    /**
     * @dev gets a wallet type
     * @param _wallet the address of the wallet to check.
     */
    function getWalletType(address _wallet) public view returns (uint8);

    /**
     * @dev Sets a wallet to be an issuer wallet.
     * @param _wallet The address of the wallet.
     * @return A boolean that indicates if the operation was successful.
     */
    function addIssuerWallet(
        address _wallet /*onlyIssuerOrAbove*/
    ) public returns (bool);

    /**
     * @dev Sets a wallet to be a platform wallet.
     * @param _wallet The address of the wallet.
     * @return A boolean that indicates if the operation was successful.
     */
    function addPlatformWallet(
        address _wallet /*onlyIssuerOrAbove*/
    ) public returns (bool);

    /**
     * @dev Sets a wallet to be an exchange wallet.
     * @param _wallet The address of the wallet.
     * @param _owner The address of the owner.
     * @return A boolean that indicates if the operation was successful.
     */
    function addExchangeWallet(address _wallet, address _owner) public returns (bool);

    /**
     * @dev Removes a special wallet.
     * @param _wallet The address of the wallet.
     * @return A boolean that indicates if the operation was successful.
     */
    function removeSpecialWallet(
        address _wallet /*onlyIssuerOrAbove*/
    ) public returns (bool);

    /**
     * @dev Sets the amount of reserved slots for a wallet based on country and accreditation status.
     * @param _wallet The address of the wallet.
     * @param _country The investors' country.
     * @param _accreditationStatus the investors' accrediation status.
     * @param _slots number of reserved slots.
     * @return A boolean that indicates if the operation was successful.
     */
    function setReservedSlots(
        address _wallet,
        string memory _country,
        uint8 _accreditationStatus,
        uint256 _slots /*onlyIssuerOrAbove*/
    ) public returns (bool);

    /**
     * @dev Gets the amount of reserved slots for a wallet based on country and accreditation status.
     * @param _wallet The address of the wallet.
     * @param _country The investors' country.
     * @param _accreditationStatus the investors' accrediation status.
     * @return The number of reserved slots.
     */
    function getReservedSlots(address _wallet, string memory _country, uint8 _accreditationStatus) public view returns (uint256);
}
