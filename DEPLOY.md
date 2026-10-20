# PIXELS — EasyPanel, Android, iOS e métricas

## Arquitetura atual

Node.js 24 serve o jogo, a API e o painel /admin. SQLite guarda os dados em
/data/pixels.sqlite. Não há dependências npm nem serviço MySQL separado.
Uma única réplica do aplicativo deve usar o volume persistente.

## EasyPanel

1. Serviço App pixels, repositório aggjr/pixels. A preparação está na branch
   codex/easypanel-pwa; após integrar, use main.
2. Builder Dockerfile, contexto /, arquivo Dockerfile.
3. Variáveis: ADMIN_PASSWORD com senha aleatória de pelo menos 16 caracteres.
   Não use o texto de exemplo como senha. PORT=3000 e DB_PATH=/data/pixels.sqlite
   já estão na imagem.
4. Crie um volume persistente montado em /data, gravável pelo usuário node
   (UID 1000). Sem esse volume, uma substituição do contêiner perde o banco.
5. Configure pixels.gutoapps.site, HTTPS com certificado válido e porta interna
   3000. A configuração anterior de porta 80 foi substituída por esta API.
6. Implante, confira /healthz e abra /admin com sua senha administrativa.
7. Teste cadastro autorizado, nascimento, cuidados e coleção. Confira os dados
   no painel, reimplante e confirme que continuam presentes.

## Dados e métricas

- Apelido e ID de instalação, criado no servidor, autenticado por cookie HttpOnly.
- Cadastro e último sinal; sessões por abertura conectada da página.
- Tempo ativo com página visível e interação nos últimos 60 segundos.
- Tentativas de cuidados, sucessos, recusas e motivos; necessidades baixas
  (no máximo uma amostra/minuto por necessidade); tentativas de aquecer o ovo,
  nascimentos, crescimento, novos ovos, armário, coleção e itens escolhidos.
- Cópias dos PIXELS, necessidades, fases, roupas e estado da coleção.
- Resumo administrativo, detalhes por jogador, exportação do resumo JSON e
  ranking interno dos jogadores listados por adultos/total de PIXELS.

O responsável pode autorizar o envio no cadastro. Sem autorização, o jogo
permanece local e não aparece nas métricas. Apelidos podem repetir; IDs distinguem
instalações. Não é autenticação por conta: não há recuperação por nome nem
continuidade automática em outro aparelho. Limpar cookies cria outra identidade.
Não armazenamos localização, IP ou user-agent no banco da aplicação.

O painel não publica apelidos ou ranking no jogo. Os valores enviados pelo
navegador não têm proteção contra trapaça. Contagens de ações são indícios de
uso, não prova de preferência ou de dificuldade. Eventos recebem a data de
chegada ao servidor; períodos diários usam UTC. Relatórios limitam jogadores a
500 e detalhes a 100 sessões/eventos recentes. Coleção: até 300 PIXELS.

## Sincronização e offline

O jogo mantém os dados locais e funciona se a API falhar. Métricas são enviadas
em lotes a cada 15 segundos; eventos aguardam em memória (até 500). Se fechar a
página offline, eventos ainda não enviados podem se perder. O tempo e eventos
finais enviados ao fechar são uma tentativa, não uma garantia do navegador.
A coleção é sincronizada após alterações e nas tentativas seguintes com internet.
O servidor mescla os PIXELS recebidos, sem apagar os demais; a última gravação
recebida vence para o mesmo PIXEL. Não há exclusão remota pela interface ainda.
Ao abrir conectado com a coleção local vazia e o cookie preservado, ela é
restaurada do servidor antes de iniciar. Se a conexão só voltar durante o jogo,
a coleção restaurada será retomada ao reabrir.

A mudança do domínio antigo para o novo não transporta localStorage nem cookies.
Antes de remover o endereço antigo, avalie exportar a coleção.

## Segurança e operação

Use HTTPS; o cookie é Secure em produção. ADMIN_PASSWORD fica apenas no servidor,
a senha digitada fica em memória da página e o botão Sair a remove. Admin/API
não entram no cache offline. Arquivos de servidor, Git, banco e configuração não
são servidos ao público. Não coloque credenciais no repositório.

Mantenha backup do volume /data. Para cópia por arquivos, pare o serviço e copie
o diretório inteiro, incluindo arquivos WAL/SHM existentes; não copie apenas o
.sqlite enquanto ele está em uso. Teste a restauração em ambiente separado.
A exportação JSON do painel é um resumo, não um backup completo do banco.

## GitHub privado

Valide o novo site primeiro. Configure no EasyPanel acesso autenticado ao
repositório privado. Depois mude a visibilidade no GitHub e teste outro deploy.
O código entregue ao navegador continua acessível aos visitantes; tornar o
repositório privado protege o repositório, não os arquivos executados no cliente.

## Instalação

Android/Chrome: menu → Instalar aplicativo ou Adicionar à tela inicial.
iPhone/iPad/Safari: Compartilhar → Adicionar à Tela de Início. Se aparecer,
mantenha Abrir como App ativo. Não exige Play Store ou App Store.

## Desenvolvimento e validação

### Integracao das branches de IA

O fluxo foi adaptado de `scripts/git-publish-to-main.ps1` do CO-CEO.
Execute na branch `main`, com todos os arquivos commitados:

- `npm run git:integrate -- --dry-run`: simula os merges e valida a versao e os testes.
- `npm run git:integrate`: integra e valida localmente, permanecendo em `main`.
- `npm run git:integrate -- --push`: integra, valida e publica `main` no GitHub.
- Para corrigir explicitamente a sequencia de versoes, acrescente
  `--version=0.1.65`. O valor exato sera usado no jogo, assets e cache offline.

As branches sao definidas em `scripts/git-machines.json`; nomes com os prefixos
`codex/`, `antigravity/` e `cursor/` tambem entram automaticamente. Novas IAs
podem ser adicionadas nessa configuracao. Sao considerados commits locais e
remotos, apos `fetch --prune`; alteracoes ainda sem commit nao sao integradas.

Os merges e testes rodam em um worktree temporario. Em caso de conflito ou
falha nos testes, a integracao para e informa o diretorio para diagnostico.
A versao sobe uma vez, acima da maior versao encontrada, sincronizando jogo,
assets e cache offline. Commits novos feitos diretamente em `main`, ainda nao
publicados, tambem geram uma versao. Rodar novamente sobre a mesma release nao
incrementa a versao outra vez. Sem commits novos, a versao permanece igual.
O push usa o fluxo normal do Git, respeitando protecoes e recusando sobrescrita
do historico remoto. Se outro agente publicar durante a integracao, rode de novo.
O deploy depende de o EasyPanel acompanhar `main`; confira `/healthz` apos publicar.

Node 24+: npm start (porta 3000). Defina ADMIN_PASSWORD no ambiente para usar
/admin. Desenvolvimento guarda o SQLite em data/, ignorado pelo Git.
Execute npm test e npm run bump antes de preparar uma nova versão.

Referências:
- https://easypanel.io/docs/services/app
- https://easypanel.io/docs/builders
- https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios
