# Modelo de Dados — Plataforma de Cibersegurança

Desenho conceitual das entidades e suas relações, **em nível de projeto**.
Este documento guia a implementação e alinha o vocabulário. O schema concreto
foi implementado na Fase 2 em [`db/schema.ts`](../db/schema.ts) (Drizzle ORM),
com o SQL versionado em [`db/migrations/`](../db/migrations/). Em caso de
divergência, o código é a referência de colunas e o documento, a de conceitos.

## Princípios
- **Conteúdo vs. estado.** O conteúdo (trilhas, módulos, tarefas, labs) nasce dos
  arquivos MDX versionados em `content/` e é ingerido no banco. O estado do
  usuário (progresso, flags resolvidas) nasce do uso da plataforma.
- **Sem login.** Uso local por uma única pessoa; não há entidade de usuário nem
  autenticação. O progresso é global do banco local.
- **SQLite local.** Uma única base em arquivo, sem servidor.
- **Glossário automático.** Termos técnicos explicados na primeira ocorrência
  são registrados como entidade própria e reaproveitados em todo o conteúdo.

---

## Entidades

### Track (Trilha)
Uma das 9 trilhas do currículo (0 a 8, desde a Fase 6).
- **Atributos:** identificador estável (slug), número da trilha, título,
  descrição, ordem de exibição.
- **Origem:** conteúdo (ingerido do MDX).

### Module (Módulo)
Uma unidade de estudo dentro de uma trilha.
- **Atributos:** slug, título, ordem dentro da trilha, corpo em MDX, indicação
  de ter lab ou não, referência ao alvo de lab (quando houver).
- **Origem:** conteúdo.
- **Pertence a:** uma Track.

### Prerequisite (Pré-requisito)
Relação que liga um módulo aos módulos que devem vir antes.
- **Atributos:** módulo de origem, módulo exigido.
- **Origem:** conteúdo (declarado no MDX de cada módulo).
- **Natureza:** relação muitos-para-muitos de Module com Module.

### Task (Tarefa)
Um passo verificável dentro de um módulo (uma pergunta, um objetivo prático,
uma etapa do lab).
- **Atributos:** slug, título/enunciado, ordem no módulo, tipo (leitura,
  exercício, etapa de lab, flag, quiz), indicação se exige submissão de flag.
- **Origem:** conteúdo.
- **Pertence a:** um Module.

### Flag
A resposta esperada de uma tarefa do tipo flag (estilo CTF).
- **Atributos:** referência à tarefa, valor/representação da resposta esperada
  (armazenada de forma a permitir verificação, não em texto claro), dica opcional.
- **Origem:** conteúdo.
- **Pertence a:** uma Task (relação um-para-um com tarefas do tipo flag).

### Quiz (Fase 5)
As perguntas de uma tarefa do tipo quiz, com alternativas, a resposta certa e a
explicação de cada uma, mais o percentual de acertos que conclui a tarefa.
- **Origem:** conteúdo (front-matter do MDX).
- **Pertence a:** uma Task (relação um-para-um com tarefas do tipo quiz).

### QuizAttempt (Tentativa de quiz, Fase 5)
- **Atributos:** referência ao Quiz, alternativas escolhidas, nota e total
  congelados no momento do envio, data/hora.
- **Origem:** estado.

### Lab
Um laboratório que um ou mais módulos usam.
- **Atributos:** slug, título, tipo (desktop com Kali ou sandbox no
  terminal), disponível ou previsto (com a fase), arquivos Compose, alvos que o
  Kali alcança, porta local (sempre em `127.0.0.1`), memória, o que o reset
  faz, observações de isolamento.
- **Origem:** configuração em código (`lib/labs/catalog.ts`, desde a Fase 6).
  O banco guarda só o slug e as observações, para a *foreign key* do módulo.
- **Relação:** referenciado por Module (um módulo com lab aponta para um Lab).
- **Estado (rodando/parado):** nunca gravado; vem do Docker a cada consulta.

### Progress (Progresso)
Estado de conclusão do usuário local.
- **Atributos:** referência ao Module ou à Task, situação (não iniciado, em
  andamento, concluído), data de atualização.
- **Origem:** estado (gerado pelo uso).
- **Relação:** cada registro liga-se a um Module ou a uma Task.

### FlagSubmission (Submissão de flag)
Registro de tentativas de resolver uma flag.
- **Atributos:** referência à Flag, valor submetido, resultado (correto/incorreto),
  data/hora.
