import { api } from "@/lib/api";
import { toast } from "sonner";

let razorpayScriptPromise = null;

/** Loads the Razorpay checkout script once and caches the result. */
export function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => {
      razorpayScriptPromise = null; // allow retrying on a later attempt
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

/**
 * Starts a Razorpay subscription checkout for the given plan. Shared by every
 * upgrade entry point (Pricing page, Subscription page, premium-gate modal)
 * so success/failure/dismiss behavior — and the post-payment user re-sync —
 * stays consistent no matter where the checkout was launched from.
 */
export async function startSubscriptionCheckout({ plan, user, onSuccess, onFailure, onDismiss }) {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    toast.error("Razorpay failed to load. Check your connection and try again.");
    return;
  }

  let data;
  try {
    ({ data } = await api.post("/payments/subscribe", { plan }));
  } catch (error) {
    toast.error(error.response?.data?.detail || "Failed to start checkout. Please try again.");
    return;
  }

  const options = {
    key: process.env.REACT_APP_RAZORPAY_KEY_ID,
    subscription_id: data.subscription_id,
    name: "Ledger",
    description: `${plan === "monthly" ? "Monthly" : "Yearly"} Premium Subscription`,
    prefill: {
      name: user?.name || "",
      email: user?.email || "",
      contact: user?.phone || "",
    },
    theme: { color: "#0F52BA" },
    handler: async function () {
      try {
        // Refresh the local user/plan cache immediately — the webhook is the
        // source of truth, this just avoids a stale "free" plan flash.
        await api.post("/users/sync", {});
      } catch {
        // non-fatal, webhook will settle this shortly regardless
      }
      toast.success("Payment successful! Your premium access will be active shortly.");
      onSuccess?.();
    },
    modal: {
      ondismiss: function () {
        onDismiss?.();
      },
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.on("payment.failed", function (response) {
    toast.error(`Payment failed: ${response.error?.description || "Please try again."}`);
    onFailure?.(response);
  });
  rzp.open();
}
