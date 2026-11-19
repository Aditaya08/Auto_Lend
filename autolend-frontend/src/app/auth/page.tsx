/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { login, register } from "@/lib/api";
import { setToken, setUser } from "@/lib/auth";
import { toast } from "sonner";

export default function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({ name: "", email: "", password: "", role: "customer" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(loginForm);
      setToken(data.token);
      setUser(data.user);
      toast.success("Login successful");
      router.push(`/${data.user.role}`);
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await register(regForm);
      setToken(data.token);
      setUser(data.user);
      toast.success("Registration successful");
      router.push(`/${data.user.role}`);
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 relative z-10 pb-[10vh]">
      <Card className="w-full max-w-md bg-white/5 backdrop-blur-md border-white/20 text-white shadow-2xl min-h-[500px] flex flex-col">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Welcome to AutoLend</CardTitle>
          <CardDescription className="text-center text-white/70">
            Sign in or create an account to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/10 mb-6">
              <TabsTrigger value="login" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">
                Register
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input 
                    id="login-email" 
                    type="email" 
                    placeholder="email@example.com"
                    required
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input 
                    id="login-password" 
                    type="password" 
                    required
                    className="bg-white/5 border-white/20 text-white"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-white text-black hover:bg-white/90">
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Full Name</Label>
                  <Input 
                    id="reg-name" 
                    required
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                    placeholder="John Doe"
                    value={regForm.name}
                    onChange={(e) => setRegForm({...regForm, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input 
                    id="reg-email" 
                    type="email" 
                    required
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                    placeholder="email@example.com"
                    value={regForm.email}
                    onChange={(e) => setRegForm({...regForm, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input 
                    id="reg-password" 
                    type="password" 
                    required
                    className="bg-white/5 border-white/20 text-white"
                    value={regForm.password}
                    onChange={(e) => setRegForm({...regForm, password: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-role">Role</Label>
                  <Select 
                    value={regForm.role} 
                    onValueChange={(val) => setRegForm({...regForm, role: val || ""})}
                  >
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="dealer">Dealer</SelectItem>
                      <SelectItem value="lender">Lender</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-white text-black hover:bg-white/90 mt-4">
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