- **Origem:** estado.
- **Relação:** cada submissão liga-se a uma Flag.

### GlossaryTerm (Termo do Glossário)
Um termo técnico (em inglês) com sua explicação em português.
- **Atributos:** termo, definição, primeira ocorrência (módulo onde foi
  introduzido) e, desde a Fase 5, todos os módulos que o citam.
- **Origem:** conteúdo (extraído/declarado no MDX).

---

## Relações (resumo)

```
Track (1) ───< (N) Module
Module (N) >───< (N) Module         [via Prerequisite]
Module (1) ───< (N) Task
Task  (1) ───── (0..1) Flag          [apenas tarefas do tipo flag]
Task  (1) ───── (0..1) Quiz          [apenas tarefas do tipo quiz]
Quiz  (1) ───< (N) QuizAttempt       [histórico de tentativas]
Module (N) ───> (0..1) Lab           [módulos com lab apontam para um Lab]
Module (1) ───< (N) Progress         [estado por módulo]
Task  (1) ───< (N) Progress          [estado por tarefa]
Flag  (1) ───< (N) FlagSubmission    [histórico de tentativas]
GlossaryTerm (N) >───< (N) Module   [via menções <GlossaryTerm>]
```

Legenda: `(1)───<(N)` = um-para-muitos; `(N)>───<(N)` = muitos-para-muitos;
`(0..1)` = opcional.

---

## Ciclo de vida dos dados
1. **Seed (Fase 3):** `npm run db:seed` grava o currículo de
   `db/seed/curriculum.ts` (trilhas, módulos, pré-requisitos e labs, sem corpo
   MDX, tarefas nem flags), com *upsert* por slug. Os slugs são os mesmos que os
   MDX usarão, então a ingestão sobrescreve o seed sem perder estado.
   O progresso de demonstração da Fase 3 (`db:seed:demo`) foi removido na
   Fase 5.
2. **Ingestão (Fase 4):** `npm run content:ingest` lê os MDX de `content/` e
   grava o corpo do módulo, Task, Flag e GlossaryTerm. Trilhas, módulos,
   pré-requisitos e labs continuam vindo do seed (ver "Decisões da Fase 4").
   Reexecutar a ingestão atualiza o conteúdo sem apagar o estado do usuário.
3. **Uso:** a resolução de flags gera FlagSubmission (Fase 4); quizzes geram
   QuizAttempt e todo o estudo gera Progress (Fase 5).
   `npm run progress:reset -- --yes` apaga todo o estado e mantém o conteúdo.
4. **Separação:** conteúdo pode ser regenerado a partir dos arquivos; estado é
   preservado no banco local.

## Decisões de implementação (Fase 2)
| Entidade | Tabela | Notas |
|---|---|---|
| Track | `tracks` | `number` restrito a 0–8 (CHECK; 0–7 até a Fase 6). |
| Module | `modules` | `slug` único global (pré-requisitos cruzam trilhas). "Tem lab" = `lab_id IS NOT NULL`. |
| Prerequisite | `module_prerequisites` | Chave composta; CHECK impede um módulo exigir a si mesmo. |
| Task | `tasks` | `slug` único por módulo. "Exige flag" = `type = 'flag'`. Tipos: `reading`, `exercise`, `lab_step`, `flag` e, desde a Fase 5, `quiz`. |
| Flag | `flags` | Guarda `answer_hash` + `salt`, nunca a resposta em claro. Algoritmo e normalização: Fase 4. |
| Lab | `labs` | Desde a Fase 6, só `slug` e `isolation_notes`; o resto vive em `lib/labs/catalog.ts` (ver "Decisões da Fase 6"). Até a Fase 5: `target` (CHECK), `compose_dir` e `local_ports`. |
| Progress | `module_progress` e `task_progress` | Duas tabelas com *foreign key* real, em vez de uma referência polimórfica. Status: `not_started`, `in_progress`, `completed`. |
| FlagSubmission | `flag_submissions` | Desde a Fase 4, guarda o valor digitado **só nas tentativas erradas**; nas corretas, `submitted_value` é `NULL` (CHECK no banco). |
| GlossaryTerm | `glossary_terms` | `term` único sem diferenciar maiúsculas/minúsculas. |
| Quiz | `quizzes` e `quiz_questions` | Fase 5. `pass_percent` de 1 a 100; perguntas com `options` em JSON e `answer_index` a partir de 0. |
| QuizAttempt | `quiz_attempts` | Fase 5. `answers` em JSON; `score` e `total` congelados no envio. |
| (menções) | `glossary_term_mentions` | Fase 5. Chave composta (termo, módulo); inclui o módulo que declara o termo. |

