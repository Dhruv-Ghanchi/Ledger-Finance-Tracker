import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, FileText, Scan } from "lucide-react";
import { startSubscriptionCheckout } from "@/lib/razorpay";
import { useAuth } from "@/context/AuthContext";

export default function PremiumUpgradeModal() {
  const [open, setOpen] = useState(false);
  const { dbUser } = useAuth();
  const [loading, setLoading] = useState(null);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener("premiumRequired", handleOpen);
    return () => window.removeEventListener("premiumRequired", handleOpen);
  }, []);

  const handleUpgrade = async (planType) => {
    setLoading(planType);
    await startSubscriptionCheckout({
      plan: planType,
      user: dbUser,
      onSuccess: () => setOpen(false),
    });
    setLoading(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
        <div className="bg-gradient-to-b from-primary/10 to-transparent px-6 py-8 border-b border-border text-center">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-4 text-primary">
            <Sparkles className="w-8 h-8" />
          </div>
          <DialogTitle className="text-2xl font-display font-bold">Unlock Ledger Premium</DialogTitle>
          <DialogDescription className="mt-2 text-base">
            This is a premium feature. Upgrade to Ledger Premium to unlock it and all our powerful smart features.
          </DialogDescription>
        </div>
        
        <div className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col items-center text-center p-3 rounded-lg bg-muted/50">
              <Zap className="w-6 h-6 mb-2 text-blue-500" />
              <div className="font-semibold text-sm">Ledger AI</div>
              <div className="text-xs text-muted-foreground mt-1">Chat to log and query expenses</div>
            </div>
            <div className="flex flex-col items-center text-center p-3 rounded-lg bg-muted/50">
              <Scan className="w-6 h-6 mb-2 text-green-500" />
              <div className="font-semibold text-sm">Smart Scanner</div>
              <div className="text-xs text-muted-foreground mt-1">Extract data from receipts instantly</div>
            </div>
            <div className="flex flex-col items-center text-center p-3 rounded-lg bg-muted/50">
              <FileText className="w-6 h-6 mb-2 text-orange-500" />
              <div className="font-semibold text-sm">PDF Reports</div>
              <div className="text-xs text-muted-foreground mt-1">Download official monthly invoices</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <Button 
              onClick={() => handleUpgrade("monthly")}
              variant="outline"
              disabled={loading !== null}
              className="group h-auto border-2 border-border hover:border-foreground hover:bg-foreground transition-all relative w-full flex flex-col items-start justify-center p-4 text-left"
            >
              <div className="font-semibold text-foreground group-hover:text-background text-lg">Monthly</div>
              <div className="text-sm text-muted-foreground group-hover:text-background/80">₹49/month</div>
            </Button>
            <Button 
              onClick={() => handleUpgrade("yearly")}
              variant="outline"
              disabled={loading !== null}
              className="group h-auto border-2 border-primary bg-primary/5 hover:border-primary hover:bg-primary transition-all relative w-full flex flex-col items-start justify-center p-4 text-left"
            >
              <div className="absolute -top-3 right-3 bg-primary text-primary-foreground text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">
                Best Value
              </div>
              <div className="font-semibold text-primary group-hover:text-primary-foreground text-lg">Yearly</div>
              <div className="text-sm text-primary/80 group-hover:text-primary-foreground/80">₹499/year</div>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
