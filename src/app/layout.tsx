import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "42Beirut-Recruit | 42 Beirut CV & Resume Engine",
  description: "ATS-optimized CV generator tailored for 42 Beirut cadets and alumni.",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100">
      <body className={`${inter.className} min-h-full antialiased`}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function purgeNetlify() {
                  var els = document.querySelectorAll('[data-netlify-drawer], #netlify-drawer, .netlify-badge, iframe[src*="netlify"], div[class*="netlify-drawer"], div[class*="netlify-feedback"], a[href*="netlify.com"]');
                  for (var i = 0; i < els.length; i++) {
                    els[i].remove();
                  }
                }
                if (typeof window !== 'undefined') {
                  window.addEventListener('DOMContentLoaded', purgeNetlify);
                  try {
                    var obs = new MutationObserver(purgeNetlify);
                    obs.observe(document.documentElement, { childList: true, subtree: true });
                  } catch (e) {}
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
