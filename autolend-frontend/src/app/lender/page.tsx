/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { getLenderOffers, createLenderOffer, getLenderPortfolio } from "@/lib/api";
import { LoanOffer, LoanAgreement } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Edit2, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function LenderDashboard() {
  const [offers, setOffers] = useState<LoanOffer[]>([]);
  const [portfolio, setPortfolio] = useState<LoanAgreement[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  
  const [offerForm, setOfferForm] = useState({ amount: "", interestRate: "", repaymentScheduleMonths: "", collateralRequirement: "" });

  const fetchOffers = async () => {
    try {
      const data = await getLenderOffers();
      setOffers(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch offers");
    } finally {
      setLoadingOffers(false);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const data = await getLenderPortfolio();
      setPortfolio(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch portfolio");
    } finally {
      setLoadingPortfolio(false);
    }
  };

  useEffect(() => {
    fetchOffers();
    fetchPortfolio();
  }, []);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLenderOffer({
        amount: parseFloat(offerForm.amount),
        interestRate: parseFloat(offerForm.interestRate),
        repaymentScheduleMonths: parseInt(offerForm.repaymentScheduleMonths),
        collateralRequirement: offerForm.collateralRequirement
      });
      toast.success("Offer created successfully");
      setOfferForm({ amount: "", interestRate: "", repaymentScheduleMonths: "", collateralRequirement: "" });
      fetchOffers();
    } catch (err: any) {
      toast.error(err.message || "Failed to create offer");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">Pending</Badge>;
      case 'FUNDED': return <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30">Funded</Badge>;
      case 'ACTIVE': return <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">Active</Badge>;
      case 'COMPLETED': return <Badge className="bg-gray-500/20 text-gray-300 hover:bg-gray-500/30">Completed</Badge>;
      case 'DEFAULTED': return <Badge className="bg-red-500/20 text-red-500 hover:bg-red-500/30">Defaulted</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 relative z-10">
      <h1 className="text-4xl font-bold mb-8 tracking-tight">Lender Portal</h1>
      
      <Tabs defaultValue="offers" className="w-full">
        <TabsList className="mb-8 bg-white/10">
          <TabsTrigger value="offers" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">
            My Offers
          </TabsTrigger>
          <TabsTrigger value="create" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Create Offer
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Portfolio
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="offers">
          <Card className="bg-white/5 backdrop-blur-md border-white/20 text-white">
            <CardHeader>
              <CardTitle>My Loan Offers</CardTitle>
              <CardDescription className="text-white/70">Manage your standardized loan terms.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingOffers ? (
                <p>Loading...</p>
              ) : offers.length === 0 ? (
                <p className="text-center py-8 text-white/60">No offers created yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/20 hover:bg-transparent">
                      <TableHead className="text-white">Amount (BTC)</TableHead>
                      <TableHead className="text-white">Interest Rate</TableHead>
                      <TableHead className="text-white">Schedule</TableHead>
                      <TableHead className="text-white">Collateral Rule</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                      <TableHead className="text-white text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offers.map(offer => (
                      <TableRow key={offer._id} className="border-white/20 hover:bg-white/5">
                        <TableCell className="font-medium">₿ {offer.amount}</TableCell>
                        <TableCell>{offer.interestRate}% APR</TableCell>
                        <TableCell>{offer.repaymentScheduleMonths} months</TableCell>
                        <TableCell>{offer.collateralRequirement}</TableCell>
                        <TableCell>
                          {offer.isActive ? (
                            <Badge className="bg-green-500/20 text-green-500 border-none">Active</Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-500 border-none">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger className="text-white/70 hover:text-white hover:bg-white/10 p-2 text-sm rounded-md flex items-center justify-center"><Edit2 className="w-4 h-4 mr-2" /> Edit</DialogTrigger>
                            <DialogContent className="bg-zinc-900 border-white/20 text-white sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Edit Offer</DialogTitle>
                                <DialogDescription className="text-white/60">
                                  Make changes to your loan offer here.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                {/* Disabled form just for visual integration as per prompt "Edit button opens Dialog with prefilled form" */}
                                <div className="space-y-2">
                                  <Label>Amount (BTC)</Label>
                                  <Input defaultValue={offer.amount} className="bg-white/5 border-white/20 text-white" />
                                </div>
                                <div className="space-y-2">
                                  <Label>Interest Rate (%)</Label>
                                  <Input defaultValue={offer.interestRate} className="bg-white/5 border-white/20 text-white" />
                                </div>
                                <Button className="w-full bg-white text-black hover:bg-white/90">Save Changes</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="create">
          <Card className="max-w-2xl bg-white/5 backdrop-blur-md border-white/20 text-white">
            <CardHeader>
              <CardTitle>Create Loan Offer</CardTitle>
              <CardDescription className="text-white/70">
                Set up standard loan terms for customers to apply to.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateOffer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Loan Amount (BTC)</Label>
                    <Input id="amount" type="number" step="0.001" value={offerForm.amount} onChange={e => setOfferForm({...offerForm, amount: e.target.value})} className="bg-white/5 border-white/20 text-white" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rate">Interest Rate (%)</Label>
                    <Input id="rate" type="number" step="0.1" value={offerForm.interestRate} onChange={e => setOfferForm({...offerForm, interestRate: e.target.value})} className="bg-white/5 border-white/20 text-white" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="schedule">Repayment Schedule (Months)</Label>
                    <Input id="schedule" type="number" value={offerForm.repaymentScheduleMonths} onChange={e => setOfferForm({...offerForm, repaymentScheduleMonths: e.target.value})} className="bg-white/5 border-white/20 text-white" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="collateral">Collateral Requirement</Label>
                    <Input id="collateral" value={offerForm.collateralRequirement} onChange={e => setOfferForm({...offerForm, collateralRequirement: e.target.value})} className="bg-white/5 border-white/20 text-white" placeholder="e.g. Value > 1.5x Loan" required />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-white text-black hover:bg-white/90 mt-6 font-semibold">
                  Create Offer
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio">
          <div className="grid grid-cols-1 gap-6">
            {loadingPortfolio ? (
              <p>Loading portfolio...</p>
            ) : portfolio.length === 0 ? (
              <Card className="bg-white/5 border-white/20 text-white">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                  <p className="text-xl mb-4">Your portfolio is empty</p>
                  <p className="text-white/60">Active loans will appear here once escrows are funded.</p>
                </CardContent>
              </Card>
            ) : (
              portfolio.map(loan => (
                <Card key={loan._id} className="bg-white/5 backdrop-blur-md border-white/20 text-white">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg">Loan #{loan._id.slice(-6).toUpperCase()}</CardTitle>
                      <CardDescription className="text-white/70">Collateral VIN: {loan.collateralVIN}</CardDescription>
                    </div>
                    {getStatusBadge(loan.status)}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-white/60 mb-1">Amount</p>
                        <p className="font-semibold text-lg">₿ {loan.amount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-white/60 mb-1">Interest Rate</p>
                        <p className="font-semibold text-lg">{loan.rate}% APR</p>
                      </div>
                      <div>
                        <p className="text-sm text-white/60 mb-1">Customer PubKey</p>
                        <p className="font-mono text-sm">{loan.customerPubKey.slice(0, 12)}...</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Repayment Progress</span>
                        <span>0 / {loan.schedule} Months</span>
                      </div>
                      <Progress value={0} className="h-2 bg-white/10" />
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                      <Link href={`/escrow/${loan._id}`}>
                        <Button variant="outline" className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Escrow Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
