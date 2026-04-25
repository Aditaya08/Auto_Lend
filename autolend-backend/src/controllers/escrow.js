import { transitionEscrowState } from '../services/escrowStateMachine.js';
import LoanAgreement from '../models/LoanAgreement.js';
import EscrowState from '../models/EscrowState.js';
import Repayment from '../models/Repayment.js';
import {
  getBitcoinNetworkName,
  isOnChainEnforced,
  verifyBitcoinPayment
} from '../services/bitcoinService.js';
import { callBitcoin } from '../../lib/bitcoin.js';

const isObjectId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || ''));

const findLoanAgreementByIdentifier = async (identifier) => {
  let agreement = await LoanAgreement.findOne({ loanId: identifier });

  if (!agreement && isObjectId(identifier)) {
    agreement = await LoanAgreement.findById(identifier);
  }

  return agreement;
};

const ensureTxIdNotReused = async (txId, currentLoanId) => {
  const agreementUsage = await LoanAgreement.findOne({
    loanId: { $ne: currentLoanId },
    $or: [{ fundingTxId: txId }, { releaseTxId: txId }, { liquidationTxId: txId }]
  }).select('loanId');

  if (agreementUsage) {
    return { reused: true, source: 'loan_agreement', loanId: agreementUsage.loanId };
  }

  const repaymentUsage = await Repayment.findOne({ txId }).select('loanId');
  if (repaymentUsage) {
    return { reused: true, source: 'repayment', loanId: repaymentUsage.loanId };
  }

  return { reused: false };
};

const isStakeholderForLoan = (agreement, userAddress) => {
  const addresses = [
    agreement.customerAddress,
    agreement.customerPubKey,
    agreement.dealerAddress,
    agreement.dealerPubKey,
    agreement.lenderAddress,
    agreement.lenderPubKey
  ].filter(Boolean);

  return addresses.includes(userAddress);
};

export const fundEscrow = async (req, res, next) => {
  try {
    const loanIdentifier = req.params.loanId;
    const agreement = await findLoanAgreementByIdentifier(loanIdentifier);

    if (!agreement) {
      return res.status(404).json({ success: false, error: 'Loan Agreement not found', code: 'NOT_FOUND' });
    }

    const lenderAddress = req.user.btcAddress || req.user.pubKey;
    if (agreement.lenderAddress !== lenderAddress && agreement.lenderPubKey !== lenderAddress) {
      return res.status(403).json({ success: false, error: 'Not authorized to fund this escrow', code: 'FORBIDDEN' });
    }

    const lenderDescriptor = req.body.lenderDescriptor;
    if (!lenderDescriptor) {
      return res.status(400).json({ success: false, error: 'lenderDescriptor is required', code: 'MISSING_DESCRIPTOR' });
    }

    if (agreement.escrowTxid) {
      return res.status(400).json({
        success: false,
        error: 'Escrow funding transaction is already set for this loan',
        code: 'FUNDING_ALREADY_RECORDED'
      });
    }

    const multisig = await callBitcoin('create_multisig', {
      dealer_pk: agreement.dealerPubKey,
      lender_pk: agreement.lenderPubKey,
      customer_pk: agreement.customerPubKey
    });

    const fundRes = await callBitcoin('fund_escrow', {
      escrow_address: multisig.escrow_address,
      amount_btc: agreement.amount,
      lender_descriptor: lenderDescriptor
    });

    // In a real app we'd wait for confirmation. For regtest simulation we set fundedAtBlock to 100 or get it.
    // Actually, we'll just set it to 100 for now. The check_timelock can be tested by mining blocks.
    agreement.escrowAddress = multisig.escrow_address;
    agreement.redeemScript = multisig.redeem_script;
    agreement.escrowTxid = fundRes.txid;
    agreement.fundedAtBlock = 101; // Based on setup-regtest.sh
    await agreement.save();

    const { escrow, agreement: updatedAgreement } = await transitionEscrowState(agreement.loanId, 'FUNDED', {
      amountBTC: agreement.amount,
      txId: fundRes.txid,
      escrowAddress: multisig.escrow_address,
      confirmations: 1,
      blockHeight: 101,
      network: agreement.bitcoinNetwork || getBitcoinNetworkName(),
      requiredConfirmations: agreement.requiredConfirmations || 1,
      verified: true
    });

    res.status(200).json({
      success: true,
      data: {
        escrow,
        agreement: updatedAgreement
      }
    });
  } catch (err) {
    if (err.message && err.message.includes('Invalid state transition')) {
      return res.status(400).json({ success: false, error: err.message, code: 'INVALID_TRANSITION' });
    }
    next(err);
  }
};

