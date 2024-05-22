module.exports = function ether (n) {
  return new web3.utils.BN(web3.utils.toWei(n, 'ether'));
};
