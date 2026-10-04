/**
 * Lab catalog (Phase 6): every lab the curriculum mentions, available now or
 * planned for a later phase. Pure data, safe on the server and in the
 * browser, and the source of truth for everything the interface shows about
 * a lab. The database only keeps the slug (modules.lab_id points to it).
 *
 * Available labs must agree with the closed registry in
 * scripts/lab-common.sh: `npm test` compares this file with `scripts/lab.sh
 * list`. The platform only ever hands a slug from here to that script, never
 * a path or a command.
 */

export const LAB_KINDS = ["desktop", "sandbox"] as const;
export type LabKind = (typeof LAB_KINDS)[number];

export type LabTarget = {
  /** Hostname that Kali resolves inside the lab network. */
  host: string;
  title: string;
  url: string;
  /** Default credentials, when they are part of the exercise. */
  credentials?: string;
};

export type LabDefinition = {
  slug: string;
  title: string;
  kind: LabKind;
  /** One sentence, shown on the lab card. */
  summary: string;
  /** How to run it; null while the lab is only planned. */
  run: { project: string; composeFiles: string[] } | null;
  /** Roadmap phase that brings a planned lab. */
  plannedPhase: number | null;
  /** What Kali reaches inside the lab (desktop labs). */
  targets: LabTarget[];
  /** The only host port the lab publishes, always on 127.0.0.1. */
  localPort: number | null;
  ram: string;
  /** What "Resetar" does to this lab. */
  reset: string;
  isolationNotes: string;
};

const DESKTOP_ISOLATION =
  "Rede interna sem internet; o alvo só é alcançável pelo Kali, e o Kali só pela tela do Guacamole em 127.0.0.1:8080.";
const PLANNED_RESET = "Definido quando o lab for montado.";

const DVWA_TARGET: LabTarget = {
  host: "dvwa",
  title: "DVWA",
  url: "http://dvwa/",
  credentials: "admin / password",
};
const JUICE_SHOP_TARGET: LabTarget = { host: "juice-shop", title: "OWASP Juice Shop", url: "http://juice-shop:3000/" };

