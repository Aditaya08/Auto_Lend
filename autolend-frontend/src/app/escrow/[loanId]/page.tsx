/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { getEscrowDetails, fundEscrow, releaseEscrow } from "@/lib/api";
import { LoanAgreement } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { getUser } from "@/lib/auth";

export default function EscrowDetail() {
  const params = useParams();
  const router = useRouter();
  const loanId = params.loanId as string;
  const user = getUser();
  
  const [loan, setLoan] = useState<LoanAgreement | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLoan = async () => {
    try {
      const data = await getEscrowDetails(loanId);
      setLoan(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch escrow details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoan();
  }, [loanId]);

  const handleFund = async () => {
    try {
      await fundEscrow(loanId);
      toast.success("Escrow funded successfully");
      fetchLoan();
    } catch (err: any) {
      toast.error(err.message || "Failed to fund escrow");
    }
  };

  const handleRelease = async () => {
    try {
      await releaseEscrow(loanId);
      toast.success("Funds released successfully");
      fetchLoan();
    } catch (err: any) {
      toast.error(err.message || "Failed to release funds");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">Loading...</div>;
  }

  if (!loan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <h2 className="text-2xl font-bold mb-4 text-white">Escrow Not Found</h2>
        <Button onClick={() => router.back()} variant="outline" className="text-white border-white/20">Go Back</Button>
      </div>
    );
  }

  const steps = ["PENDING", "FUNDED", "ACTIVE", "COMPLETED"];
  const currentStepIndex = loan.status === "DEFAULTED" ? -1 : steps.indexOf(loan.status);

  return (
    <div className="container mx-auto px-4 py-8 relative z-10 max-w-4xl">
      <Button 
        onClick={() => router.back()} 
        variant="ghost" 
        className="mb-6 text-white/70 hover:text-white hover:bg-white/10"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>
      
      <h1 className="text-4xl font-bold mb-8 tracking-tight">Escrow Details</h1>
      
      <Card className="bg-white/5 backdrop-blur-md border-white/20 text-white mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">State Machine Status</CardTitle>
          <CardDescription className="text-white/70">
            Current stage of the multi-sig escrow contract.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between mb-8 mt-4 relative">
            <div className="absolute left-0 top-4 w-full h-0.5 bg-white/10 -z-10"></div>
            {steps.map((step, idx) => {
              const isPast = currentStepIndex >= idx;
              const isCurrent = currentStepIndex === idx;
              
              return (
                <div key={step} className="flex flex-col items-center p-2 rounded-lg relative z-10">
                  {isPast ? (
                    <CheckCircle2 className={`w-8 h-8 ${isCurrent ? 'text-blue-500' : 'text-green-500'} bg-[#121212] rounded-full`} />
                  ) : (
                    <Circle className="w-8 h-8 text-white/20 bg-[#121212] rounded-full" />
                  )}
                  <span className={`mt-2 text-sm font-semibold ${isCurrent ? 'text-white' : isPast ? 'text-white/70' : 'text-white/30'}`}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
          
          {loan.status === "DEFAULTED" && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-center mb-4 text-red-100">
              <h3 className="font-bold text-red-500 text-lg mb-1">CONTRACT DEFAULTED</h3>
              <p className="text-sm">This loan has defaulted due to missed payments. Collateral ownership has been transferred to the lender.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-white/5 backdrop-blur-md border-white/20 text-white">
          <CardHeader>
            <CardTitle>Contract Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-white/60 mb-1">Loan Amount</p>
              <p className="text-2xl font-bold">₿ {loan.amount}</p>
            </div>
            <div>
              <p className="text-sm text-white/60 mb-1">Created At</p>
              <p className="font-mono text-sm">{new Date(loan.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-white/60 mb-1">Collateral VIN</p>
              <p className="font-mono text-sm bg-white/10 p-2 rounded inline-block">{loan.collateralVIN}</p>
            </div>
            
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-xs text-white/60 mb-1">Dealer Public Key</p>
                <p className="font-mono text-xs bg-black/50 p-2 rounded break-all">{loan.dealerPubKey}</p>
              </div>
              <div>
                <p className="text-xs text-white/60 mb-1">Lender Public Key</p>
                <p className="font-mono text-xs bg-black/50 p-2 rounded break-all">{loan.lenderPubKey}</p>
              </div>
              <div>
                <p className="text-xs text-white/60 mb-1">Customer Public Key</p>
                <p className="font-mono text-xs bg-black/50 p-2 rounded break-all">{loan.customerPubKey}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/5 backdrop-blur-md border-white/20 text-white h-fit">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription className="text-white/70">Available contract interactions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {user?.role === "lender" && loan.status === "PENDING" && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h4 className="font-semibold mb-2">Fund Escrow</h4>
                <p className="text-sm text-white/70 mb-4">Deposit ₿ {loan.amount} into the multi-sig contract to fund this loan.</p>
                <Button onClick={handleFund} className="w-full bg-white text-black hover:bg-white/90 font-semibold">
                  Fund Contract
                </Button>
              </div>
            )}
            
            {loan.status === "FUNDED" && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <h4 className="font-semibold mb-2">Release Funds to Dealer</h4>
                <p className="text-sm text-white/70 mb-4">The vehicle has been delivered. Release the ₿ {loan.amount} to the dealer.</p>
                <Button onClick={handleRelease} className="w-full bg-white text-black hover:bg-white/90 font-semibold">
                  Release Funds
                </Button>
              </div>
            )}
            
            {(loan.status === "COMPLETED" || loan.status === "DEFAULTED" || loan.status === "ACTIVE") && (
              <div className="p-4 bg-white/5 rounded-lg text-center">
                <p className="text-white/70 text-sm">No escrow actions required at this stage.</p>
              </div>
            )}
            
            {(user?.role !== "lender" && loan.status === "PENDING") && (
              <div className="p-4 bg-white/5 rounded-lg text-center">
                <p className="text-white/70 text-sm">Waiting for lender to fund the contract.</p>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
