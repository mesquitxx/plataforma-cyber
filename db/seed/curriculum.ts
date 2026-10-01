/**
 * Curriculum seed, transcribed from docs/CURRICULO.md (Phase 3).
 *
 * Slugs here are the same ones the MDX files will use in Phase 4, so content
 * ingestion overwrites this seed (upsert by slug) without losing user state.
 * Slugs are content (Portuguese, URL-facing); identifiers are in English.
 */
import type { LabTarget } from "../schema";

export type LabSeed = {
  slug: string;
  target: LabTarget;
  /** Relative to labs/. */
  composeDir: string;
  isolationNotes: string;
};

/**
 * A prerequisite is either a module slug or a whole track ("trilha-N"), which
 * expands to every module of that track. Module slugs never start with "trilha-".
 */
export type PrerequisiteRef = string;

export type ModuleSeed = {
  slug: string;
  title: string;
  prerequisites: PrerequisiteRef[];
  /** Lab slug. Labs that do not fit LAB_TARGETS yet are left out until Phase 6. */
  lab?: string;
};

export type TrackSeed = {
  slug: string;
  number: number;
  title: string;
  description: string;
  /** In display order; a module's position (1-based) is its sort_order. */
  modules: ModuleSeed[];
};

const TARGET_ISOLATION =
  "Rede interna sem internet; alcançável só pelo Kali, via Guacamole em 127.0.0.1.";

export const LABS: LabSeed[] = [
  { slug: "dvwa", target: "dvwa", composeDir: "dvwa", isolationNotes: TARGET_ISOLATION },
  {
    slug: "juice-shop",
    target: "juice-shop",
    composeDir: "juice-shop",
    isolationNotes: TARGET_ISOLATION,
  },
  { slug: "webgoat", target: "webgoat", composeDir: "webgoat", isolationNotes: TARGET_ISOLATION },
  { slug: "vulhub", target: "vulhub", composeDir: "vulhub", isolationNotes: TARGET_ISOLATION },
];

