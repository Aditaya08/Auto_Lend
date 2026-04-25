import express from 'express';
import { register, login } from '../controllers/auth.js';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { isValidBitcoinAddress } from '../services/bitcoinService.js';

const router = express.Router();

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['dealer', 'lender', 'customer']).withMessage('Invalid role'),
    body('walletNetwork')
      .optional()
      .isIn(['mainnet', 'testnet', 'signet', 'regtest'])
      .withMessage('Invalid Bitcoin network'),
    body().custom((_, { req }) => {
      const network = req.body.walletNetwork || process.env.BITCOIN_NETWORK || 'testnet';
      const address = req.body.btcAddress || req.body.pubKey;

      if (!address) {
        throw new Error('Bitcoin address is required');
      }

      if (!isValidBitcoinAddress(address, network)) {
        throw new Error(`Invalid Bitcoin address for network ${network}`);
      }

      return true;
    })
  ],
  validateRequest,
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validateRequest,
  login
);

export default router;
