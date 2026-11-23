"use client";
import { usePathname } from "next/navigation";
import { CommandBar } from "./_components/command-bar";

// The static Stitch mock pages that are not driven by widget config yet.
// They keep the old hard-coded command bar; everything else renders its own header.
const STATIC_MOCKS = /^\/dashboard\/(users|revenue|funnel|product|content)(\/|$)/;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (!STATIC_MOCKS.test(pathname)) return <div className="flex flex-col w-full">{children}</div>;

  return (
    <div className="flex flex-col w-full">
      <CommandBar />
      <div className="p-6 max-w-full">{children}</div>
    </div>
  );
}
