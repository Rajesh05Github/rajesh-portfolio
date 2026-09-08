import type { Metadata } from "next";
import { Inter, Playfair_Display, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Fonts are loaded via next/font here — the reference repo referenced
// "Inter"/"Playfair Display" in CSS but never actually loaded them (see
// docs/existing-system-audit.md §8, item 2). next/font also self-hosts
// and inlines the font files, avoiding a render-blocking Google Fonts request.
//
// This is also the curated font set the theme engine picks from
// (src/lib/theme/fonts.ts) — next/font requires static imports, so a theme
// can only choose among fonts loaded here, never an arbitrary typed-in name.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["italic", "normal"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Portfolio",
    template: "%s | Portfolio",
  },
  description:
    "Personal portfolio — placeholder metadata until Profile content is wired up in Phase 5.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfairDisplay.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
