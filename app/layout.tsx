import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { NavSidebar } from "@/components/NavSidebar";

export const metadata: Metadata = {
  title: "AI App",
  description: "AI-powered application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="flex min-h-screen">
            <NavSidebar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
