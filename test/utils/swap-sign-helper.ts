import * as ethUtil from 'ethereumjs-util';

const EIP_712_START_MESSAGE_TO_SIGN_INIT = '0x19';
const EIP_712_START_MESSAGE_TO_SIGN_END = '01';

const TXTYPE_HASH = '0xee963d66f92bd81c2e9b743fdab1cc81cd81a67f7626663992ce230ad0c71b51';
const NAME_HASH = '0x5183e5178b4530d2fd10dfc0fff5d171f113e3becc98b45ca5513d6472888e3c';
const VERSION_HASH = '0xad7c5bef027816a800da1736444fb58a807ef4c9603b7848673f7e3a68eb14a5';
const EIP712DOMAINTYPE_HASH = '0xd87cd6ef79d4e2b95e15ce8abf732db51ec771f1ca2edccf22a46c729ac56472';
const SALT = '0xc7c09cf61ec4558aac49f42b32ffbafd87af4676341e61db3c383153955f6f39';

const domainSeparator = (contractAddress: string, chainId: number) => {
  const domainData = EIP712DOMAINTYPE_HASH +
    NAME_HASH.slice(2) +
    VERSION_HASH.slice(2) +
    chainId.toString(16).padStart(64, '0') +
    contractAddress.slice(2).padStart(64, '0') +
    SALT.slice(2);
  const domainSeparatorHash = ethUtil.keccakFromHexString(domainData);
  return `0x${domainSeparatorHash.toString('hex')}`;
};

const txInputHash = (
  destinationAddress: string,
  investorNonce: number,
  value: number,
  data: string,
  executorAddress: string,
  gasLimit: number,
  investorId: string) => {
  const dataHash = ethUtil.keccakFromHexString(data).toString('hex');
  const txInput = TXTYPE_HASH +
    destinationAddress.slice(2).padStart(64, '0') +
    value.toString(16).padStart(64, '0') +
    dataHash +
    investorNonce.toString(16).padStart(64, '0') +
    executorAddress.slice(2).padStart(64, '0') +
    gasLimit.toString(16).padStart(64, '0') +
    ethUtil.keccakFromString(investorId).toString('hex');

  const finalHash = ethUtil.keccakFromHexString(txInput);
  return `0x${finalHash.toString('hex')}`;
};

const eip712msgHashToSign = function (
  contractAddress: string,
  destinationAddress: string,
  nonce: number,
  investorId: string,
  value: number,
  data: string,
  executorAddress: string,
  gasLimit: number,
  chainId: number) {
  const input = EIP_712_START_MESSAGE_TO_SIGN_INIT +
    EIP_712_START_MESSAGE_TO_SIGN_END +
    domainSeparator(contractAddress, chainId).slice(2) +
    txInputHash(destinationAddress,
      nonce,
      value,
      data,
      executorAddress,
      gasLimit,
      investorId).slice(2);
  const ethHash = ethUtil.keccakFromHexString(input);
  return `0x${ethHash.toString('hex')}`;
};

export const sign = async (
  contractAddress: string,
  nonce: number,
  destinationAddr: string,
  investorId: string,
  data: string,
  executor: string,
  chainId: number,
  privateKey: string,
  gasLimit: number,
  value: number,
) => {
  const msgHashToSign = eip712msgHashToSign(
    contractAddress,
    destinationAddr,
    nonce,
    investorId,
    value,
    data,
    executor,
    gasLimit,
    chainId);
  const messageHashx = Buffer.from(msgHashToSign.replace('0x', ''), 'hex');
  const privateKeyBuffer = Buffer.from(privateKey, 'hex');
  const signature = ethUtil.ecsign(messageHashx, privateKeyBuffer);
  const v = signature.v;
  const r = '0x' + signature.r.toString('hex');
  const s = '0x' + signature.s.toString('hex');

  return { s, r, v };
};
