"use client";

import type { ReactNode } from "react";
import { CourtProvider } from "@/lib/store";
import { CommandPalette } from "./CommandPalette";
import { TxStageOverlay } from "./TxStage";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CourtProvider>
      {children}
      <CommandPalette />
      <TxStageOverlay />
    </CourtProvider>
  );
}
