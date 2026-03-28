import type { Metadata } from "next";
import "@/app/globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Work Order Manager",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
