import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Sidebar from "@/components/custom/SideBar";
import  ProviderWrapper  from "@/components/custom/SessionProviderWrapper";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import QueryClientProvider from "@/components/custom/QueryClientProvider";
import Navbar from "@/components/custom/Navbar";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChessHero",
  description: "A website to improve your chess skills",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
  <QueryClientProvider > 
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-100vh w-full antialiased`}
      >
                 
         <ProviderWrapper>
         <Navbar /> 
          {children}
          </ProviderWrapper>
      </body>
    </html>
  </QueryClientProvider> 
  );
}
