import type { Metadata } from "next";
// Fonts ship inside the `geist` package (next/font/local): no download from
// Google at build time, keeping the platform 100% local.
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Plataforma Cyber",
    template: "%s · Plataforma Cyber",
  },
  description: "Plataforma local para aprender pentest, da teoria ao laboratório.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="bg-transparent">
              <TopBar />
              <div className="flex flex-1 flex-col p-6">{children}</div>
            </SidebarInset>
          </SidebarProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