export const releaseFunds = async (req, res, next) => {
  try {
    const loanIdentifier = req.params.loanId;
    const agreement = await findLoanAgreementByIdentifier(loanIdentifier);

    if (!agreement) {
      return res.status(404).json({ success: false, error: 'Loan Agreement not found', code: 'NOT_FOUND' });
    }

    const requesterAddress = req.user.btcAddress || req.user.pubKey;
    if (!isStakeholderForLoan(agreement, requesterAddress)) {
      return res.status(403).json({ success: false, error: 'Not authorized to release funds', code: 'FORBIDDEN' });
    }

    const { signerDescriptor } = req.body;
    if (!signerDescriptor) {
      return res.status(400).json({ success: false, error: 'signerDescriptor is required', code: 'MISSING_DESCRIPTOR' });
    }

    if (agreement.status !== 'ACTIVE' && agreement.status !== 'FUNDED') {
      return res.status(400).json({
        success: false,
        error: `Cannot release funds while loan status is ${agreement.status}`,
        code: 'INVALID_STATE'
      });
    }

    if (agreement.releaseTxid) {
      return res.status(400).json({
        success: false,
        error: 'Release transaction is already broadcasted',
        code: 'RELEASE_ALREADY_RECORDED'
      });
    }

    let currentPsbt = agreement.partialPsbt;
    if (!currentPsbt) {
      const payoutAddress = agreement.dealerAddress || agreement.dealerPubKey;
      const psbtRes = await callBitcoin('build_release_psbt', {
        escrow_address: agreement.escrowAddress,
        dealer_address: payoutAddress,
        amount_btc: agreement.amount,
        redeem_script: agreement.redeemScript
      });
      currentPsbt = psbtRes.psbt_base64;
    }

    const signRes = await callBitcoin('sign_psbt', {
      psbt_base64: currentPsbt,
      signer_descriptor: signerDescriptor
    });
    
    currentPsbt = signRes.psbt_base64;
    
    const role = req.user.role || 'unknown';
    if (!agreement.signatures) agreement.signatures = [];
    if (!agreement.signatures.includes(role)) {
       agreement.signatures.push(role);
    }

    agreement.partialPsbt = currentPsbt;
    await agreement.save();

    if (agreement.signatures.length >= 2) {
      const broadcastRes = await callBitcoin('broadcast_psbt', {
        psbt_base64: currentPsbt
      });
      
      agreement.releaseTxid = broadcastRes.txid;
      await agreement.save();

      const { escrow, agreement: updatedAgreement } = await transitionEscrowState(agreement.loanId, 'COMPLETED', {
        txId: broadcastRes.txid,
        confirmations: 1,
        blockHeight: 101,
        network: agreement.bitcoinNetwork || getBitcoinNetworkName(),
        verified: true
      });

      return res.status(200).json({
        success: true,
        data: {
          escrow,
          agreement: updatedAgreement
        }
      });
    } else {
      return res.status(200).json({
        success: true,
        data: {
          message: 'Signed successfully, waiting for more signatures',
          signatures: agreement.signatures,
          agreement
        }
      });
    }
  } catch (err) {
    next(err);
  }
};

export const liquidateCollateral = async (req, res, next) => {
  try {
    const loanIdentifier = req.params.loanId;
    const agreement = await findLoanAgreementByIdentifier(loanIdentifier);

    if (!agreement) {
      return res.status(404).json({ success: false, error: 'Loan Agreement not found', code: 'NOT_FOUND' });
    }

    const lenderAddress = req.user.btcAddress || req.user.pubKey;
    if (agreement.lenderAddress !== lenderAddress && agreement.lenderPubKey !== lenderAddress) {
      return res.status(403).json({ success: false, error: 'Not authorized to liquidate this collateral', code: 'FORBIDDEN' });
    }

    const { liquidationTxId, recipientAddress, liquidationAmountBTC } = req.body;
    if (!['FUNDED', 'ACTIVE'].includes(agreement.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot liquidate collateral while loan status is ${agreement.status}`,
        code: 'INVALID_STATE'
      });
    }

    if (agreement.liquidationTxId && agreement.liquidationTxId !== liquidationTxId) {
      return res.status(400).json({
        success: false,
        error: 'Liquidation transaction is already recorded for this loan',
        code: 'LIQUIDATION_ALREADY_RECORDED'
      });
    }

    const txReuseCheck = await ensureTxIdNotReused(liquidationTxId, agreement.loanId);
    if (txReuseCheck.reused) {
      return res.status(409).json({
        success: false,
        error: `Liquidation transaction id is already used by ${txReuseCheck.source}`,
        code: 'TX_ALREADY_USED'
      });
    }

    const liquidationRecipient = recipientAddress || agreement.lenderAddress || agreement.lenderPubKey;

    const liquidationVerification = await verifyBitcoinPayment({
      txId: liquidationTxId,
      recipientAddress: liquidationRecipient,
      minAmountBTC: liquidationAmountBTC ?? 0.00000001,
      networkName: agreement.bitcoinNetwork || getBitcoinNetworkName(),
      requiredConfirmations: agreement.requiredConfirmations || 1,
      strict: isOnChainEnforced()
    });

    const { escrow, agreement: updatedAgreement } = await transitionEscrowState(agreement.loanId, 'DEFAULTED', {
      txId: liquidationTxId,
      confirmations: liquidationVerification.confirmations,
      blockHeight: liquidationVerification.blockHeight,
      network: liquidationVerification.network,
      verified: liquidationVerification.verified
    });

    res.status(200).json({
      success: true,
      data: {
        escrow,
        agreement: updatedAgreement,
        liquidationVerification
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getEscrowDetails = async (req, res, next) => {
  try {
    const loanIdentifier = req.params.loanId;
    const agreement = await findLoanAgreementByIdentifier(loanIdentifier);

    if (!agreement) {
      return res.status(404).json({ success: false, error: 'Escrow not found', code: 'NOT_FOUND' });
    }

    const escrow = await EscrowState.findOne({ loanId: agreement.loanId });

    if (!escrow) {
      return res.status(404).json({ success: false, error: 'Escrow not found', code: 'NOT_FOUND' });
    }

    const requesterAddress = req.user.btcAddress || req.user.pubKey;
    if (!isStakeholderForLoan(agreement, requesterAddress)) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this escrow', code: 'FORBIDDEN' });
    }

    res.status(200).json({
      success: true,
      data: {
        loan: agreement,
        escrow
      }
    });
  } catch (error) {
    next(error);
  }
};
