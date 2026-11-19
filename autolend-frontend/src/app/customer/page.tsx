/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { getMarketplaceVehicles, submitApplication, getCustomerApplicationsList, getCustomerRepayments, submitRepayment } from "@/lib/api";
import { Vehicle, LoanApplication, LoanAgreement, RepaymentRecord } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CarFront, CreditCard, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function CustomerDashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [repaymentData, setRepaymentData] = useState<{loans: LoanAgreement[], history: RepaymentRecord[]}>({ loans: [], history: [] });
  
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingRepayments, setLoadingRepayments] = useState(true);

  const [appForm, setAppForm] = useState({ downPaymentBTC: "", kycHash: "", loanOfferId: "" });

  const fetchVehicles = async () => {
    try {
      const data = await getMarketplaceVehicles();
      setVehicles(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch vehicles");
    } finally {
      setLoadingMarket(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const data = await getCustomerApplicationsList();
      // If the backend doesn't implement this, handle it gracefully
      setApplications(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      setApplications([]);
    } finally {
      setLoadingApps(false);
    }
  };

  const fetchRepayments = async () => {
    try {
      const data = await getCustomerRepayments();
      if (data) setRepaymentData(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingRepayments(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    fetchApplications();
    fetchRepayments();
  }, []);

  const handleApply = async (vehicleId: string, e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitApplication({
        vehicleId,
        loanOfferId: appForm.loanOfferId,
        downPaymentBTC: parseFloat(appForm.downPaymentBTC),
        kycHash: appForm.kycHash
      });
      toast.success("Application submitted successfully");
      setAppForm({ downPaymentBTC: "", kycHash: "", loanOfferId: "" });
      fetchApplications();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit application");
    }
  };

  const handleMakePayment = async (loanId: string, amountBTC: number) => {
    try {
      await submitRepayment(loanId, amountBTC);
      toast.success("Payment successful");
      fetchRepayments();
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'PENDING': return <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">Pending</Badge>;
      case 'FUNDED': return <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30">Funded</Badge>;
      case 'active':
      case 'ACTIVE': return <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">Active</Badge>;
      case 'COMPLETED': return <Badge className="bg-gray-500/20 text-gray-300 hover:bg-gray-500/30">Completed</Badge>;
      case 'DEFAULTED': return <Badge className="bg-red-500/20 text-red-500 hover:bg-red-500/30">Defaulted</Badge>;
      case 'rejected': return <Badge className="bg-red-500/20 text-red-500 hover:bg-red-500/30">Rejected</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 relative z-10">
      <h1 className="text-4xl font-bold mb-8 tracking-tight">Customer Portal</h1>
      
      <Tabs defaultValue="marketplace" className="w-full">
        <TabsList className="mb-8 bg-white/10">
          <TabsTrigger value="marketplace" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Marketplace
          </TabsTrigger>
          <TabsTrigger value="applications" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">
            My Applications
          </TabsTrigger>
          <TabsTrigger value="repayments" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Repayments
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="marketplace">
          {loadingMarket ? (
            <p>Loading marketplace...</p>
          ) : vehicles.length === 0 ? (
            <Card className="bg-white/5 border-white/20 text-white">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <p className="text-xl mb-4">No vehicles currently available</p>
                <p className="text-white/60">Check back later for new listings.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((vehicle) => {
                const bestOffer = vehicle.availableOffers?.[0]; // Get the first offer for simplicity
                return (
                  <Card key={vehicle._id} className="bg-white/5 backdrop-blur-md border-white/20 text-white overflow-hidden flex flex-col hover:bg-white/10 transition-colors">
                      <div className="h-48 bg-white/10 relative">
                      <img 
                        src={`https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80`} 
                        alt="Car"
                        className="w-full h-full object-cover mix-blend-overlay opacity-80"
                      />
                    </div>
                    <CardHeader>
                      <CardTitle className="text-xl">{vehicle.year} {vehicle.make} {vehicle.model}</CardTitle>
                      <CardDescription className="text-white/70">VIN: {vehicle.vin}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-2xl font-semibold mb-2">₿ {vehicle.priceBTC}</p>
                      
                      {bestOffer ? (
                        <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                          <p className="text-sm font-semibold mb-2">Best Loan Offer Attached</p>
                          <div className="grid grid-cols-2 gap-2 text-sm text-white/70">
                            <div>Amount: ₿{bestOffer.amount}</div>
                            <div>Rate: {bestOffer.interestRate}%</div>
                            <div className="col-span-2">Term: {bestOffer.repaymentScheduleMonths} months</div>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-yellow-400">No loan offers available for this vehicle.</p>
                      )}
                    </CardContent>
                    <CardFooter className="pt-0 mt-auto">
                      {bestOffer ? (
                        <Sheet>
                          <SheetTrigger className="w-full bg-white text-black hover:bg-white/90 font-semibold py-2 rounded-md" onClick={() => setAppForm({...appForm, loanOfferId: bestOffer._id})}>
                              Apply Now
                          </SheetTrigger>
                          <SheetContent className="bg-zinc-900 border-l border-white/20 text-white">
                            <SheetHeader>
                              <SheetTitle className="text-white">Apply for Loan</SheetTitle>
                              <SheetDescription className="text-white/60">
                                Enter your application details for {vehicle.make} {vehicle.model}.
                              </SheetDescription>
                            </SheetHeader>
                            <form onSubmit={(e) => handleApply(vehicle._id, e)} className="space-y-6 mt-8">
                              <div className="space-y-2">
                                <Label>Vehicle Price</Label>
                                <p className="text-xl font-bold">₿ {vehicle.priceBTC}</p>
                              </div>
                              <div className="space-y-2">
                                <Label>Loan Amount Requested</Label>
                                <p className="text-xl font-bold">₿ {bestOffer.amount}</p>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="downPayment">Down Payment (BTC)</Label>
                                <Input 
                                  id="downPayment" 
                                  type="number" 
                                  step="0.001" 
                                  required 
                                  className="bg-white/5 border-white/20 text-white"
                                  value={appForm.downPaymentBTC}
                                  onChange={e => setAppForm({...appForm, downPaymentBTC: e.target.value})}
                                />
                                <p className="text-xs text-white/50">Minimum required: ₿ {(vehicle.priceBTC - bestOffer.amount).toFixed(4)}</p>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="kyc">KYC Reference ID — provided by your KYC provider</Label>
                                <Input 
                                  id="kyc" 
                                  required 
                                  className="bg-white/5 border-white/20 text-white font-mono text-sm"
                                  placeholder="0xabc123..."
                                  value={appForm.kycHash}
                                  onChange={e => setAppForm({...appForm, kycHash: e.target.value})}
                                />
                              </div>
                              <Button type="submit" className="w-full bg-white text-black hover:bg-white/90">
                                Submit Application
                              </Button>
                            </form>
                          </SheetContent>
                        </Sheet>
                      ) : (
                        <Button disabled className="w-full bg-white/20 text-white/50">
                          Unavailable
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="applications">
          <Card className="bg-white/5 backdrop-blur-md border-white/20 text-white">
            <CardHeader>
              <CardTitle>My Applications</CardTitle>
              <CardDescription className="text-white/70">Track the status of your loan applications.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingApps ? (
                <p>Loading...</p>
              ) : applications.length === 0 ? (
                <p className="text-center py-8 text-white/60">You haven't submitted any applications yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/20 hover:bg-transparent">
                      <TableHead className="text-white">Date</TableHead>
                      <TableHead className="text-white">Vehicle ID</TableHead>
                      <TableHead className="text-white">Down Payment</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map(app => (
                      <TableRow key={app._id} className="border-white/20 hover:bg-white/5">
                        <TableCell>{new Date(app.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono text-xs">{app.vehicleId}</TableCell>
                        <TableCell>₿ {app.downPaymentBTC}</TableCell>
                        <TableCell>{getStatusBadge(app.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repayments">
          <div className="grid grid-cols-1 gap-6">
            {loadingRepayments ? (
              <p>Loading active loans...</p>
            ) : repaymentData.loans.length === 0 ? (
              <Card className="bg-white/5 border-white/20 text-white">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                  <p className="text-xl mb-4">No active loans</p>
                  <p className="text-white/60">Your active loan repayment schedules will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              repaymentData.loans.filter(l => l.status === 'ACTIVE').map(loan => {
                const monthlyPayment = (loan.amount * (1 + loan.rate / 100)) / loan.schedule;
                return (
                  <Card key={loan._id} className="bg-white/5 backdrop-blur-md border-white/20 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div>
                        <CardTitle className="text-lg">Loan #{loan._id.slice(-6).toUpperCase()}</CardTitle>
                        <CardDescription className="text-white/70">Remaining Escrow BTC Balance: ₿ {loan.amount}</CardDescription>
                      </div>
                      {getStatusBadge(loan.status)}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="relative border-l border-white/20 pl-6 ml-3 space-y-6">
                          {Array.from({ length: loan.schedule }).map((_, i) => (
                            <div key={i} className="relative">
                              <div className="absolute -left-[31px] top-1 w-3 h-3 bg-white/20 rounded-full border border-white/50" />
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold">Installment {i + 1}</p>
                                  <p className="text-sm text-white/60">₿ {monthlyPayment.toFixed(4)}</p>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-white/20 hover:bg-white text-white hover:text-black"
                                  onClick={() => handleMakePayment(loan._id, monthlyPayment)}
                                >
                                  Make Payment <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                        <Link href={`/escrow/${loan._id}`}>
                          <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
                            View Escrow <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
