pragma solidity ^0.5.0;

import "./IDSComplianceService.sol";

contract IDSComplianceServicePartitioned is IDSComplianceService {
  constructor() internal {}

  function initialize() public isNotInitialized {
    VERSIONS.push(1);
  }

  function getPartitionsForTransfer(address _from, address _to, uint256 value) public returns (bytes32[] memory partitions, uint256[] memory values);

  function validateBurn(address _who, uint _value, bytes32 _partition) /*onlyToken*/ public returns (bool);

  function validateSeize(address _from, address _to, uint _value, bytes32 _partition) /*onlyToken*/ public returns (bool);

  function validate(address _from, address _to, uint _value, bytes32[] memory _partitions, uint256 _values) /*onlyToken*/ public returns (bool);

  function getComplianceTransferableTokens(address _who, uint256 _time, bool _checkFlowback) public view returns (uint transferable);

  function getComplianceTransferableTokens(address _who, uint256 _time, bool _checkFlowback, bytes32 _partition) public view returns (uint);

  function getComplianceTransferableTokens(address _who, uint256 _time, address _to) public view returns (uint transferable);

  function getComplianceTransferableTokens(address _who, uint256 _time, address _to, bytes32 _partition) public view returns (uint);
}