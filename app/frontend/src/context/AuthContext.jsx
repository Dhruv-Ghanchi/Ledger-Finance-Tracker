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
      const activeUser = user || {
        uid: "dev_user_123",
        email: "dev@example.com",
        displayName: "Dev Tester"
      };
      setCurrentUser(activeUser);
      if (activeUser) {
        try {
          const providerData = activeUser.providerData?.[0] || {};
          const { data } = await api.post("/users/sync", {
            name: activeUser.displayName || providerData.displayName || "Dev Tester",
            profile_picture: activeUser.photoURL || providerData.photoURL || "",
            phone: activeUser.phoneNumber || providerData.phoneNumber || "",
            provider: providerData.providerId || "email"
          }, {
            headers: { Authorization: "Bearer mock_token" }
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