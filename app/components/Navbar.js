"use client";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav style={{
      display: "flex",
      gap: "20px",
      padding: "15px",
      borderBottom: "2px solid black",
      backgroundColor: "#f8f8f8"
    }}>
      <Link href="/search">🔍 Hledej karty</Link>
      <Link href="/wishlist">📜 Můj wishlist</Link>
      <Link href="/sets">📦 Sety</Link>
    </nav>
  );
}

