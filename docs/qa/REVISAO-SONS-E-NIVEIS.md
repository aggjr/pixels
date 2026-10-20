# Segunda conferencia: sons, idades e nivel intermediario

Data: 2026-10-20. Alteracoes locais em main, ainda sem INTEGRATE.

## Implementado

- Quatro tons progressivamente mais graves para vozes, choro e apito de barco.
- Choro tonal de bebe separado do lamento adulto; falha de motor para maquinas.
- Risada tonal nas brincadeiras biologicas; buzina e derrapagem sintetizada para carros.
- Fala pt-BR com altura por idade: amor com carinho alto e pedido de veterinario/mecanico.
- Sono e mute bloqueiam falas, interrompem vozes e cancelam risadas pendentes.
- Soluco espontaneo restrito a bebes; retirada de mugido/cavalo para elefante.
- Evitada duplicacao de sample tardio sobre o som procedural de fallback.
- Aba Nivel intermediario com tres artes novas: explorador, piloto e bola cometa.
- Itens intermediarios desabilitados no DOM, no equipar e na restauracao do guarda-roupa.
- Sem atribuicao falsa das artes geradas a Bia e Juju. Nenhum item de nivel maximo novo liberado.

## Evidencia e limites

- Duas rodadas de regressao acelerada de cuidados: 1.680 verificacoes por rodada, 140 configuracoes, 30 aparencias, quatro idades; nenhuma falha em ambas. A ultima rodada esta registrada em care-actions.json.
- Suite automatizada completa: 34 testes aprovados.
- Matriz de acessorios: 1.776 montagens separadas e quatro conjuntos completos; sem erro tecnico. Isso NAO significa aprovacao artistica.
- Testes de audio verificam frequencias WebAudio, agendamento, silencio no sono, mute e propriedades da fala. Nao substituem escuta humana em celular/tablet.
- Voz falada depende de speechSynthesis e das vozes pt-BR instaladas; sem essa API, as mensagens visuais e sons WebAudio continuam disponiveis.
- Risada, choro, apito e derrapagem novos sao sintetizados, nao gravacoes realistas aprovadas por escuta.

## Ainda nao aprovado

A revisao integral solicitada ainda NAO esta concluida. accessory-review.json conserva as pendencias por grupo: roupas sem modelagem individual, bolsas sem pega/alca coerente, calcados sem ajuste de cada pata, acessorios de cabine em conflito com rotores/antenas, pecas que desaparecem em poses sem ancoragem e artes sem desenho distinto para cada idade.

As novas pecas intermediarias tambem sao apenas previas: o chapeu aparece pequeno em varios cranios e os oculos ficam na testa em algumas especies. Permanecem bloqueadas ate ajuste e aprovacao visual de todas as anatomias. O nivel maximo permanece reservado para uma colecao futura; os itens antigos nao tiveram direitos ou disponibilidade alterados.

Ha variedade tecnica para cada especie (teste exige ao menos seis pecas compativeis), mas ainda nao e correto afirmar que todas possuem variedade suficiente de pecas REALISTAS e aprovadas. Nao publicar esta etapa como revisao artistica completa.
