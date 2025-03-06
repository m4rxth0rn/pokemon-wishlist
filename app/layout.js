import Navbar from "./components/Navbar";



export default function RootLayout({ children }) {
  return (
    <html lang="cs">
      <body>
        <Navbar /> {/* ✅ Navigace pro všechny stránky */}
        {children}
      </body>
    </html>
  );
}
