export interface User {
  id: string;
  email: string;
  role: 'dealer' | 'lender' | 'customer';
  pubKey: string;
}

export interface Vehicle {
  _id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  priceBTC: number;
  priceUSD: number;
  dealerId: string;
  availableOffers?: LoanOffer[];
}

export interface LoanOffer {
  _id: string;
  lenderId: string;
  amount: number;
  interestRate: number;
  repaymentScheduleMonths: number;
  collateralRequirement: string;
  isActive: boolean;
}

export interface LoanApplication {
  _id: string;
  customerId: string;
  vehicleId: string;
  loanOfferId: string;
  downPaymentBTC: number;
  kycHash: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface LoanAgreement {
  _id: string;
  loanId: string;
  applicationId: string;
  dealerPubKey: string;
  lenderPubKey: string;
  customerPubKey: string;
  amount: number;
  rate: number;
  schedule: number;
  collateralVIN: string;
  status: 'PENDING' | 'FUNDED' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED';
  createdAt: string;
}

export interface EscrowState {
  _id: string;
  loanId: string;
  state: 'PENDING' | 'FUNDED' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED';
  balance: number;
}

export interface RepaymentRecord {
  _id: string;
  loanId: string;
  customerId: string;
  amountBTC: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}
