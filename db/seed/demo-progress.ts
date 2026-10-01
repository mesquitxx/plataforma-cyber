/**
 * Demo progress (Phase 3 only), written by `npm run db:seed:demo` so every
 * module state shows up in the UI. Real progress replaces it in Phase 5.
 *
 * Result: track 0 done, track 1 partly done, "lei-e-etica" is the most recent
 * in-progress module (the "continue" target), "documentacao-e-anotacoes" is
 * available and most of track 2 onward is locked.
 */
import type { ProgressStatus } from "../schema";

export type DemoProgress = {
  moduleSlug: string;
  status: Exclude<ProgressStatus, "not_started">;
  hoursAgo: number;
};

export const DEMO_PROGRESS: DemoProgress[] = [
  { moduleSlug: "como-usar-a-plataforma", status: "completed", hoursAgo: 240 },
  { moduleSlug: "redes-tcp-ip", status: "completed", hoursAgo: 220 },
  { moduleSlug: "terminal-linux", status: "completed", hoursAgo: 200 },
  { moduleSlug: "windows-para-quem-vem-do-linux", status: "completed", hoursAgo: 170 },
  { moduleSlug: "scripting-bash", status: "completed", hoursAgo: 150 },
  { moduleSlug: "python-para-seguranca", status: "completed", hoursAgo: 135 },
  { moduleSlug: "git-basico", status: "completed", hoursAgo: 120 },
  { moduleSlug: "o-que-e-pentest", status: "completed", hoursAgo: 96 },
  { moduleSlug: "metodologia", status: "completed", hoursAgo: 84 },
  { moduleSlug: "escopo-e-autorizacao", status: "completed", hoursAgo: 72 },
  { moduleSlug: "kali-linux", status: "in_progress", hoursAgo: 24 },
  { moduleSlug: "lei-e-etica", status: "in_progress", hoursAgo: 2 },
];
