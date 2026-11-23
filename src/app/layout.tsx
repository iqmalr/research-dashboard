import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { Sidebar } from "./_components/sidebar";
import { GlobalHeader } from "./_components/global-header";
import { loadStore } from "@/lib/store";
import type { DashboardNav } from "./_components/sidebar";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Stats — Studio Ops",
  description: "Internal analytics dashboard for Football Analytics v2",
};

async function SidebarData() {
  let dashboards: DashboardNav[] = [];
  try {
    const { store } = await loadStore();
    dashboards = store.dashboards.map((d) => {
      const sources = store.sources.filter((s) => s.dashboardId === d.id);
      const hasError = sources.some((s) => s.status === "error");
      return {
        id: d.id,
        name: d.name,
        description: d.description,
        pages: d.pages.map((p) => ({ id: p.id, name: p.name })),
        status: hasError ? ("error" as const) : ("ok" as const),
      };
    });
  } catch {
    // DB not available — sidebar renders with no domains
  }
  return <Sidebar dashboards={dashboards} totalDashboards={dashboards.length} />;
}

function SidebarShell() {
  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-surface-container-lowest border-r border-outline-variant/30 z-50" />
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} h-full`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="h-full bg-surface text-on-surface antialiased">
        <Suspense fallback={<SidebarShell />}>
          <SidebarData />
        </Suspense>
        <div className="pl-[240px]">
          <GlobalHeader />
          <main className="pt-14">{children}</main>
        </div>
      </body>
    </html>
  );
}
