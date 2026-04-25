import express from 'express';
import { fundEscrow, releaseFunds, liquidateCollateral, getEscrowDetails } from '../controllers/escrow.js';
import { protect, authorize } from '../middleware/auth.js';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { isValidBitcoinAddress } from '../services/bitcoinService.js';

const router = express.Router();

router.use(protect);

router.get('/:loanId', getEscrowDetails);
router.post(
	'/:loanId/fund',
	authorize('lender'),
	[
		body('fundingTxId').matches(/^[a-fA-F0-9]{64}$/).withMessage('Valid funding transaction id is required'),
		body('escrowAddress').custom((value) => {
			if (!isValidBitcoinAddress(value, process.env.BITCOIN_NETWORK || 'testnet')) {
				throw new Error('Valid escrow Bitcoin address is required');
			}
			return true;
		})
	],
	validateRequest,
	fundEscrow
);

router.post(
	'/:loanId/release',
	[
		body('releaseTxId').matches(/^[a-fA-F0-9]{64}$/).withMessage('Valid release transaction id is required'),
		body('dealerReceiveAddress')
			.optional()
			.custom((value) => {
				if (!isValidBitcoinAddress(value, process.env.BITCOIN_NETWORK || 'testnet')) {
					throw new Error('dealerReceiveAddress must be a valid Bitcoin address');
				}
				return true;
			})
	],
	validateRequest,
	releaseFunds
);

router.post(
	'/:loanId/liquidate',
	authorize('lender'),
	[
		body('liquidationTxId').matches(/^[a-fA-F0-9]{64}$/).withMessage('Valid liquidation transaction id is required'),
		body('recipientAddress')
			.optional()
			.custom((value) => {
				if (!isValidBitcoinAddress(value, process.env.BITCOIN_NETWORK || 'testnet')) {
					throw new Error('recipientAddress must be a valid Bitcoin address');
				}
				return true;
			}),
		body('liquidationAmountBTC').optional().isFloat({ gt: 0 }).withMessage('liquidationAmountBTC must be greater than 0')
	],
	validateRequest,
	liquidateCollateral
);

export default router;
