import React from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Pricing() {
  const { dbUser } = useAuth();
  const navigate = useNavigate();

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
          alert("Payment successful! Your premium access will be active shortly.");
          navigate("/");
        },
        prefill: {
          email: dbUser?.email,
          name: dbUser?.name,
        },
        theme: {
          color: "#2563eb",
        },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.open();
    } catch (error) {
      alert("Failed to initiate subscription: " + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-4">Pricing Plans</h1>
        <p className="text-center text-zinc-400 mb-12">Upgrade your account to unlock premium features.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 flex flex-col">
            <h3 className="text-xl font-bold mb-2">Free Trial</h3>
            <p className="text-4xl font-bold mb-6">₹0<span className="text-sm font-normal text-zinc-500">/7 days</span></p>
            <ul className="text-zinc-400 space-y-3 mb-8 flex-1">
              <li>✓ All premium features</li>
              <li>✓ 7 days duration</li>
              <li>✓ No credit card required</li>
            </ul>
            <Button disabled variant="outline" className="w-full">Active Default</Button>
          </div>

          <div className="bg-zinc-900 border border-blue-500 rounded-xl p-8 flex flex-col relative">
            <div className="absolute top-0 right-0 bg-blue-500 text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl">POPULAR</div>
            <h3 className="text-xl font-bold mb-2">Monthly Premium</h3>
            <p className="text-4xl font-bold mb-6">₹49<span className="text-sm font-normal text-zinc-500">/month</span></p>
            <ul className="text-zinc-400 space-y-3 mb-8 flex-1">
              <li>✓ Unlimited entries</li>
              <li>✓ Advanced reports</li>
              <li>✓ Export data</li>
            </ul>
            <Button onClick={() => handleUpgrade("monthly")} className="w-full bg-blue-600 hover:bg-blue-700 text-white">Upgrade Monthly</Button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 flex flex-col">
            <h3 className="text-xl font-bold mb-2">Yearly Premium</h3>
            <p className="text-4xl font-bold mb-6">₹499<span className="text-sm font-normal text-zinc-500">/year</span></p>
            <ul className="text-zinc-400 space-y-3 mb-8 flex-1">
              <li>✓ Save 15%</li>
              <li>✓ Unlimited entries</li>
              <li>✓ Advanced reports</li>
              <li>✓ Export data</li>
            </ul>
            <Button onClick={() => handleUpgrade("yearly")} variant="outline" className="w-full">Upgrade Yearly</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
