import LoanOffer from '../models/LoanOffer.js';
import LoanAgreement from '../models/LoanAgreement.js';

export const createOffer = async (req, res, next) => {
  try {
    const { amount, interestRate, repaymentScheduleMonths, collateralRequirement } = req.body;

    const offer = await LoanOffer.create({
      amount,
      interestRate,
      repaymentScheduleMonths,
      collateralRequirement,
      lenderId: req.user.id
    });

    res.status(201).json({ success: true, data: offer });
  } catch (err) {
    next(err);
  }
};

export const getOffers = async (req, res, next) => {
  try {
    const offers = await LoanOffer.find({ lenderId: req.user.id });
    res.status(200).json({ success: true, data: offers });
  } catch (err) {
    next(err);
  }
};

export const updateOffer = async (req, res, next) => {
  try {
    let offer = await LoanOffer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ success: false, error: 'Offer not found', code: 'NOT_FOUND' });
    }

    if (offer.lenderId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this offer', code: 'FORBIDDEN' });
    }

    offer = await LoanOffer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: offer });
  } catch (err) {
    next(err);
  }
};

export const getPortfolio = async (req, res, next) => {
  try {
    // Portfolio is loans that this lender is funding
    const lenderAddress = req.user.btcAddress || req.user.pubKey;
    if (!lenderAddress) {
      return res.status(400).json({
        success: false,
        error: 'Lender Bitcoin address is missing from profile',
        code: 'BITCOIN_ADDRESS_MISSING'
      });
    }

    const loans = await LoanAgreement.find({
      $or: [
        { lenderAddress },
        { lenderPubKey: lenderAddress }
      ]
    });

    res.status(200).json({ success: true, data: loans });
  } catch (err) {
    next(err);
  }
};
