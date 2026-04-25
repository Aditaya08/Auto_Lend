import mongoose from 'mongoose';

const LoanAgreementSchema = new mongoose.Schema({
  loanId: {
    type: String, // UUID or custom generated ID for smart contract sim
    required: true,
    unique: true
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LoanApplication',
    required: true
  },
  dealerPubKey: {
    type: String,
    required: true
  },
  lenderPubKey: {
    type: String,
    required: true
  },
  customerPubKey: {
    type: String,
    required: true
  },
  dealerAddress: {
    type: String,
    required: true
  },
  lenderAddress: {
    type: String,
    required: true
  },
  customerAddress: {
    type: String,
    required: true
  },
  amount: {
    type: Number, // Amount in BTC
    required: true
  },
  rate: {
    type: Number, // Interest rate
    required: true
  },
  schedule: {
    type: Number, // Months
    required: true
  },
  collateralVIN: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'FUNDED', 'ACTIVE', 'COMPLETED', 'DEFAULTED'],
    default: 'PENDING'
  },
  escrowAddress: {
    type: String
  },
  escrowTxid: {
    type: String
  },
  redeemScript: {
    type: String
  },
  partialPsbt: {
    type: String
  },
  signatures: {
    type: [String]
  },
  fundedAtBlock: {
    type: Number
  },
  timelockBlocks: {
    type: Number
  },
  releaseTxid: {
    type: String
  },
  bitcoinNetwork: {
    type: String,
    enum: ['mainnet', 'testnet', 'signet', 'regtest'],
    default: process.env.BITCOIN_NETWORK || 'testnet'
  },
  requiredConfirmations: {
    type: Number,
    default: 1
  },
  lastPaymentDate: {
    type: Date
  }
}, { timestamps: true });

export default mongoose.model('LoanAgreement', LoanAgreementSchema);
