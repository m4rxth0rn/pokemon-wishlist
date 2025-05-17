import './globals.css';
import Navbar from './components/Navbar';

export default function RootLayout({ children }) {
  return (
    <html lang="cs">
      <head>
        {/* Vynucení desktop zobrazení i na mobilu */}
        <meta name="viewport" content="width=1280" />
        <title>Tvoje Aplikace</title>
      </head>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
