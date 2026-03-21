import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "PickleballVideoIQ - AI Pickleball Video Analyzer",
  description: "Upload your pickleball game footage and get AI-powered ratings, pro tips, and game analysis for all 4 players.",
  manifest: "/manifest.json",
};
export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