- **Chaves:** IDs inteiros; a ingestão faz *upsert* pela chave natural (slug),
  nunca apaga-e-recria, para o estado do usuário sobreviver à reingestão.
- **Remoção de conteúdo:** apagar um módulo/tarefa/flag do conteúdo apaga em
  cascata seu progresso e suas submissões (intencional).
- **Invariante entre tabelas:** "flag só existe para tarefa do tipo `flag`" é
  garantida pela ingestão, não por CHECK.
- **Banco:** `data/plataforma.db`, modo WAL, `foreign_keys = ON`.

## Decisões de navegação (Fase 3)
- **Slugs:** trilhas `trilha-0` … `trilha-8` (iguais às pastas de `content/`;
  o slug segue o número da trilha, `trilha-N`);
  módulos em português, sem acento e sem número (ex.: `lei-e-etica`), para
  continuarem estáveis se a ordem mudar. São dados, não código.
- **Número exibido** do módulo (ex.: "1.4") = número da trilha + `sort_order`
  (que começa em 1 dentro da trilha). Não é armazenado.
- **"Pré-requisito: Trilha N"** do currículo vira uma linha em
  `module_prerequisites` para **cada** módulo da trilha N.
- **Pré-requisitos sempre anteriores:** todo pré-requisito vem antes do módulo na
  ordem do currículo (trilha, depois `sort_order`); isso também garante que não
  há ciclos. O seed valida e aborta se a regra for violada.
- **Estado do módulo é derivado, não armazenado:** o banco guarda só
  `not_started | in_progress | completed`. A interface mostra 4 estados, nesta
  ordem de precedência:

  | Estado | Regra |
  |---|---|
  | Concluído | `module_progress.status = 'completed'` |
  | Em andamento | `status = 'in_progress'` |
  | Bloqueado | algum pré-requisito não está concluído |
  | Disponível | todos os pré-requisitos concluídos, sem progresso |

  O bloqueio é **suave**: a página do módulo abre e mostra um aviso com os
  pré-requisitos pendentes.
- **"Continuar de onde parei":** o módulo em andamento com `updated_at` mais
  recente; senão, o primeiro disponível na ordem do currículo.
- **Labs fora do enum (até a Fase 5):** módulos cujo lab não cabia em
  `LAB_TARGETS` ficavam sem `lab_id`. A Fase 6 trocou o enum pelo catálogo de
  labs e ligou os que já tinham decisão (ver "Decisões da Fase 6").

## Decisões da Fase 4 (motor de conteúdo)

### Quem é dono de cada dado
- **Seed (`db/seed/curriculum.ts`):** trilhas, módulos (título, ordem), pré-
  requisitos e labs. É o currículo.
- **Front-matter do MDX:** repete `slug`, `track`, `title`, `prerequisites` e
  `lab` para quem escreve, e o `npm test` exige que batam com o seed. Acrescenta
  o que só o módulo sabe: tarefas, flags e termos de glossário.
- **Corpo do MDX:** renderizado na página a partir do arquivo compilado; a
  ingestão guarda uma cópia em `modules.body_mdx` (para busca futura).

### Formato do front-matter
```yaml
slug: terminal-linux
track: trilha-0
title: "Linux: primeiros passos no terminal"
prerequisites: [como-usar-a-plataforma]   # como no seed, sem expandir "trilha-N"
lab: linux-sandbox                        # ou null
tasks:
  - slug: missao-1-arquivo-oculto
    title: "Missão 1 — ..."
    type: flag                            # reading | exercise | lab_step | flag
    prompt: "..."                         # opcional
    hint: "..."                           # opcional, só em flags
    flag: { hash: "scrypt$16384$8$1$<hex>", salt: "<hex>" }   # só em flags
glossary:
  - term: shell
    definition: "..."
```
Modelo completo e comentado: [`TEMPLATE-MODULO.mdx`](TEMPLATE-MODULO.mdx).

### Regras de ingestão
- Tudo é validado antes de gravar; um arquivo inválido aborta a ingestão
  inteira, numa única transação.
- Tarefas: *upsert* por `(module_id, slug)`; `sort_order` segue a ordem do
  front-matter. Tarefas removidas do front-matter são apagadas (com progresso e
  submissões, em cascata).