export const TRACKS: TrackSeed[] = [
  {
    slug: "trilha-0",
    number: 0,
    title: "Pré-Segurança",
    description:
      "Base para quem começa do zero: como usar a plataforma, redes, terminais e scripting. Sem labs de ataque; prática guiada no próprio ambiente.",
    modules: [
      { slug: "como-usar-a-plataforma", title: "Como usar esta plataforma", prerequisites: [] },
      {
        slug: "redes-tcp-ip",
        title: "Redes TCP/IP na prática",
        prerequisites: ["como-usar-a-plataforma"],
      },
      {
        slug: "terminal-linux",
        title: "Terminal Linux essencial",
        prerequisites: ["como-usar-a-plataforma"],
      },
      {
        slug: "windows-para-quem-vem-do-linux",
        title: "Windows para quem vem do Linux",
        prerequisites: ["terminal-linux"],
      },
      { slug: "scripting-bash", title: "Scripting: Bash", prerequisites: ["terminal-linux"] },
      {
        slug: "python-para-seguranca",
        title: "Scripting: Python para segurança",
        prerequisites: ["scripting-bash"],
      },
      {
        slug: "git-basico",
        title: "Git e versionamento básico",
        prerequisites: ["terminal-linux"],
      },
    ],
  },
  {
    slug: "trilha-1",
    number: 1,
    title: "Fundamentos e Ética",
    description: "Metodologia, escopo e a base legal e ética do pentest no Brasil.",
    modules: [
      {
        slug: "o-que-e-pentest",
        title: "O que é pentest e tipos de teste",
        prerequisites: ["trilha-0"],
      },
      { slug: "metodologia", title: "Metodologia", prerequisites: ["o-que-e-pentest"] },
      {
        slug: "escopo-e-autorizacao",
        title: "Escopo, regras de engajamento e autorização",
        prerequisites: ["o-que-e-pentest"],
      },
      {
        slug: "lei-e-etica",
        title: "Lei brasileira e ética",
        prerequisites: ["escopo-e-autorizacao"],
      },
      {
        slug: "documentacao-e-anotacoes",
        title: "Documentação e anotações de pentest",
        prerequisites: ["metodologia"],
      },
    ],
  },
  {
    slug: "trilha-2",
    number: 2,
    title: "Kit do Pentester",
    description: "As ferramentas de base e como operá-las com segurança em labs isolados.",
    modules: [
      {
        slug: "kali-linux",
        title: "Kali Linux e organização do ambiente",
        prerequisites: ["trilha-0", "escopo-e-autorizacao"],
      },
      // Lab: internal target network (not in LAB_TARGETS yet).
      {
        slug: "nmap",
        title: "Reconhecimento e nmap",
        prerequisites: ["redes-tcp-ip", "kali-linux"],
      },
      {
        slug: "burp-suite",
        title: "Burp Suite",
        prerequisites: ["redes-tcp-ip", "kali-linux"],
        lab: "juice-shop",
      },
      // Lab: capture on the internal lab network (not in LAB_TARGETS yet).
      {
        slug: "wireshark",
        title: "Wireshark e análise de tráfego",
        prerequisites: ["redes-tcp-ip", "kali-linux"],
      },
      // Lab: simple container on the isolated network (not in LAB_TARGETS yet).
      {
        slug: "netcat-e-shells",
        title: "netcat, shells e transferência de arquivos",
        prerequisites: ["terminal-linux", "kali-linux"],
      },
      {
        slug: "wordlists-e-fuzzing",
        title: "Wordlists e fuzzing",
        prerequisites: ["nmap"],
        lab: "dvwa",
      },
    ],
  },
  {
    slug: "trilha-3",
    number: 3,
    title: "Hacking Web (OWASP Top 10)",
    description: "As principais classes de falha web, na prática, em alvos consagrados.",
    modules: [
      {
        slug: "web-por-dentro",
        title: "Como a web funciona por dentro (revisão aplicada)",
        prerequisites: ["trilha-2"],
      },
      {
        slug: "sql-injection",
        title: "Injeção: SQL Injection",
        prerequisites: ["web-por-dentro", "burp-suite"],
        lab: "dvwa",
      },
      // Main lab is DVWA; the content also uses Juice Shop.
      {
        slug: "xss",
        title: "Cross-Site Scripting (XSS)",
        prerequisites: ["web-por-dentro"],
        lab: "dvwa",
      },
      {
        slug: "autenticacao-e-sessoes",
        title: "Autenticação e sessões quebradas",
        prerequisites: ["web-por-dentro"],
        lab: "juice-shop",
      },
      {
        slug: "controle-de-acesso-e-idor",
        title: "Broken Access Control e IDOR",
        prerequisites: ["web-por-dentro"],
        lab: "juice-shop",
      },
      {
        slug: "command-injection-e-upload",
        title: "Command Injection e upload de arquivos",
        prerequisites: ["sql-injection"],
        lab: "dvwa",
      },
      {
        slug: "csrf-e-ssrf",
        title: "CSRF e SSRF",
        prerequisites: ["web-por-dentro"],
        lab: "webgoat",
      },
      {
        slug: "componentes-vulneraveis",
        title: "Componentes vulneráveis e desserialização",
        prerequisites: ["web-por-dentro"],
        lab: "webgoat",
      },
      {
        slug: "mini-projeto-web",
        title: "Mini-projeto web: encadear falhas",
        prerequisites: [
          "sql-injection",
          "xss",
          "autenticacao-e-sessoes",
          "controle-de-acesso-e-idor",
          "command-injection-e-upload",
          "csrf-e-ssrf",
          "componentes-vulneraveis",
        ],
        lab: "juice-shop",
      },
    ],
  },
  {
    slug: "trilha-4",
    number: 4,
    title: "Redes e Serviços",
    description: "Do recon de serviços à exploração de CVEs reais com ferramentas de mercado.",
    modules: [
      {
        slug: "enumeracao-de-servicos",
        title: "Enumeração de serviços em profundidade",
        prerequisites: ["nmap"],
        lab: "vulhub",
      },
      {
        slug: "ataque-a-servicos",
        title: "Ataque a serviços comuns",
        prerequisites: ["enumeracao-de-servicos", "netcat-e-shells"],
        lab: "vulhub",
      },
      {
        slug: "metasploit",
        title: "Metasploit Framework do zero",
        prerequisites: ["enumeracao-de-servicos"],
        lab: "vulhub",
      },
      {
        slug: "cves-com-vulhub",
        title: "Explorando CVEs reais com Vulhub",
        prerequisites: ["metasploit"],
        lab: "vulhub",
      },
      // Lab: internal service on the isolated network (not in LAB_TARGETS yet).
      {
        slug: "ataques-a-senhas",
        title: "Ataques a senhas",
        prerequisites: ["ataque-a-servicos"],
      },
      {
        slug: "mini-projeto-servicos",
        title: "Mini-projeto: comprometer um serviço ponta a ponta",
        prerequisites: [
          "enumeracao-de-servicos",
          "ataque-a-servicos",
          "metasploit",
          "cves-com-vulhub",
          "ataques-a-senhas",
        ],
        lab: "vulhub",
      },
    ],
  },
  {
    slug: "trilha-5",
    number: 5,
    title: "Escalação de Privilégios",
    description:
      "De um acesso inicial ao controle total do host — Linux primeiro, Windows depois.",
    modules: [
      {
        slug: "conceitos-de-privesc",
        title: "Conceitos de privilégio e superfícies de escalação",
        prerequisites: ["trilha-4"],
      },
      // Lab (5.2, 5.3, 5.6): Linux container (not in LAB_TARGETS yet).
      {
        slug: "privesc-linux-enumeracao",
        title: "PrivEsc Linux: enumeração",
        prerequisites: ["conceitos-de-privesc", "terminal-linux"],
      },
      {
        slug: "privesc-linux-vetores",
        title: "PrivEsc Linux: SUID, cron, sudo, capabilities",
        prerequisites: ["privesc-linux-enumeracao"],
      },
      {
        slug: "privesc-windows-enumeracao",
        title: "PrivEsc Windows: enumeração",
        prerequisites: ["conceitos-de-privesc", "windows-para-quem-vem-do-linux"],
      },
      {
        slug: "privesc-windows-vetores",
        title: "PrivEsc Windows: serviços, tokens, permissões",
        prerequisites: ["privesc-windows-enumeracao"],
      },
      {
        slug: "mini-projeto-privesc",
        title: "Mini-projeto: da shell ao root/SYSTEM",
        prerequisites: [
          "privesc-linux-enumeracao",
          "privesc-linux-vetores",
          "privesc-windows-enumeracao",
          "privesc-windows-vetores",
        ],
      },
    ],
  },
  {
    slug: "trilha-6",
    number: 6,
    title: "Active Directory",
    description: "Conceitos de AD e os ataques clássicos, em um lab enxuto e guiado.",
    modules: [
      {
        slug: "o-que-e-active-directory",
        title: "O que é AD e por que importa",
        prerequisites: ["trilha-5"],
      },
      {
        slug: "enumeracao-de-dominio",
        title: "Enumeração de domínio",
        prerequisites: ["o-que-e-active-directory"],
      },
      {
        slug: "ataques-classicos-ad",
        title: "Ataques clássicos",
        prerequisites: ["enumeracao-de-dominio"],
      },
      {
        slug: "movimento-lateral",
        title: "Movimento lateral e escalação no domínio",
        prerequisites: ["ataques-classicos-ad"],
      },
      {
        slug: "mini-projeto-ad",
        title: "Mini-projeto: comprometer o domínio",
        prerequisites: ["enumeracao-de-dominio", "ataques-classicos-ad", "movimento-lateral"],
      },
    ],
  },
  {
    slug: "trilha-7",
    number: 7,
    title: "Consolidação",
    description:
      "Juntar tudo: metodologia integrada, máquinas estilo CTF e o relatório final.",
    modules: [
      {
        slug: "metodologia-completa",
        title: "Metodologia completa de ataque (revisão integrada)",
        prerequisites: ["trilha-2", "trilha-3", "trilha-4", "trilha-5", "trilha-6"],
      },
      // Lab (7.2, 7.3, 7.5): boot2root machines (not in LAB_TARGETS yet).
      { slug: "ctf-guiado", title: "Máquina CTF guiada", prerequisites: ["metodologia-completa"] },
      { slug: "ctf-sem-dicas", title: "Máquina CTF sem dicas", prerequisites: ["ctf-guiado"] },
      {
        slug: "relatorio-de-pentest",
        title: "Escrevendo o relatório de pentest",
        prerequisites: ["documentacao-e-anotacoes", "ctf-guiado"],
      },
      {
        slug: "projeto-final",
        title: "Projeto final: pentest completo + relatório",
        prerequisites: [
          "metodologia-completa",
          "ctf-guiado",
          "ctf-sem-dicas",
          "relatorio-de-pentest",
        ],
      },
    ],
  },
];

