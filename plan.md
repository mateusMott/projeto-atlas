# Plano de implementação — Atlas de Personagens

**Estado:** a reconstrução inicial foi concluída e enviada ao GitHub; em 14/11/2026, o usuário solicitou e autorizou a revisão visual da ficha com base no vídeo de referência. O site permanece não publicado.

## Objetivo e escopo

Reconstruir o Atlas usando como referência o site original e o arquivo `atlas-personagens.html`, preservando seu conteúdo e suas interações principais, com administração autenticada e alterações persistidas entre dispositivos. O site terá interface pública para consulta e comparação; apenas uma conta com papel de administrador poderá alterar o catálogo.

A base fornecida tem **54 fichas**, sendo **44 no ranking principal**, e **1.431 análises salvas de confrontos**. A comparação deve consultar essas análises existentes, sem gerar parecer por IA, chamar API externa ou transformar Tier/atributos em pontuação de vencedor.

## Comportamento previsto

- **Ranking e pesquisa:** busca por nome, aliases e conteúdo das fichas, filtros por universo, navegação por teclado e atalho Ctrl/Cmd+K; ranking principal separado do catálogo pesquisável; tiers S, A, B, C e D com acesso à listagem completa de cada Tier. No cabeçalho, usar um ícone de pódio ou equivalente visual claro para Ranking e mover o ícone atual de duas espadas para Comparação; remover o botão visível de pesquisa no canto superior direito, sem remover a busca ou o atalho.
- **Fichas:** nome, universo, Tier, visibilidade no ranking, imagem, resumo/versão, mentalidade, atributos de combate, poderes, fraquezas, observações, justificativa de Tier, link e nota da fonte, aliases; exibição em ficha detalhada e ampliação da imagem. Conforme o vídeo enviado em 14/11/2026, abrir a ficha em dois painéis verticais: imagem ampliável à esquerda e informações roláveis à direita. No painel de informações, priorizar cabeçalho com nome/universo/ranking, cartão de Tier destacado, descrição, mentalidade, atributos de combate em linhas rótulo/valor, poderes em etiquetas, fraquezas e fontes; preservar os demais campos e adaptar a disposição para telas móveis. Nesta solicitação, definir a imagem de The Fulcrum com o arquivo enviado, sem alterar os outros campos da ficha nem seus pareceres salvos.
- **Comparação:** seleção de dois personagens distintos, troca de lados, atributos lado a lado e parecer salvo com resultado ou inconclusão, confiança, versões, evidências, rotas de vitória, contrapontos e fontes. O resultado nunca será inferido pela comparação numérica dos atributos.
- **Administração:** autenticação Manus OAuth, saída da conta, busca e edição de fichas, criação/remoção de personagens, consulta do catálogo e cobertura das análises, além de exportação de uma cópia dos dados sem segredos. A conta Manus do usuário será a única com permissões administrativas; sem criar uma página de login local nem senha própria. Alterações serão gravadas no banco compartilhado e visíveis nos dispositivos que consultarem o site.
- **Integridade dos pareceres:** quando resumo/versão, poderes, atributos, fraquezas ou observações de um personagem forem alterados, as análises ligadas a ele serão marcadas como desatualizadas/suspensas para revisão. Personagem novo não terá parecer inventado; os pares ainda não revisados serão indicados como sem análise. Mudanças somente de Tier, imagem ou visibilidade não invalidarão pareceres.

### Reconciliação do contador de confrontos

O arquivo contém 1.431 pares: **196 com vencedor indicado** e **1.235 inconclusivos**. O painel original afirma “1.431 vencedores definidos”, o que contradiz os próprios dados. A implementação exibirá os totais reais por estado, mantendo as 1.431 análises e seus pareceres; não apresentará como vencedor definido uma dupla marcada como inconclusiva.

## Direção visual

Reaproveitar a identidade e os recursos já fornecidos, sem acrescentar ilustrações genéricas: estética de arquivo/atlas sci-fi escuro com grade sutil e brilho ambiental; fundo próximo de `#090c11`, verde-neon `#b8ff55` como assinatura, tons grafite e acentos de Tier; wordmark ATLAS com o símbolo embutido no HTML; tipografia Manrope/DM Sans. Manter títulos, microcopy e navegação em português e próximos ao original.

