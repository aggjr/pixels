# Revisao de cuidados - 20/10/2026

## Cobertura

Resultado final: **1.680 cenarios aprovados, zero falhas**, em 140 configuracoes.
O elenco liberado possui 27 especies e 30 aparencias ao considerar as cores.

- 30 aparencias liberadas (especies e cores), nas quatro fases de crescimento.
- Conjunto completo da Lili nas quatro fases e combinacoes de acessorios em
  joaninha, unicornio, carrinho e morcego.
- Comer, beber, banho, carinho, dormir, acordar, brincar e curar.
- Recusa de excesso de cuidados, brincadeira sem energia ou doente e cuidados
  durante o sono; retorno de PIXEL salvo dormindo.
- Sequencia comer -> brincar -> dormir -> acordar; pedidos de sono durante
  alimentacao e animacoes automaticas.

O resultado detalhado fica em `care-actions.json`. Cada cenario registra a
especie, cor, fase, acessorios, acao e resultado; movimentos e imagens tambem
sao registrados nos cenarios principais.

## Correcoes

A selecao de sono antes dependia de artes por fase que varias especies nao
tinham. Joaninha e outras especies agora usam as artes compartilhadas de olhos
fechados, revisadas visualmente; especies com artes por fase usam a fase correta.
O morcego conserva suas artes de sono pendurado. O conjunto Lili conserva suas
artes vestidas. As poses de alimentacao e acrobacias nao ficam mais restritas
ao nascimento. O carrinho crescido usa a coreografia do prato com sua arte da
fase, pois a unica arte especifica de comida possui chupeta de bebe.

Animacoes de movimento agora removem suas classes ao terminar, sem remover
uma animacao mais recente. Isso libera a transformacao de corrida depois de
comer ou beber. Ao parar de brincar, o combo e o movimento sao limpos.

O pedido de dormir feito durante uma acao em andamento agora fica pendente e
e aplicado ao terminar essa acao; antes era descartado. O salvamento preserva
a intencao de dormir caso o aplicativo seja fechado nesse intervalo.

## Como repetir

Execute `npm run audit:care` e abra `http://localhost:3081`. Clique em
"Executar revisao". O servidor de auditoria aceita conexoes somente locais,
injeta os pontos de teste em memoria e nao e incluido na imagem Docker de
producao. O relatorio e gravado em `docs/qa/care-actions.json`.

O navegador executa as funcoes reais de cuidado e o mesmo roteamento dos
botoes numerados. A matriz usa temporizadores a 1% do tempo normal e pausa o
loop de decaimento para testar as condicoes de maneira controlada. Ela valida
efeitos sobre necessidades, poses, imagens carregadas, limpeza de elementos,
transformacoes da brincadeira e transicoes de estado.

Tambem foram feitas conferencias no jogo normal, em tempo real, do sono da
joaninha adulta, acordar, comer, brincar e dormir durante outro cuidado, alem
da inspecao visual das pranchas de imagens de sono e alimentacao do elenco.
Os testes automatizados conferem caminhos e estados; nao interpretam os olhos
ou a expressao dos desenhos. Bebida, banho, carinho e cura usam coreografias
compartilhadas quando nao existe uma arte exclusiva da especie.
