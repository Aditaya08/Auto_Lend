import mongoose from 'mongoose';

const VehicleSchema = new mongoose.Schema({
  make: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  vin: {
    type: String,
    required: true,
    unique: true
  },
  priceBTC: {
    type: Number,
    required: true
  },
  priceUSD: {
    type: Number,
    default: null
  },
  dealerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

export default mongoose.model('Vehicle', VehicleSchema);
