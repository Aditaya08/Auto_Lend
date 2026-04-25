import mongoose from 'mongoose';

const LoanOfferSchema = new mongoose.Schema({
  lenderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number, // Amount in BTC
    required: true
  },
  interestRate: {
    type: Number, // Annual interest rate in percentage
    required: true
  },
  repaymentScheduleMonths: {
    type: Number,
    required: true
  },
  collateralRequirement: {
    type: String, // E.g., 'Vehicle Title'
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default mongoose.model('LoanOffer', LoanOfferSchema);
