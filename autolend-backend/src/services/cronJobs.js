import cron from 'node-cron';
import LoanAgreement from '../models/LoanAgreement.js';
import EscrowState from '../models/EscrowState.js';
import Repayment from '../models/Repayment.js';
import { transitionEscrowState } from './escrowStateMachine.js';
import { isOnChainEnforced, verifyBitcoinPayment } from './bitcoinService.js';

const DEFAULT_THRESHOLD_DAYS = 30;

const logJobError = (message, err) => {
  console.error(message, err?.message || err);
};

const refreshFundedEscrows = async () => {
  const fundedEscrows = await EscrowState.find({
    state: 'FUNDED',
    fundingTxId: { $exists: true, $ne: null },
    escrowAddress: { $exists: true, $ne: null }
  });

  for (const escrow of fundedEscrows) {
    try {
      const agreement = await LoanAgreement.findOne({ loanId: escrow.loanId });
      if (!agreement || agreement.status !== 'FUNDED') {
        continue;
      }

      const verification = await verifyBitcoinPayment({
        txId: escrow.fundingTxId,
        recipientAddress: escrow.escrowAddress,
        minAmountBTC: agreement.amount,
        networkName: agreement.bitcoinNetwork || escrow.network,
        requiredConfirmations: agreement.requiredConfirmations || escrow.requiredConfirmations || 1,
        strict: false
      });

      escrow.lastObservedConfirmations = verification.confirmations;
      await escrow.save();

      if (!verification.verified) {
        continue;
      }

      await transitionEscrowState(agreement.loanId, 'ACTIVE', {
        txId: escrow.fundingTxId,
        confirmations: verification.confirmations,
        blockHeight: verification.blockHeight,
        network: verification.network,
        verified: true
      });

      console.log(`Escrow ${agreement.loanId} moved to ACTIVE after on-chain confirmation refresh.`);
    } catch (err) {
      logJobError(`Error refreshing funded escrow ${escrow.loanId}:`, err);
    }
  }
};

const refreshPendingRepayments = async () => {
  const pendingRepayments = await Repayment.find({
    status: 'PENDING',
    txId: { $exists: true, $ne: null }
  });

  for (const repayment of pendingRepayments) {
    try {
      const agreement = await LoanAgreement.findOne({ loanId: repayment.loanId });
      if (!agreement) {
        continue;
      }

      const recipientAddress = repayment.recipientAddress || agreement.lenderAddress || agreement.lenderPubKey;
      const verification = await verifyBitcoinPayment({
        txId: repayment.txId,
        recipientAddress,
        minAmountBTC: repayment.amountBTC,
        networkName: repayment.network || agreement.bitcoinNetwork,
        requiredConfirmations: agreement.requiredConfirmations || 1,
        strict: false
      });

      repayment.confirmations = verification.confirmations;
      repayment.verifiedOnChain = verification.verified;
      repayment.blockHeight = verification.blockHeight;
      repayment.network = verification.network || repayment.network;
      repayment.status = verification.verified ? 'COMPLETED' : 'PENDING';
      await repayment.save();

      if (verification.verified) {
        agreement.lastPaymentDate = new Date();
        await agreement.save();
      }
    } catch (err) {
      logJobError(`Error refreshing repayment ${repayment._id}:`, err);
    }
  }
};

export const startCronJobs = () => {
  // Refresh every 10 minutes to sync pending on-chain confirmations.
  cron.schedule('*/10 * * * *', async () => {
    try {
      await refreshFundedEscrows();
      await refreshPendingRepayments();
    } catch (err) {
      logJobError('Error running on-chain refresh cron job:', err);
    }
  });

  // Run daily at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily default detection job...');
    
    try {
      const activeLoans = await LoanAgreement.find({ status: 'ACTIVE' });
      
      const now = new Date();

      for (const loan of activeLoans) {
        const lastPayment = loan.lastPaymentDate || loan.createdAt;
        const diffTime = Math.abs(now - lastPayment);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays > DEFAULT_THRESHOLD_DAYS) {
          if (isOnChainEnforced()) {
            console.log(
              `Loan ${loan.loanId} exceeded repayment threshold but on-chain enforcement is enabled; waiting for explicit liquidation tx.`
            );
            continue;
          }

          console.log(`Loan ${loan.loanId} has defaulted. Transitioning state...`);
          await transitionEscrowState(loan.loanId, 'DEFAULTED');
        }
      }
    } catch (err) {
      console.error('Error running cron job:', err);
    }
  });
};