export const LAB_CATALOG: LabDefinition[] = [
  {
    slug: "kali",
    title: "Kali (sem alvo)",
    kind: "desktop",
    summary: "Só o desktop do Kali, para conhecer as ferramentas e praticar sem nenhum alvo na rede.",
    run: { project: "cyberlab", composeFiles: ["base/compose.yaml"] },
    plannedPhase: null,
    targets: [],
    localPort: 8080,
    ram: "≈ 0,45 GB ocioso (medido na Fase 6) · ≈ 1,35 GB no pico (estimado: o pico do DVWA sem o alvo)",
    reset: "Recria o contêiner do Kali a partir da imagem. O que está em /home/kali continua lá.",
    isolationNotes: DESKTOP_ISOLATION,
  },
  {
    slug: "dvwa",
    title: "DVWA",
    kind: "desktop",
    summary: "Kali + Damn Vulnerable Web Application, o alvo web clássico para começar.",
    run: { project: "cyberlab", composeFiles: ["base/compose.yaml", "dvwa/compose.yaml"] },
    plannedPhase: null,
    targets: [DVWA_TARGET],
    localPort: 8080,
    ram: "≈ 0,55 GB ocioso · ≈ 1,5 GB no pico (medido na Fase 1)",
    reset:
      "Recria o DVWA e apaga o banco dele (volta ao estado de fábrica). O que está em /home/kali continua lá.",
    isolationNotes: DESKTOP_ISOLATION,
  },
  {
    slug: "linux-sandbox",
    title: "Sandbox Linux",
    kind: "sandbox",
    summary: "Contêiner Debian sem rede e sem vulnerabilidade, só para treinar o terminal. O shell abre no WSL.",
    run: { project: "cyberlab-sandbox", composeFiles: ["linux-sandbox/compose.yaml"] },
    plannedPhase: null,
    targets: [],
    localPort: null,
    ram: "até 128 MB (limite do contêiner)",
    reset: "Descarta o contêiner e cria outro a partir da imagem: as missões voltam ao estado inicial.",
    isolationNotes:
      "Sandbox de prática sem vulnerabilidade: sem rede (network_mode: none), sem portas publicadas; acesso só por docker exec no WSL.",
  },
  {
    slug: "juice-shop",
    title: "OWASP Juice Shop",
    kind: "desktop",
    summary: "Kali + OWASP Juice Shop, uma loja moderna (Node.js) cheia de falhas do OWASP Top 10.",
    run: { project: "cyberlab", composeFiles: ["base/compose.yaml", "juice-shop/compose.yaml"] },
    plannedPhase: null,
    targets: [JUICE_SHOP_TARGET],
    localPort: 8080,
    ram: "a medir no terminal após o pull (estimativa: ≈ 0,7 GB ocioso · ≈ 1,5 GB no pico)",
    reset: "Recria o contêiner do Juice Shop (estado em memória; volta de fábrica). O que está em /home/kali continua lá.",
    isolationNotes: DESKTOP_ISOLATION,
  },
  {
    slug: "rede-de-alvos",
    title: "Rede de alvos",
    kind: "desktop",
    summary: "Kali + DVWA + Juice Shop na mesma rede interna: dois hosts com pilhas diferentes para varrer.",
    run: {
      project: "cyberlab",
      composeFiles: ["base/compose.yaml", "dvwa/compose.yaml", "juice-shop/compose.yaml"],
    },
    plannedPhase: null,
    targets: [DVWA_TARGET, JUICE_SHOP_TARGET],
    localPort: 8080,
    ram: "≈ 1,0 GB em uso (medido na Fase 9) · ≈ 1,6 GB no pico (estimado)",
    reset:
      "Recria o DVWA (apaga o banco dele) e o Juice Shop (estado em memória). O que está em /home/kali continua lá.",
    isolationNotes: DESKTOP_ISOLATION,
  },
  {
    slug: "webgoat",
    title: "OWASP WebGoat",
    kind: "desktop",
    summary: "Kali + OWASP WebGoat, aulas guiadas de falhas web em Java (CSRF, SSRF, desserialização).",
    run: { project: "cyberlab", composeFiles: ["base/compose.yaml", "webgoat/compose.yaml"] },
    plannedPhase: null,
    targets: [{ host: "webgoat", title: "OWASP WebGoat", url: "http://webgoat:8080/WebGoat/" }],
    localPort: 8080,
    ram: "a medir no terminal após o pull (estimativa: ≈ 0,9 GB ocioso com a JVM · ≈ 1,7 GB no pico)",
    reset: "Recria o contêiner do WebGoat (banco H2 em memória; progresso zerado). O que está em /home/kali continua lá.",
    isolationNotes: DESKTOP_ISOLATION,
  },
  {
    slug: "vulhub",
    title: "Vulhub (provisório: CVE-2021-41773)",
    kind: "desktop",
    summary:
      "Kali + um alvo Vulhub com uma CVE real. Provisório: Apache 2.4.49 (CVE-2021-41773). A CVE final é decisão do MESQUITA.",
    run: { project: "cyberlab", composeFiles: ["base/compose.yaml", "vulhub/compose.yaml"] },
    plannedPhase: null,
    targets: [{ host: "vulhub", title: "Vulhub (Apache 2.4.49)", url: "http://vulhub/" }],
    localPort: 8080,
    ram: "a medir no terminal após o pull (estimativa: ≈ 0,5 GB ocioso · ≈ 1,4 GB no pico)",
    reset: "Recria o contêiner do alvo a partir da imagem local. O que está em /home/kali continua lá.",
    isolationNotes: DESKTOP_ISOLATION,
  },
  {
    slug: "dvga",
    title: "DVGA (GraphQL)",
    kind: "desktop",
    summary:
      "Kali + Damn Vulnerable GraphQL Application, para falhas de APIs GraphQL. Candidato: a escolha final sai na Fase 10 (conteúdo da Trilha 4).",
    run: null,
    plannedPhase: 10,
    targets: [{ host: "dvga", title: "DVGA", url: "http://dvga:5013/" }],
    localPort: 8080,
    ram: "a medir na Fase 10",
    reset: PLANNED_RESET,
    isolationNotes: DESKTOP_ISOLATION,
  },
];

const BY_SLUG = new Map(LAB_CATALOG.map((lab) => [lab.slug, lab]));

export function getLab(slug: string): LabDefinition | null {
  return BY_SLUG.get(slug) ?? null;
}

export function isAvailable(lab: LabDefinition): lab is LabDefinition & { run: NonNullable<LabDefinition["run"]> } {
  return lab.run !== null;
}

/** Slugs the platform may start, for zod enums. */
export const AVAILABLE_LAB_SLUGS = LAB_CATALOG.filter(isAvailable).map((lab) => lab.slug) as [
  string,
  ...string[],
];

/** Shell command for sandbox labs, which open in the WSL terminal (no web terminal). */
export const SANDBOX_SHELL_COMMAND: Record<string, string> = {
  "linux-sandbox": "npm run lab:sandbox",
};
