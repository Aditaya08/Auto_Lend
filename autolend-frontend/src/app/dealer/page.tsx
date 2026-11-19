/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { getDealerVehicles, createDealerVehicle, deleteDealerVehicle } from "@/lib/api";
import { Vehicle } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DealerDashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [addForm, setAddForm] = useState({ make: "", model: "", year: "", vin: "", priceBTC: "", description: "" });

  const fetchVehicles = async () => {
    try {
      const data = await getDealerVehicles();
      setVehicles(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch vehicles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteDealerVehicle(id);
      toast.success("Vehicle deleted");
      setVehicles(vehicles.filter(v => v._id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete vehicle");
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newVehicle = await createDealerVehicle({
        make: addForm.make,
        model: addForm.model,
        year: parseInt(addForm.year),
        vin: addForm.vin,
        priceBTC: parseFloat(addForm.priceBTC)
      });
      toast.success("Vehicle added successfully");
      setAddForm({ make: "", model: "", year: "", vin: "", priceBTC: "", description: "" });
      fetchVehicles();
    } catch (err: any) {
      toast.error(err.message || "Failed to add vehicle");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 relative z-10">
      <h1 className="text-4xl font-bold mb-8 tracking-tight">Dealer Portal</h1>
      
      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="mb-8 bg-white/10">
          <TabsTrigger value="inventory" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">
            My Inventory
          </TabsTrigger>
          <TabsTrigger value="add" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">
            Add Vehicle
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="inventory">
          {loading ? (
            <p>Loading inventory...</p>
          ) : vehicles.length === 0 ? (
            <Card className="bg-white/5 border-white/20 text-white">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <p className="text-xl mb-4">No vehicles in your inventory</p>
                <p className="text-white/60 mb-6">Start by adding a new vehicle to your lot.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((vehicle) => (
                <Card key={vehicle._id} className="bg-white/5 backdrop-blur-md border-white/20 text-white overflow-hidden flex flex-col hover:bg-white/10 transition-colors">
                  <div className="h-48 bg-white/10 relative">
                    <img 
                      src={`https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80`} 
                      alt="Car"
                      className="w-full h-full object-cover mix-blend-overlay opacity-80"
                    />
                    <Badge className="absolute top-2 right-2 bg-white text-black backdrop-blur-sm border-none font-semibold">
                      Available
                    </Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl">{vehicle.year} {vehicle.make} {vehicle.model}</CardTitle>
                    <CardDescription className="text-white/70">VIN: {vehicle.vin}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-2xl font-semibold mb-2">₿ {vehicle.priceBTC}</p>
                    <p className="text-sm text-white/60">Estimated USD: ${(vehicle.priceUSD || vehicle.priceBTC * 60000).toLocaleString()}</p>
                  </CardContent>
                  <CardFooter className="pt-0 mt-auto">
                    <Button 
                      variant="outline" 
                      onClick={() => handleDelete(vehicle._id)}
                      className="w-full text-red-400 border-red-400/50 hover:bg-red-400 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove Listing
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="add">
          <Card className="max-w-2xl bg-white/5 backdrop-blur-md border-white/20 text-white">
            <CardHeader>
              <CardTitle className="text-2xl">List New Vehicle</CardTitle>
              <CardDescription className="text-white/70">
                Add a new vehicle to your inventory for customers to browse.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="make">Make</Label>
                    <Input id="make" value={addForm.make} onChange={e => setAddForm({...addForm, make: e.target.value})} className="bg-white/5 border-white/20 text-white placeholder:text-white/40" required placeholder="Tesla" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input id="model" value={addForm.model} onChange={e => setAddForm({...addForm, model: e.target.value})} className="bg-white/5 border-white/20 text-white placeholder:text-white/40" required placeholder="Model 3" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input id="year" type="number" value={addForm.year} onChange={e => setAddForm({...addForm, year: e.target.value})} className="bg-white/5 border-white/20 text-white placeholder:text-white/40" required placeholder="2023" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vin">VIN</Label>
                    <Input id="vin" value={addForm.vin} onChange={e => setAddForm({...addForm, vin: e.target.value})} className="bg-white/5 border-white/20 text-white placeholder:text-white/40" required placeholder="5YJ3E1EA..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (BTC)</Label>
                  <Input id="price" type="number" step="0.001" value={addForm.priceBTC} onChange={e => setAddForm({...addForm, priceBTC: e.target.value})} className="bg-white/5 border-white/20 text-white placeholder:text-white/40" required placeholder="0.5" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Input id="desc" value={addForm.description} onChange={e => setAddForm({...addForm, description: e.target.value})} className="bg-white/5 border-white/20 text-white placeholder:text-white/40" placeholder="Excellent condition..." />
                </div>
                <Button type="submit" className="w-full bg-white text-black hover:bg-white/90 mt-6 text-base font-semibold">
                  Add Vehicle
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
