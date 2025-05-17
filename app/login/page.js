"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/supabase";

export default function LoginPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // 👈 přidáno
  const router = useRouter();

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const redirectTo = sessionStorage.getItem("redirectAfterLogin") || "/";
        sessionStorage.removeItem("redirectAfterLogin");
        router.replace(redirectTo);
      } else {
        setLoading(false); // 👈 teprve teď zobrazíme tlačítko
      }
    };

    checkUserAndRedirect();
  }, [router]);

  const handleLogin = async () => {
    sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
  };

  if (loading) return null; // 👈 stránka zůstane prázdná během redirect checku

  return (
    <main style={{
      padding: "3rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Segoe UI, sans-serif",
      color: "#222"
    }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "2rem" }}>
        🔒 Přihlášení přes Google
      </h1>

      <button
        onClick={handleLogin}
        style={{
          backgroundColor: "#4285f4",
          color: "white",
          padding: "0.6rem 1.5rem",
          fontSize: "1rem",
          borderRadius: "10px",
          border: "none",
          cursor: "pointer",
          fontWeight: "bold",
          boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
        }}
      >
        🔐 Přihlásit se přes Google
      </button>
    </main>
  );
}
