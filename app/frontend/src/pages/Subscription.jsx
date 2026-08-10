import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { startSubscriptionCheckout } from "@/lib/razorpay";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CreditCard, Calendar, AlertCircle, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { formatINR, getSubscriptionExpiry } from "@/lib/format";
import { hasPremiumAccess, isPaidPlan, isTrialActive } from "@/lib/premium";

export default function SubscriptionPage() {
  const { dbUser, currentUser, refreshDbUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [cancelling, setCancelling] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

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
      setPaymentHistory(Array.isArray(payRes.data) ? payRes.data : (payRes.data?.payments || []));
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

  const handleUpgrade = (plan) => {
    if (!currentUser) {
      navigate(`/register?intent=${plan}`);
      return;
    }
    startSubscriptionCheckout({
      plan,
      user: dbUser,
      onSuccess: fetchSubscription,
    });
  };

  const handleRedeemPromo = async () => {
    if (!promoCode.trim()) return;
    setRedeeming(true);
    try {
      const updated = await refreshDbUser({ promo_code: promoCode.trim() });
      if (updated?.promo_status === "applied") {
        toast.success("Promo code applied!");
        setPromoCode("");
        fetchSubscription();
      } else if (updated?.promo_status === "exhausted") {
        toast.error("This offer has ended.");
      } else if (updated?.promo_status === "already_used") {
        toast.error("You've already redeemed a promo code.");
      } else {
        toast.error("That code isn't valid.");
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to redeem code");
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  const isPremium = hasPremiumAccess(dbUser);
  const paidPlan = isPaidPlan(dbUser);
  const onTrial = isTrialActive(dbUser);
  const planLabel = dbUser?.plan === "monthly" ? "Monthly" : dbUser?.plan === "yearly" ? "Yearly" : (dbUser?.plan === "lifetime" || dbUser?.plan === "lifetimefree") ? "Lifetime" : onTrial ? "Free Trial" : "Free";
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
                      {paidPlan ? "Active subscription" : onTrial ? "Trial active" : "Free plan"}
                    </div>
                  </div>
                </div>
                {paidPlan && expiryDate && (
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
                        <div className="text-sm text-muted-foreground group-hover:text-background/80">₹11/month</div>
                      </div>
                    </Button>
                    <Button 
                      onClick={() => handleUpgrade("yearly")}
                      variant="outline"
                      className="group h-16 border-2 border-border hover:border-foreground hover:bg-foreground transition-all relative w-full flex items-center justify-start p-4"
                    >
                      <div className="text-left">
                        <div className="font-semibold text-foreground group-hover:text-background">Yearly</div>
                        <div className="text-sm text-muted-foreground group-hover:text-background/80">₹51/year <span className="text-green-600 font-medium ml-1">(Save 61%)</span></div>
                      </div>
                    </Button>
                  </div>
                </div>
              )}

              {isPremium && (
                <div className="border-t border-border pt-4">
                  {paidPlan && (
                    <>
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
                    </>
                  )}
                  {onTrial && expiryDate && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="w-4 h-4 text-blue-500" />
                      <span>Trial active until <strong>{expiryDate}</strong>. Enjoy full premium access during your trial.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Free plan info */}
              {!isPremium && expiryDate && (
                <div className="border-t border-border pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span>Trial ended on <strong>{expiryDate}</strong>. Upgrade to continue with premium features.</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Redeem a promo code — works regardless of how the account was
              created (email, Google from Login, Google from Register). */}
          {dbUser?.plan !== "lifetime" && dbUser?.plan !== "lifetimefree" && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Have a promo code?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRedeemPromo()}
                    className="uppercase"
                  />
                  <Button onClick={handleRedeemPromo} disabled={redeeming || !promoCode.trim()}>
                    {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Redeem"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-foreground" /> All premium features for 6 months</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-foreground" /> Unlimited entries</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-foreground" /> Export data (CSV/Excel)</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-foreground" /> Custom categories (unlimited)</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-foreground" /> Advanced reports & analytics</li>
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