import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Landing() {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen w-full bg-background bg-grain flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[700px] flex flex-col items-center text-center">
        {/* Original Logo Style */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-10 h-10 rounded-md bg-foreground flex items-center justify-center">
            <span className="text-background font-display text-lg font-bold">₹</span>
          </div>
          <div className="leading-tight text-left">
            <div className="font-display font-semibold tracking-tight text-[18px]">Ledger</div>
            <div className="text-[12px] uppercase tracking-widest text-muted-foreground">Personal · Business</div>
          </div>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight mb-6">
          The minimalist approach to <br className="hidden sm:block" /> financial clarity.
        </h1>
        <p className="text-lg text-muted-foreground mb-12 max-w-md">
          Track expenses, monitor subscriptions, and gain deep insights into your spending habits with our secure platform.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 w-full text-left">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-display font-semibold mb-2 text-[15px]">Bank-grade Security</h3>
            <p className="text-sm text-muted-foreground">Your data is secured by Firebase Auth.</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-display font-semibold mb-2 text-[15px]">Intelligent Analytics</h3>
            <p className="text-sm text-muted-foreground">Beautiful graphs to understand your habits.</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-display font-semibold mb-2 text-[15px]">Multi-device Sync</h3>
            <p className="text-sm text-muted-foreground">Access your ledger from anywhere seamlessly.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {currentUser ? (
            <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-md bg-foreground text-background text-sm font-medium px-8 py-3 hover:bg-foreground/90 transition-colors">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-md bg-foreground text-background text-sm font-medium px-8 py-3 hover:bg-foreground/90 transition-colors">
                Get Started
              </Link>
              <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-md bg-background border border-input text-foreground text-sm font-medium px-8 py-3 hover:bg-accent hover:text-accent-foreground transition-colors">
                Sign In
              </Link>
            </>
          )}
        </div>

        <div className="text-[11px] uppercase tracking-widest text-muted-foreground text-center mt-20">
          Ledger SaaS Platform
        </div>
      </div>
    </div>
  );
}
