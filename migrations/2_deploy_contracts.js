var EternalStorage = artifacts.require('./EternalStorage');
// var DSTokenMock = artifacts.require("./DSTokenMock.sol");

module.exports = function (deployer) {
  deployer.deploy(EternalStorage);
  // deployer.deploy(DSTokenMock);
};
