import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nature Observer — Product Case Study",
  description: "A product case study covering Nature Observer’s experience design, user research, and project evolution.",
  other: { "codex-preview": "development" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
