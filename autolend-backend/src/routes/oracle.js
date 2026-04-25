import express from 'express';
import { getValuation, getScore, getRate } from '../controllers/oracle.js';

const router = express.Router();

router.get('/valuation/:vin', getValuation);
router.get('/creditScore/:customerId', getScore);
router.get('/interestRate', getRate);

export default router;
