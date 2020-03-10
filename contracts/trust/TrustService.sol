pragma solidity ^0.5.0;

import "../utils/ProxyTarget.sol";
import "./IDSTrustService.sol";
import "../data-stores/TrustServiceDataStore.sol";

/**
 * @title TrustService
 * @dev A trust service which allows role-based access control for other contracts.
 * @dev Implements IDSTrustService.
 */
contract TrustService is ProxyTarget, Initializable, IDSTrustService, TrustServiceDataStore {
    function initialize() public initializer onlyFromProxy {
        IDSTrustService.initialize();
        VERSIONS.push(2);
        owner = msg.sender;
        roles[msg.sender] = MASTER;
    }

    /**
   * @dev Allow invoking of functions only by the user who has the MASTER role.
   */
    modifier onlyMaster() {
        require(roles[msg.sender] == MASTER);
        _;
    }

    /**
   * @dev Allow invoking of functions only by the users who have the MASTER role or the ISSUER role.
   */
    modifier onlyMasterOrIssuer() {
        require(roles[msg.sender] == MASTER || roles[msg.sender] == ISSUER);
        _;
    }

    modifier onlyEntityOwnerOrAbove(string memory _name) {
        require(
            roles[msg.sender] == MASTER ||
                roles[msg.sender] == ISSUER ||
                (keccak256(abi.encodePacked(ownersEntities[msg.sender])) != keccak256(abi.encodePacked("")) &&
                    keccak256(abi.encodePacked(ownersEntities[msg.sender])) == keccak256(abi.encodePacked(_name)))
        );
        _;
    }

    modifier onlyNewEntity(string memory _name) {
        require(entitiesOwners[_name] != address(0), "Entity already exists");
        _;
    }

    modifier onlyExistingEntity(string memory _name) {
        require(entitiesOwners[_name] != address(0), "Entity doesn't exist");
        _;
    }

    modifier onlyNewEntityOwner(address _owner) {
        require(keccak256(abi.encodePacked(ownersEntities[_owner])) == keccak256(abi.encodePacked("")), "Entity owner already exists");
        _;
    }

    modifier onlyExistingEntityOwner(string memory _name, address _owner) {
        require(
            keccak256(abi.encodePacked(ownersEntities[_owner])) != keccak256(abi.encodePacked("")) &&
                keccak256(abi.encodePacked(ownersEntities[_owner])) == keccak256(abi.encodePacked(_name)),
            "Entity owner doesn't exist"
        );
        _;
    }

    modifier onlyNewOperator(address _operator) {
        require(keccak256(abi.encodePacked(operatorsEntities[_operator])) == keccak256(abi.encodePacked("")), "Entity operator already exists");
        _;
    }

    modifier onlyExistingOperator(string memory _name, address _operator) {
        require(
            keccak256(abi.encodePacked(operatorsEntities[_operator])) != keccak256(abi.encodePacked("")) &&
                keccak256(abi.encodePacked(operatorsEntities[_operator])) == keccak256(abi.encodePacked(_name)),
            "Entity operator doesn't exist"
        );
        _;
    }

    modifier onlyNewResource(address _resource) {
        require(keccak256(abi.encodePacked(resourcesEntities[_resource])) == keccak256(abi.encodePacked("")), "Entity resource already exists");
        _;
    }

    modifier onlyExistingResource(string memory _name, address _resource) {
        require(
            keccak256(abi.encodePacked(resourcesEntities[_resource])) != keccak256(abi.encodePacked("")) &&
                keccak256(abi.encodePacked(resourcesEntities[_resource])) == keccak256(abi.encodePacked(_name)),
            "Entity resource doesn't exist"
        );
        _;
    }

    /**
   * @dev Sets or removes a role for a wallet. (internal)
   * @param _address The wallet whose role needs to be set or removed.
   * @param _role The role to be set. NONE (0) indicates role removal.
   * @return A boolean that indicates if the operation was successful.
   */
    function setRoleImpl(address _address, uint8 _role) internal returns (bool) {
        uint8 old_role = roles[_address];

        require(old_role == NONE || _role == NONE, "No direct role-to-role change");

        roles[_address] = _role;

        if (old_role == NONE) {
            emit DSTrustServiceRoleAdded(_address, _role, msg.sender);
        } else {
            emit DSTrustServiceRoleRemoved(_address, old_role, msg.sender);
        }

        return true;
    }

    /**
   * @dev Transfers the ownership (MASTER role) of the contract.
   * @param _address The address which the ownership needs to be transferred to.
   * @return A boolean that indicates if the operation was successful.
   */
    function setServiceOwner(address _address) public onlyMaster returns (bool) {
        require(setRoleImpl(owner, NONE));
        owner = _address;
        require(setRoleImpl(_address, MASTER));
        return true;
    }

    /**
   * @dev Sets a role for a wallet.
   * @dev Should not be used for setting MASTER (use setServiceOwner) or role removal (use removeRole).
   * @param _address The wallet whose role needs to be set.
   * @param _role The role to be set.
   * @return A boolean that indicates if the operation was successful.
   */
    function setRole(address _address, uint8 _role) public onlyMasterOrIssuer returns (bool) {
        require(_role == ISSUER || _role == EXCHANGE);

        return setRoleImpl(_address, _role);
    }

    /**
   * @dev Removes the role for a wallet.
   * @dev Should not be used to remove MASTER (use setServiceOwner).
   * @param _address The wallet whose role needs to be removed.
   * @return A boolean that indicates if the operation was successful.
   */
    function removeRole(address _address) public onlyMasterOrIssuer returns (bool) {
        uint8 role = roles[_address];

        require(role == ISSUER || role == EXCHANGE);

        return setRoleImpl(_address, NONE);
    }

    /**
   * @dev Gets the role for a wallet.
   * @param _address The wallet whose role needs to be fetched.
   * @return A boolean that indicates if the operation was successful.
   */
    function getRole(address _address) public view returns (uint8) {
        return roles[_address];
    }

    function addEntity(string memory _name, address _owner) public onlyMasterOrIssuer onlyNewEntity(_name) onlyNewEntityOwner(_owner) {
        entitiesOwners[_name] = _owner;
        ownersEntities[_owner] = _name;
    }

    function changeEntityOwner(string memory _name, address _oldOwner, address _newOwner) public onlyMasterOrIssuer onlyExistingEntityOwner(_name, _oldOwner) {
        delete ownersEntities[_oldOwner];
        ownersEntities[_newOwner] = _name;
    }

    function addOperator(string memory _name, address _operator) public onlyEntityOwnerOrAbove(_name) onlyNewOperator(_operator) {
        operatorsEntities[_operator] = _name;
    }

    function removeOperator(string memory _name, address _operator) public onlyEntityOwnerOrAbove(_name) onlyExistingOperator(_name, _operator) {
        delete operatorsEntities[_operator];
    }

    function addResource(string memory _name, address _resource) public onlyMasterOrIssuer onlyExistingEntity(_name) onlyNewResource(_resource) {
        resourcesEntities[_resource] = _name;
    }

    function removeResource(string memory _name, address _resource) public onlyMasterOrIssuer onlyExistingResource(_name, _resource) {
        delete resourcesEntities[_resource];
    }

    function isEntityOwner(address _resource, address _owner) public view returns (bool) {
        return
            keccak256(abi.encodePacked(resourcesEntities[_resource])) != keccak256(abi.encodePacked("")) &&
            keccak256(abi.encodePacked(resourcesEntities[_resource])) == keccak256(abi.encodePacked(ownersEntities[_owner]));
    }

    function isResourceOperator(address _resource, address _operator) public view returns (bool) {
        return
            keccak256(abi.encodePacked(resourcesEntities[_resource])) != keccak256(abi.encodePacked("")) &&
            keccak256(abi.encodePacked(resourcesEntities[_resource])) == keccak256(abi.encodePacked(operatorsEntities[_operator]));
    }
}
