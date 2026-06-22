import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FTM Worship",
  description: "Scheduling for the FTM worship team",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
