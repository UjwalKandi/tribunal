import type { Metadata } from "next";
import "./globals.css";

/**
 * TYPEFACES
 *
 * The three families are declared as CSS variables on `html` in app/globals.css, which
 * currently resolves them to named local families (Charter / Inter Tight / JetBrains Mono,
 * each with a graceful fallback chain).
 *
 * To self-host instead — better rendering, identical everywhere, no reliance on what the
 * demo machine has installed — uncomment the block below and add the three variables to
 * the <html> className. Nothing else in the codebase needs to change; globals.css and
 * tailwind.config.ts already read from these variable names.
 *
 * Note this requires network access at build time: next/font downloads the font files
 * during `next build` and emits them under /_next/static/media.
 *
 *   import { Inter_Tight, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
 *
 *   const serif = Source_Serif_4({
 *     subsets: ["latin"],
 *     weight: ["400", "600"],
 *     style: ["normal", "italic"],
 *     display: "swap",
 *     variable: "--font-serif",
 *   });
 *
 *   const sans = Inter_Tight({
 *     subsets: ["latin"],
 *     weight: ["400", "500", "600"],
 *     display: "swap",
 *     variable: "--font-sans",
 *   });
 *
 *   const mono = JetBrains_Mono({
 *     subsets: ["latin"],
 *     weight: ["400", "500", "700"],
 *     display: "swap",
 *     variable: "--font-mono",
 *   });
 *
 *   // ...then:
 *   <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
 */

export const metadata: Metadata = {
  title: "TRIBUNAL — Machine Court for Production Incidents",
  description: "Adversarial hearings over pipeline failures with binding precedent.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
