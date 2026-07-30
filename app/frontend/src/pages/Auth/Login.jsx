import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, googleProvider, auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (error) {
      alert("Failed to login: " + error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/");
    } catch (error) {
      alert("Failed to login with Google: " + error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Sign In</h2>
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-zinc-400 text-sm mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white outline-none focus:border-blue-500" required />
          </div>
          <div>
            <label className="block text-zinc-400 text-sm mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white outline-none focus:border-blue-500" required />
          </div>
          <Button type="submit" className="w-full">Sign In</Button>
        </form>
        
        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-zinc-800"></div>
          <span className="px-3 text-zinc-500 text-sm">OR</span>
          <div className="flex-1 border-t border-zinc-800"></div>
        </div>
        
        <Button onClick={handleGoogleLogin} variant="outline" className="w-full border-zinc-700 text-white hover:bg-zinc-800">
          Sign in with Google
        </Button>
        
        <p className="mt-6 text-center text-sm text-zinc-400">
          Don't have an account? <Link to="/register" className="text-blue-500 hover:underline">Register here</Link>
        </p>
      </div>
    </div>
  );
}
