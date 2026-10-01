# Padrão de Módulo — a régua de qualidade do conteúdo

Todo módulo da plataforma segue este padrão. Ele existe para garantir uma coisa: que cada módulo seja um capítulo completo e profundo, nunca um resumo raso. É a única régua que a automação usa para escrever os 49 módulos, então precisa ser exigente.

## Para que serve este padrão

A plataforma tem duas metades: a estrutura (homepage, navegação, labs) e o conteúdo (os 49 módulos). A estrutura o Claude Code resolve bem sozinho. O conteúdo é o que de fato ensina, e é onde mora o risco de ficar raso — um módulo pode ter a aparência pronta e, por dentro, ser três parágrafos que não ensinam nada.

Este documento é a defesa contra isso. Ele define, de forma objetiva, o que todo módulo precisa conter para ser considerado completo. A automação escreve os 49 módulos sem revisão humana módulo a módulo, então esta régua é a única coisa que separa um capítulo profundo de um resumo de blog. Por isso ela é exigente de propósito.

A decisão que rege tudo aqui: **qualidade máxima, sem economia**. Cada módulo é um capítulo completo, no nível de um bom curso pago ou livro técnico, cobrindo ataque, teoria e defesa. Tempo e limite de uso não são restrição; conteúdo raso, sim.

Como este padrão entra na prática: o prompt de cada fase de conteúdo manda o Claude Code ler este arquivo antes de escrever qualquer módulo e tratá-lo como requisito, não como sugestão. Um módulo que não cumpre todas as seções e o checklist final não está pronto.

## Princípios inegociáveis

Estes valem para todos os módulos, do primeiro ao último.

1. **Zero absoluto como ponto de partida.** O leitor nunca viu o assunto. Todo termo técnico é explicado na primeira vez que aparece, com uma frase do que é e por que importa, antes de ser usado. Nada de "é só fazer um ARP spoofing" sem antes dizer o que é ARP. Se um conceito depende de outro, o outro vem primeiro ou é relembrado em uma linha.
2. **Português no corpo, termos técnicos em inglês.** O texto é em português. Os termos da área ficam em inglês (SQL injection, buffer overflow, privilege escalation), explicados na primeira aparição. É assim que a área fala, e alimenta o Glossário automático da plataforma.
3. **Visão completa: ataque, teoria e defesa.** Não basta mostrar como explorar. Todo módulo explica o conceito por dentro (por que a falha existe), como o ataque funciona na mecânica, e como se defende dela. Entender a defesa faz o leitor entender o ataque de verdade.
4. **Nada inventado.** Casos reais, CVEs, datas, nomes de ferramentas e números precisam ser verdadeiros e verificados. Um caso real falso é pior que nenhum caso. A seção de verificação de fatos abaixo detalha como garantir isso.
5. **Prática que faz pensar.** O lab de cada módulo é guiado, mas com desafios: mostra o caminho e deixa partes para o leitor descobrir. Não é um roteiro de copiar e colar do começo ao fim.
6. **Progressão real.** Cada módulo pode assumir que o leitor fez os módulos anteriores (os pré-requisitos definidos no currículo), mas não mais que isso. Pode contar com a base de programação do leitor em Python e C quando o assunto for script ou memória.
7. **Ética sempre presente.** Todo módulo ofensivo deixa claro o limite: isto se faz em ambiente autorizado, como o laboratório local. Não é um aviso decorativo; é parte da formação de quem trabalha com segurança.

## Anatomia de um módulo

Todo módulo tem estas 10 seções, nesta ordem. A extensão mínima é um piso, não um alvo: se o assunto pedir mais, escreva mais.

**1. Abertura — o que você vai aprender e por quê.** Um resumo curto do que o módulo cobre, por que isso importa no mundo real, e o que o leitor vai saber fazer no fim. Lista de objetivos de aprendizado. Pré-requisitos relembrados em uma linha cada. (meia a uma página)

**2. Teoria aprofundada — o conceito por dentro.** A explicação de verdade: o que é, por que existe, como se encaixa no quadro maior da segurança. Aqui mora a profundidade. Não é "o que é SQL injection" em três linhas; é entender por que o banco interpreta a entrada como comando, o que é uma query, como a aplicação monta ela. Com analogias e exemplos. (duas a quatro páginas)

**3. Como o ataque funciona — a mecânica.** O passo a passo técnico de como a falha é explorada, com exemplos concretos de código, requisições, comandos. O leitor precisa entender cada etapa, não decorar. (duas a três páginas)

**4. Casos reais — o que aconteceu no mundo.** Pelo menos um incidente real e verificado em que essa técnica foi usada, com o que aconteceu, o impacto e a lição. Datas, nomes e números corretos (ver verificação de fatos). É o que conecta a teoria à realidade. (meia a uma página)

**5. Mãos à obra — o laboratório guiado.** A parte prática, contra o alvo do lab (DVWA, Juice Shop, etc.). Guiado com desafios: mostra o caminho, deixa partes para o leitor resolver. Termina com uma flag. Detalhado na seção própria abaixo. (duas a quatro páginas)

