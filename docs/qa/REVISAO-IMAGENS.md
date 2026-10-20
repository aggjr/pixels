# Conferência geral de imagens — 20/10/2026

## Resultado

Inventário de 542 PNG/WebP, incluindo arquivos intermediários e personagens
ainda indisponíveis. Todos decodificam sem erro. Isso verifica integridade,
não aprova anatomia, animações ou acabamento artístico.

As pranchas do elenco, cuidados, acessórios, cenários, ícones e fontes foram
inspecionadas. Algumas capturas da galeria foram feitas antes de todas as
miniaturas aparecerem; não constituem prova de aprovação individual.
O inventário está em `image-inventory.json`; a galeria local fica em
`http://127.0.0.1:5192/images` enquanto o inspetor estiver ligado.

## Corrigido nesta etapa

- Removida a língua sobreposta em posição fixa na cena. Esse efeito não
  acompanhava a boca e podia aparecer na testa de qualquer personagem.
- Lili com conjunto completo recebeu duas imagens integradas de água:
  língua junto à boca e língua recolhida, com roupa, alça, óculos e tigela.
  O jogo alterna as poses e esconde a tigela externa duplicada nesse conjunto.
- Humor neutro do leão usa a pose amigável: a imagem base já tinha cara brava.

## Pendências visuais encontradas

- Sete WebP de Slime verde apresentam resíduos magenta: adult, bounce,
  child, eat, newborn, plead e sleep. O adulto já usa o PNG limpo; os demais
  continuam precisando de tratamento.
- Sono adulto de pato, porco e toupeira ainda contém chupeta. O trator
  adulto dormindo parece a versão bebê. Exigem novas fontes coerentes.
- Há letras incorporadas nas fontes: Nini; algumas poses de Tini;
  placa na abelha voando; medalhão do elefante pedindo; resíduos em Lilica.
- Há mudanças de idade, corpo ou estilo em poses de ação genéricas.
  A vegetação permanente do Floide exige cuidado especial nos acessórios.
- A pose original da gatinha comendo já inclui tigela e pode se sobrepor
  à tigela externa. O conjunto integrado da Lili evita essa duplicação;
  a gatinha sem o conjunto ainda precisa de ajuste específico.
- Roupas e acessórios individuais continuam com as pendências registradas
  em `REVISAO-ACESSORIOS.md`. Remover a língua flutuante não equivale a criar
  animação anatômica de água para todo o elenco.

Fundos verdes opacos nos arquivos intermediários da raiz não foram tratados
como defeito de uma imagem publicada: são fontes de trabalho, não sprites
transparentes ativos. Personagens incompletos continuam indisponíveis.

## Verificação e reprodução

O ciclo de água da Lili foi acionado no navegador: zero línguas sobrepostas,
troca de pose, tigela externa oculta e retorno normal ao fim do cuidado.
`images/game-lili-drinking-fixed.png` registra a pose corrigida dentro do jogo.
Testes de seleção da arte cobrem as duas poses e existência dos arquivos.

Prévia sem persistir a coleção:
`http://127.0.0.1:5191/?species=kitty&stage=3&pose=drink&outfit=look_lili_complete&mood=happy&period=day&name=Lili&pronoun=ela`

## Procedência das duas artes novas

Geradas com image_gen a partir da pose existente da Lili vestida, preservando
identidade, vestido, bolsa com alça, óculos e sapatos. Instruções: abaixar a
boca até uma tigela de água, língua curta saindo dos lábios logo abaixo do
nariz; na segunda pose, recolher a língua sem mudar o enquadramento.
Arquivos incorporados: `assets/pets/lili-dressed-drink.png` e
`assets/pets/lili-dressed-sip.png`. Fundo transparente.

## Publicação

Esta revisão encontra e documenta defeitos; ainda não aprova a arte final.
Sem publicação desta etapa na main ou no EasyPanel enquanto as pendências
de qualidade que condicionam a publicação não estiverem resolvidas.
