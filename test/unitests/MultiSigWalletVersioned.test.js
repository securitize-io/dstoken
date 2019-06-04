const MultiSigWallet = artifacts.require('MultiSigWalletVersioned');
const web3 = MultiSigWallet.web3;
const TestToken = artifacts.require('TestToken');
const TestCalls = artifacts.require('TestCalls');

const transactionId = 'id';
const transactionId2 = 'id2';

const deployMultisig = (owners, confirmations) => {
  return MultiSigWallet.new(owners, confirmations);
};
const deployToken = () => {
  return TestToken.new();
};
const deployCalls = () => {
  return TestCalls.new();
};

const assertRevert = require('../utils/assertRevert');
const utils = require('../utils');

contract('MultiSigWallet', accounts => {
  let multisigInstance;
  let tokenInstance;
  let callsInstance;
  const requiredConfirmations = 2;

  beforeEach(async () => {
    multisigInstance = await deployMultisig(
      [accounts[0], accounts[1], accounts[2]],
      requiredConfirmations
    );
    assert.ok(multisigInstance);
    tokenInstance = await deployToken();
    assert.ok(tokenInstance);
    callsInstance = await deployCalls();
    assert.ok(callsInstance);

    const deposit = 10000000;

    // Send money to wallet contract
    await new Promise((resolve, reject) =>
      web3.eth.sendTransaction(
        {to: multisigInstance.address, value: deposit, from: accounts[0]},
        e => (e ? reject(e) : resolve())
      )
    );
    const balance = await utils.balanceOf(web3, multisigInstance.address);
    assert.equal(balance.valueOf(), deposit);
  });

  it('transferWithPayloadSizeCheck', async () => {
    // Issue tokens to the multisig address
    const issueResult = await tokenInstance.issueTokens(
      multisigInstance.address,
      1000000,
      {from: accounts[0]}
    );
    assert.ok(issueResult);
    // Encode transfer call for the multisig
    const transferEncoded = tokenInstance.contract.transfer.getData(
      accounts[1],
      1000000
    );

    const id = utils.getParamFromTxEvent(
      await multisigInstance.submitTransaction(
        transactionId,
        tokenInstance.address,
        0,
        transferEncoded,
        {from: accounts[0]}
      ),
      'transactionId',
      null,
      'Submission'
    );

    const exist = await multisigInstance.doesTransactionExist(id);

    assert.isTrue(exist);

    const executedTransactionId = utils.getParamFromTxEvent(
      await multisigInstance.confirmTransaction(id, {
        from: accounts[1],
      }),
      'transactionId',
      null,
      'Execution'
    );
    // Check that transaction has been executed
    assert.equal(id, executedTransactionId);
    // Check that the transfer has actually occured
    assert.equal(1000000, await tokenInstance.balanceOf(accounts[1]));
  });

  it('transferFailure', async () => {
    // Encode transfer call for the multisig
    const transferEncoded = tokenInstance.contract.transfer.getData(
      accounts[1],
      1000000
    );
    const id = utils.getParamFromTxEvent(
      await multisigInstance.submitTransaction(
        transactionId,
        tokenInstance.address,
        0,
        transferEncoded,
        {from: accounts[0]}
      ),
      'transactionId',
      null,
      'Submission'
    );
    // Transfer without issuance - expected to fail
    const failedTransactionId = utils.getParamFromTxEvent(
      await multisigInstance.confirmTransaction(id, {
        from: accounts[1],
      }),
      'transactionId',
      null,
      'ExecutionFailure'
    );
    // Check that transaction has been executed
    assert.equal(id, failedTransactionId);
  });

  it('callReceive1uint', async () => {
    // Encode call for the multisig
    const receive1uintEncoded = callsInstance.contract.receive1uint.getData(
      12345
    );
    const id = utils.getParamFromTxEvent(
      await multisigInstance.submitTransaction(
        transactionId,
        callsInstance.address,
        67890,
        receive1uintEncoded,
        {from: accounts[0]}
      ),
      'transactionId',
      null,
      'Submission'
    );

    const executedTransactionId = utils.getParamFromTxEvent(
      await multisigInstance.confirmTransaction(id, {
        from: accounts[1],
      }),
      'transactionId',
      null,
      'Execution'
    );
    // Check that transaction has been executed
    assert.equal(id, executedTransactionId);
    // Check that the expected parameters and values were passed
    assert.equal(12345, await callsInstance.uint1());
    assert.equal(32 + 4, await callsInstance.lastMsgDataLength());
    assert.equal(67890, await callsInstance.lastMsgValue());
  });

  it('callReceive2uint', async () => {
    // Encode call for the multisig
    const receive2uintsEncoded = callsInstance.contract.receive2uints.getData(
      12345,
      67890
    );
    const id = utils.getParamFromTxEvent(
      await multisigInstance.submitTransaction(
        transactionId,
        callsInstance.address,
        4040404,
        receive2uintsEncoded,
        {from: accounts[0]}
      ),
      'transactionId',
      null,
      'Submission'
    );

    const executedTransactionId = utils.getParamFromTxEvent(
      await multisigInstance.confirmTransaction(id, {
        from: accounts[1],
      }),
      'transactionId',
      null,
      'Execution'
    );
    // Check that transaction has been executed
    assert.equal(id, executedTransactionId);
    // Check that the expected parameters and values were passed
    assert.equal(12345, await callsInstance.uint1());
    assert.equal(67890, await callsInstance.uint2());
    assert.equal(32 + 32 + 4, await callsInstance.lastMsgDataLength());
    assert.equal(4040404, await callsInstance.lastMsgValue());
  });

  it('callReceive1bytes', async () => {
    // Encode call for the multisig
    const dataHex = '0x' + '0123456789abcdef'.repeat(100); // 800 bytes long

    const receive1bytesEncoded = callsInstance.contract.receive1bytes.getData(
      dataHex
    );
    const id = utils.getParamFromTxEvent(
      await multisigInstance.submitTransaction(
        transactionId,
        callsInstance.address,
        10,
        receive1bytesEncoded,
        {from: accounts[0]}
      ),
      'transactionId',
      null,
      'Submission'
    );

    const executedTransactionId = utils.getParamFromTxEvent(
      await multisigInstance.confirmTransaction(id, {
        from: accounts[1],
      }),
      'transactionId',
      null,
      'Execution'
    );
    // Check that transaction has been executed
    assert.equal(id, executedTransactionId);
    // Check that the expected parameters and values were passed
    assert.equal(
      868, // 800 bytes data + 32 bytes offset + 32 bytes data length + 4 bytes method signature
      await callsInstance.lastMsgDataLength()
    );
    assert.equal(10, await callsInstance.lastMsgValue());
    assert.equal(dataHex, await callsInstance.byteArray1());
  });

  it('test execution after requirements changed', async () => {
    // Add owner wa_4
    const addOwnerData = multisigInstance.contract.addOwner.getData(
      accounts[3]
    );
    const id = utils.getParamFromTxEvent(
      await multisigInstance.submitTransaction(
        transactionId,
        multisigInstance.address,
        0,
        addOwnerData,
        {from: accounts[0]}
      ),
      'transactionId',
      null,
      'Submission'
    );

    // Update required to 1
    const newRequired = 1;
    const updateRequirementData = multisigInstance.contract.changeRequirement.getData(
      newRequired
    );

    // Submit successfully
    const id2 = utils.getParamFromTxEvent(
      await multisigInstance.submitTransaction(
        transactionId2,
        multisigInstance.address,
        0,
        updateRequirementData,
        {from: accounts[0]}
      ),
      'transactionId',
      null,
      'Submission'
    );

    // Confirm change requirement transaction
    await multisigInstance.confirmTransaction(id2, {
      from: accounts[1],
    });
    assert.equal((await multisigInstance.required()).toNumber(), newRequired);

    // Execution fails, because sender is not wallet owner
    await assertRevert(
      multisigInstance.executeTransaction(id, {from: accounts[9]})
    );

    // Because the # required confirmations changed to 1, the addOwner transaction can be executed now
    await multisigInstance.executeTransaction(id, {
      from: accounts[0],
    });
  });
});
