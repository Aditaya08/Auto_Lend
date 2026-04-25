import AssetRegistry from '../models/AssetRegistry.js';

export const registerVehicle = async (req, res, next) => {
  try {
    const { vin, owner, loanId, txId, blockHeight, network } = req.body;

    const record = await AssetRegistry.create({
      vin,
      owner,
      loanId,
      txId,
      blockHeight,
      network,
      status: 'FREE' // Append-only, initial status
    });

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

export const getCollateralStatus = async (req, res, next) => {
  try {
    const vin = req.params.vin;
    // Get the most recent record for this VIN
    const records = await AssetRegistry.find({ vin }).sort({ createdAt: -1 });

    if (!records || records.length === 0) {
      return res.status(404).json({ success: false, error: 'No registry records found for this VIN', code: 'NOT_FOUND' });
    }

    res.status(200).json({ success: true, data: records[0], history: records });
  } catch (err) {
    next(err);
  }
};
