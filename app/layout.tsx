import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionProviderWrapper } from "@/components/SessionProviderWrapper";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "CRM",
  description: "CRM system for managing customer inquiries",
  icons: {
    icon: [
      { url: "/favicon-light.svg", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-dark.svg", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          href="/favicon-light.svg"
          id="favicon"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var isDark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  }
                  
                  // Update favicon based on theme
                  var favicon = document.getElementById('favicon');
                  if (favicon) {
                    favicon.href = isDark ? '/favicon-dark.svg' : '/favicon-light.svg';
                  }
                  
                  // Watch for theme changes
                  var observer = new MutationObserver(function(mutations) {
                    var isDarkNow = document.documentElement.classList.contains('dark');
                    var favicon = document.getElementById('favicon');
                    if (favicon) {
                      favicon.href = isDarkNow ? '/favicon-dark.svg' : '/favicon-light.svg';
                    }
                  });
                  
                  observer.observe(document.documentElement, {
                    attributes: true,
                    attributeFilter: ['class']
                  });
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${inter.className}`} suppressHydrationWarning>
        <SessionProviderWrapper>
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
