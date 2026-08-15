import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { DonationProvider } from "@/lib/donation-store";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Send It Along",
  description: "Give without going anywhere.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="min-h-dvh bg-surface">
        <DonationProvider>
          <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-bg sm:border-x sm:border-border sm:shadow-sm">
            {children}
          </div>
        </DonationProvider>
      </body>
    </html>
  );
}
