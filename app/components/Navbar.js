"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import supabase from "@/supabase";
import styles from "./Navbar.module.css"; // Import CSS modulu

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
    sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarLinks}>
        <Link href="/search" legacyBehavior>
          <a className={styles.navLink}>🔍 Hledej karty</a>
        </Link>
        <Link href="/sets" legacyBehavior>
          <a className={styles.navLink}>📦 Sety</a>
        </Link>
        {user && (
          <Link href="/wishlist" legacyBehavior>
            <a className={styles.navLink}>📜 Můj wishlist</a>
          </Link>
        )}
      </div>
      <div className={styles.navbarUser}>
        {user ? (
          <>
            <span className={styles.userEmail}>{user.email}</span>
            <button className={styles.sylveonButton} onClick={handleLogout}>Odhlásit se</button>
          </>
        ) : (
          <button className={styles.sylveonButton} onClick={handleLogin}>Přihlásit se</button>
        )}
      </div>
    </nav>
  );
}
