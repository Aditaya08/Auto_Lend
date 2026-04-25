import mongoose from 'mongoose';

// Append-only ledger style
const AssetRegistrySchema = new mongoose.Schema({
  vin: {
    type: String,
    required: true
  },
  owner: {
    type: String, // User pubKey
    required: true
  },
  loanId: {
    type: String // Optional, if collateralized
  },
  txId: {
    type: String
  },
  blockHeight: {
    type: Number
  },
  network: {
    type: String,
    enum: ['mainnet', 'testnet', 'signet', 'regtest'],
    default: process.env.BITCOIN_NETWORK || 'testnet'
  },
  status: {
    type: String,
    enum: ['FREE', 'COLLATERALIZED', 'LIQUIDATED'],
    default: 'FREE'
  }
}, { timestamps: true });

export default mongoose.model('AssetRegistry', AssetRegistrySchema);
