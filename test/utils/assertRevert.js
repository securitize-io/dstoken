module.exports = async function assertRevert(promise) {
  let shouldFailAssert = false;

  try {
    await promise;
    shouldFailAssert = true;
  } catch (error) {
    const revertFound = error.message.search("revert") >= 0;
    assert(revertFound, `Expected "revert", got ${error} instead`);
  }

  if (shouldFailAssert) {
    assert.fail("Expected revert not received");
  }
};
