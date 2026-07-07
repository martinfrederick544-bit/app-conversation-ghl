import type { Metadata } from "next";
import "./globals.css";
import { SWRegister } from "@/components/SWRegister";

export const metadata: Metadata = {
  title: "Inbox — SMS, courriels, appels",
  description: "Ta boîte de réception unifiée, branchée sur GoHighLevel.",
  manifest: "/manifest.json",
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
