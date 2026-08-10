import React from "react";
import { Link } from "react-router-dom";

export default function Terms() {
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
        <h1 className="font-display text-4xl font-semibold tracking-tight mb-8">Terms & Conditions</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground"><strong>Last updated:</strong> August 10, 2026</p>

          <h2>1. Acceptance of Terms</h2>
          <p>By accessing and using Ledger ("the Service") — via our website or our Android and iOS applications — you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p>

          <h2>2. Description of Service</h2>
          <p>Ledger is a personal finance tracking SaaS platform, available on the web and as native mobile apps, that allows users to record income and expenses, categorize transactions, view summaries, and export data. The Service is provided "as is" and "as available" without warranties of any kind.</p>

          <h2>3. User Accounts</h2>
          <ul>
            <li>You must provide accurate and complete registration information.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You are responsible for all activities that occur under your account.</li>
            <li>You must notify us immediately of any unauthorized use of your account.</li>
          </ul>

          <h2>4. Subscription & Billing</h2>
          <ul>
            <li>All new users are granted a 6-month free trial with full premium access upon registration.</li>
            <li>After the trial expires, premium subscriptions (AI Chat, OCR Scanner, Invoices) are billed monthly or annually via Razorpay.</li>
            <li>Subscriptions auto-renew unless cancelled before the renewal date.</li>
            <li>Refunds are handled per our <Link to="/refund" className="underline">Refund Policy</Link>.</li>
            <li>Prices are in INR and subject to change with notice.</li>
          </ul>
          
          <h2>5. AI Features & API Usage</h2>
          <p>By using the KOIN AI Assistant and Smart Receipt Scanner features, you consent to the sending of necessary text and image data to third-party AI service providers (Google Gemini, with Groq as a fallback) solely for the purpose of processing and extracting your financial data. Your data is strictly not used by these providers to train their AI models.</p>

          <h2>6. Data & Privacy</h2>
          <p>Your financial data is stored securely and is never shared with third parties. See our <Link to="/privacy" className="underline">Privacy Policy</Link> for details on data collection, storage, and your rights.</p>

          <h2>7. Intellectual Property</h2>
          <p>The Service and its original content, features, and functionality are owned by Ledger and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.</p>

          <h2>8. Disclaimer of Warranties</h2>
          <p>The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.</p>

          <h2>9. Limitation of Liability</h2>
          <p>In no event shall Ledger, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses resulting from your use of the Service.</p>

          <h2>10. Governing Law</h2>
          <p>These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.</p>

          <h2>11. Changes to Terms</h2>
          <p>We reserve the right to modify these Terms at any time. We will provide notice of any material changes by posting the new Terms on this page and updating the "Last updated" date.</p>

          <h2>12. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us via the <Link to="/" className="underline">Contact section</Link> on our landing page.</p>
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