import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AR Billing",
  description: "Billing and AR follow-up for service businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