- **Princípios:** hierarquia clara por Tier; foco visual em personagens e pesquisa; dados de combate apresentados como referência, sem falsa precisão; administração discreta, mas acessível a quem tem permissão.
- **Layout:** barra superior compacta; área de busca em destaque; filtros próximos à busca; ranking dividido em faixas por Tier; comparação em área própria; painel administrativo separado.
- **Motivos visuais:** grade de fundo de baixa intensidade; brilho verde ambiental e realces finos; cartões de personagem com badges coloridos por Tier.
- **Interações e movimento:** estados de foco/hover claros; busca navegável por teclado; diálogos para fichas e imagem; transições breves e discretas, respeitando `prefers-reduced-motion`.
- **Marca e voz:** manter o símbolo e a palavra ATLAS; posicionamento de atlas comparativo para explorar personagens de múltiplos universos; personalidade analítica, exploratória e precisa. Preservar chamadas como “Poder além das escalas.” e “Quem venceria?”. Cor proprietária: verde-neon `#b8ff55`.

## Arquitetura e dados

Usar o starter já inicializado: React/TypeScript/Vite no cliente, Express e tRPC no servidor, Drizzle/MySQL para persistência e a tabela de usuários do template. Usar o fluxo padrão de Manus OAuth, com páginas públicas sem login e operações de escrita protegidas no servidor. Como o ambiente não fornece `OWNER_OPEN_ID`, a única conta administradora confirmada será identificada pelo e-mail Manus OAuth configurado por entrada protegida `ATLAS_ADMIN_EMAIL`; esse valor não será armazenado em código nem versionado. A concessão e a verificação administrativa devem falhar fechadas sem esse valor e não promover o primeiro login. Não criar senha local nem armazenar credenciais no repositório.

Extrair do HTML enviado os objetos de catálogo e pesquisa para arquivos versionados dentro do projeto. Criar tabelas para fichas e pares de confronto, preservando a chave de cada par e seu conteúdo integral. Um seed inicial versionado e idempotente importará o catálogo e as 1.431 análises apenas quando ainda não houver uma base inicializada; reinícios não poderão sobrescrever edições administrativas. A aplicação carregará e gravará esses registros por procedimentos tRPC, com operações administrativas autorizadas no servidor.

As imagens e links de fonte serão reaproveitados do arquivo de referência, com fallback visual para imagens indisponíveis. As análises serão consultadas localmente no banco; ausência de parecer deve ser mostrada como tal, sem chamada externa.

## Estrutura principal prevista

- `client/src/pages/Home.tsx`: composição da aplicação e seleção entre ranking, comparação e administração.
- `client/src/components/atlas/`: cabeçalho, busca/filtros, grupos de Tier, cartões, ficha e ampliação de imagem, comparação e parecer, formulários e catálogo administrativo.
- `client/src/lib/`: normalização de busca, aliases, formatação de dados e utilitários de apresentação.
- `shared/`: tipos e validações Zod compartilhadas entre UI e servidor.
- `server/atlas/`: consultas, permissões administrativas, regras de invalidação, seed idempotente e procedimentos tRPC do domínio Atlas.
- `server/db.ts`, `server/routers.ts` e `drizzle/`: integração das consultas, rotas tRPC, schema e migrations MySQL.
- `data/atlas/`: catálogo e análises iniciais derivados do arquivo do usuário, usados na inicialização versionada.
- `client/public/`: símbolo/favicons extraídos do HTML e manifesto estático `manus-routes.json`.

## Limites de entrega

O banco e o login dependem do runtime Webdev/Manus ou de hospedagem compatível com o backend; um push ao GitHub, por si só, não publica o site nem fornece servidor OAuth/MySQL. O projeto manterá seu remoto canônico de checkpoints Manus; o código também será enviado ao repositório existente `mateusMott/projeto-atlas`, sem force-push e sem substituir conteúdo remoto. A publicação do site é separada e não está incluída nesta etapa.
