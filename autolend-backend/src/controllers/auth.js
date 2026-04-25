import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import {
  getBitcoinNetworkName,
  isValidBitcoinAddress
} from '../services/bitcoinService.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

export const register = async (req, res, next) => {
  try {
    const {
      email,
      password,
      role,
      pubKey,
      btcAddress,
      walletNetwork
    } = req.body;

    const normalizedNetwork = walletNetwork || getBitcoinNetworkName();
    const normalizedAddress = btcAddress || pubKey;

    if (!normalizedAddress || !isValidBitcoinAddress(normalizedAddress, normalizedNetwork)) {
      return res.status(400).json({
        success: false,
        error: `A valid Bitcoin address is required for network ${normalizedNetwork}`,
        code: 'INVALID_BITCOIN_ADDRESS'
      });
    }

    const user = await User.create({
      email,
      password,
      role,
      btcAddress: normalizedAddress,
      pubKey: normalizedAddress,
      walletNetwork: normalizedNetwork
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          btcAddress: user.btcAddress,
          pubKey: user.pubKey,
          walletNetwork: user.walletNetwork
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide an email and password', code: 'VALIDATION_ERROR' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          btcAddress: user.btcAddress,
          pubKey: user.pubKey,
          walletNetwork: user.walletNetwork
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
