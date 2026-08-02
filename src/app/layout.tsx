import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Card Business Tracker",
  description: "Revenue, expenses, P&L, and inventory ROI for your sports card business.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-base-950 font-sans text-white antialiased">{children}</body>
    </html>
  );
}