- Flags: *upsert* por `task_id`. Uma tarefa que deixa de ser `flag` perde a flag.
  Cada tarefa `flag` tem exatamente um `<FlagInput task="...">` no corpo.
- Glossário: cada termo é declarado por **um único** módulo (o da primeira
  aparição), que vira `first_module_id`. Todo termo declarado é marcado no corpo
  com `<GlossaryTerm>`, e todo `<GlossaryTerm>` aponta para um termo declarado
  em algum módulo.

### Hash das flags
- **Normalização:** `trim()` e Unicode NFC. Diferencia maiúsculas de minúsculas.
- **Algoritmo:** scrypt (`node:crypto`), N=16384, r=8, p=1, 32 bytes, salt
  aleatório de 16 bytes por flag. Comparação em tempo constante.
- **Formato:** `answer_hash = "scrypt$N$r$p$<hex>"`, para poder mudar parâmetros
  no futuro sem invalidar flags antigas; `salt` em hex.
- **Onde a flag existe em claro:** só dentro do lab (os arquivos que o leitor
  encontra). Front-matter, banco, página e bundle do navegador só veem o hash.

### Migração 0001
Acrescenta `linux-sandbox` ao CHECK de `labs.target` e torna
`flag_submissions.submitted_value` anulável, com o CHECK "valor só quando
errado". As duas mudanças recriam as tabelas; por isso o `db:migrate` desliga
as *foreign keys* em volta do migrador e roda `foreign_key_check` no fim. Sem
isso, o `DROP TABLE labs` dentro da transação anulava todo `modules.lab_id`.

## Decisões da Fase 5 (progresso, quizzes, painel e glossário)

### Flags
- O hash continua **scrypt** (Fase 4). O pedido original citava SHA-256, mas o
  scrypt atende igual a regra "nunca em claro" e resiste muito mais a força
  bruta de flags de baixa entropia a partir do hash no front-matter.
- Sem limite de tentativas: uso local, uma pessoa, e o scrypt já deixa cada
  envio lento. Tentativas erradas guardam o valor digitado (Fase 4).

### Quizzes
- O quiz é uma tarefa `type: quiz` no front-matter; o corpo só tem
  `<Quiz task="..." />`. A ingestão valida (2 a 6 alternativas distintas,
  `answer` no intervalo, exatamente um `<Quiz task>` por tarefa, nenhum quiz
  inline) e grava. Formato: [`TEMPLATE-MODULO.mdx`](TEMPLATE-MODULO.mdx).
- Correção no servidor (Server Action). O navegador recebe só perguntas e
  alternativas; gabarito e explicações voltam depois que a tentativa é gravada.
- Aprova com `acertos / total >= passPercent%` (padrão 70). Tentativas
  ilimitadas; vale a melhor nota. Reingerir mantém o quiz e suas tentativas e
  substitui as perguntas.

### Regras de progresso (`lib/progress-rules.ts`)
| Evento | Efeito |
|---|---|
| Flag correta | tarefa `completed`, na mesma transação do registro da tentativa |
| Flag errada | tarefa `in_progress` (nunca desfaz uma conclusão) |
| Quiz com nota ≥ aprovação | tarefa `completed` |
| Quiz abaixo da aprovação | tarefa `in_progress` (nunca desfaz uma conclusão) |
| `reading`, `exercise`, `lab_step` | marcadas e desmarcadas à mão no painel "Tarefas do módulo" |
| Qualquer ação numa tarefa | módulo `in_progress` |
| Todas as tarefas concluídas | módulo `completed` |
| Módulo **sem** tarefas | botões "Marcar módulo como concluído" e "Reabrir módulo" |

- Abrir a página não marca "em andamento", para não bagunçar o "continuar".
- Módulo com tarefas não tem conclusão manual: ela vem das tarefas.
- Um módulo concluído continua concluído se a reingestão acrescentar uma
  tarefa; só desmarcar uma tarefa o reabre.
- `module_progress.updated_at` de um módulo concluído é a data da conclusão:
  ele não é tocado enquanto o módulo continua concluído. Por isso não há
  coluna `completed_at`.

### Painel e conquistas
- Conquistas e sequência de estudo são **derivadas** do estado a cada
  requisição (`lib/achievements.ts`, `lib/activity.ts`), nunca gravadas: não
  há o que ficar inconsistente. Se um conteúdo some, a conquista ligada a ele
  também some.
- Dia de estudo: dia do calendário local (fuso do WSL) com tentativa de flag,
  de quiz ou tarefa/módulo marcado. A sequência atual conta até hoje ou, se
  hoje ainda não houve atividade, até ontem.
