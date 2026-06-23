import type { Metadata } from "next";
import { Playfair_Display, Source_Serif_4, UnifrakturCook } from "next/font/google";
import "./globals.css";

// Display serif for headlines and filter labels.
const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
});

// Readable serif for body copy and UI text.
const body = Source_Serif_4({
  variable: "--font-body",
  subsets: ["latin"],
});

// Blackletter, used only for the masthead nameplate.
const blackletter = UnifrakturCook({
  variable: "--font-blackletter",
  weight: "700",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Just Some News",
  description: "Just some news",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${blackletter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
