import type { Metadata } from "next";
import type { ReactNode } from "react";
import ConsoleShell from "@/components/ConsoleShell";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Console",
};

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <ConsoleShell>{children}</ConsoleShell>
    </Providers>
  );
}
