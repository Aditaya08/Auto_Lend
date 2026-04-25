import mongoose from 'mongoose';

const EscrowStateSchema = new mongoose.Schema({
  loanId: {
    type: String, // Matches LoanAgreement loanId
    required: true,
    unique: true
  },
  state: {
    type: String,
    enum: ['PENDING', 'FUNDED', 'ACTIVE', 'COMPLETED', 'DEFAULTED'],
    default: 'PENDING'
  },
  balance: {
    type: Number, // Escrow balance in BTC
    default: 0
  },
  escrowAddress: {
    type: String
  },
  fundingTxId: {
    type: String
  },
  releaseTxId: {
    type: String
  },
  liquidationTxId: {
    type: String
  },
  lastObservedConfirmations: {
    type: Number,
    default: 0
  },
  requiredConfirmations: {
    type: Number,
    default: 1
  },
  network: {
    type: String,
    enum: ['mainnet', 'testnet', 'signet', 'regtest'],
    default: process.env.BITCOIN_NETWORK || 'testnet'
  }
}, { timestamps: true });

export default mongoose.model('EscrowState', EscrowStateSchema);
