const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const template = fs.readFileSync(path.join(__dirname, './EternalStorageClient.ejs'), 'utf-8');

const names = ['Boolean', 'Uint', 'Int', 'Address', 'String', 'Bytes'];
const types = ['bool', 'uint256', 'int', 'address', 'string', 'bytes'];

const data = ejs.render(template, { names,types });

fs.writeFileSync(path.join(__dirname, '../contracts/util/EternalStorageClient.sol'), data);

console.log('EternalStorageClient contract file generated');
