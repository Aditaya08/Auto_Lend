"use client";


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Car, Landmark, UserCircle } from "lucide-react";

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <div className="w-full h-[40vh] flex items-center justify-center relative mt-8">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-white text-7xl md:text-8xl font-bold tracking-tighter drop-shadow-2xl">
            AutoLend
          </h1>
          <p className="mt-6 text-white/70 text-xl md:text-2xl font-light tracking-wide max-w-2xl">
            Decentralized Smart Auto Loans
          </p>
        </div>
      </div>

      {/* Role Selection */}
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          
          <Card className="bg-white/5 backdrop-blur-md border-white/20 text-white flex flex-col items-center text-center hover:bg-white/10 transition-colors">
            <CardHeader>
              <div className="mx-auto bg-white/10 p-4 rounded-full mb-4">
                <Car className="w-8 h-8" />
              </div>
              <CardTitle className="text-2xl">Dealer Portal</CardTitle>
              <CardDescription className="text-white/70">
                List vehicles, manage inventory, and accept loan offers.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pb-8 w-full">
              <Button onClick={() => router.push("/dealer")} className="w-full font-semibold bg-white text-black hover:bg-white/90">
                Enter as Dealer
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-md border-white/20 text-white flex flex-col items-center text-center hover:bg-white/10 transition-colors">
            <CardHeader>
              <div className="mx-auto bg-white/10 p-4 rounded-full mb-4">
                <Landmark className="w-8 h-8" />
              </div>
              <CardTitle className="text-2xl">Lender Portal</CardTitle>
              <CardDescription className="text-white/70">
                Create loan offers, fund escrows, and manage your portfolio.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pb-8 w-full">
              <Button onClick={() => router.push("/lender")} className="w-full font-semibold bg-white text-black hover:bg-white/90">
                Enter as Lender
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-md border-white/20 text-white flex flex-col items-center text-center hover:bg-white/10 transition-colors">
            <CardHeader>
              <div className="mx-auto bg-white/10 p-4 rounded-full mb-4">
                <UserCircle className="w-8 h-8" />
              </div>
              <CardTitle className="text-2xl">Customer Portal</CardTitle>
              <CardDescription className="text-white/70">
                Browse vehicles, apply for loans, and manage repayments.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pb-8 w-full">
              <Button onClick={() => router.push("/customer")} className="w-full font-semibold bg-white text-black hover:bg-white/90">
                Enter as Customer
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
