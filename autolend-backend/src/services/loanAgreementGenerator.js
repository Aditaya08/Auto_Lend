import crypto from 'crypto';
import LoanAgreement from '../models/LoanAgreement.js';
import EscrowState from '../models/EscrowState.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import {
  getBitcoinNetworkName,
  getRequiredConfirmations,
  requireUserBitcoinAddress
} from './bitcoinService.js';

export const generateLoanAgreement = async (application, loanOffer) => {
  // Resolve all stakeholders to Bitcoin addresses used for on-chain settlement.
  const customer = await User.findById(application.customerId);
  const vehicle = await Vehicle.findById(application.vehicleId);
  if (!vehicle) {
    throw new Error('Vehicle not found for application');
  }

  const dealerUser = await User.findById(vehicle.dealerId);
  const lenderUser = await User.findById(loanOffer.lenderId);

  if (!customer || !dealerUser || !lenderUser) {
    throw new Error('Stakeholders not found for loan agreement generation');
  }

  const customerAddress = requireUserBitcoinAddress(customer, 'Customer');
  const dealerAddress = requireUserBitcoinAddress(dealerUser, 'Dealer');
  const lenderAddress = requireUserBitcoinAddress(lenderUser, 'Lender');

  const bitcoinNetwork = getBitcoinNetworkName();
  const requiredConfirmations = getRequiredConfirmations();

  // Use a unique loan id to map off-chain records with on-chain tx references.
  const loanId = crypto.randomUUID();

  const agreement = await LoanAgreement.create({
    loanId,
    applicationId: application._id,
    dealerPubKey: dealerAddress,
    lenderPubKey: lenderAddress,
    customerPubKey: customerAddress,
    dealerAddress,
    lenderAddress,
    customerAddress,
    amount: loanOffer.amount,
    rate: loanOffer.interestRate,
    schedule: loanOffer.repaymentScheduleMonths,
    collateralVIN: vehicle.vin,
    status: 'PENDING',
    bitcoinNetwork,
    requiredConfirmations
  });

  // Escrow starts pending until a verified funding tx is provided.
  await EscrowState.create({
    loanId,
    state: 'PENDING',
    balance: 0,
    requiredConfirmations,
    network: bitcoinNetwork
  });

  return agreement;
};
