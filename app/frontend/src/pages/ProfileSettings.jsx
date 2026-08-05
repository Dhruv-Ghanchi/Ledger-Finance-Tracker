import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, User, Mail, Phone, Camera, ArrowLeft } from "lucide-react";
import { getSubscriptionExpiry } from "@/lib/format";
import { useNavigate } from "react-router-dom";

export default function ProfileSettings() {
  const navigate = useNavigate();
  const { dbUser, currentUser } = useAuth();
  const getFallback = (dbVal, currentVal, providerVal) => dbVal || currentVal || providerVal || "";

  const [name, setName] = useState(() => getFallback(dbUser?.name, currentUser?.displayName, currentUser?.providerData?.[0]?.displayName));
  const [phone, setPhone] = useState(() => getFallback(dbUser?.phone, currentUser?.phoneNumber, currentUser?.providerData?.[0]?.phoneNumber));
  const [profilePicture, setProfilePicture] = useState(() => getFallback(dbUser?.profile_picture, currentUser?.photoURL, currentUser?.providerData?.[0]?.photoURL));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (dbUser) {
      const providerData = currentUser?.providerData?.[0] || {};
      setName(prev => prev || getFallback(dbUser.name, currentUser?.displayName, providerData.displayName));
      setPhone(prev => prev || getFallback(dbUser.phone, currentUser?.phoneNumber, providerData.phoneNumber));
      setProfilePicture(prev => prev || getFallback(dbUser.profile_picture, currentUser?.photoURL, providerData.photoURL));
    }
  }, [dbUser, currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;
    setBusy(true);
    try {
      await api.put("/users/profile", { name, phone, profile_picture: profilePicture });
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to update profile");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border" data-testid="sticky-header">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-2 mr-2">
            <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center">
              <span className="text-background font-display text-sm font-bold">₹</span>
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="font-display font-semibold tracking-tight text-[15px]">Ledger</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Profile Settings</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8" data-testid="dashboard-main">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Profile Settings</h1>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 border border-border">
                <AvatarImage src={profilePicture || currentUser?.photoURL || currentUser?.providerData?.[0]?.photoURL} alt={name || "User"} referrerPolicy="no-referrer" />
                <AvatarFallback className="text-3xl">
                  {name ? name.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-3">
                <label className="text-sm text-muted-foreground">Profile Picture</label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="relative overflow-hidden h-9"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            toast.error("Image must be smaller than 2MB");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProfilePicture(reader.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </Button>
                  {profilePicture !== (dbUser?.profile_picture || "") && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setProfilePicture(dbUser?.profile_picture || "")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Revert
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6 space-y-6">
              <div>
                <Label className="overline">Full Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1 h-10"
                />
              </div>

              <div>
                <Label className="overline">Email</Label>
                <div className="flex items-center gap-2 mt-1 h-10 px-3 rounded-md border border-input bg-transparent">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{currentUser?.email || dbUser?.email}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here. Update it in your Firebase/Google account settings.</p>
              </div>

              <div>
                <Label className="overline">Phone Number</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className="mt-1 h-10"
                />
              </div>
            </div>

            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="font-display text-lg font-semibold">Subscription</h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Plan</span>
                  <span className="font-semibold capitalize">{dbUser?.plan || "free"}</span>
                </div>
                {(dbUser?.plan === "monthly" || dbUser?.plan === "yearly" || dbUser?.plan === "lifetime") && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-semibold capitalize">
                      {dbUser?.subscription_expiry && new Date(dbUser.subscription_expiry) > new Date() ? "active" : "inactive"}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expires</span>
                  <span className="font-semibold">
                    {getSubscriptionExpiry(dbUser, currentUser)}
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={busy}
              className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <>Save Changes</>}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}