import React from "react";
import { Link } from "react-router-dom";

export default function Refund() {
  return (
    <div className="min-h-screen bg-background bg-grain flex flex-col">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center">
              <span className="text-background font-display text-sm font-bold">₹</span>
            </div>
            <span className="font-display font-semibold tracking-tight text-[15px]">Ledger</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight mb-8">Refund Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground"><strong>Last updated:</strong> August 10, 2026</p>

          <h2>1. Free Trial</h2>
          <p>All new users receive a 60-day free trial with full access to premium features. No credit card is required to start the trial. You can cancel at any time during the trial without being charged.</p>

          <h2>2. Paid Subscriptions</h2>
          <p>After the trial ends, or if you choose to upgrade early, you will be billed according to your chosen plan:</p>
          <ul>
            <li><strong>Monthly:</strong> ₹49/month (billed monthly)</li>
            <li><strong>Yearly:</strong> ₹499/year (billed annually, ~15% savings)</li>
          </ul>
          <p>Subscriptions auto-renew unless cancelled before the renewal date.</p>

          <h2>3. Refund Eligibility</h2>
          <p>We offer refunds under the following circumstances:</p>
          <ul>
            <li><strong>Accidental Double Charge:</strong> If you were charged twice for the same period due to a system error</li>
            <li><strong>Service Unavailability:</strong> If the Service was substantially unavailable for more than 72 consecutive hours</li>
            <li><strong>Unauthorized Charge:</strong> If a charge was made without your authorization (subject to verification)</li>
          </ul>

          <h2>4. Non-Refundable Circumstances</h2>
          <p>Refunds are generally not provided for:</p>
          <ul>
            <li>Change of mind or dissatisfaction with features</li>
            <li>Failure to cancel before auto-renewal</li>
            <li>Partial usage of a billing period</li>
            <li>Account termination due to violation of Terms of Service</li>
            <li>Subscription gifts or promotional credits</li>
          </ul>

          <h2>5. Refund Process</h2>
          <ol>
            <li>Contact us via the <Link to="/" className="underline">Contact section</Link> within 14 days of the charge</li>
            <li>Provide your registered email, transaction ID, and reason for refund request</li>
            <li>We will review your request within 5 business days</li>
            <li>If approved, refunds are processed back to the original payment method within 7-10 business days</li>
          </ol>

          <h2>6. Razorpay Refunds</h2>
          <p>All payments are processed through Razorpay. Refunds are subject to Razorpay's refund policies and processing timelines. Razorpay may deduct payment gateway fees from refund amounts as per their terms.</p>

          <h2>7. Cancellation vs Refund</h2>
          <p>You can cancel your subscription at any time from the <Link to="/subscription" className="underline">Subscription</Link> page. Cancellation stops future charges but does not entitle you to a refund for the current billing period. You will retain premium access until the end of the paid period.</p>

          <h2>8. Disputes</h2>
          <p>If you dispute a charge with your bank/card issuer before contacting us, the dispute process may delay or prevent a direct refund. We recommend contacting us first to resolve any billing issues.</p>

          <h2>9. Changes to This Policy</h2>
          <p>We may update this Refund Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.</p>

          <h2>10. Contact Us</h2>
          <p>For refund requests or billing questions, please contact us via the <Link to="/" className="underline">Contact section</Link> on our landing page.</p>
        </div>
      </main>

      <footer className="border-t border-border/40 py-10 px-4 bg-background">
        <div className="max-w-3xl mx-auto text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Ledger Platform. All rights reserved.
        </div>
      </footer>
    </div>
  );
}