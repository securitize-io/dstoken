pragma solidity 0.5.17;

import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";


/**
 * @title IDSTrustService
 * @dev An interface for a trust service which allows role-based access control for other contracts.
 */
contract IDSTrustService is Initializable, VersionedContract {
    constructor() internal {}

    function initialize() public {
        VERSIONS.push(3);
    }

    /**
     * @dev Should be emitted when a role is set for a user.
     */
    event DSTrustServiceRoleAdded(address targetAddress, uint8 role, address sender);
    /**
     * @dev Should be emitted when a role is removed for a user.
     */
    event DSTrustServiceRoleRemoved(address targetAddress, uint8 role, address sender);

    // Role constants
    uint8 public constant NONE = 0;
    uint8 public constant MASTER = 1;
    uint8 public constant ISSUER = 2;
    uint8 public constant EXCHANGE = 4;

    /**
     * @dev Allow invoking of functions only by the user who has the MASTER role.
     */
    modifier onlyMaster() {
        assert(false);
        _;
    }

    /**
     * @dev Allow invoking of functions only by the users who have the MASTER role or the ISSUER role.
     */
    modifier onlyMasterOrIssuer() {
        assert(false);
        _;
    }

    modifier onlyEntityOwnerOrAbove(string memory _name) {
        assert(false);
        _;
    }

    modifier onlyNewEntity(string memory _name) {
        assert(false);
        _;
    }

    modifier onlyExistingEntity(string memory _name) {
        assert(false);
        _;
    }

    modifier onlyNewEntityOwner(address _owner) {
        assert(false);
        _;
    }

    modifier onlyExistingEntityOwner(string memory _name, address _owner) {
        assert(false);
        _;
    }

    modifier onlyNewOperator(address _operator) {
        assert(false);
        _;
    }

    modifier onlyExistingOperator(string memory _name, address _operator) {
        assert(false);
        _;
    }

    modifier onlyNewResource(address _resource) {
        assert(false);
        _;
    }

    modifier onlyExistingResource(string memory _name, address _resource) {
        assert(false);
        _;
    }

    /**
     * @dev Transfers the ownership (MASTER role) of the contract.
     * @param _address The address which the ownership needs to be transferred to.
     * @return A boolean that indicates if the operation was successful.
     */
    function setServiceOwner(
        address _address /*onlyMaster*/
    ) public returns (bool);

    /**
     * @dev Sets a role for a wallet.
     * @dev Should not be used for setting MASTER (use setServiceOwner) or role removal (use removeRole).
     * @param _address The wallet whose role needs to be set.
     * @param _role The role to be set.
     * @return A boolean that indicates if the operation was successful.
     */
    function setRole(
        address _address,
        uint8 _role /*onlyMasterOrIssuer*/
    ) public returns (bool);

    /**
     * @dev Removes the role for a wallet.
     * @dev Should not be used to remove MASTER (use setServiceOwner).
     * @param _address The wallet whose role needs to be removed.
     * @return A boolean that indicates if the operation was successful.
     */
    function removeRole(
        address _address /*onlyMasterOrIssuer*/
    ) public returns (bool);

    /**
     * @dev Gets the role for a wallet.
     * @param _address The wallet whose role needs to be fetched.
     * @return A boolean that indicates if the operation was successful.
     */
    function getRole(address _address) public view returns (uint8);

    /**
     * @dev Gets true if address is operator or above.
     * @param _omnibusWallet The omnibus wallet of the token.
     * @param _address The wallet whose role needs to be fetched.
     * @return A boolean that indicates if is operator or above.
     */
    function isOperatorOrAbove(address _omnibusWallet, address _address) public view returns (bool);

    /**
     * @dev Gets true if address is exchange.
     * @param _address The wallet whose role needs to be fetched.
     * @return A boolean that indicates if is exchange.
     */
    function isExchange(address _address) public view returns (bool);

    function addEntity(
        string memory _name,
        address _owner /*onlyMasterOrIssuer onlyNewEntity onlyNewEntityOwner*/
    ) public;

    function changeEntityOwner(
        string memory _name,
        address _oldOwner,
        address _newOwner /*onlyMasterOrIssuer onlyExistingEntityOwner*/
    ) public;

    function addOperator(
        string memory _name,
        address _operator /*onlyEntityOwnerOrAbove onlyNewOperator*/
    ) public;

    function removeOperator(
        string memory _name,
        address _operator /*onlyEntityOwnerOrAbove onlyExistingOperator*/
    ) public;

    function addResource(
        string memory _name,
        address _resource /*onlyMasterOrIssuer onlyExistingEntity onlyNewResource*/
    ) public;

    function removeResource(
        string memory _name,
        address _resource /*onlyMasterOrIssuer onlyExistingResource*/
    ) public;

    function getEntityByOwner(address _owner) public view returns (string memory);

    function getEntityByOperator(address _operator) public view returns (string memory);

    function getEntityByResource(address _resource) public view returns (string memory);

    function isResourceOwner(address _resource, address _owner) public view returns (bool);

    function isResourceOperator(address _resource, address _operator) public view returns (bool);
}
