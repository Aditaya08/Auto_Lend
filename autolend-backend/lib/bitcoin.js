const { execFile } = require('child_process');
const path = require('path');

const BINARY = path.resolve(
  __dirname, 
  '../../autolend-bitcoin/target/release/autolend-bitcoin'
);

function callBitcoin(command, params = {}) {
  return new Promise((resolve, reject) => {
    const input = JSON.stringify({ command, ...params });
    const child = execFile(BINARY, [], (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr || error.message));
      try {
        const result = JSON.parse(stdout);
        if (!result.success) {
          const err = new Error(result.error);
          err.code = "BITCOIN_ERROR";
          return reject(err);
        }
        resolve(result.data);
      } catch (e) {
        reject(new Error('Invalid JSON from Bitcoin binary'));
      }
    });
    child.stdin.write(input);
    child.stdin.end();
  });
}

module.exports = { callBitcoin };
