import Vehicle from '../models/Vehicle.js';
import LoanOffer from '../models/LoanOffer.js';
import LoanApplication from '../models/LoanApplication.js';
import LoanAgreement from '../models/LoanAgreement.js';
import Repayment from '../models/Repayment.js';
import User from '../models/User.js';
import {
  getBitcoinNetworkName,
  isOnChainEnforced,
  requireUserBitcoinAddress,
  verifyBitcoinPayment
} from '../services/bitcoinService.js';
import { callBitcoin } from '../../lib/bitcoin.js';

const isObjectId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || ''));

const findLoanAgreementByIdentifier = async (identifier) => {
  let agreement = await LoanAgreement.findOne({ loanId: identifier });

  if (!agreement && isObjectId(identifier)) {
    agreement = await LoanAgreement.findById(identifier);
  }

  return agreement;
};

export const getMarketplaceVehicles = async (req, res, next) => {
  try {
    // Return all vehicles, possibly attaching available loan offers to them.
    // In a real app this might be a complex aggregation.
    const vehicles = await Vehicle.find().lean();
    const offers = await LoanOffer.find({ isActive: true }).lean();

    const marketplace = vehicles.map(v => ({
      ...v,
      availableOffers: offers // For simplicity, all active offers are available
    }));

    res.status(200).json({ success: true, data: marketplace });
  } catch (err) {
    next(err);
  }
};

