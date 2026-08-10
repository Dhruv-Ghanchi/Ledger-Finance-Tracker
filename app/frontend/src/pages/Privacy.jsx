import React from "react";
import { Link } from "react-router-dom";

export default function Privacy() {
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
        <h1 className="font-display text-4xl font-semibold tracking-tight mb-8">Privacy Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground"><strong>Last updated:</strong> August 10, 2026</p>

          <p>This policy covers Ledger on the web and on our Android and iOS applications.</p>

          <h2>1. Information We Collect</h2>
          <p>We collect the following information when you use Ledger:</p>
          <ul>
            <li><strong>Account Information:</strong> Name, email address, phone number (optional), profile picture (from Google OAuth)</li>
            <li><strong>Financial Data:</strong> Transaction amounts, categories, dates, notes, scope (personal/business)</li>
            <li><strong>Usage Data:</strong> IP address, browser type, device information, access times</li>
            <li><strong>Subscription Data:</strong> Plan type, payment history (via Razorpay), subscription status</li>
            <li><strong>Device Permissions (mobile app only):</strong> Access to your photo library / file storage, requested only when you choose to import a receipt or statement</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To provide and maintain the Service</li>
            <li>To authenticate and authorize your account</li>
            <li>To process subscriptions and payments via Razorpay</li>
            <li>To send service-related notifications</li>
            <li>To improve and personalize your experience</li>
            <li>To comply with legal obligations</li>
          </ul>

          <h2>3. Data Storage & Security</h2>
          <ul>
            <li>Data is stored in a secure MongoDB database with encryption at rest</li>
            <li>All API communications use HTTPS/TLS encryption</li>
            <li>Authentication is handled by Firebase Auth (industry-standard OAuth2/OIDC)</li>
            <li>We implement role-based access control - users can only access their own data</li>
            <li>Regular security audits and dependency updates</li>
          </ul>

          <h2>4. Third-Party Services & AI Processing</h2>
          <p>We use the following third-party services:</p>
          <ul>
            <li><strong>Firebase Authentication:</strong> For user authentication and identity management</li>
            <li><strong>Razorpay:</strong> For subscription payment processing</li>
            <li><strong>MongoDB Atlas:</strong> For database hosting</li>
            <li><strong>AI Providers (OpenAI/Groq/Google):</strong> We use external AI APIs to power Ledger AI and Smart Receipt Scanning. When you use these features, minimal required text data is sent to these providers for processing. <strong>Your data is NOT used to train their AI models.</strong></li>
          </ul>
          <p>These providers have their own privacy policies. We only share the minimum data necessary for them to provide their services.</p>
          
          <h2>5. Uploaded Files & Receipts (Ephemeral Storage)</h2>
          <p>When you upload an image of a receipt or a bank statement CSV/Excel file for the Smart Scanner to process:</p>
          <ul>
            <li>The file is temporarily loaded into server memory for extraction.</li>
            <li><strong>The file is instantly and permanently deleted</strong> from our servers the moment extraction is complete (usually within seconds).</li>
            <li>We do not store your original receipts, images, or statement files in our database.</li>
          </ul>

          <h2>6. Data Retention</h2>
          <ul>
            <li>Account data is retained while your account is active</li>
            <li>Financial data is retained for 7 years for tax/compliance purposes (Indian regulations)</li>
            <li>You can request deletion of your account and associated data at any time</li>
            <li>Upon deletion, data is purged within 30 days from active systems and 90 days from backups</li>
          </ul>

          <h2>7. Your Rights</h2>
          <p>Under applicable data protection laws, you have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Rectify inaccurate data</li>
            <li>Request erasure of your data</li>
            <li>Restrict processing of your data</li>
            <li>Data portability (export your data in CSV/Excel format)</li>
            <li>Object to processing</li>
          </ul>

          <h2>8. Cookies & Tracking</h2>
          <p>We use essential cookies for authentication and session management. We do not use tracking cookies, analytics cookies, or advertising cookies.</p>

          <h2>9. Children's Privacy</h2>
          <p>Ledger is not intended for users under 18. We do not knowingly collect personal information from children under 18. If you become aware that a child has provided us with personal information, please contact us immediately.</p>

          <h2>10. International Transfers</h2>
          <p>Your data is stored on servers located in India (Mumbai region). We do not transfer your data outside India unless required by law.</p>

          <h2>11. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.</p>

          <h2>12. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact us via the <Link to="/" className="underline">Contact section</Link> on our landing page.</p>
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