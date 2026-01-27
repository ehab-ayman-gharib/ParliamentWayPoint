import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parliament 3D Wayfinder",
  description: "Advanced 3D Indoor Wayfinding Experience",
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