**6. Variações e aprofundamento.** Além do caso básico: outras formas da técnica, casos mais difíceis, como ela aparece em cenários modernos. O que separa quem sabe o básico de quem sabe o assunto. (uma a duas páginas)

**7. Erros comuns.** O que trava os iniciantes, os enganos frequentes, o que fazer quando "não funciona". Poupa horas de frustração e ensina a depurar. (meia página)

**8. Defesa e mitigação.** Como se proteger contra o ataque: boas práticas, configurações, código seguro. A metade que fecha a visão completa. Quem entende a defesa entende o ataque. (uma a duas páginas)

**9. Exercícios.** Perguntas e desafios para fixar, incluindo a tarefa que gera a flag do módulo. Alguns de teoria, alguns práticos. (meia página)

**10. Resumo e glossário.** Os pontos-chave em poucas linhas e a lista dos termos técnicos novos que apareceram, com a definição de cada um (alimenta o Glossário global). (meia página)

**Módulos de fundamentos (Trilhas 0 e 1).** Alguns módulos não ensinam um ataque específico (terminal Linux, redes, ética). Neles, as 10 seções continuam obrigatórias, com duas adaptações: a seção 3 vira **"Na prática da segurança"** (como um pentester e um atacante usam aquilo no dia a dia) e a seção 8 vira **"Boas práticas e segurança"** (como usar com segurança e evitar os riscos daquilo). Todas as outras seções valem igual.

## Regra de ouro contra conteúdo raso

Esta seção existe para dar ao autor (o Claude Code) critérios objetivos, não subjetivos. "Escreva bem" é fácil de burlar; os critérios abaixo não.

Um módulo **reprova** e precisa ser reescrito se qualquer um destes for verdade:

- Falta qualquer uma das 10 seções, ou alguma está abaixo da extensão mínima.
- A teoria (seção 2) só diz o que a coisa é, sem explicar por que a falha existe e como funciona por dentro.
- Não há nenhum caso real verificado, ou o caso é vago ("já houve ataques assim") sem incidente, data ou fonte.
- O lab é um roteiro de copiar e colar do início ao fim, sem nenhum desafio onde o leitor precise pensar.
- Falta a seção de defesa, ou ela é genérica ("use boas práticas") sem dizer quais e como.
- Termos técnicos aparecem sem explicação na primeira vez.
- Não há nenhum diagrama onde um ajudaria (um fluxo de ataque, uma topologia), nem saída real do lab.
- O módulo poderia ter sido escrito sem rodar o lab de verdade (sinais: comandos genéricos, nenhuma saída real, nenhum detalhe específico do alvo).

O teste final, em uma frase: **um módulo está completo quando alguém que nunca viu o assunto consegue, só com ele, entender a fundo a vulnerabilidade, explorá-la no lab, e saber defender contra ela.** Se faltar qualquer uma das três, não está pronto.

Uma regra de processo que reforça isso: o autor **roda o lab de verdade** enquanto escreve a seção prática, e usa a saída real (adaptada) e screenshots reais. Conteúdo prático escrito "de cabeça", sem executar, é a maior fonte de erro e de rasura.

## Verificação de fatos e casos reais

Um modelo de linguagem é propenso a inventar com confiança: um CVE que não existe, uma data errada, um incidente que nunca aconteceu. Num material de estudo, isso é veneno — o leitor aprende algo falso. Estas regras combatem isso.

- **Todo fato verificável é verificado.** Casos reais, CVEs, versões afetadas, datas, números de impacto e nomes de ferramentas são confirmados por busca na web antes de entrar no texto. O autor abre a fonte (não confia no trecho do resultado de busca) e confere.
- **Context7 para APIs e ferramentas.** Para sintaxe de comandos, flags e comportamento de ferramentas (nmap, Burp, sqlmap, Metasploit), consultar o Context7 ou a documentação oficial, não escrever de memória.
- **Citar a fonte.** Cada caso real traz um link para a fonte (relatório, CVE, notícia confiável). O leitor pode conferir e se aprofundar.
- **Na dúvida, não afirme.** Se um fato não pôde ser confirmado, ou ele sai do texto, ou é marcado claramente como aproximado/ilustrativo. Nunca apresentar algo incerto como se fosse verificado.
- **Preferir fontes primárias.** O boletim do CVE, o relatório oficial do incidente, a documentação do projeto — não blogs que copiam uns aos outros.
- **Caso ilustrativo é permitido, desde que rotulado.** Se não houver um incidente público bom para o ponto, um cenário hipotético pode ser usado — mas rotulado como "cenário hipotético", nunca disfarçado de caso real.

Isto se aplica especialmente à seção 4 (casos reais), mas vale para qualquer afirmação factual em qualquer seção.

## Diagramas e imagens

A plataforma é 100% local e offline, então imagens baixadas da internet estão fora (não carregariam, e muitas têm direitos). Há duas fontes de imagem permitidas, e as duas são suficientes.

