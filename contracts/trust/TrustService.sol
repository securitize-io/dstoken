pragma solidity ^0.8.13;

import "../utils/CommonUtils.sol";
import "../utils/ProxyTarget.sol";
import "./IDSTrustService.sol";
import "../data-stores/TrustServiceDataStore.sol";

/**
 * @title TrustService
 * @dev A trust service which allows role-based access control for other contracts.
 * @dev Implements IDSTrustService.
 */
//SPDX-License-Identifier: UNLICENSED
contract TrustService is ProxyTarget, Initializable, IDSTrustService, TrustServiceDataStore {
    function initialize() public override initializer forceInitializeFromProxy {
        IDSTrustService.initialize();
        VERSIONS.push(3);
        owner = msg.sender;
        roles[msg.sender] = MASTER;
    }

    /**
   * @dev Allow invoking of functions only by the user who has the MASTER role.
   */
    modifier onlyMaster() {
        require(roles[msg.sender] == MASTER, "Not enough permissions");
        _;
    }

    /**
   * @dev Allow invoking of functions only by the users who have the MASTER role or the ISSUER role.
   */
    modifier onlyMasterOrIssuer() {
        require(roles[msg.sender] == MASTER || roles[msg.sender] == ISSUER, "Not enough permissions");
        _;
    }

    modifier onlyEntityOwnerOrAbove(string memory _name) {
        require(
            roles[msg.sender] == MASTER ||
                roles[msg.sender] == ISSUER ||
                (!CommonUtils.isEmptyString(ownersEntities[msg.sender]) &&
                  CommonUtils.isEqualString(ownersEntities[msg.sender], _name)),
                "Not enough permissions"
        );
        _;
    }

    modifier onlyNewEntity(string memory _name) {
        require(entitiesOwners[_name] == address(0), "Entity already exists");
        _;
    }

    modifier onlyExistingEntity(string memory _name) {
        require(entitiesOwners[_name] != address(0), "Entity doesn't exist");
        _;
    }

    modifier onlyNewEntityOwner(address _owner) {
        require(CommonUtils.isEmptyString(ownersEntities[_owner]), "Entity owner already exists");
        _;
    }

    modifier onlyExistingEntityOwner(string memory _name, address _owner) {

        require(
            !CommonUtils.isEmptyString(ownersEntities[_owner]) &&
            CommonUtils.isEqualString(ownersEntities[_owner], _name),
            "Entity owner doesn't exist"
        );
        _;
    }

    modifier onlyNewOperator(address _operator) {
        require(CommonUtils.isEmptyString(operatorsEntities[_operator]), "Entity operator already exists");
        _;
    }

    modifier onlyExistingOperator(string memory _name, address _operator) {
        require(
            !CommonUtils.isEmptyString(operatorsEntities[_operator]) &&
            CommonUtils.isEqualString(operatorsEntities[_operator], _name),
            "Entity operator doesn't exist"
        );
        _;
    }

    modifier onlyNewResource(address _resource) {
        require(CommonUtils.isEmptyString(resourcesEntities[_resource]), "Entity resource already exists");
        _;
    }

    modifier onlyExistingResource(string memory _name, address _resource) {
        require(
            !CommonUtils.isEmptyString(resourcesEntities[_resource]) &&
            CommonUtils.isEqualString(resourcesEntities[_resource], _name),
            "Entity resource doesn't exist"
        );
        _;
    }

    /**
   * @dev Sets or removes a role for a wallet. (internal)
   * @param _address The wallet whose role needs to be set or removed.
   * @param _role The role to be set. NONE (0) indicates role removal.
   */
    function setRoleImpl(address _address, uint8 _role) internal {
        uint8 old_role = roles[_address];

        require(old_role == NONE || _role == NONE, "No direct role-to-role change");

        roles[_address] = _role;

        if (old_role == NONE) {
            emit DSTrustServiceRoleAdded(_address, _role, msg.sender);
        } else {
            emit DSTrustServiceRoleRemoved(_address, old_role, msg.sender);
        }
    }

    /**
   * @dev Transfers the ownership (MASTER role) of the contract.
   * @param _address The address which the ownership needs to be transferred to.
   * @return A boolean that indicates if the operation was successful.
   */
    function setServiceOwner(address _address) public override onlyMaster returns (bool) {
        setRoleImpl(owner, NONE);
        owner = _address;
        setRoleImpl(_address, MASTER);

        return true;
    }

    /**
   * @dev Sets roles to an array of wallets
   * @dev Should not be used for setting MASTER (use setServiceOwner) or role removal (use removeRole).
   * @param _addresses The array of wallet whose role needs to be set.
   * @param _roles The array of role to be set. Length and order must match wit _addresss
   * @return A boolean that indicates if the operation was successful.
   */
    function setRoles(address[] memory _addresses, uint8[] memory _roles) public override onlyMasterOrIssuer returns (bool) {
        require(_addresses.length < 50, "Exceeded the maximum number of addresses");
        require(_addresses.length == _roles.length, "Wrong length of parameters");
        for (uint i = 0; i < _addresses.length; i++) {
            setRole(_addresses[i], _roles[i]);
        }
        return true;
    }

    /**
   * @dev Sets a role for a wallet.
   * @dev Should not be used for setting MASTER (use setServiceOwner) or role removal (use removeRole).
   * @param _address The wallet whose role needs to be set.
   * @param _role The role to be set.
   * @return A boolean that indicates if the operation was successful.
   */
    function setRole(address _address, uint8 _role) public override onlyMasterOrIssuer returns (bool) {
        require(_role == ISSUER || _role == EXCHANGE, "Invalid target role");

        setRoleImpl(_address, _role);

        return true;
    }

    /**
   * @dev Removes the role for a wallet.
   * @dev Should not be used to remove MASTER (use setServiceOwner).
   * @param _address The wallet whose role needs to be removed.
   * @return A boolean that indicates if the operation was successful.
   */
    function removeRole(address _address) public override onlyMasterOrIssuer returns (bool) {
        uint8 role = roles[_address];

        require(role != MASTER, "Cannot remove master");

        setRoleImpl(_address, NONE);

        return true;
    }

    /**
   * @dev Gets the role for a wallet.
   * @param _address The wallet whose role needs to be fetched.
   * @return A boolean that indicates if the operation was successful.
   */
    function getRole(address _address) public view override returns (uint8) {
        return roles[_address];
    }

    function addEntity(string memory _name, address _owner) public override onlyMasterOrIssuer onlyNewEntity(_name) onlyNewEntityOwner(_owner) {
        entitiesOwners[_name] = _owner;
        ownersEntities[_owner] = _name;
    }

    function changeEntityOwner(string memory _name, address _oldOwner, address _newOwner) public override onlyMasterOrIssuer onlyExistingEntityOwner(_name, _oldOwner) {
        delete ownersEntities[_oldOwner];
        ownersEntities[_newOwner] = _name;
    }

    function addOperator(string memory _name, address _operator) public override onlyEntityOwnerOrAbove(_name) onlyNewOperator(_operator) {
        operatorsEntities[_operator] = _name;
    }

    function removeOperator(string memory _name, address _operator) public override onlyEntityOwnerOrAbove(_name) onlyExistingOperator(_name, _operator) {
        delete operatorsEntities[_operator];
    }

    function addResource(string memory _name, address _resource) public override onlyMasterOrIssuer onlyExistingEntity(_name) onlyNewResource(_resource) {
        resourcesEntities[_resource] = _name;
    }

    function removeResource(string memory _name, address _resource) public override onlyMasterOrIssuer onlyExistingResource(_name, _resource) {
        delete resourcesEntities[_resource];
    }

    function getEntityByOwner(address _owner) public view override returns (string memory) {
        return ownersEntities[_owner];
    }

    function getEntityByOperator(address _operator) public view override returns (string memory) {
        return operatorsEntities[_operator];
    }

    function getEntityByResource(address _resource) public view override returns (string memory) {
        return resourcesEntities[_resource];
    }

    function isResourceOwner(address _resource, address _owner) public view override returns (bool) {
        return
            !CommonUtils.isEmptyString(resourcesEntities[_resource]) &&
            CommonUtils.isEqualString(resourcesEntities[_resource], ownersEntities[_owner]);
    }

    function isResourceOperator(address _resource, address _operator) public view override returns (bool) {
        return
            !CommonUtils.isEmptyString(resourcesEntities[_resource]) &&
            CommonUtils.isEqualString(resourcesEntities[_resource], operatorsEntities[_operator]);
    }
}
