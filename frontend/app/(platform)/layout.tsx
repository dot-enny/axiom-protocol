import type { ReactNode } from "react";
import { Frame } from "@/components/layout/frame";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { WalletProvider } from "@/components/dashboard/wallet-context";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <Frame>
        <div className="flex min-h-screen flex-col md:flex-row">
          <AppSidebar />
          <main className="flex-1">{children}</main>
        </div>
      </Frame>
    </WalletProvider>
  );
}