- **Diagramas próprios (SVG ou Mermaid).** De preferência SVG desenhado à mão no tema da plataforma, que é simples e robusto. Mermaid (diagrama descrito em texto) também vale, se a plataforma suportar renderizá-lo. Serve para fluxos de ataque, topologia de rede, máquinas de estado, sequências de requisição e resposta, árvores de decisão. Como é texto, versiona no git, funciona offline e o autor escreve direto. Use sempre que um diagrama ajudar o entendimento — e, em segurança, ele ajuda com frequência (o caminho de um ataque, como os pacotes andam, como os componentes conversam).
- **Screenshots e saídas reais do lab.** Quando o autor roda o lab de verdade, pode capturar a tela (o Burp interceptando, a saída do nmap, a tela do DVWA) e incluir no módulo, ou mostrar a saída real do terminal num bloco de código. São imagens e saídas reais, do próprio ambiente, que mostram exatamente o que o leitor vai ver. Ficam salvas no repositório, junto do módulo.

Regras:

- Todo diagrama tem uma frase embaixo explicando o que ele mostra.
- Nada de imagem decorativa só para "encher". Cada imagem ensina algo.
- Diagramas de fluxo e de rede são preferência sobre parágrafos longos descrevendo a mesma coisa — um desenho de como o ataque anda vale mais que três parágrafos.
- Screenshots e saídas mostram o resultado real, não um inventado.

## A parte prática: lab guiado com desafios

A seção 5 (Mãos à obra) é o coração estilo TryHackMe. Ela não é um roteiro de copiar e colar, nem um enigma sem pistas. É o meio-termo: guiada, mas fazendo o leitor pensar.

Como estruturar:

- **Começo guiado.** As primeiras etapas (subir o lab, acessar o alvo, o primeiro reconhecimento) são passo a passo completo, com os comandos e o que esperar na tela. O leitor não pode travar logo no começo.
- **Meio com desafios.** Conforme avança, o módulo passa a mostrar o objetivo e o caminho, mas deixa o leitor montar partes. Em vez de dar o comando pronto, diz o que precisa ser descoberto e dá a direção. Exemplo: em vez de "rode `sqlmap -u ... --dump`", algo como "agora que você confirmou a injeção no campo de login, seu objetivo é extrair a lista de usuários. Pense em qual técnica de SQL injection lista o conteúdo de uma tabela. Dica: ...".
- **Dicas escondidas.** Cada desafio tem uma ou duas dicas e a solução, mas recolhidas — num bloco que o leitor abre só se precisar (um elemento de "spoiler"/detalhe que a plataforma renderiza fechado). Assim quem quer pensar, pensa; quem travou, destrava.
- **Fim com a flag.** O lab termina com uma tarefa cujo resultado é a flag do módulo — uma string que o leitor encontra ao completar o objetivo (um valor no banco, um arquivo lido, uma resposta do servidor). Ele submete na plataforma, que valida pelo hash. A flag precisa ser algo que só se obtém fazendo o exercício de verdade, não adivinhando.
- **Objetivo claro desde o início.** O leitor sabe, no começo do lab, o que vai conseguir no fim ("ao terminar, você terá extraído as senhas dos usuários do DVWA e encontrado a flag escondida na conta do admin").

O autor roda o lab de verdade ao escrever esta seção, para que os comandos, as saídas e a flag sejam reais e corretos.

## Checklist final de aprovação

Antes de considerar um módulo pronto, o autor confere item por item. Se algum não estiver marcado, o módulo volta para revisão.

**Estrutura**

- [ ] As 10 seções estão presentes, na ordem, cada uma acima da extensão mínima.
- [ ] O arquivo segue o template de MDX da plataforma e fica em `content/trilha-N/<slug>/index.mdx`, com o slug idêntico ao do currículo.
- [ ] Os pré-requisitos citados na abertura batem com os do currículo.

**Profundidade**

- [ ] A teoria explica por que a falha existe e como funciona por dentro, não só o que ela é.
- [ ] A mecânica do ataque tem exemplos concretos (código, requisições, comandos) explicados etapa por etapa.
- [ ] Há variações além do caso básico e uma seção de erros comuns.
- [ ] A defesa diz exatamente o que fazer e como, com exemplos de configuração ou código seguro.

**Fatos**

- [ ] Há pelo menos um caso real verificado, com data, impacto e link para fonte primária.
- [ ] Todo CVE, versão, data, número e comando foi confirmado (web, Context7 ou documentação oficial).
- [ ] Cenários hipotéticos estão rotulados como tal.

**Prática**

- [ ] O lab foi executado de verdade durante a escrita; saídas e screenshots são reais.
- [ ] O começo é guiado; o meio tem desafios com dicas e solução recolhidas.
- [ ] A flag só é obtida completando o exercício, e foi testada.

**Leitor**

- [ ] Todo termo técnico é explicado na primeira aparição e está no glossário do módulo.
- [ ] Há pelo menos um diagrama próprio (SVG ou Mermaid) onde ele ajuda, com a frase de explicação embaixo.
- [ ] O texto deixa claro o limite ético: só em ambiente autorizado.
- [ ] Teste final: alguém que nunca viu o assunto entende a vulnerabilidade, explora no lab e sabe defender, só com este módulo.
