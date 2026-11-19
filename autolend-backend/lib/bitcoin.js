import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BINARY = path.resolve(
  __dirname, 
  '../../autolend-bitcoin/target/release/autolend-bitcoin'
);

export function callBitcoin(command, params = {}) {
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
