import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithPopup, googleProvider, auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const navigate = useNavigate();

  const handleSuccess = () => {
    const params = new URLSearchParams(window.location.search);
    const intent = params.get("intent");
    if (intent) {
      navigate(`/pricing?auto_upgrade=${intent}`);
    } else {
      navigate("/dashboard");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!agreeTerms) {
      toast.error("You must agree to the Terms and Privacy Policy to register.");
      return;
    }
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      try {
        await api.post("/users/sync", { 
          name: `${firstName} ${lastName}`.trim(), 
          phone: phone,
          promo_code: promoCode
        });
      } catch (err) {
        console.error("Failed to sync profile data", err);
      }
      handleSuccess();
    } catch (error) {
      toast.error("Failed to register: " + error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      try {
        await api.post("/users/sync", { 
          name: user.displayName, 
          profile_picture: user.photoURL,
          promo_code: promoCode
        });
      } catch (err) {
        console.error("Failed to sync google profile data", err);
      }
      handleSuccess();
    } catch (error) {
      toast.error("Failed to register with Google: " + error.message);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background bg-grain flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px]">
        {/* Original Logo Style */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center">
            <span className="text-background font-display text-sm font-bold">₹</span>
          </div>
          <div className="leading-tight">
            <div className="font-display font-semibold tracking-tight text-[15px]">Ledger</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Personal · Business</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight mb-2">
            Create Account
          </h1>
          <p className="text-sm text-muted-foreground mb-8">Start your journey to financial clarity.</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="overline block mb-2">First Name</label>
                <input 
                  type="text" 
                  value={firstName} 
                  onChange={e => setFirstName(e.target.value)} 
                  className="w-full flex h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                  required 
                />
              </div>
              <div className="flex-1">
                <label className="overline block mb-2">Last Name</label>
                <input 
                  type="text" 
                  value={lastName} 
                  onChange={e => setLastName(e.target.value)} 
                  className="w-full flex h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                  required 
                />
              </div>
            </div>

            <div>
              <label className="overline block mb-2">Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="w-full flex h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                required 
              />
            </div>

            <div>
              <label className="overline block mb-2">Phone Number <span className="text-muted-foreground normal-case">(Optional)</span></label>
              <input 
                type="tel" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                className="w-full flex h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
              />
            </div>

            <div>
              <label className="overline block mb-2">Promo Code <span className="text-muted-foreground normal-case">(Optional)</span></label>
              <input 
                type="text" 
                value={promoCode} 
                onChange={e => setPromoCode(e.target.value)} 
                className="w-full flex h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="overline block mb-2">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="w-full flex h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                    required 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <label className="overline block mb-2">Confirm Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    className="w-full flex h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                    required 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-2 pt-2">
              <input 
                type="checkbox" 
                id="terms" 
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-input bg-transparent text-foreground focus:ring-ring"
                required
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed">
                I have read and agree to the <Link to="/terms" onClick={() => setAgreeTerms(true)} className="text-foreground underline">Terms</Link> and <Link to="/privacy" onClick={() => setAgreeTerms(true)} className="text-foreground underline">Privacy Policy</Link>.
              </label>
            </div>

            <button type="submit" className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-foreground text-background text-sm font-medium py-3 hover:bg-foreground/90 transition-colors">
              Register
            </button>
          </form>

          <div className="my-5 flex items-center">
            <div className="flex-1 border-t border-border"></div>
            <span className="px-3 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">OR</span>
            <div className="flex-1 border-t border-border"></div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Button onClick={handleGoogleLogin} variant="outline" className="w-full h-11 border-border">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign up with Google
            </Button>
            <span className="text-[10px] text-muted-foreground text-center px-4">
              By continuing with Google, you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
            </span>
          </div>
          
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account? <Link to={`/login${window.location.search}`} className="text-foreground font-medium hover:underline">Sign in</Link>
          </p>
        </div>

        <div className="text-[11px] uppercase tracking-widest text-muted-foreground text-center mt-6">
          Ledger SaaS Platform
        </div>
      </div>
    </div>
  );
}
