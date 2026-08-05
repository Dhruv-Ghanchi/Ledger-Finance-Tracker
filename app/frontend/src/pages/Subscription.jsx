import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CreditCard, Calendar, AlertCircle, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { formatINR, getSubscriptionExpiry } from "@/lib/format";

export default function SubscriptionPage() {
  const { dbUser, currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const fetchSubscription = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [subRes, payRes] = await Promise.all([
        api.get("/payments/subscription"),
        api.get("/payments/history"),
      ]);
      setSubscription(subRes.data);
      setPaymentHistory(payRes.data || []);
    } catch (e) {
      console.error("Failed to fetch subscription", e);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel your subscription? You'll lose premium access at the end of the billing period.")) {
      return;
    }
    setCancelling(true);
    try {
      await api.post("/payments/cancel");
      toast.success("Subscription cancelled. Premium access continues until the end of the billing period.");
      fetchSubscription();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async (plan) => {
    if (!currentUser) {
      navigate(`/register?intent=${plan}`);
      return;
    }

    const res = await loadRazorpay();
    if (!res) {
      alert("Razorpay SDK failed to load");
      return;
    }

    try {
      const { data } = await api.post("/payments/subscribe", { plan });
      
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        subscription_id: data.subscription_id,
        name: "Ledger SaaS",
        description: `${plan} Premium Subscription`,
        handler: function (response) {
          toast.success("Payment successful! Your premium access will be active shortly.");
          fetchSubscription();
        },
        prefill: {
          email: dbUser?.email,
          name: dbUser?.name,
        },
        theme: {
          color: "#0a0a0a",
        },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.open();
    } catch (error) {
      toast.error("Failed to initiate subscription: " + (error.response?.data?.detail || error.message));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  const isPremium = dbUser?.plan === "monthly" || dbUser?.plan === "yearly" || dbUser?.plan === "lifetime";
  const planLabel = dbUser?.plan === "monthly" ? "Monthly" : dbUser?.plan === "yearly" ? "Yearly" : dbUser?.plan === "lifetime" ? "Lifetime" : "Free Trial";
  const expiryDate = getSubscriptionExpiry(dbUser, currentUser);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border" data-testid="sticky-header">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 mr-2">
            <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center">
              <span className="text-background font-display text-sm font-bold">₹</span>
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="font-display font-semibold tracking-tight text-[15px]">Ledger</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Subscription</div>
            </div>
          </Link>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8" data-testid="dashboard-main">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="ml-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">Manage Subscription</h1>
              <p className="text-sm text-muted-foreground">View and manage your Ledger Premium subscription</p>
            </div>
          </div>

          {/* Current Plan Card */}
          <Card className={isPremium ? "border-2 border-foreground" : "border-border"}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-foreground/10 flex items-center justify-center">
                    <CreditCard className="w-8 h-8 text-foreground" />
                  </div>
                  <div>
                    <div className="font-display text-2xl font-semibold">{planLabel} Plan</div>
                    <div className="text-sm text-muted-foreground">
                      {isPremium ? "Active subscription" : "Free trial - 60 days"}
                    </div>
                  </div>
                </div>
                {isPremium && expiryDate && (
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground uppercase tracking-widest">Renews on</div>
                    <div className="font-mono font-semibold">{expiryDate}</div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {!isPremium && (
                <div className="border-t border-border pt-4 space-y-4">
                  <p className="text-sm text-muted-foreground">Upgrade to unlock premium features:</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      onClick={() => handleUpgrade("monthly")}
                      variant="outline"
                      className="group h-16 border-2 border-border hover:border-foreground hover:bg-foreground transition-all relative w-full flex items-center justify-start p-4"
                    >
                      <div className="text-left">
                        <div className="font-semibold text-foreground group-hover:text-background">Monthly</div>
                        <div className="text-sm text-muted-foreground group-hover:text-background/80">₹49/month</div>
                      </div>
                    </Button>
                    <Button 
                      onClick={() => handleUpgrade("yearly")}
                      variant="outline"
                      className="group h-16 border-2 border-border hover:border-foreground hover:bg-foreground transition-all relative w-full flex items-center justify-start p-4"
                    >
                      <div className="text-left">
                        <div className="font-semibold text-foreground group-hover:text-background">Yearly</div>
                        <div className="text-sm text-muted-foreground group-hover:text-background/80">₹499/year <span className="text-green-600 font-medium ml-1">(Save 15%)</span></div>
                      </div>
                    </Button>
                  </div>
                </div>
              )}

              {isPremium && (
                <div className="border-t border-border pt-4">
                  <Button 
                    variant="destructive" 
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="w-full"
                  >
                    {cancelling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <>Cancel Subscription</>}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    You'll retain premium access until the end of your current billing period.
                  </p>
                </div>
              )}

              {/* Trial/Free plan info */}
              {!isPremium && expiryDate && (
                <div className="border-t border-border pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span>Trial ends on <strong>{expiryDate}</strong>. Upgrade to continue with premium features.</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          {paymentHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl">Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          payment.status === "captured" ? "bg-green-100 text-green-600" :
                          payment.status === "failed" ? "bg-red-100 text-red-600" :
                          "bg-yellow-100 text-yellow-600"
                        }`}>
                          {payment.status === "captured" && <CheckCircle2 className="w-5 h-5" />}
                          {payment.status === "failed" && <XCircle className="w-5 h-5" />}
                          {payment.status === "pending" && <AlertCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-medium">{payment.plan === "monthly" ? "Monthly Plan" : "Yearly Plan"}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(payment.created_at).toLocaleDateString()} · {payment.status}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-semibold">{formatINR(payment.amount, { isPaise: true })}</div>
                        <div className="text-xs text-muted-foreground">INR</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Features comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl">Plan Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">Free Trial</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-foreground" /> All premium features for 60 days</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-foreground" /> Unlimited entries</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-foreground" /> Export data (CSV/Excel)</li>
                    <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-muted-foreground" /> Custom categories</li>
                    <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-muted-foreground" /> Advanced reports</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold">Premium (Monthly/Yearly)</h4>
                  <ul className="text-sm text-foreground space-y-2">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /> Unlimited entries</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /> Export data (CSV/Excel/PDF)</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /> Custom categories (unlimited)</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /> Advanced reports & analytics</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /> Priority support</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}