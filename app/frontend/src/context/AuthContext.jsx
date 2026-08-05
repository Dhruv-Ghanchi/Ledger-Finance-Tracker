import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, signOut } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbUser, setDbUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const providerData = user.providerData?.[0] || {};
          const { data } = await api.post("/users/sync", {
            name: user.displayName || providerData.displayName || "Dev Tester",
            profile_picture: user.photoURL || providerData.photoURL || "",
            phone: user.phoneNumber || providerData.phoneNumber || "",
            provider: providerData.providerId || "email"
          });
          setDbUser(data);
        } catch (error) {
          console.error("Failed to sync user with backend", error);
        }
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, dbUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);