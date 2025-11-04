// import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
// import "./globals.css";
// import SessionProvider from "@/components/providers/SessionProvider";
// import { ToasterProvider } from "@/components/ui/toaster";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// export const metadata: Metadata = {
//   title: "AI PDF-to-Audio Platform",
//   description: "Transform your PDFs into natural, human-like audio using advanced AI voice technology",
// };

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <html lang="en">
//       <body
//         className={`${geistSans.variable} ${geistMono.variable} antialiased`}
//         suppressHydrationWarning={true}
//       >
//         <ToasterProvider>
//           <SessionProvider>
//             {children}
//           </SessionProvider>
//         </ToasterProvider>
//       </body>
//     </html>
//   );
// }


import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Admin Panel',
  description: 'User Management Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}