export type ResolvedModule = {
  slug: string;
  title: string;
  trackSlug: string;
  sortOrder: number;
  labSlug: string | null;
  /** Module slugs, with "trilha-N" refs expanded. */
  prerequisites: string[];
};

const TRACK_REF = /^trilha-\d+$/;

function fail(message: string): never {
  throw new Error(`Invalid curriculum seed: ${message}`);
}

/**
 * Flattens the curriculum and checks its invariants, throwing on the first
 * violation: unique slugs, known references, and every prerequisite coming
 * earlier in curriculum order (which also rules out cycles).
 */
export function resolveCurriculum(tracks: TrackSeed[] = TRACKS, labs: LabSeed[] = LABS) {
  const labSlugs = new Set(labs.map((lab) => lab.slug));
  if (labSlugs.size !== labs.length) fail("duplicate lab slug");

  const trackSlugs = new Set<string>();
  const trackNumbers = new Set<number>();
  for (const track of tracks) {
    if (!TRACK_REF.test(track.slug)) fail(`track slug "${track.slug}" must match trilha-N`);
    if (track.number < 0 || track.number > 7) fail(`track number ${track.number} out of 0–7`);
    if (trackSlugs.has(track.slug)) fail(`duplicate track slug "${track.slug}"`);
    if (trackNumbers.has(track.number)) fail(`duplicate track number ${track.number}`);
    trackSlugs.add(track.slug);
    trackNumbers.add(track.number);
  }

  const ordered = [...tracks].sort((a, b) => a.number - b.number);
  // Position of each module in curriculum order, filled as we go: a
  // prerequisite must already be here when the module that needs it is read.
  const position = new Map<string, number>();
  const trackModules = new Map<string, string[]>();
  const resolved: ResolvedModule[] = [];

  for (const track of ordered) {
    trackModules.set(track.slug, []);
    track.modules.forEach((module, index) => {
      if (TRACK_REF.test(module.slug)) fail(`module slug "${module.slug}" looks like a track`);
      if (position.has(module.slug)) fail(`duplicate module slug "${module.slug}"`);
      if (module.lab && !labSlugs.has(module.lab)) {
        fail(`module "${module.slug}" uses unknown lab "${module.lab}"`);
      }

      const prerequisites = new Set<string>();
      for (const ref of module.prerequisites) {
        if (TRACK_REF.test(ref)) {
          if (!trackSlugs.has(ref)) fail(`module "${module.slug}" requires unknown track "${ref}"`);
          if (ref === track.slug) fail(`module "${module.slug}" requires its own track`);
          const expanded = trackModules.get(ref);
          if (!expanded) fail(`module "${module.slug}" requires later track "${ref}"`);
          for (const slug of expanded) prerequisites.add(slug);
        } else {
          if (!position.has(ref)) {
            fail(`module "${module.slug}" requires "${ref}", which is unknown or not earlier`);
          }
          prerequisites.add(ref);
        }
      }

      position.set(module.slug, position.size);
      trackModules.get(track.slug)!.push(module.slug);
      resolved.push({
        slug: module.slug,
        title: module.title,
        trackSlug: track.slug,
        sortOrder: index + 1,
        labSlug: module.lab ?? null,
        prerequisites: [...prerequisites],
      });
    });
  }

  return { tracks: ordered, labs, modules: resolved };
}
