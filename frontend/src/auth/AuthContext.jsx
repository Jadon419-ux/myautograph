import { createContext, useContext, useEffect, useState } from "react";
import client from "../api/client.js";

const AuthContext = createContext(null);

const TOKEN_KEY = "myautograph_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await client.get("/auth/me");
      setUser(data);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email, password) {
    const body = new URLSearchParams();
    body.set("username", email);
    body.set("password", password);
    const { data } = await client.post("/auth/login", body, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    localStorage.setItem(TOKEN_KEY, data.access_token);
    const { data: me } = await client.get("/auth/me");
    setUser(me);
    return me;
  }

  async function register(payload) {
    await client.post("/auth/register", payload);
    return login(payload.email, payload.password);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
