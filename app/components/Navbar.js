"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import supabase from "@/supabase";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
  sessionStorage.setItem("redirectAfterLogin", window.location.pathname); // ULOŽÍME aktuální URL

  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/login`, // Návratová URL BEZ parametru
    },
  });
};

const handleLogout = async () => {
  await supabase.auth.signOut();
  window.location.reload();

};



  

  return (
    <nav style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "15px 20px",
      borderBottom: "2px solid black",
      backgroundColor: "#f8f8f8"
    }}>
      <div style={{ display: "flex", gap: "20px" }}>
        <Link href="/search">🔍 Hledej karty</Link>
        <Link href="/sets">📦 Sety</Link>
         {user && <Link href="/wishlist">📜 Můj wishlist</Link>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {user ? (
          <>
            <span style={{ fontSize: "0.9rem", color: "#333" }}>{user.email}</span>
            <button onClick={handleLogout}>Odhlásit se</button>
          </>
        ) : (
          <button onClick={handleLogin}>Přihlásit se</button>
        )}
      </div>
    </nav>
  );
}
