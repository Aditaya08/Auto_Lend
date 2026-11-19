/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUser, clearToken } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export function NavBar() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setUser(getUser());
  }, [pathname]);

  if (pathname === "/") return null; // Hide on splash page

  const handleLogout = () => {
    clearToken();
    setUser(null);
    router.push("/auth");
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-black/10 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/home" className="text-xl font-bold text-white tracking-tight">
          AutoLend
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Badge variant="outline" className="text-white border-white/20 bg-white/5 capitalize">
                {user.role}
              </Badge>
              <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => router.push("/auth")}>
              Login
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
