import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegistration } from "../components/pwa-registration";
export const metadata: Metadata = { title:"KiliGuide | Smart campus, clearer answers", description:"Trusted university answers by KiliMind AI", manifest:"/manifest.webmanifest" };
export const viewport: Viewport = { themeColor: "#102a5d" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body><PwaRegistration/>{children}</body></html> }
