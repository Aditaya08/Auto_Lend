import mongoose from 'mongoose';

const LoanApplicationSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  loanOfferId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LoanOffer',
    required: true
  },
  downPaymentBTC: {
    type: Number,
    required: true
  },
  downPaymentTxId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  downPaymentToAddress: {
    type: String,
    required: true,
    trim: true
  },
  downPaymentConfirmations: {
    type: Number,
    default: 0
  },
  downPaymentVerified: {
    type: Boolean,
    default: false
  },
  bitcoinNetwork: {
    type: String,
    enum: ['mainnet', 'testnet', 'signet', 'regtest'],
    default: process.env.BITCOIN_NETWORK || 'testnet'
  },
  kycHash: {
    type: String, // Store KYC reference hash only
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, { timestamps: true });

export default mongoose.model('LoanApplication', LoanApplicationSchema);
