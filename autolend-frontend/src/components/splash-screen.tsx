"use client";

import { useEffect, useState, useCallback } from "react";
import { SparklesCore } from "@/components/ui/sparkles";

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const [fading, setFading] = useState(false);

  const dismissSplash = useCallback(() => {
    if (fading) return;
    setFading(true);
    setTimeout(() => {
      setShowSplash(false);
    }, 500); // 500ms fade transition
  }, [fading]);

  useEffect(() => {
    if (!showSplash) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        dismissSplash();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSplash, dismissSplash]);

  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Hide the main content while splash is showing, or keep it under */}
      <div className="hidden">{children}</div>
      
      <div
        className={`fixed inset-0 z-[100] cursor-pointer flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 bg-black ${
          fading ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        onClick={dismissSplash}
      >
        <h1 className="md:text-7xl text-5xl lg:text-9xl font-bold text-center text-white relative z-20">
          AutoLend
        </h1>
        <div className="w-[40rem] h-40 relative">
          {/* Gradients */}
          <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-[2px] w-3/4 blur-sm" />
          <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-px w-3/4" />
          <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-[5px] w-1/4 blur-sm" />
          <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px w-1/4" />

          {/* Core component */}
          <SparklesCore
            background="transparent"
            minSize={0.4}
            maxSize={1}
            particleDensity={1200}
            className="w-full h-full"
            particleColor="#FFFFFF"
          />

          {/* Radial Gradient to prevent sharp edges */}
          <div className="absolute inset-0 w-full h-full bg-black [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]"></div>
        </div>

        <p className="mt-8 text-white/50 text-xl tracking-widest uppercase animate-pulse absolute bottom-20">
          Press ENTER to continue
        </p>
      </div>
    </>
  );
}
