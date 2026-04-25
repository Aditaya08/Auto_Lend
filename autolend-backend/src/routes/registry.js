import express from 'express';
import { registerVehicle, getCollateralStatus } from '../controllers/registry.js';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { isValidBitcoinAddress } from '../services/bitcoinService.js';

const router = express.Router();

router.post(
  '/vehicles',
  [
    body('vin').notEmpty().withMessage('VIN is required'),
    body('network')
      .optional()
      .isIn(['mainnet', 'testnet', 'signet', 'regtest'])
      .withMessage('Invalid Bitcoin network'),
    body('owner')
      .notEmpty()
      .withMessage('Owner is required')
      .custom((value, { req }) => {
        const network = req.body.network || process.env.BITCOIN_NETWORK || 'testnet';
        if (!isValidBitcoinAddress(value, network)) {
          throw new Error(`Owner must be a valid Bitcoin address for network ${network}`);
        }
        return true;
      }),
    body('txId').optional().matches(/^[a-fA-F0-9]{64}$/).withMessage('txId must be a valid transaction id')
  ],
  validateRequest,
  registerVehicle
);

router.get('/vehicles/:vin', getCollateralStatus);

export default router;
