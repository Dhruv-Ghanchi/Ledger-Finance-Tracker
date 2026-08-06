import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Auth/Login";
import Register from "@/pages/Auth/Register";
import Dashboard from "@/pages/Dashboard";
import Pricing from "@/pages/Pricing";
import ProfileSettings from "@/pages/ProfileSettings";
import Subscription from "@/pages/Subscription";
import { Toaster } from "@/components/ui/sonner";

import Landing from "@/pages/Landing";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Refund from "@/pages/Refund";
import PremiumUpgradeModal from "@/components/PremiumUpgradeModal";

function ProtectedRoute({ element }) {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  
  if (!currentUser) return <Navigate to="/login" replace />;
  return element;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <PremiumUpgradeModal />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/profile" element={<ProtectedRoute element={<ProfileSettings />} />} />
            <Route path="/subscription" element={<ProtectedRoute element={<Subscription />} />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/refund" element={<Refund />} />
            <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
            <Route path="/" element={<Landing />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster 
          position="top-right" 
          closeButton 
          toastOptions={{
            classNames: {
              toast: "group",
              closeButton: "left-[initial] right-4 top-1/2 -translate-y-1/2 !bg-transparent !border-none !shadow-none !text-muted-foreground hover:!text-foreground",
            }
          }}
        />
      </AuthProvider>
    </div>
  );
}

export default App;