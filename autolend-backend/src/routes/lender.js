import express from 'express';
import { createOffer, getOffers, updateOffer, getPortfolio } from '../controllers/lender.js';
import { protect, authorize } from '../middleware/auth.js';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

router.use(protect);
router.use(authorize('lender'));

router.route('/offers')
  .get(getOffers)
  .post(
    [
      body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
      body('interestRate').isFloat({ gt: 0 }).withMessage('Interest Rate must be greater than 0'),
      body('repaymentScheduleMonths').isInt({ gt: 0 }).withMessage('Schedule must be a positive integer'),
      body('collateralRequirement').notEmpty().withMessage('Collateral Requirement is required')
    ],
    validateRequest,
    createOffer
  );

router.put('/offers/:id', updateOffer);
router.get('/portfolio', getPortfolio);

export default router;
