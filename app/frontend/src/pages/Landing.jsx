import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShieldCheck, BarChart3, Smartphone, ArrowRight, Zap, CheckCircle2 } from "lucide-react";

export default function Landing() {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen bg-background bg-grain text-foreground flex flex-col font-sans">
      
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center">
              <span className="text-background font-display text-sm font-bold">₹</span>
            </div>
            <span className="font-display font-semibold tracking-tight text-[16px]">Ledger</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </nav>

          <div className="flex items-center gap-4">
            {currentUser ? (
              <Link to="/dashboard">
                <Button variant="default" size="sm">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:inline-block text-sm font-medium hover:underline text-muted-foreground hover:text-foreground">
                  Sign In
                </Link>
                <Link to="/register">
                  <Button variant="default" size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center">
        
        {/* Hero Section */}
        <section className="w-full py-24 md:py-32 flex flex-col items-center text-center px-4">
          <div className="inline-flex items-center rounded-full border border-border px-3 py-1 text-sm mb-8 bg-muted/50 backdrop-blur text-muted-foreground">
            <Zap className="h-4 w-4 mr-2 text-yellow-500" />
            <span>v1.0 is now live for everyone</span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl leading-tight">
            Take control of your <br className="hidden md:block" /> financial future.
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl">
            The minimalist, secure personal ledger that respects your privacy. Track spending, monitor subscriptions, and build wealth effortlessly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
             <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  Start for free <ArrowRight className="h-4 w-4" />
                </Button>
             </Link>
             <Link to="/pricing">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  View Pricing
                </Button>
             </Link>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-24 bg-muted/20 border-y border-border/40 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl font-bold tracking-tight mb-4">Everything you need to manage your money</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">No clutter, no confusing menus. Just the tools you need to track your financial health.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-background border-border shadow-sm">
                <CardHeader>
                  <ShieldCheck className="h-8 w-8 mb-4 text-foreground" />
                  <CardTitle className="font-display">Bank-Grade Security</CardTitle>
                  <CardDescription className="text-sm">Powered by Firebase Authentication. Your data is isolated, encrypted, and completely yours.</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-background border-border shadow-sm">
                <CardHeader>
                  <BarChart3 className="h-8 w-8 mb-4 text-foreground" />
                  <CardTitle className="font-display">Intelligent Analytics</CardTitle>
                  <CardDescription className="text-sm">Visualize your spending habits with gorgeous, easy-to-read charts and monthly summaries.</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-background border-border shadow-sm">
                <CardHeader>
                  <Smartphone className="h-8 w-8 mb-4 text-foreground" />
                  <CardTitle className="font-display">Multi-Device Sync</CardTitle>
                  <CardDescription className="text-sm">Access your ledger seamlessly across your phone, tablet, and desktop without losing a beat.</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Highlight Section */}
        <section id="how-it-works" className="w-full py-24 px-4 container mx-auto max-w-5xl text-center">
           <h2 className="font-display text-3xl font-bold tracking-tight mb-8">Built for clarity. Designed for speed.</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-16 text-left mt-16 items-center">
             <div className="space-y-6">
               <h3 className="text-2xl font-semibold font-display">Effortless Entry</h3>
               <p className="text-muted-foreground leading-relaxed text-lg">We stripped away the noise. Adding a transaction takes two seconds. Categorize it, add a note, and you're done.</p>
               <ul className="space-y-4 pt-4">
                 <li className="flex items-center gap-3 text-muted-foreground"><CheckCircle2 className="h-5 w-5 text-foreground"/> Create custom categories</li>
                 <li className="flex items-center gap-3 text-muted-foreground"><CheckCircle2 className="h-5 w-5 text-foreground"/> Instant, real-time search</li>
                 <li className="flex items-center gap-3 text-muted-foreground"><CheckCircle2 className="h-5 w-5 text-foreground"/> Secure data export</li>
               </ul>
             </div>
             <div className="bg-muted/40 border border-border/60 rounded-xl p-8 flex flex-col justify-center items-center h-80 relative overflow-hidden">
               {/* Minimalist UI Abstraction */}
               <div className="w-full max-w-xs space-y-4 relative z-10">
                 <div className="h-12 bg-background rounded-md border border-border shadow-sm"></div>
                 <div className="h-12 bg-background rounded-md border border-border shadow-sm w-5/6"></div>
                 <div className="h-12 bg-foreground rounded-md w-full mt-6"></div>
               </div>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-foreground/5 blur-3xl rounded-full"></div>
             </div>
           </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="w-full py-24 bg-muted/20 border-t border-border/40 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl font-bold tracking-tight mb-4">Frequently Asked Questions</h2>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left font-display">Is my data secure?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Yes, your data is securely stored in a multi-tenant database structure. We use Firebase Authentication to ensure that only you can access your financial records.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left font-display">Is there a mobile app?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Ledger is a Progressive Web App (PWA) which means you can install it directly to your home screen from your mobile browser for a native app-like experience.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left font-display">Can I export my data?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Yes! You can export all your transactions at any time in CSV format for use in Excel, Google Sheets, or other accounting tools.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

      </main>

      <footer className="w-full border-t border-border/40 py-10 px-4 bg-background">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded border border-border flex items-center justify-center bg-foreground">
              <span className="text-background font-display text-[10px] font-bold">₹</span>
            </div>
            <span className="text-sm font-semibold tracking-tight font-display">Ledger SaaS</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Ledger Platform. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
