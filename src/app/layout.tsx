import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SWRegister } from "@/components/SWRegister";

export const metadata: Metadata = {
  title: "Inbox — SMS, courriels, appels",
  description: "Ta boîte de réception unifiée, branchée sur GoHighLevel.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Inbox",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0d12",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <SWRegister />
        {children}
      </body>
    </html>
  );
}
