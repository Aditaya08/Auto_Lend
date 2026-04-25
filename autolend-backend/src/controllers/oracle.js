import { getVehicleValuation, getCreditScore, getMarketInterestRate } from '../services/oracleMock.js';

export const getValuation = (req, res, next) => {
  try {
    const valuation = getVehicleValuation(req.params.vin);
    res.status(200).json({ success: true, data: valuation });
  } catch (err) {
    next(err);
  }
};

export const getScore = (req, res, next) => {
  try {
    const score = getCreditScore(req.params.customerId);
    res.status(200).json({ success: true, data: { creditScore: score } });
  } catch (err) {
    next(err);
  }
};

export const getRate = (req, res, next) => {
  try {
    const rate = getMarketInterestRate();
    res.status(200).json({ success: true, data: { interestRate: rate } });
  } catch (err) {
    next(err);
  }
};
