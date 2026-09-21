import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TTS Platform",
  description: "Text-to-Speech platform powered by Microsoft Edge TTS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
