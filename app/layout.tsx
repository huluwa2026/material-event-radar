import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Material Event Radar",
  description: "Daily material company events, grouped by SEC filing and linked to the original disclosure.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
