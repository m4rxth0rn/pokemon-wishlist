import "./globals.css";
import Navbar from "./components/Navbar";

export default function RootLayout({ children }) {
  return (
    <html lang="cs">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=1024" />
        <title>Moje stránka</title>
      </head>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
