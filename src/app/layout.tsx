import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Otter Run - 3D River Racing",
  description: "Stylized 3D river racing prototype with current-riding mechanics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full w-full`}
    >
      <body className="h-full w-full m-0 p-0 overflow-hidden bg-slate-950 font-sans">
        {children}
      </body>
    </html>
  );
}
