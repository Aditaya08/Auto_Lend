import EscrowState from '../models/EscrowState.js';
import LoanAgreement from '../models/LoanAgreement.js';
import AssetRegistry from '../models/AssetRegistry.js';
import {
  getBitcoinNetworkName,
  getRequiredConfirmations,
  isOnChainEnforced
} from './bitcoinService.js';

export const transitionEscrowState = async (loanId, newState, transitionData = {}) => {
  const normalizedTransitionData = typeof transitionData === 'number'
    ? { amountBTC: transitionData }
    : transitionData;

  const {
    amountBTC = 0,
    txId = null,
    escrowAddress = null,
    confirmations = 0,
    blockHeight = null,
    network = getBitcoinNetworkName(),
    requiredConfirmations = getRequiredConfirmations(),
    verified = !isOnChainEnforced()
  } = normalizedTransitionData;

  const escrow = await EscrowState.findOne({ loanId });
  const agreement = await LoanAgreement.findOne({ loanId });

  if (!escrow || !agreement) {
    throw new Error('Escrow or Loan Agreement not found');
  }

  // Validate transitions
  const validTransitions = {
    'PENDING': ['FUNDED'],
    'FUNDED': ['ACTIVE', 'DEFAULTED'],
    'ACTIVE': ['COMPLETED', 'DEFAULTED'],
    'COMPLETED': [],
    'DEFAULTED': []
  };

  if (!validTransitions[escrow.state].includes(newState)) {
    throw new Error(`Invalid state transition from ${escrow.state} to ${newState}`);
  }

  escrow.state = newState;
  agreement.status = newState;
  escrow.network = network;
  agreement.bitcoinNetwork = network;

  if (newState === 'FUNDED') {
    const fundingAmount = Number(amountBTC) || 0;
    const confirmationsCount = Number(confirmations) || 0;
    const shouldActivate = Boolean(verified) || confirmationsCount >= requiredConfirmations;

    escrow.balance += fundingAmount;
    escrow.fundingTxId = txId || escrow.fundingTxId;
    escrow.escrowAddress = escrowAddress || escrow.escrowAddress;
    escrow.lastObservedConfirmations = confirmationsCount;
    escrow.requiredConfirmations = requiredConfirmations;

    agreement.fundingTxId = txId || agreement.fundingTxId;
    agreement.fundingConfirmations = confirmationsCount;
    agreement.escrowAddress = escrowAddress || agreement.escrowAddress;
    agreement.requiredConfirmations = requiredConfirmations;

    if (shouldActivate) {
      escrow.state = 'ACTIVE';
      agreement.status = 'ACTIVE';
    }
    
    // Register asset as collateralized in Asset Registry
    await AssetRegistry.create({
      vin: agreement.collateralVIN,
      owner: agreement.customerPubKey,
      loanId: agreement.loanId,
      status: 'COLLATERALIZED',
      txId,
      blockHeight,
      network
    });
  }

  if (newState === 'ACTIVE') {
    escrow.lastObservedConfirmations = Number(confirmations) || escrow.lastObservedConfirmations;
    agreement.fundingConfirmations = Number(confirmations) || agreement.fundingConfirmations;
  }

  if (newState === 'COMPLETED') {
    escrow.releaseTxId = txId || escrow.releaseTxId;
    agreement.releaseTxId = txId || agreement.releaseTxId;
    escrow.balance = 0; // Funds released

    // Release collateral
    await AssetRegistry.create({
      vin: agreement.collateralVIN,
      owner: agreement.customerPubKey,
      loanId: agreement.loanId,
      status: 'FREE',
      txId,
      blockHeight,
      network
    });
  }

  if (newState === 'DEFAULTED') {
    escrow.liquidationTxId = txId || escrow.liquidationTxId;
    agreement.liquidationTxId = txId || agreement.liquidationTxId;
    escrow.balance = 0; // Liquidated

    // Liquidate collateral (transfer to lender)
    await AssetRegistry.create({
      vin: agreement.collateralVIN,
      owner: agreement.lenderPubKey,
      loanId: agreement.loanId,
      status: 'LIQUIDATED',
      txId,
      blockHeight,
      network
    });
  }

  await escrow.save();
  await agreement.save();

  return { escrow, agreement };
};
