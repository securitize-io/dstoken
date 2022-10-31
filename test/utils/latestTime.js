// Returns the time of the last mined block in seconds
module.exports = async function latestTime () {
  const block = await web3.eth.getBlock('latest');

  return block.timestamp;
};
