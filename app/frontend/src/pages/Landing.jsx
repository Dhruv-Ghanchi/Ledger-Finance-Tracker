import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ShieldCheck, BarChart3, Smartphone, ArrowRight, Zap, CheckCircle2, Github, Linkedin, MessageSquare, Mail, Phone, Loader2, FileSpreadsheet, ReceiptText, Twitter, Plus, Download, User, Instagram, Scan, FileText, Menu, Apple, Clock } from "lucide-react";

// GitHub's "latest" release alias always resolves to the newest release's
// asset with this exact filename — the uploaded release asset must be named
// exactly "Ledger.apk" so the browser saves the download as "Ledger.apk".
const ANDROID_APK_URL = "https://github.com/Dhruv-Ghanchi/Ledger/releases/latest/download/Ledger.apk";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";
import { toast } from "sonner";

const GmailIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
  </svg>
);

export default function Landing() {
  const { currentUser } = useAuth();
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactSubmitting, setContactSubmitting] = useState(false);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactSubmitting(true);
    try {
      await api.post("/contact", contactForm);
      toast.success("Message sent successfully!");
      setContactForm({ name: "", email: "", message: "" });
    } catch (error) {
      if (error.response?.status === 429) {
        toast.error("Too many requests. Please try again later.");
      } else {
        toast.error("Failed to send message. Please try again.");
      }
    } finally {
      setContactSubmitting(false);
    }
  };

  const handleContactChange = (e) => {
    setContactForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };



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
            <a href="#download" className="hover:text-foreground transition-colors">Download</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-foreground transition-colors">Contact</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
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

            <div className="md:hidden flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <a href="#features" className="w-full">Features</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="#how-it-works" className="w-full">How it works</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="#download" className="w-full">Download</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="#pricing" className="w-full">Pricing</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="#contact" className="w-full">Contact</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="#faq" className="w-full">FAQ</a>
                  </DropdownMenuItem>
                  {!currentUser && (
                    <DropdownMenuItem asChild>
                      <Link to="/login" className="w-full sm:hidden">Sign In</Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center">
        
        {/* Hero Section */}
        <section className="w-full py-24 md:py-32 flex flex-col items-center text-center px-4">
          <div className="inline-flex items-center rounded-full border border-border px-3 py-1 text-sm mb-8 bg-muted/50 backdrop-blur text-muted-foreground">
            <Zap className="h-4 w-4 mr-2 text-yellow-500" />
            <span>KOIN AI & Smart OCR now live</span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl leading-tight">
            Take control of your <br className="hidden md:block" /> financial future.
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl">
            The intelligent personal ledger that respects your privacy. Chat with AI, scan receipts instantly, and build wealth effortlessly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
             <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  Start for free <ArrowRight className="h-4 w-4" />
                </Button>
             </Link>
             <a href="#pricing">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  View Pricing
                </Button>
             </a>
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <span>Secured by Firebase Authentication</span>
          </div>

          {/* Hero Dashboard Mockup - Exact Replica */}
          <div className="mt-20 w-full max-w-5xl mx-auto relative pointer-events-none select-none">
            <div className="w-full bg-background border border-border/60 rounded-t-xl shadow-2xl overflow-hidden flex flex-col relative z-10 mx-auto transform-gpu transition-all duration-700 hover:scale-[1.01]">
              
              {/* Actual Dashboard Header Replica */}
              <div className="border-b border-border bg-background px-4 sm:px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center shrink-0">
                    <span className="text-background font-display text-sm font-bold">₹</span>
                  </div>
                  <div className="hidden sm:block leading-tight text-left">
                    <div className="font-display font-semibold tracking-tight text-[15px] text-foreground">Ledger</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">FY 2026-27</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 overflow-hidden">
                  <div className="hidden md:flex h-9 w-[140px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm opacity-60 items-center justify-between">FY 2026-27</div>
                  <div className="hidden lg:flex h-9 w-[170px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm opacity-60 items-center justify-between">August 2026</div>
                  <div className="hidden sm:flex h-9 px-3 rounded-md border border-input bg-transparent text-sm font-medium items-center gap-2 opacity-60"><Download className="w-4 h-4"/> Export</div>
                  <div className="h-9 px-2 sm:px-3 rounded-md bg-foreground text-background text-sm font-medium flex items-center gap-2 shrink-0"><Plus className="w-4 h-4"/> <span className="hidden sm:inline">Add Entry</span></div>
                  <div className="h-9 w-9 shrink-0 rounded-full border border-border bg-muted flex items-center justify-center sm:ml-2"><User className="w-4 h-4 text-muted-foreground"/></div>
                </div>
              </div>
              
              {/* Actual Dashboard Main Content Replica */}
              <div className="p-6 md:p-8 bg-background flex flex-col gap-6 text-left relative overflow-hidden h-[300px]">
                 <div>
                   <div className="overline text-muted-foreground">Overview</div>
                   <h2 className="font-display text-3xl font-semibold tracking-tight mt-1 text-foreground">August 2026</h2>
                 </div>
                 
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {/* Exact KPI Cards */}
                   <div className="bg-card border border-border p-6 rounded-md shadow-sm">
                     <div className="overline text-muted-foreground">Total Income</div>
                     <div className="font-mono text-2xl font-semibold tracking-tight mt-3 text-foreground">₹1,24,500</div>
                   </div>
                   <div className="bg-card border border-border p-6 rounded-md shadow-sm">
                     <div className="overline text-muted-foreground">Total Expense</div>
                     <div className="font-mono text-2xl font-semibold tracking-tight mt-3 text-foreground">₹42,350</div>
                   </div>
                   <div className="bg-card border border-border p-6 rounded-md shadow-sm">
                     <div className="overline text-muted-foreground">Net · Personal</div>
                     <div className="font-mono text-2xl font-semibold tracking-tight mt-3 text-blue-600">₹68,150</div>
                     <div className="text-xs text-muted-foreground mt-2 font-mono">Surplus</div>
                   </div>
                   <div className="bg-card border border-border p-6 rounded-md shadow-sm">
                     <div className="overline text-muted-foreground">Net · Business</div>
                     <div className="font-mono text-2xl font-semibold tracking-tight mt-3 text-purple-600">₹14,000</div>
                     <div className="text-xs text-muted-foreground mt-2 font-mono">Surplus</div>
                   </div>
                 </div>

                 {/* Bottom Fade to mask the cutoff */}
                 <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none"></div>
              </div>
            </div>
            
            {/* Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-64 bg-foreground/5 blur-[120px] rounded-full z-0 pointer-events-none"></div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-24 bg-muted/20 border-y border-border/40 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl font-bold tracking-tight mb-4">Everything you need to manage your money</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">No clutter, no confusing menus. Just the tools you need to track your financial health.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-background border-border shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                <CardHeader>
                  <MessageSquare className="h-8 w-8 mb-4 text-foreground" />
                  <CardTitle className="font-display">KOIN AI Assistant</CardTitle>
                  <CardDescription className="text-sm">Chat naturally to log expenses, check balances, and query your financial habits effortlessly.</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-background border-border shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                <CardHeader>
                  <Scan className="h-8 w-8 mb-4 text-foreground" />
                  <CardTitle className="font-display">Smart Receipt OCR</CardTitle>
                  <CardDescription className="text-sm">Upload receipts or bank statements. Our engine extracts the data instantly with zero manual entry.</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-background border-border shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                <CardHeader>
                  <FileText className="h-8 w-8 mb-4 text-foreground" />
                  <CardTitle className="font-display">PDF Statements</CardTitle>
                  <CardDescription className="text-sm">Download official monthly and yearly PDF invoices of your financial data for your records.</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-background border-border shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                <CardHeader>
                  <User className="h-8 w-8 mb-4 text-foreground" />
                  <CardTitle className="font-display">IOUs & Debts</CardTitle>
                  <CardDescription className="text-sm">Keep track of money you owe or are owed. Settle up seamlessly with built-in tracking.</CardDescription>
                </CardHeader>
              </Card>
            </div>
            
            {/* Deep Dive Feature Block */}
            <div className="mt-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 bg-background border border-border/60 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-6">
                 {/* Visual Representation of Analytics */}
                 <div className="flex justify-between items-center mb-4">
                   <div>
                     <div className="overline text-muted-foreground text-xs uppercase tracking-wider font-bold">Monthly Income vs Expense</div>
                     <div className="font-display text-lg font-semibold tracking-tight mt-1">FY 2026-27</div>
                   </div>
                 </div>
                 
                 {/* Actual Recharts Component Replica */}
                 <div className="h-[220px] w-full mt-2">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={[
                       { label: "Apr", income: 80000, expense: 45000 },
                       { label: "May", income: 82000, expense: 52000 },
                       { label: "Jun", income: 79000, expense: 38000 },
                       { label: "Jul", income: 85000, expense: 49000 },
                       { label: "Aug", income: 124500, expense: 42350 },
                     ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="2 4" stroke="#E4E4E7" vertical={false} />
                       <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="#71717A" axisLine={false} tickLine={false} />
                       <YAxis tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="#71717A" axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v)} />
                       <Bar dataKey="income" name="Income" fill="#059669" radius={[2,2,0,0]} maxBarSize={16} />
                       <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[2,2,0,0]} maxBarSize={16} />
                     </BarChart>
                   </ResponsiveContainer>
                 </div>
              </div>
              <div className="order-1 md:order-2 space-y-6">
                <div className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Pro Feature
                </div>
                <h3 className="text-3xl font-bold font-display tracking-tight">Your data, ready for tax season.</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  We don't hold your data hostage. Gain instant insights into your spending patterns with beautiful monthly and yearly summaries. 
                </p>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  When it's time to file taxes or share with your accountant, export your entire ledger to Excel, CSV, or generate professional PDF invoices with a single click.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* Highlight Section */}
        <section id="how-it-works" className="w-full py-24 px-4 container mx-auto max-w-5xl text-center">
           <h2 className="font-display text-3xl font-bold tracking-tight mb-8">Built for clarity. Designed for speed.</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-16 text-left mt-16 items-center">
             <div className="space-y-10">
               <div>
                 <h3 className="text-2xl font-semibold font-display mb-3">1. Select your scope</h3>
                 <p className="text-muted-foreground leading-relaxed">Seamlessly toggle between your Personal and Business ledgers. Keep your finances completely isolated but accessible from one place.</p>
               </div>
               <div>
                 <h3 className="text-2xl font-semibold font-display mb-3">2. Log the details</h3>
                 <p className="text-muted-foreground leading-relaxed">We stripped away the noise. Enter the amount, pick a date, and tag a category in seconds. No complex menus.</p>
               </div>
               <div>
                 <h3 className="text-2xl font-semibold font-display mb-3">3. Track instantly</h3>
                 <p className="text-muted-foreground leading-relaxed">Hit save and your dashboard charts, analytics, and summaries update in real-time across all your devices.</p>
               </div>
             </div>
             <div className="bg-muted/30 border border-border/60 rounded-2xl p-6 sm:p-8 flex flex-col justify-center items-center relative overflow-hidden">
               {/* Exact Live Replica of AddEntryDialog */}
               <div className="w-full max-w-[440px] bg-background border border-border rounded-lg shadow-2xl relative z-10 overflow-hidden flex flex-col transform transition-transform hover:scale-[1.02] duration-500">
                 <div className="p-6">
                   <div className="font-display text-2xl tracking-tight mb-1 font-semibold">New Entry</div>
                   <div className="text-xs text-muted-foreground mb-4">Toggle Personal or Business, then choose income or expense.</div>
                   
                   {/* Scope toggle */}
                   <div className="grid grid-cols-2 gap-2 mt-1 mb-4">
                     <button className="h-11 rounded-md border text-sm font-medium transition-all bg-personal border-personal text-white">Personal</button>
                     <button className="h-11 rounded-md border text-sm font-medium transition-all bg-card border-border text-business pointer-events-none">Business</button>
                   </div>

                   {/* Type toggle */}
                   <div className="grid grid-cols-2 gap-2 mb-4">
                     <button className="h-10 rounded-md border text-sm font-medium bg-destructive text-destructive-foreground border-destructive pointer-events-none">Expense</button>
                     <button className="h-10 rounded-md border text-sm font-medium bg-card border-border text-muted-foreground pointer-events-none">Income</button>
                   </div>

                   <div className="grid grid-cols-2 gap-3 mt-2 mb-4">
                     <div>
                       <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Amount (₹)</label>
                       <input type="text" readOnly value="1250.00" className="w-full h-10 bg-background border border-input rounded-md px-3 text-sm font-mono pointer-events-none" />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Date</label>
                       <input type="date" readOnly value="2026-08-02" className="w-full h-10 bg-background border border-input rounded-md px-3 text-sm font-mono pointer-events-none text-muted-foreground" />
                     </div>
                   </div>

                   <div className="mb-4">
                     <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Category</label>
                     <select className="w-full h-10 bg-background border border-input rounded-md px-3 text-sm focus:outline-none appearance-none pointer-events-none">
                       <option>Groceries</option>
                     </select>
                   </div>

                   <div className="mb-6">
                     <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Note (optional)</label>
                     <textarea readOnly className="w-full min-h-[70px] bg-background border border-input rounded-md p-3 text-sm focus:outline-none pointer-events-none resize-none text-muted-foreground">Weekly supermarket run</textarea>
                   </div>
                   
                   <div className="flex justify-end gap-2">
                     <button className="h-10 px-4 py-2 border border-input bg-background rounded-md text-sm font-medium pointer-events-none">Cancel</button>
                     <button className="h-10 px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium pointer-events-none">Add entry</button>
                   </div>
                 </div>
               </div>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-foreground/5 blur-[100px] rounded-full"></div>
             </div>
           </div>
        </section>

        {/* Download Section */}
        <section id="download" className="w-full py-24 bg-muted/20 border-y border-border/40 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl font-bold tracking-tight mb-4">Take Ledger with you</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">The full app, in your pocket. Same account, same data, everywhere.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Android */}
              <Card className="bg-background border-border shadow-sm flex flex-col">
                <CardHeader className="flex-1">
                  <Smartphone className="h-8 w-8 mb-4 text-foreground" />
                  <CardTitle className="font-display">Android</CardTitle>
                  <CardDescription className="text-sm">Direct APK download. Works on Android 8.0 and above.</CardDescription>
                </CardHeader>
                <CardContent>
                  <a href={ANDROID_APK_URL} className="block">
                    <Button className="w-full gap-2 bg-foreground text-background hover:bg-foreground/90">
                      <Download className="h-4 w-4" /> Download for Android
                    </Button>
                  </a>
                  <p className="text-[11px] text-muted-foreground text-center mt-3">
                    Your browser may warn about apps from outside the Play Store — this is expected for direct downloads. The app is signed and safe.
                  </p>
                </CardContent>
              </Card>

              {/* iOS */}
              <Card className="bg-background border-border shadow-sm flex flex-col opacity-75">
                <CardHeader className="flex-1">
                  <Apple className="h-8 w-8 mb-4 text-foreground" />
                  <CardTitle className="font-display">iOS</CardTitle>
                  <CardDescription className="text-sm">iPhone and iPad support is on the way.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button disabled className="w-full gap-2" variant="outline">
                    <Clock className="h-4 w-4" /> Coming Soon
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center mt-3">
                    In the meantime, the web app works great in Safari on iPhone.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="w-full py-24 bg-background border-y border-border/40 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl font-bold tracking-tight mb-4">Simple, transparent pricing</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">Start free for 6 months. Upgrade when you're ready. No hidden fees.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Free Tier */}
              <Card className="bg-card border border-border shadow-sm flex flex-col">
                <CardHeader>
                  <CardTitle className="font-display text-xl font-semibold tracking-tight">Free Trial</CardTitle>
                  <CardDescription className="text-sm">Perfect for trying out all features</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-1">
                  <div className="mb-6">
                    <span className="font-display text-4xl font-semibold tracking-tight">₹0</span>
                    <span className="text-sm text-muted-foreground ml-1">/ 6 months</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-4 mb-8 flex-1">
                    <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-foreground mr-2"/> All premium features</li>
                    <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-foreground mr-2"/> 6 months duration</li>
                    <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-foreground mr-2"/> No credit card required</li>
                  </ul>
                  <Button disabled variant="outline" className="w-full h-11 border-border mt-auto">
                    Active Default
                  </Button>
                </CardContent>
              </Card>

              {/* Monthly Tier */}
              <Card className="bg-card border-2 border-foreground shadow-md relative flex flex-col">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                  Most Popular
                </div>
                <CardHeader>
                  <CardTitle className="font-display text-xl font-semibold tracking-tight">Monthly</CardTitle>
                  <CardDescription className="text-sm">Flexible month-to-month billing</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-1">
                  <div className="mb-6">
                    <span className="font-display text-4xl font-semibold tracking-tight">₹11</span>
                    <span className="text-sm text-muted-foreground ml-1">/ month</span>
                  </div>
                  <ul className="text-sm text-foreground space-y-4 mb-8 flex-1">
                    <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-foreground mr-2"/> Ledger AI Chatbot</li>
                    <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-foreground mr-2"/> Smart Receipt Scanner</li>
                    <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-foreground mr-2"/> PDF Invoice Downloads</li>
                    <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-foreground mr-2"/> Unlimited Entries</li>
                  </ul>
                  <Link to="/register?intent=monthly" className="mt-auto">
                    <Button className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 transition-colors">
                      Start Monthly Plan
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Yearly Tier */}
              <Card className="bg-card border border-border shadow-sm flex flex-col">
                <CardHeader>
                  <CardTitle className="font-display text-xl font-semibold tracking-tight">Yearly</CardTitle>
                  <CardDescription className="text-sm">Best value - save ~61%</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-1">
                  <div className="mb-6">
                    <span className="font-display text-4xl font-semibold tracking-tight">₹51</span>
                    <span className="text-sm text-muted-foreground ml-1">/ year</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-4 mb-8 flex-1">
                    <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-foreground mr-2"/> Save ~61% annually</li>
                    <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-foreground mr-2"/> Ledger AI Chatbot</li>
                    <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-foreground mr-2"/> Smart Receipt Scanner</li>
                    <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-foreground mr-2"/> PDF Invoice Downloads</li>
                    <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-foreground mr-2"/> Unlimited Entries</li>
                  </ul>
                  <Link to="/register?intent=yearly" className="mt-auto">
                    <Button variant="outline" className="w-full h-11 border-border hover:bg-accent hover:text-accent-foreground transition-colors">
                      Start Yearly Plan
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="w-full py-24 bg-muted/20 border-t border-border/40 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="font-display text-4xl font-bold tracking-tight mb-4">Get in touch</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Have questions, feedback, or just want to say hi? We'd love to hear from you.</p>
            </div>

            <div className="bg-background border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row">
              {/* Left Side: Contact Info */}
              <div className="w-full md:w-2/5 bg-muted/30 p-8 md:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border">
                <div>
                   <h3 className="font-display text-2xl font-bold mb-4">Connect with me</h3>
                   <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                     Feel free to reach out for collaborations, support, or just a friendly hello. I'm always open to discussing new projects, creative ideas or opportunities to be part of your visions.
                   </p>
                   
                   <div className="space-y-6">
                     <div className="flex items-center gap-4 text-muted-foreground hover:text-foreground transition-colors group">
                       <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center group-hover:border-red-500/30 transition-colors">
                         <Mail className="w-4 h-4 text-red-500" />
                       </div>
                       <span className="text-sm font-medium">dhruvghanchi.1@gmail.com</span>
                     </div>
                     <div className="flex items-center gap-4 text-muted-foreground hover:text-foreground transition-colors group">
                       <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center group-hover:border-green-500/30 transition-colors">
                         <Phone className="w-4 h-4 text-green-500" />
                       </div>
                       <span className="text-sm font-medium">+91 9867783783</span>
                     </div>
                   </div>
                </div>
                
                <div className="mt-12 md:mt-0">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Follow me</h4>
                  <div className="flex items-center gap-3">
                    <a href="https://www.linkedin.com/in/dhruv-ghanchi/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center hover:bg-blue-500/10 hover:border-blue-500/30 transition-all hover:-translate-y-1 group">
                      <Linkedin className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                    </a>
                    <a href="https://github.com/Dhruv-Ghanchi" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center hover:bg-foreground/10 hover:border-foreground/30 transition-all hover:-translate-y-1 group">
                      <Github className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </a>
                    <a href="mailto:dhruvghanchi.1@gmail.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/30 transition-all hover:-translate-y-1 group">
                      <GmailIcon className="w-4 h-4 text-muted-foreground group-hover:text-red-600 transition-colors" />
                    </a>
                    <a href="https://wa.me/919867783783" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center hover:bg-green-500/10 hover:border-green-500/30 transition-all hover:-translate-y-1 group">
                      <MessageSquare className="w-4 h-4 text-muted-foreground group-hover:text-green-600 transition-colors" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Right Side: Form */}
              <div className="w-full md:w-3/5 p-8 md:p-12">
                <h3 className="font-display text-2xl font-bold mb-6">Send a message</h3>
                <form className="space-y-6" id="contact-form" onSubmit={handleContactSubmit}>
                  <div className="space-y-5">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Name</label>
                      <input 
                        type="text" 
                        name="name"
                        value={contactForm.name}
                        onChange={handleContactChange}
                        required
                        className="w-full h-11 rounded-md border border-input bg-transparent px-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Email</label>
                      <input 
                        type="email" 
                        name="email"
                        value={contactForm.email}
                        onChange={handleContactChange}
                        required
                        className="w-full h-11 rounded-md border border-input bg-transparent px-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Message</label>
                      <textarea 
                        name="message"
                        value={contactForm.message}
                        onChange={handleContactChange}
                        required
                        rows={5}
                        className="w-full rounded-md border border-input bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none transition-all"
                        placeholder="How can we help you?"
                      ></textarea>
                    </div>
                  </div>
                  <Button type="submit" disabled={contactSubmitting} className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-medium text-sm transition-all shadow-sm">
                    {contactSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <span>Send Message</span>}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="w-full py-24 bg-background border-t border-border/40 px-4">
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
                  Yes! You can export all your transactions at any time in CSV and Excel format for use in Excel, Google Sheets, or other accounting tools.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left font-display">What happens after the free trial?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  After 6 months, you can choose to upgrade to a paid plan (Monthly ₹11/month or Yearly ₹51/year) or continue with limited features on the free tier.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-5">
                <AccordionTrigger className="text-left font-display">Can I cancel my subscription anytime?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Yes, you can cancel your subscription at any time from the Profile Settings page. You'll retain premium access until the end of your current billing period.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

      </main>

      <footer className="w-full border-t border-border/40 pt-16 pb-8 px-4 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded border border-border flex items-center justify-center bg-foreground">
                  <span className="text-background font-display text-sm font-bold">₹</span>
                </div>
                <span className="text-xl font-semibold tracking-tight font-display">Ledger</span>
              </div>
              <p className="text-muted-foreground text-sm max-w-sm mb-6">
                The minimalist, secure personal ledger that respects your privacy. Track spending, monitor subscriptions, and build wealth effortlessly.
              </p>
              <div className="flex items-center gap-4">
                <a href="https://github.com/Dhruv-Ghanchi" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><Github className="w-5 h-5" /></a>
                <a href="https://www.linkedin.com/in/dhruv-ghanchi/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><Linkedin className="w-5 h-5" /></a>
                <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><Instagram className="w-5 h-5" /></a>
                <a href="mailto:dhruvghanchi.1@gmail.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><GmailIcon className="w-5 h-5" /></a>
                <a href="https://wa.me/919867783783" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><MessageSquare className="w-5 h-5" /></a>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 font-display">Product</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 font-display">Legal</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link to="/refund" className="hover:text-foreground transition-colors">Refund Policy</Link></li>
                <li><a href="#contact" className="hover:text-foreground transition-colors">Contact Us</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Ledger Platform. All rights reserved.</p>
            <p className="flex items-center gap-1">
              Built by{" "}
              <a
                href="https://www.linkedin.com/in/dhruv-ghanchi/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground hover:underline"
              >
                Dhruv Ghanchi
              </a>
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
