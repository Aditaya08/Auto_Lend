#!/usr/bin/env node
// Minimal read-only Esplora API over Bitcoin Core RPC, so the backend's
// on-chain verification works against RegTest. Requires bitcoind -txindex.
import http from 'node:http';

const RPC_URL = process.env.BITCOIN_RPC_URL || 'http://127.0.0.1:18443';
const RPC_USER = process.env.BITCOIN_RPC_USER || 'admin';
const RPC_PASS = process.env.BITCOIN_RPC_PASS || 'adminpass';
const PORT = Number(process.env.ESPLORA_PORT || 3006);
const AUTH = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');

const rpc = async (method, params = []) => {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Basic ${AUTH}` },
    body: JSON.stringify({ jsonrpc: '1.0', id: 'esplora-shim', method, params })
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error.message);
  return body.result;
};

const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { 'content-type': type });
  res.end(type === 'application/json' ? JSON.stringify(body) : String(body));
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname.replace(/^\/api/, '');

    if (path === '/blocks/tip/height') {
      return send(res, 200, await rpc('getblockcount'), 'text/plain');
    }

    const txMatch = path.match(/^\/tx\/([a-fA-F0-9]{64})(\/status)?$/);
    if (!txMatch) return send(res, 404, { error: 'not found' });

    const [, txid, isStatus] = txMatch;
    const tx = await rpc('getrawtransaction', [txid, true]);

    if (isStatus) {
      if (!tx.blockhash) return send(res, 200, { confirmed: false });
      const header = await rpc('getblockheader', [tx.blockhash]);
      return send(res, 200, {
        confirmed: true,
        block_height: header.height,
        block_hash: tx.blockhash,
        block_time: header.time
      });
    }

    return send(res, 200, {
      txid: tx.txid,
      vout: tx.vout.map((out) => ({
        scriptpubkey_address: out.scriptPubKey?.address,
        value: Math.round(out.value * 1e8)
      }))
    });
  } catch (err) {
    send(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => console.log(`Esplora shim listening on http://127.0.0.1:${PORT}/api`));
