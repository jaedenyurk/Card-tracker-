import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Card Business Tracker",
  description: "Revenue, expenses, P&L, and inventory ROI for your sports card business.",
  // Short label under the home-screen icon. capable:false keeps it opening in Safari, as before.
  appleWebApp: { title: "Card Tracker", capable: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="font-sans text-fg antialiased">{children}</body>
    </html>
  );
}
