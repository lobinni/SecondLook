import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "SecondLook — a standing veto on autonomous payments",
    template: "%s · SecondLook",
  },
  description:
    "An agent releases a payment against a one-line mandate. For a short window, any stranger can fund a second look; an independent validator panel reads the mandate and the live pages and rules. Wrong spend? It reverts.",
  applicationName: "SecondLook",
  keywords: ["agent payments", "validator panel", "challenge window", "challenge bond", "web3"],
  openGraph: {
    title: "SecondLook",
    description:
      "A standing third-party veto on autonomous payments. Anyone can fund a second look; the panel's word moves the money.",
    type: "website",
    images: ["/icons/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#07110e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
