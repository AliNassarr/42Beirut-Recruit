import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "42 Beirut | CV Builder",
  description:
    "An automated CV builder and resume engine built by 42 Beirut for all 42 Network cadets. Sync your Intra milestones and export industry-standard resumes.",
  icons: {
    icon: "/icon.png",
  },
  openGraph: {
    title: "42 Beirut | CV Builder",
    description:
      "An automated CV builder and resume engine built by 42 Beirut for all 42 Network cadets. Sync your Intra milestones and export industry-standard resumes.",
    url: "https://42beirutrecruit.me",
    siteName: "42 Beirut CV Builder",
    type: "website",
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
