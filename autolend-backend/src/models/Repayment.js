import mongoose from 'mongoose';

const RepaymentSchema = new mongoose.Schema({
  loanId: {
    type: String, // Maps to LoanAgreement.loanId
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amountBTC: {
    type: Number,
    required: true
  },
  txId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  onChainTxid: {
    type: String
  },
  recipientAddress: {
    type: String,
    required: true,
    trim: true
  },
  confirmations: {
    type: Number,
    default: 0
  },
  verifiedOnChain: {
    type: Boolean,
    default: false
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
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
    default: 'PENDING'
  }
}, { timestamps: true });

export default mongoose.model('Repayment', RepaymentSchema);