export const submitApplication = async (req, res, next) => {
  try {
    const {
      vehicleId,
      loanOfferId,
      downPaymentBTC,
      downPaymentTxId,
      kycHash
    } = req.body;

    const parsedDownPaymentBTC = Number(downPaymentBTC);
    if (!Number.isFinite(parsedDownPaymentBTC) || parsedDownPaymentBTC <= 0) {
      return res.status(400).json({
        success: false,
        error: 'downPaymentBTC must be a positive number',
        code: 'VALIDATION_ERROR'
      });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found', code: 'NOT_FOUND' });
    }

    const offer = await LoanOffer.findById(loanOfferId);
    if (!offer) {
      return res.status(404).json({ success: false, error: 'Loan offer not found', code: 'NOT_FOUND' });
    }

    if (!offer.isActive) {
      return res.status(400).json({ success: false, error: 'Loan offer is no longer active', code: 'OFFER_INACTIVE' });
    }

    const minimumDownPayment = Math.max(Number(vehicle.priceBTC) - Number(offer.amount), 0);
    if (parsedDownPaymentBTC + 1e-8 < minimumDownPayment) {
      return res.status(400).json({
        success: false,
        error: `Down payment is below minimum required (${minimumDownPayment.toFixed(8)} BTC)`,
        code: 'DOWN_PAYMENT_TOO_LOW'
      });
    }

    const existingTxUsage = await LoanApplication.findOne({ downPaymentTxId });
    if (existingTxUsage) {
      return res.status(409).json({
        success: false,
        error: 'This down payment transaction has already been used',
        code: 'TX_ALREADY_USED'
      });
    }

    const dealer = await User.findById(vehicle.dealerId);
    if (!dealer) {
      return res.status(404).json({ success: false, error: 'Dealer not found for this vehicle', code: 'NOT_FOUND' });
    }

    const dealerAddress = requireUserBitcoinAddress(dealer, 'Dealer');
    const networkName = dealer.walletNetwork || getBitcoinNetworkName();

    const downPaymentVerification = await verifyBitcoinPayment({
      txId: downPaymentTxId,
      recipientAddress: dealerAddress,
      minAmountBTC: parsedDownPaymentBTC,
      networkName,
      strict: isOnChainEnforced()
    });

    const application = await LoanApplication.create({
      customerId: req.user.id,
      vehicleId,
      loanOfferId,
      downPaymentBTC: parsedDownPaymentBTC,
      downPaymentTxId,
      downPaymentToAddress: dealerAddress,
      downPaymentConfirmations: downPaymentVerification.confirmations,
      downPaymentVerified: downPaymentVerification.verified,
      bitcoinNetwork: downPaymentVerification.network,
      kycHash,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      data: {
        application,
        downPaymentVerification
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getApplicationStatus = async (req, res, next) => {
  try {
    const application = await LoanApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found', code: 'NOT_FOUND' });
    }

    if (application.customerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized', code: 'FORBIDDEN' });
    }

    res.status(200).json({ success: true, data: application });
  } catch (err) {
    next(err);
  }
};

export const getCustomerApplicationsList = async (req, res, next) => {
  try {
    const applications = await LoanApplication.find({ customerId: req.user.id });
    res.status(200).json({ success: true, data: applications });
  } catch (err) {
    next(err);
  }
};

export const getRepayments = async (req, res, next) => {
  try {
    const customerAddress = req.user.btcAddress || req.user.pubKey;
    if (!customerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Customer Bitcoin address is missing from profile',
        code: 'BITCOIN_ADDRESS_MISSING'
      });
    }

    const loans = await LoanAgreement.find({
      $or: [
        { customerAddress },
        { customerPubKey: customerAddress }
      ]
    });

    const loanIds = loans.map(l => l.loanId);

    const history = await Repayment.find({ loanId: { $in: loanIds } });

    res.status(200).json({ success: true, data: { loans, history } });
  } catch (err) {
    next(err);
  }
};

export const submitRepayment = async (req, res, next) => {
  try {
    const loan = await findLoanAgreementByIdentifier(req.params.loanId);

    if (!loan) {
      return res.status(404).json({ success: false, error: 'Loan not found', code: 'NOT_FOUND' });
    }

    const userAddress = req.user.btcAddress || req.user.pubKey;
    if (loan.customerAddress !== userAddress && loan.customerPubKey !== userAddress) {
      return res.status(403).json({ success: false, error: 'Not authorized for this loan', code: 'FORBIDDEN' });
    }

    if (loan.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: `Cannot make repayment on loan with status ${loan.status}`, code: 'BAD_REQUEST' });
    }

    const { amountBTC, customerDescriptor } = req.body;
    const parsedAmountBTC = Number(amountBTC);
    if (!Number.isFinite(parsedAmountBTC) || parsedAmountBTC <= 0) {
      return res.status(400).json({
        success: false,
        error: 'amountBTC must be a positive number',
        code: 'VALIDATION_ERROR'
      });
    }

    if (!customerDescriptor) {
      return res.status(400).json({ success: false, error: 'customerDescriptor is required', code: 'MISSING_DESCRIPTOR' });
    }

    const lenderAddress = loan.lenderAddress || loan.lenderPubKey;

    const repayRes = await callBitcoin('send_repayment', {
        customer_descriptor: customerDescriptor,
        lender_address: lenderAddress,
        amount_btc: parsedAmountBTC
    });
    
    const onChainTxid = repayRes.txid;

    // get_tx_status may fail if it's not in mempool immediately or if rpc is too fast. 
    // We'll wrap in try/catch or just assume 0 confirmations.
    let statusRes = { confirmed: false, confirmations: 0 };
    try {
        statusRes = await callBitcoin('get_tx_status', { txid: onChainTxid });
    } catch(e) {
        // Ignore, assume 0 conf
    }

    const txId = onChainTxid + '-' + Date.now();

    const repayment = await Repayment.create({
      loanId: loan.loanId,
      customerId: req.user.id,
      amountBTC: parsedAmountBTC,
      txId: txId, 
      onChainTxid: onChainTxid,
      recipientAddress: lenderAddress,
      confirmations: statusRes.confirmations,
      verifiedOnChain: statusRes.confirmed,
      blockHeight: statusRes.confirmed ? 101 : 0,
      network: loan.bitcoinNetwork || getBitcoinNetworkName(),
      status: statusRes.confirmed ? 'COMPLETED' : 'PENDING'
    });

    if (statusRes.confirmed) {
      loan.lastPaymentDate = new Date();
      await loan.save();
    }

    res.status(201).json({
      success: true,
      data: {
        repayment
      }
    });
  } catch (err) {
    next(err);
  }
};
