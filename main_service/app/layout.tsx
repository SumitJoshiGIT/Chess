import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSession } from "next-auth/react";
import Sidebar from "@/components/custom/SideBar";
import  ProviderWrapper  from "@/components/custom/SessionProviderWrapper";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import QueryClientProvider from "@/components/custom/QueryClientProvider";
import Navbar from "@/components/custom/Navbar";
import orm from "@/lib/orm";
import { getServerSession } from "next-auth";
import { useStore } from "@/lib/store";
import UserProvider from "@/lib/UserProvider";
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



export default async function RootLayout({children}: {children:React.ReactNode}) {
  const session = await getServerSession();
  let user=null;
  if (session && session.user ) {
     if (session.user.email) {
       user = await orm.user.findUnique({
         where: { email: session.user.email },
         include: { profile: true , password:false  }
       });
     }
  }

  return (
  <UserProvider user={user}>
  <QueryClientProvider > 
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-screen w-full antialiased`}
      >
                 
         <ProviderWrapper>
         <Navbar /> 
         <div className="flex w-full  justify-center"> 
          {children}
          </div>
          </ProviderWrapper>
      </body>
    </html>
  </QueryClientProvider> 
  </UserProvider>
  );
}
