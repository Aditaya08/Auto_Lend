import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false // Do not return password by default
  },
  role: {
    type: String,
    enum: ['dealer', 'lender', 'customer'],
    required: true
  },
  btcAddress: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  pubKey: {
    type: String,
    trim: true
  },
  walletNetwork: {
    type: String,
    enum: ['mainnet', 'testnet', 'signet', 'regtest'],
    default: process.env.BITCOIN_NETWORK || 'testnet'
  }
}, { timestamps: true });

UserSchema.pre('validate', function (next) {
  if (!this.btcAddress && this.pubKey) {
    this.btcAddress = this.pubKey;
  }

  if (!this.pubKey && this.btcAddress) {
    this.pubKey = this.btcAddress;
  }

  next();
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', UserSchema);
