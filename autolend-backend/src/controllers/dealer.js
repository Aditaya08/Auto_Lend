import Vehicle from '../models/Vehicle.js';
import LoanApplication from '../models/LoanApplication.js';
import LoanOffer from '../models/LoanOffer.js';
import { generateLoanAgreement } from '../services/loanAgreementGenerator.js';
import {
  getBitcoinNetworkName,
  isOnChainEnforced,
  verifyBitcoinPayment
} from '../services/bitcoinService.js';

const BTC_USD_REFERENCE_RATE = Number.parseFloat(process.env.BTC_USD_REFERENCE_RATE || '65000');

const toPositiveNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

export const getVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ dealerId: req.user.id });
    res.status(200).json({ success: true, data: vehicles });
  } catch (err) {
    next(err);
  }
};

export const createVehicle = async (req, res, next) => {
  try {
    const { make, model, year, vin, priceBTC, priceUSD } = req.body;

    const parsedPriceBTC = toPositiveNumber(priceBTC);
    if (!parsedPriceBTC) {
      return res.status(400).json({
        success: false,
        error: 'priceBTC must be a positive number',
        code: 'VALIDATION_ERROR'
      });
    }

    const parsedPriceUSD = toPositiveNumber(priceUSD);
    const resolvedPriceUSD = parsedPriceUSD ?? Number((parsedPriceBTC * BTC_USD_REFERENCE_RATE).toFixed(2));

    const vehicle = await Vehicle.create({
      make,
      model,
      year,
      vin,
      priceBTC: parsedPriceBTC,
      priceUSD: resolvedPriceUSD,
      dealerId: req.user.id
    });

    res.status(201).json({ success: true, data: vehicle });
  } catch (err) {
    next(err);
  }
};

export const updateVehicle = async (req, res, next) => {
  try {
    let vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found', code: 'NOT_FOUND' });
    }

    if (vehicle.dealerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this vehicle', code: 'FORBIDDEN' });
    }

    vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: vehicle });
  } catch (err) {
    next(err);
  }
};

export const deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found', code: 'NOT_FOUND' });
    }

    if (vehicle.dealerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this vehicle', code: 'FORBIDDEN' });
    }

    await vehicle.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};

export const acceptApplication = async (req, res, next) => {
  try {
    const application = await LoanApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found', code: 'NOT_FOUND' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Application already processed', code: 'BAD_REQUEST' });
    }

    // Ensure the dealer owns the vehicle associated with this application
    const vehicle = await Vehicle.findById(application.vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found', code: 'NOT_FOUND' });
    }

    if (vehicle.dealerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to accept application for this vehicle', code: 'FORBIDDEN' });
    }

    const dealerAddress = req.user.btcAddress || req.user.pubKey;
    if (!dealerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Dealer Bitcoin address is missing from profile',
        code: 'BITCOIN_ADDRESS_MISSING'
      });
    }

    if (application.downPaymentToAddress !== dealerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Down payment recipient does not match dealer Bitcoin address',
        code: 'DOWN_PAYMENT_ADDRESS_MISMATCH'
      });
    }

    const downPaymentVerification = await verifyBitcoinPayment({
      txId: application.downPaymentTxId,
      recipientAddress: application.downPaymentToAddress,
      minAmountBTC: application.downPaymentBTC,
      networkName: application.bitcoinNetwork || getBitcoinNetworkName(),
      strict: isOnChainEnforced()
    });

    application.downPaymentConfirmations = downPaymentVerification.confirmations;
    application.downPaymentVerified = downPaymentVerification.verified;
    application.bitcoinNetwork = downPaymentVerification.network || application.bitcoinNetwork;
    await application.save();

    if (!application.downPaymentVerified) {
      return res.status(400).json({
        success: false,
        error: 'Down payment transaction is not yet sufficiently confirmed',
        code: 'DOWN_PAYMENT_NOT_VERIFIED'
      });
    }

    application.status = 'accepted';
    await application.save();

    const loanOffer = await LoanOffer.findById(application.loanOfferId);
    if (!loanOffer) {
      return res.status(404).json({ success: false, error: 'Loan offer not found', code: 'NOT_FOUND' });
    }

    // Generate LoanAgreement
    const agreement = await generateLoanAgreement(application, loanOffer);

    res.status(200).json({ success: true, data: { application, agreement, downPaymentVerification } });
  } catch (err) {
    next(err);
  }
};