- 18 conquistas: Primeiro passo, Captura de bandeira, De primeira,
  Persistente, Dez bandeiras, Nota máxima, Constância (3 dias), Hábito
  (7 dias), Metade do caminho, uma por trilha (Fundação sólida, Hacker ético,
  Kit montado, Caçador web, Mestre dos serviços, Root, Domain Admin,
  Pentester) e Zerou.

### Glossário
- `glossary_term_mentions` liga cada termo a todos os módulos que o marcam com
  `<GlossaryTerm>`, gravado pela ingestão numa segunda passada (um módulo pode
  citar um termo declarado por outro arquivo).
- `/glossario`: A–Z com ordenação pt-BR, busca sem acentos, âncora estável por
  termo (`#t-<slug>`), módulo que introduz o termo e onde mais ele aparece.

### Migração 0002
Cria `quizzes`, `quiz_questions`, `quiz_attempts` e `glossary_term_mentions` e
acrescenta `quiz` ao CHECK de `tasks.type` (o drizzle-kit recria `tasks`; as
*foreign keys* ficam desligadas em volta do migrador, como na 0001). Backup
prévio em `data/plataforma.pre-fase5.db`.

## Decisões da Fase 6 (laboratórios e expansão do currículo)

### Catálogo de labs em código
- `lib/labs/catalog.ts` é a fonte de verdade de cada lab: tipo, arquivos
  Compose, alvos, porta, memória, o que o reset faz e se está disponível ou
  previsto (com a fase). É dado puro, usado pelo servidor e pelo navegador.
- A tabela `labs` ficou só com `slug` e `isolation_notes`. **Motivo de
  segurança:** nada que a plataforma entrega ao `scripts/lab.sh` vem do banco,
  então editar dados não muda o que roda no Docker.
- O `npm test` exige que os labs disponíveis do catálogo batam com o registro
  fechado do `scripts/lab-common.sh` (`scripts/lab.sh list`) e que todo lab
  citado pelo seed exista no catálogo.
- O seed grava uma linha por lab do catálogo, disponível ou previsto: módulos
  podem apontar para um lab previsto (ex.: `nmap` → `rede-de-alvos`), e a
  interface mostra "previsto · Fase N" sem botões.
- **Estado dos labs não é gravado:** "rodando/parado" vem do Docker
  (`scripts/lab.sh status`, pelo rótulo `config_files` do Compose) a cada
  consulta. Não há tabela de sessões de lab.

### Expansão do currículo (aprovada pelo MESQUITA)
- Nova Trilha 3 (Criptografia, 5 módulos); Hacking Web, Redes e Serviços,
  Escalação de Privilégios, Active Directory e Consolidação passam a 4–8.
  Quatro módulos novos: `osint-e-reconhecimento-passivo`,
  `engenharia-social-e-phishing`, `seguranca-de-apis-e-graphql` e
  `pos-exploracao-e-persistencia`. Total: 9 trilhas e 59 módulos.
- **Progresso preservado:** o progresso pende de módulos e tarefas, nunca de
  trilhas. O seed faz *upsert* das trilhas por slug (`trilha-3` ganha o título
  "Criptografia"; `trilha-8` é nova) e dos módulos por slug, só trocando o
  `track_id` dos que mudaram de trilha. Testado numa cópia do banco com
  progresso sintético antes de aplicar no banco real: status, tarefas e
  tentativas de flag ficaram intactos e o `foreign_key_check` voltou vazio.
- Módulos novos entram com `body_mdx` vazio; o conteúdo vem nas fases de
  conteúdo, seguindo o padrão de módulo.
- Conquistas: 19 (uma nova por trilha, "Criptógrafo" para a Trilha 3). Como
  são derivadas, os ids `trilha-N` passam a seguir a nova numeração sem
  migração.
- O front-matter aceita `track: trilha-0` … `trilha-8`.

### Migração 0003
Recria `labs` (sai `target` com seu CHECK, `compose_dir` e `local_ports`) e
`tracks` (CHECK de `number` de 0–7 para 0–8), copiando as linhas com os mesmos
ids. Como nas migrações 0001 e 0002, as *foreign keys* ficam desligadas em
volta do migrador, então os `modules.lab_id` sobrevivem. Backup prévio em
`data/plataforma.pre-fase6.db`. Depois: `npm run db:seed` e
`npm run content:ingest`.
