/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getToken } from "./auth";
import { Vehicle, LoanOffer, LoanApplication, LoanAgreement, EscrowState, RepaymentRecord } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${url}`, { ...options, headers });
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "An error occurred");
  }
  return data.data;
}

// Dealer API
export const getDealerVehicles = (): Promise<Vehicle[]> => fetchWithAuth("/dealer/vehicles");
export const createDealerVehicle = (vehicle: Partial<Vehicle>): Promise<Vehicle> => 
  fetchWithAuth("/dealer/vehicles", { method: "POST", body: JSON.stringify(vehicle) });
export const deleteDealerVehicle = (id: string): Promise<any> => 
  fetchWithAuth(`/dealer/vehicles/${id}`, { method: "DELETE" });
export const acceptApplication = (id: string): Promise<{application: LoanApplication, agreement: LoanAgreement}> => 
  fetchWithAuth(`/dealer/applications/${id}/accept`, { method: "POST" });

// Lender API
export const getLenderOffers = (): Promise<LoanOffer[]> => fetchWithAuth("/lender/offers");
export const createLenderOffer = (offer: Partial<LoanOffer>): Promise<LoanOffer> => 
  fetchWithAuth("/lender/offers", { method: "POST", body: JSON.stringify(offer) });
export const getLenderPortfolio = (): Promise<LoanAgreement[]> => fetchWithAuth("/lender/portfolio");

// Customer API
export const getMarketplaceVehicles = (): Promise<Vehicle[]> => fetchWithAuth("/marketplace/vehicles");
export const submitApplication = (application: Partial<LoanApplication>): Promise<LoanApplication> => 
  fetchWithAuth("/customer/applications", { method: "POST", body: JSON.stringify(application) });
export const getCustomerApplicationsList = (): Promise<LoanApplication[]> => fetchWithAuth(`/customer/applications`);
export const getCustomerApplications = (id: string): Promise<LoanApplication> => fetchWithAuth(`/customer/applications/${id}`);
export const getCustomerRepayments = (): Promise<{loans: LoanAgreement[], history: RepaymentRecord[]}> => fetchWithAuth("/customer/repayments");
export const submitRepayment = (loanId: string, amountBTC: number): Promise<RepaymentRecord> => 
  fetchWithAuth(`/customer/repayments/${loanId}/pay`, { method: "POST", body: JSON.stringify({ amountBTC }) });

// Escrow API
export const getEscrowDetails = (loanId: string): Promise<LoanAgreement> => fetchWithAuth(`/escrow/${loanId}`);
export const fundEscrow = (loanId: string): Promise<EscrowState> => fetchWithAuth(`/escrow/${loanId}/fund`, { method: "POST" });
export const releaseEscrow = (loanId: string): Promise<EscrowState> => fetchWithAuth(`/escrow/${loanId}/release`, { method: "POST" });
export const liquidateEscrow = (loanId: string): Promise<EscrowState> => fetchWithAuth(`/escrow/${loanId}/liquidate`, { method: "POST" });

// Auth API (no token needed usually)
export const login = (data: any) => fetchWithAuth("/auth/login", { method: "POST", body: JSON.stringify(data) });
export const register = (data: any) => fetchWithAuth("/auth/register", { method: "POST", body: JSON.stringify(data) });
