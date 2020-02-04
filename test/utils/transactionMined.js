// from https://gist.github.com/xavierlepretre/88682e871f4ad07be4534ae560692ee6
module.exports = web3.eth.transactionMined = async function(txnHash, interval) {
  var transactionReceiptAsync;
  interval = interval || 500;
  transactionReceiptAsync = async function(txnHash, resolve, reject) {
    try {
      var receipt = await web3.eth.getTransactionReceipt(txnHash);
      if (receipt === null) {
        setTimeout(function() {
          transactionReceiptAsync(txnHash, resolve, reject);
        }, interval);
      } else {
        resolve(receipt);
      }
    } catch (e) {
      reject(e);
    }
  };

  if (Array.isArray(txnHash)) {
    var promises = [];
    txnHash.forEach(function(oneTxHash) {
      promises.push(web3.eth.getTransactionReceiptMined(oneTxHash, interval));
    });
    return Promise.all(promises);
  } else {
    return new Promise(function(resolve, reject) {
      transactionReceiptAsync(txnHash, resolve, reject);
    });
  }
};
