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

/// @title Contract for testing low-level calls issued from the multisig wallet
contract TestCalls {
    // msg.data.length of the latest call to "receive" methods
    uint256 public lastMsgDataLength;

    // msg.value of the latest call to "receive" methods
    uint256 public lastMsgValue;

    uint256 public uint1;
    uint256 public uint2;
    bytes public byteArray1;

    modifier setMsgFields {
        lastMsgDataLength = msg.data.length;
        lastMsgValue = msg.value;
        _;
    }

    constructor() payable setMsgFields() {
        // This constructor will be used to test the creation via multisig wallet
    }

    function receive1uint(uint256 a) public payable setMsgFields {
        uint1 = a;
    }

    function receive2uints(uint256 a, uint256 b) public payable setMsgFields {
        uint1 = a;
        uint2 = b;
    }

    function receive1bytes(bytes memory c) public payable setMsgFields {
        byteArray1 = c;
    }

    function nonPayable() public payable setMsgFields {}

}
