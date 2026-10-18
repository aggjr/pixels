# Revisão do básico — 0.2.2

Base: fb045d6. Trabalho isolado em C:\pixels-visual-repair, branch codex/visual-repair.
O checkout original e o servidor público não foram modificados por esta revisão.

## Mudanças

- Nome não aparece no cabeçalho nem nas falas do ovo. Após o nascimento há um
  intervalo para conhecer o personagem, seguido de uma conversa sem escurecer a
  tela. A criança pode escrever o nome ou aceitar a sugestão. A escolha de pronome
  permanece. Reabrir durante o cadastro retoma a pergunta.
- Álbum, desfile e hospital deixam de aparecer; seus atalhos estão desabilitados.
  Preços, pontos de bondade e premiações saem do armário desta versão.
- O conjunto completo da Lili é uma opção do armário da gatinha, com arte integrada:
  vestido, óculos na testa, laço, bolsa com alça e sapatos. Trocar por uma peça avulsa
  substitui o conjunto completo; peças avulsas mantêm o sistema anterior de encaixe.
- Estados vestidos de contente, precisando de cuidados e dormindo. Alimentação
  alterna duas ilustrações registradas: pegar o peixe no potinho e mastigar. O
  potinho externo fica oculto nesse ciclo para evitar duplicação. É animação por
  quadros com movimento leve, não vídeo nem animação esquelética de mandíbula.
- Bolinha de estrelinha como objeto 3D transparente no brinquedo existente.
- Corrigida migração dos três IDs antigos de acessórios. Acessório avulso não
  força mais a pose neutra em todas as situações.
- Armário e coleção pausam necessidades e crescimento durante a escolha.
- overflow: clip impede que foco nos controles desloque o cabeçalho para fora.

## Limites

O conjunto novo pertence à espécie kitty; outras espécies não receberam novos
conjuntos nesta etapa. A mesma identidade vestida cresce por escala nas fases.
Peças avulsas ainda não têm poses específicas calibradas para todas as espécies.
Esta revisão não implementa festas, ranking público, pagamentos ou novas áreas.

## Validação

Testes de API, perfil e seleção de artes/migração. No navegador: ovo sem nome,
nascimento seguido de conversa, pronome feminino, seleção do conjunto,
alimentação, sono, brinquedo e persistência do conjunto. A publicação depende
de revisão da branch e implantação separada.

## Artes

Geradas pela ferramenta integrada, usando lili-dressed-photo.png como referência
de identidade e roupa. Arquivos com fundo transparente:

- assets/pets/lili-dressed-sleep.png
- assets/pets/lili-dressed-sad.png
- assets/pets/lili-dressed-eat.png
- assets/pets/lili-dressed-chew.png
- assets/accessories/toy-star-ball.png

Prompts de produção: preservar identidade, vestido lilás estrelado, alça no corpo,
bolsa lavanda, sapatos rosa, laço e óculos na testa. Gerar pose dormindo; pose
sentada pedindo cuidados; pose abaixada com peixe na boca sobre potinho; segundo
quadro da mesma pose com boca fechada mastigando. Sem cenário, texto ou símbolos.
Para a bola: esfera de borracha macia com painéis lavanda/menta e estrela dourada,
vista em três quartos, luz quente, sem cenário e com margem transparente.
