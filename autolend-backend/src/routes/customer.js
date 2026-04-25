import express from 'express';
import { getMarketplaceVehicles, submitApplication, getApplicationStatus, getCustomerApplicationsList, getRepayments, submitRepayment } from '../controllers/customer.js';
import { protect, authorize } from '../middleware/auth.js';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

// Marketplace is open to all authenticated users (or maybe public? Prompt says Customer Module, so I'll put it here. Let's make it protected just to be safe)
// Actually, let's put marketplace on its own router later if needed, but for now it's exported here.
router.get('/marketplace/vehicles', protect, getMarketplaceVehicles);

// The rest are specific to customer
router.use('/customer', protect);
router.use('/customer', authorize('customer'));

router.post(
  '/customer/applications',
  [
    body('vehicleId').notEmpty().withMessage('Vehicle ID is required'),
    body('loanOfferId').notEmpty().withMessage('Loan Offer ID is required'),
    body('downPaymentBTC').isFloat({ gt: 0 }).withMessage('Down payment must be greater than 0 BTC'),
    body('downPaymentTxId').matches(/^[a-fA-F0-9]{64}$/).withMessage('Valid down payment transaction id is required'),
    body('kycHash').notEmpty().withMessage('KYC Hash is required')
  ],
  validateRequest,
  submitApplication
);

router.get('/customer/applications', getCustomerApplicationsList);

router.get('/customer/applications/:id', getApplicationStatus);

router.get('/customer/repayments', getRepayments);

router.post(
  '/customer/repayments/:loanId/pay',
  [
    body('amountBTC').isFloat({ gt: 0 }).withMessage('Repayment amount must be greater than 0 BTC'),
    body('txId').matches(/^[a-fA-F0-9]{64}$/).withMessage('Valid repayment transaction id is required')
  ],
  validateRequest,
  submitRepayment
);

export default router;
