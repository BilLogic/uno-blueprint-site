import type { Metadata, Viewport } from "next";
import { Ubuntu_Sans, Ubuntu_Sans_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { questions } from "@/content/questions";
import { site } from "@/content/site";
import { view } from "@/content/view";
import { clarityIdFor, clarityLoader } from "@/lib/analytics";
import { jsonLdText, structuredData } from "@/lib/structured-data";
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
  title: site.title,
  description: site.description,
  alternates: {
    canonical: "/",
    // Points agents at the same page as markdown.
    types: { "text/markdown": `/${view.agentFile}` },
  },
  // The picture is app/opengraph-image.png, with its alt text beside it.
  openGraph: {
    type: "website",
    url: "/",
    siteName: site.name,
    title: site.share.title,
    description: site.share.description,
  },
  twitter: { card: "summary_large_image", title: site.share.title, description: site.share.description },
};

const jsonLd = jsonLdText(structuredData(site, questions.list));

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
        {/* Data, not code: browsers never run it, so the content security policy does not list it. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
