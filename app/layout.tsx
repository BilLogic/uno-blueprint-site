import type { Metadata, Viewport } from "next";
import { Ubuntu_Sans, Ubuntu_Sans_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { site } from "@/content/site";
import { view } from "@/content/view";
import { clarityIdFor, clarityLoader } from "@/lib/analytics";
import { THEME_COLORS, themeBootScript } from "@/lib/theme";
import "./globals.css";

const sans = Ubuntu_Sans({ subsets: ["latin"], variable: "--font-ubuntu-sans", display: "swap" });
const mono = Ubuntu_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-ubuntu-sans-mono",
  display: "swap",
  // The mono face first appears far down the page (the install commands) or in the agent view.
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.name,
  description: site.description,
  // Points agents at the same page as markdown.
  alternates: { types: { "text/markdown": `/${view.agentFile}` } },
  openGraph: {
    type: "website",
    url: "/",
    siteName: site.name,
    title: site.name,
    description: site.description,
  },
  twitter: { card: "summary_large_image", title: site.name, description: site.description },
};

// THEME_COLORS explains why these are literals; a manual pick repoints them (boot script, useTheme).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ],
};

// Read at build time: the export is static, so this decides whether the HTML carries the tag at all.
const clarityId = clarityIdFor(process.env.CONTEXT);

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The boot script sets data-theme before React hydrates, so the attribute is expected to differ.
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        {clarityId && <script dangerouslySetInnerHTML={{ __html: clarityLoader(clarityId) }} />}
      </head>
      <body>{children}</body>
    </html>
  );
}
