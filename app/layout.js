import './globals.css';
import Navbar from './components/Navbar';

export default function RootLayout({ children }) {
  return (
    <html lang="cs">
      <head>
        <meta name="viewport" content="width=1280, initial-scale=1.0" />
        <title>Moje Aplikace</title>
      </head>
      <body>
        {/* 🧩 JavaScript fallback pro "zoom-out" na malých obrazovkách */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                if (window.innerWidth < 768) {
                  document.body.style.transform = 'scale(0.3)';
                  document.body.style.transformOrigin = 'top left';
                  document.body.style.width = '3333px';
                }
              })();
            `
          }}
        />
        
        <Navbar />
        {children}
      </body>
    </html>
  );
}
