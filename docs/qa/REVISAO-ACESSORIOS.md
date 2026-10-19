# Revisão de acessórios — 19/10/2026

**Resultado: não aprovado para publicação final.** A revisão encontrou defeitos
artísticos reais. Testes técnicos passando não equivalem a roupas bem vestidas.

## Cobertura realizada

- 27 tipos de PIXEL; 30 aparências contando as cores do Slime; quatro fases.
- 29 peças avulsas: **1.536 encaixes compatíveis**, após retirar 20 combinações
  incorretas do robô. Antes da correção havia 1.556.
- Conjunto integrado da Lili: mais quatro casos de fase.
- 30 pranchas de navegador, somando **1.540 células**, sem arquivos quebrados ou
  ausência de encaixe técnico. Cada prancha está em `accessories/<id>.png`.
- Cores alternativas de laços, óculos, bolsas, vestidos e sapatos: máscaras alfa
  idênticas byte a byte, verificadas por SHA-256. A geometria foi inspecionada por
  família; as cores e todos os 12 brinquedos foram conferidos na galeria.
- Conferência dentro do jogo: carrinho com rodas independentes, sirene e óculos,
  inclusive limite de três peças. Não é teste de todas as trincas possíveis.
- A análise estática não aprova alimentação, sono, voo e todas as demais poses.

## Correções desta revisão

| Problema | Correção | Limite da aprovação |
| --- | --- | --- |
| Calçado podia herdar `bottom` e distorcer o encaixe vertical | `bottom: auto` no desenho das peças | Não corrige a anatomia do desenho do sapato |
| Roda dourada aparecia entre as pernas do robô | Combinação removida; tuning de carro não é aplicado ao robô | Novos acessórios próprios de robô ainda precisam de arte |
| Uma roda genérica no meio do veículo | Cubos individuais, por fase, com perspectiva para carrinho e trator | Conferência estática e teste no carrinho; movimento completo pendente |
| Medalha cobria a boca e parte dos olhos | Escala reduzida e posição abaixo do pescoço | Envolvimento da fita no pescoço ainda precisa de acabamento |
| Cachecol sobre a boca | Posição abaixada | Arte continua plana, sem volume envolvendo o pescoço |
| Óculos do barco e porquinho recém-nascidos muito baixos | Ajuste de altura específico dessas fontes | Hastes e perspectiva de outros rostos ainda precisam de refinamento |
| Slime verde adulto com grande fundo magenta | Novo recorte transparente, integrado ao jogo e ao inspetor | Outros recortes verdes e poses ainda têm contaminação |
| Inspetor mostrava asas na frente do corpo | Camadas igualadas às do jogo | Fixação e animação continuam sem aprovação |

## Pendências que impedem chamar o resultado de final

1. **Bolsas:** falta alça seguindo ombro/corpo ou mão segurando a alça. A bolsa
   avulsa continua flutuante, mesmo quando próxima ao corpo.
2. **Vestidos:** a mesma saia genérica não cria corpete ajustado e não respeita
   braços, patas, barriga e profundidade. Precisa de peças e ocultação por anatomia.
3. **Sapatos:** o desenho é um par inteiro com a sola voltada para a câmera.
   Não acompanha patas de alturas, aberturas e direções diferentes.
4. **Esportes:** raquete e taco não têm a mão/pata sobre o cabo em várias poses.
5. **Cabeça:** boné muito plano; laços/coroas/óculos precisam de contato e camadas
   específicos em chifres, antenas, orelhas e partes móveis dos veículos.
6. **Unicórnio:** sela parece adereço de ombro; requer perspectiva, tamanho e
   cintas no dorso. Asas precisam de articulação e fixação convincente.
7. **Oficina:** o carro já tem aerofólio desenhado na fonte; sobrepor outro não
   substitui a peça original. Nitro e escapamento precisam de fixação no chassi.
8. **Crescimento e poses:** conjunto da Lili usa o mesmo corpo vestido reduzido;
   faltam variações próprias de idade. Peças avulsas ficam ocultas em poses ainda
   não calibradas, portanto não há continuidade completa do figurino.
9. **Fontes:** outras imagens verdes ainda têm magenta; a borboletinha contém
   letras/marcas NINI na arte. Os 11 brinquedos em emoji destoam da bolinha 3D.

O resultado detalhado de cada peça está em `accessory-review.json`; cada
combinação, fonte e encaixe está em `accessory-matrix.json`. Não há aprovação
genérica do elenco. A publicação na main continua condicionada à conclusão.

## Reproduzir

```text
node --test tests/*.test.js
node scripts/audit-accessories.js
node scripts/preview-wardrobe.js
```

Inspetor: http://127.0.0.1:5192 — selecionar **Todas as fases** e a peça.
O comando `node scripts/audit-accessories.js --release` retorna erro enquanto
houver pendências artísticas: é uma verificação local, não altera o servidor.

## Arte corrigida

`assets/pets/slime_green_adult.png` foi editado pela ferramenta integrada de
imagem a partir de `slime_green_adult.webp`: remover fundo/contaminação magenta,
preservar identidade, pose, proporções e expressão, com fundo transparente.
O arquivo original foi preservado. O jogo usa o novo PNG para a fase adulta.
