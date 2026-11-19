import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GradientBackground } from "@/components/ui/paper-design-shader-background";
import { Toaster } from "@/components/ui/sonner";
import { NavBar } from "@/components/nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AutoLend",
  description: "Smart Auto Lending Platform",
};

import SplashScreen from "@/components/splash-screen";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} text-white bg-transparent`}>
        <SplashScreen>
          <GradientBackground />
          <NavBar />
          <main className="pt-16 min-h-screen">
            {children}
          </main>
          <Toaster theme="dark" />
        </SplashScreen>
      </body>
    </html>
  );
}
