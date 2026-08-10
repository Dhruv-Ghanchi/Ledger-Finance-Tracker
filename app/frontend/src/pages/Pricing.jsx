import React, { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { startSubscriptionCheckout } from "@/lib/razorpay";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Pricing() {
  const { currentUser, dbUser } = useAuth();
  const navigate = useNavigate();
  const autoUpgradeTriggered = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autoPlan = params.get("auto_upgrade");
    if (autoPlan && currentUser && dbUser && !autoUpgradeTriggered.current) {
      autoUpgradeTriggered.current = true;
      // Clear the query parameter to prevent re-triggering on refresh
      window.history.replaceState({}, document.title, "/pricing");
      // Use setTimeout to allow the UI to finish rendering before showing Razorpay popup
      setTimeout(() => handleUpgrade(autoPlan), 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, dbUser]);

  const handleUpgrade = (plan) => {
    if (!currentUser) {
      navigate(`/register?intent=${plan}`);
      return;
    }
    startSubscriptionCheckout({
      plan,
      user: dbUser,
      onSuccess: () => navigate("/dashboard"),
    });
  };

  return (
    <div className="min-h-screen w-full bg-background bg-grain flex flex-col px-6 py-12">
      <div className="max-w-[1000px] w-full mx-auto flex-1 flex flex-col">
        
        {/* Header / Logo */}
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center">
              <span className="text-background font-display text-sm font-bold">₹</span>
            </div>
            <div className="leading-tight">
              <div className="font-display font-semibold tracking-tight text-[15px]">Ledger</div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Premium</div>
            </div>
          </div>
          <Link to="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Link>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="text-center mb-16">
            <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight mb-4">
              Simple, transparent pricing
            </h1>
            <p className="text-muted-foreground text-lg max-w-[500px] mx-auto">
              Upgrade your account to unlock premium features and unlimited entries.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Tier */}
            <div className="bg-card border border-border rounded-xl p-8 flex flex-col shadow-sm">
              <h3 className="font-display text-xl font-semibold tracking-tight mb-2">Free Trial</h3>
              <div className="mb-6">
                <span className="font-display text-4xl font-semibold tracking-tight">₹0</span>
                <span className="text-sm text-muted-foreground ml-1">/ 6 months</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-4 mb-8 flex-1">
                <li className="flex items-center">✓ <span className="ml-2">All premium features</span></li>
                <li className="flex items-center">✓ <span className="ml-2">6 months duration</span></li>
                <li className="flex items-center">✓ <span className="ml-2">No credit card required</span></li>
              </ul>
              <Button disabled variant="outline" className="w-full h-11 border-border mt-auto">
                Active Default
              </Button>
            </div>

            {/* Monthly Tier */}
            <div className="bg-card border-2 border-foreground rounded-xl p-8 flex flex-col relative shadow-md">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                Most Popular
              </div>
              <h3 className="font-display text-xl font-semibold tracking-tight mb-2">Monthly</h3>
              <div className="mb-6">
                <span className="font-display text-4xl font-semibold tracking-tight">₹11</span>
                <span className="text-sm text-muted-foreground ml-1">/ month</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-4 mb-8 flex-1">
                <li className="flex items-center text-foreground">✓ <span className="ml-2">Unlimited entries</span></li>
                <li className="flex items-center text-foreground">✓ <span className="ml-2">Advanced reports</span></li>
                <li className="flex items-center text-foreground">✓ <span className="ml-2">Export data</span></li>
              </ul>
              <Button onClick={() => handleUpgrade("monthly")} className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 transition-colors mt-auto">
                Upgrade Monthly
              </Button>
            </div>

            {/* Yearly Tier */}
            <div className="bg-card border border-border rounded-xl p-8 flex flex-col shadow-sm">
              <h3 className="font-display text-xl font-semibold tracking-tight mb-2">Yearly</h3>
              <div className="mb-6">
                <span className="font-display text-4xl font-semibold tracking-tight">₹51</span>
                <span className="text-sm text-muted-foreground ml-1">/ year</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-4 mb-8 flex-1">
                <li className="flex items-center">✓ <span className="ml-2">Save ~61% annually</span></li>
                <li className="flex items-center">✓ <span className="ml-2">Unlimited entries</span></li>
                <li className="flex items-center">✓ <span className="ml-2">Advanced reports</span></li>
                <li className="flex items-center">✓ <span className="ml-2">Export data</span></li>
              </ul>
              <Button onClick={() => handleUpgrade("yearly")} variant="outline" className="w-full h-11 border-border hover:bg-accent hover:text-accent-foreground transition-colors mt-auto">
                Upgrade Yearly
              </Button>
            </div>
          </div>
        </div>

        <div className="text-[11px] uppercase tracking-widest text-muted-foreground text-center mt-16">
          Ledger SaaS Platform
        </div>
      </div>
    </div>
  );
}
