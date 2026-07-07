import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [pinSet, setPinSet] = useState(null); // null=loading, true/false
  const [authed, setAuthed] = useState(!!localStorage.getItem("ft_session"));

  const refresh = useCallback(async () => {
    const { data } = await api.get("/auth/status");
    setPinSet(data.pin_set);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const setup = async (pin) => {
    const { data } = await api.post("/auth/setup", { pin });
    localStorage.setItem("ft_session", data.token);
    setAuthed(true);
    setPinSet(true);
  };

  const verify = async (pin) => {
    const { data } = await api.post("/auth/verify", { pin });
    localStorage.setItem("ft_session", data.token);
    setAuthed(true);
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (_e) { /* ignore */ }
    localStorage.removeItem("ft_session");
    setAuthed(false);
  };

  return (
    <AuthContext.Provider value={{ pinSet, authed, setup, verify, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);