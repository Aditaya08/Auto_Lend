import express from 'express';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle, acceptApplication } from '../controllers/dealer.js';
import { protect, authorize } from '../middleware/auth.js';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

router.use(protect);
router.use(authorize('dealer'));

router.route('/vehicles')
  .get(getVehicles)
  .post(
    [
      body('make').notEmpty().withMessage('Make is required'),
      body('model').notEmpty().withMessage('Model is required'),
      body('year').isInt({ min: 1886 }).withMessage('Year must be a valid integer'),
      body('vin').notEmpty().withMessage('VIN is required'),
      body('priceBTC').isFloat({ gt: 0 }).withMessage('Price in BTC must be greater than 0'),
      body('priceUSD').optional().isFloat({ gt: 0 }).withMessage('Price in USD must be greater than 0 when provided')
    ],
    validateRequest,
    createVehicle
  );

router.route('/vehicles/:id')
  .put(updateVehicle)
  .delete(deleteVehicle);

router.post('/applications/:id/accept', acceptApplication);

export default router;
