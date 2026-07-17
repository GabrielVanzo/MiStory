import type { Difficulty } from "../types/game";

/**
 * Local enigma catalog — the source of truth for the puzzle content.
 * Seeded into the database by `prisma/seed.ts` (upsert by `id`, used as slug).
 *
 * `intro` is public (everyone sees the scene). `answer` and `explanation` are
 * SECRET: they are only ever delivered to the round's host. Never include them
 * in any broadcast payload.
 *
 * `hints` are SECRET too, and ordered from subtle to revealing. The master
 * releases them one at a time as the detectives pile up negative answers; only
 * a released hint is ever broadcast. These are editable drafts — rewrite freely.
 *
 * Content note: these are original re-tellings of classic lateral-thinking
 * puzzles (public-domain folklore of the genre), not the commercial card decks.
 */
export interface EnigmaSeed {
  /** Stable identifier / slug. */
  id: string;
  /** Difficulty level. */
  level: Difficulty;
  title: string;
  /** The public scene shown to every player. */
  intro: string;
  /** SECRET — what actually happened. */
  answer: string;
  /** SECRET — the reasoning that ties the scene together. */
  explanation: string;
  /** SECRET — ordered hints (subtle → revealing), released one by one. Max 3. */
  hints: string[];
}

export const ENIGMAS: EnigmaSeed[] = [
  {
    id: "romeu-e-julieta",
    level: "EASY",
    title: "Romeu e Julieta",
    intro:
      "Romeu e Julieta estão mortos no chão de uma sala, cercados por cacos de vidro e uma poça d'água. A porta estava trancada e ninguém entrou na casa.",
    answer: "Romeu e Julieta eram peixes. O gato da casa derrubou o aquário.",
    explanation:
      "O vidro é do aquário e a água é o que restou dele. Sem ninguém para devolvê-los à água, os peixes morreram. O gato já morava na casa, então a porta trancada nunca foi um problema.",
    hints: [
      "Ninguém precisou entrar nem sair da casa para isso acontecer.",
      "Romeu e Julieta nunca foram humanos.",
      "Os cacos são de um recipiente de vidro que ficava cheio d'água.",
    ],
  },
  {
    id: "a-mochila-fechada",
    level: "EASY",
    title: "A mochila fechada",
    intro:
      "Um homem é encontrado morto no meio de um campo aberto. Ao lado do corpo há apenas uma mochila fechada. Não existem pegadas além das dele.",
    answer: "Ele era paraquedista. A mochila era o paraquedas, que não abriu.",
    explanation:
      "Ele caiu do céu, por isso não há pegadas chegando ao local. A mochila 'fechada' é justamente o motivo da morte: o equipamento nunca foi acionado.",
    hints: [
      "A ausência de pegadas chegando ao corpo é a pista central.",
      "Ele não chegou ao campo caminhando.",
      "A mochila deveria ter aberto no ar.",
    ],
  },
  {
    id: "a-poca-dagua",
    level: "MEDIUM",
    title: "A poça d'água",
    intro:
      "Um homem está enforcado no centro de um galpão vazio, a três metros do chão. A porta estava trancada por dentro. Abaixo do corpo há somente uma poça d'água.",
    answer: "Ele subiu em um grande bloco de gelo, que derreteu.",
    explanation:
      "O bloco serviu de apoio para alcançar a altura da corda. Ao derreter, restou apenas a água — o que explica a ausência de cadeira, escada ou qualquer outro suporte.",
    hints: [
      "Ele precisou de altura para alcançar a corda, mas não sobrou nenhum apoio.",
      "O que serviu de apoio desapareceu sozinho.",
      "A poça d'água já foi sólida.",
    ],
  },
  {
    id: "a-sopa-de-albatroz",
    level: "HARD",
    title: "A sopa de albatroz",
    intro:
      "Um homem entra num restaurante à beira-mar, pede sopa de albatroz, prova uma única colherada, paga a conta e vai embora. Naquela noite, tira a própria vida.",
    answer:
      "Anos antes ele naufragou. Para mantê-lo vivo, os companheiros disseram que a carne servida era de albatroz — mas era de um amigo morto.",
    explanation:
      "Ao provar o sabor real do albatroz, ele percebeu que jamais havia comido aquilo. A conclusão sobre o que realmente comeu durante o naufrágio foi insuportável.",
    hints: [
      "O sabor da sopa contradisse uma lembrança antiga dele.",
      "Ele já achou ter comido albatroz antes, num momento extremo da vida.",
      "Durante um naufrágio, enganaram-no sobre o que estava comendo.",
    ],
  },
  {
    id: "o-botao-inalcancavel",
    level: "EASY",
    title: "O botão inalcançável",
    intro:
      "Todos os dias um homem pega o elevador no térreo, desce no sétimo andar e sobe o restante a pé até o décimo, onde mora. Nos dias de chuva, ele vai direto ao décimo.",
    answer:
      "Ele é muito baixo e só alcança o botão do sétimo andar. Na chuva, usa o guarda-chuva para apertar o do décimo.",
    explanation:
      "Não é uma escolha, é uma limitação física. A chuva não muda o prédio — muda o que ele carrega na mão.",
    hints: [
      "A chuva muda algo que ele leva na mão, não o prédio.",
      "É uma limitação física, não uma preferência.",
      "Ele não alcança sozinho o botão dos andares mais altos.",
    ],
  },
  {
    id: "a-musica-parou",
    level: "MEDIUM",
    title: "A música parou",
    intro: "A música parou e a mulher morreu.",
    answer:
      "Ela era equilibrista de circo e atravessava a corda bamba vendada. A música indicava que ainda havia corda à frente; o silêncio era o sinal para parar.",
    explanation:
      "O músico interrompeu a apresentação no momento errado. Sem enxergar, ela seguiu o único sinal que tinha e deu um passo além da plataforma.",
    hints: [
      "O som tinha uma função para ela além de entreter.",
      "Ela dependia da música para saber onde pisar.",
      "Vendada na corda bamba, o silêncio era o sinal de parar.",
    ],
  },
  {
    id: "as-pegadas-na-neve",
    level: "MEDIUM",
    title: "As pegadas na neve",
    intro:
      "Na neve, um rastro de pegadas começa no meio do nada e termina em um corpo. As pegadas apontam para longe do corpo, não em direção a ele.",
    answer: "A vítima caminhou de costas para confundir quem a perseguia.",
    explanation:
      "Andando de costas, ela deixou pegadas que pareciam se afastar do local. O rastro 'começa do nada' porque ela partiu de um ponto onde a neve já havia sido pisada.",
    hints: [
      "As pegadas enganam sobre a direção real do trajeto.",
      "Ela quis parecer que ia para o lado oposto.",
      "Ela caminhou de costas.",
    ],
  },
  {
    id: "o-carro-vazio-na-ponte",
    level: "MEDIUM",
    title: "O carro vazio na ponte",
    intro:
      "Um carro é encontrado parado no meio de uma ponte, com o motor ligado, os faróis acesos e a porta do motorista aberta. Não há ninguém dentro nem sinais de luta.",
    answer:
      "O motorista parou para socorrer alguém que caía no rio e acabou levado pela correnteza.",
    explanation:
      "A pressa explica o motor ligado e a porta aberta: ele não teve tempo de desligar nada. Não há luta porque não houve crime — houve uma tentativa de resgate.",
    hints: [
      "Não houve crime nenhum ali.",
      "Ele saiu com pressa para ajudar outra pessoa.",
      "Alguém caía no rio e ele tentou o resgate.",
    ],
  },
  {
    id: "o-vinho-envenenado",
    level: "HARD",
    title: "O brinde fatal",
    intro:
      "Duas pessoas bebem do mesmo jarro de vinho. Uma bebe devagar, conversando; a outra bebe tudo rapidamente. Apenas a que bebeu devagar morre.",
    answer:
      "O veneno estava nas pedras de gelo, que só tiveram tempo de derreter no copo de quem bebeu devagar.",
    explanation:
      "Quem bebeu rápido engoliu o gelo ainda intacto, sem liberar o veneno. O tempo — e não a dose — decidiu quem morreria.",
    hints: [
      "O que os dois beberam era idêntico; o que muda é o tempo.",
      "Quem bebeu devagar deu tempo a algo acontecer no copo.",
      "O veneno estava nas pedras de gelo.",
    ],
  },
  {
    id: "o-cachorro-que-nao-latiu",
    level: "MEDIUM",
    title: "O cachorro que não latiu",
    intro:
      "Uma casa é roubada durante a madrugada. O cão de guarda, conhecido por latir para qualquer estranho, permaneceu em silêncio a noite inteira.",
    answer: "O ladrão não era um estranho: era alguém que o cão conhecia bem.",
    explanation:
      "O silêncio é a pista. Um cão treinado para alertar sobre desconhecidos só se cala diante de alguém familiar — o que reduz drasticamente a lista de suspeitos.",
    hints: [
      "O silêncio do cão é a informação, não a falha.",
      "O cão só se cala diante de quem conhece.",
      "O ladrão era alguém familiar ao cão.",
    ],
  },
  {
    id: "o-jantar-para-um",
    level: "EASY",
    title: "Jantar para um",
    intro:
      "Uma mulher prepara um jantar caprichado para duas pessoas, arruma a mesa com esmero, come sozinha e depois joga o segundo prato inteiro no lixo, sorrindo.",
    answer:
      "Era o aniversário do divórcio dela. O segundo prato era um ritual particular de despedida.",
    explanation:
      "O jantar não era uma espera frustrada, e sim uma comemoração encenada. Descartar o prato do outro era exatamente o ponto.",
    hints: [
      "Ela não estava esperando ninguém chegar.",
      "O segundo prato era parte de um ritual, não de uma espera.",
      "Ela comemorava o fim de um casamento.",
    ],
  },
  {
    id: "o-relogio-parado",
    level: "EASY",
    title: "O relógio parado",
    intro:
      "Um homem confere um relógio que está parado há anos e, mesmo assim, sai de casa na hora exata todos os dias.",
    answer:
      "Ele usa o relógio parado apenas como referência visual; quem marca a hora é o apito da fábrica ao lado.",
    explanation:
      "O relógio é decorativo e faz parte do ritual. A informação real vem de outra fonte, sonora, que ele nem percebe mais que usa.",
    hints: [
      "O relógio não é a fonte real da hora.",
      "A informação certa chega por outro sentido, não pela visão.",
      "Um som vizinho marca a hora para ele.",
    ],
  },
  {
    id: "a-janela-do-decimo-andar",
    level: "MEDIUM",
    title: "A janela do décimo andar",
    intro:
      "Um homem pula da janela de um décimo andar e sai andando sem um único arranhão. Não havia rede, colchão ou toldo.",
    answer: "Ele pulou da janela para dentro do apartamento, não para fora.",
    explanation:
      "A altura nunca esteve no caminho dele. Presumimos a direção do salto — o enigma só depende dessa suposição errada.",
    hints: [
      "A altura nunca esteve no caminho dele.",
      "Presumimos a direção errada do salto.",
      "Ele pulou para dentro do apartamento.",
    ],
  },
  {
    id: "o-bilhete-molhado",
    level: "MEDIUM",
    title: "O bilhete molhado",
    intro:
      "Um bilhete encharcado é encontrado ao lado de um corpo. Ele salvaria a vida da vítima, mas as palavras estavam completamente borradas.",
    answer:
      "O bilhete avisava que a ponte estava interditada. A chuva apagou o aviso antes que ele fosse lido.",
    explanation:
      "A informação existia e chegou a tempo — apenas não sobreviveu ao caminho. A causa da morte foi a chuva, indiretamente.",
    hints: [
      "A informação chegou a tempo, mas não sobreviveu ao caminho.",
      "A chuva tem papel duplo nessa história.",
      "O bilhete avisava de um perigo e a água apagou as palavras.",
    ],
  },
  {
    id: "o-farol-apagado",
    level: "MEDIUM",
    title: "O farol apagado",
    intro:
      "O faroleiro cumpriu seu turno com perfeição, dormiu tranquilo e, mesmo assim, um navio naufragou naquela noite bem diante da costa.",
    answer: "Ele acendeu o farol durante o dia e o apagou ao anoitecer, por confusão de turno.",
    explanation:
      "Do ponto de vista dele, o trabalho foi impecável — só que invertido. O navio contava com a luz exatamente quando ela não estava lá.",
    hints: [
      "O faroleiro achou que fez tudo certo.",
      "A luz esteve acesa na hora errada.",
      "Ele acendeu o farol de dia e apagou de noite.",
    ],
  },
  {
    id: "o-gosto-da-agua",
    level: "HARD",
    title: "O gosto da água",
    intro:
      "Os moradores de um prédio antigo reclamam há dias que a água está com um gosto adocicado e estranho. Um funcionário sobe até o telhado, abre a caixa d'água e entende tudo na hora.",
    answer:
      "Havia um corpo em decomposição dentro da caixa d'água. A pessoa caíra ali dentro e não conseguira sair.",
    explanation:
      "Toda a água do prédio passava pelo corpo antes de chegar às torneiras. O gosto estranho era a única pista — sentida muito antes de alguém pensar em olhar lá em cima.",
    hints: [
      "O problema estava acima dos moradores, não nas torneiras.",
      "Toda a água passava por algo antes de chegar às casas.",
      "Havia um corpo dentro da caixa d'água.",
    ],
  },
  {
    id: "o-anel-no-lixo",
    level: "MEDIUM",
    title: "O anel no lixo",
    intro:
      "Uma mulher joga fora, deliberadamente, um anel caríssimo de família. No dia seguinte, revira o lixo desesperada para encontrá-lo.",
    answer:
      "Ela jogou o anel fora numa discussão e, horas depois, soube que a sogra viria buscá-lo de volta como herança para outra pessoa.",
    explanation:
      "O gesto foi impulsivo, o arrependimento foi prático. Não é o valor sentimental que a faz procurar — é a necessidade de devolvê-lo intacto.",
    hints: [
      "Ela se arrepende por um motivo prático, não sentimental.",
      "Alguém viria buscar o anel de volta.",
      "Ela o jogou fora numa discussão e agora precisa devolvê-lo intacto.",
    ],
  },
  {
    id: "o-quadro-torto",
    level: "MEDIUM",
    title: "O quadro torto",
    intro:
      "Um homem chega em casa, vê um quadro levemente torto na parede e imediatamente liga para a polícia — antes de olhar qualquer outra coisa.",
    answer: "O quadro escondia um cofre. Torto, significava que alguém o havia aberto.",
    explanation:
      "Ele nunca tocaria no quadro sem realinhá-lo. A pequena imperfeição é uma assinatura de que outra pessoa esteve ali.",
    hints: [
      "O quadro torto significa que alguém esteve ali.",
      "Ele jamais deixaria aquele quadro desalinhado.",
      "O quadro esconde um cofre — torto, indica que foi aberto.",
    ],
  },
  {
    id: "a-cadeira-caida",
    level: "MEDIUM",
    title: "A cadeira caída",
    intro:
      "Em uma sala silenciosa há uma cadeira caída no chão e nada mais fora do lugar. Não houve crime, mas alguém morreu.",
    answer: "Um homem sofreu um infarto ao se levantar bruscamente para atender ao telefone.",
    explanation:
      "A cadeira caiu com o movimento súbito, não com uma luta. A ausência de qualquer outra desordem é justamente o que descarta violência.",
    hints: [
      "Não houve violência nenhuma.",
      "A cadeira caiu por um movimento súbito, não por luta.",
      "Ele se levantou de repente e sofreu um infarto.",
    ],
  },
  {
    id: "o-desconhecido-no-velorio",
    level: "HARD",
    title: "O desconhecido no velório",
    intro:
      "No velório da própria mãe, uma mulher se apaixona à primeira vista por um homem que nunca tinha visto. Ele vai embora sem deixar nome nem contato. Dias depois, ela assassina a própria irmã.",
    answer:
      "Ela imaginou que o homem misterioso só aparecia em ocasiões de família como aquela. Matando a irmã, garantiria outro velório — e uma nova chance de reencontrá-lo.",
    explanation:
      "A lógica é fria e retorcida: para ela, um segundo velório era a única forma de repetir o encontro. O crime não tem a ver com a irmã, e sim com o desconhecido.",
    hints: [
      "A paixão no velório é a chave de tudo.",
      "Ela queria recriar exatamente aquele tipo de ocasião.",
      "Matar a irmã garantiria outro velório — e reencontrar o homem.",
    ],
  },
  {
    id: "a-foto-rasgada",
    level: "MEDIUM",
    title: "A foto rasgada",
    intro:
      "Uma foto antiga é encontrada rasgada exatamente ao meio, mas as duas metades foram guardadas com cuidado em envelopes separados.",
    answer: "Um casal separado dividiu a única foto do filho para que ambos pudessem levá-la.",
    explanation:
      "O rasgo não é raiva, é partilha. O cuidado com as duas metades revela afeto, não destruição.",
    hints: [
      "O rasgo foi cuidadoso, não violento.",
      "Duas pessoas queriam levar a mesma imagem.",
      "Um casal separado dividiu a única foto do filho.",
    ],
  },
  {
    id: "o-telefonema-de-madrugada",
    level: "MEDIUM",
    title: "O telefonema de madrugada",
    intro:
      "O telefone toca às três da manhã. O homem atende, não diz uma palavra, escuta por dois segundos, desliga e volta a dormir tranquilo.",
    answer:
      "Era ele mesmo ligando para casa de um hotel, para checar se a linha havia sido consertada.",
    explanation:
      "Se o telefone tocou, a linha funciona — e essa era a única informação necessária. Nada precisava ser dito.",
    hints: [
      "Nada precisava ser dito na ligação.",
      "O simples fato de o telefone tocar já era a resposta.",
      "Era ele ligando para a própria casa, testando a linha.",
    ],
  },
  {
    id: "o-gelo-fino",
    level: "EASY",
    title: "O gelo fino",
    intro:
      "Dois amigos atravessam um lago congelado. O mais pesado passa em segurança; o mais leve afunda.",
    answer: "O mais pesado atravessou primeiro e trincou o gelo, que cedeu sob o segundo.",
    explanation:
      "A ordem importa mais que o peso. O primeiro enfraqueceu a superfície sem quebrá-la; o segundo encontrou um gelo já comprometido.",
    hints: [
      "A ordem da travessia importa mais que o peso.",
      "O primeiro a passar mudou o gelo para o segundo.",
      "O mais pesado trincou o gelo, que cedeu sob o mais leve.",
    ],
  },
  {
    id: "o-silencio-do-radio",
    level: "MEDIUM",
    title: "O silêncio do rádio",
    intro:
      "Um operador de rádio ouve estática a noite inteira e, ao amanhecer, comunica com certeza absoluta que a expedição está perdida.",
    answer:
      "A expedição tinha ordem de transmitir um sinal curto a cada hora. A estática significava ausência de sinal.",
    explanation:
      "O que informa não é o ruído, é a falta do que deveria estar ali. O silêncio, nesse protocolo, é uma mensagem completa.",
    hints: [
      "O que informa não é o ruído.",
      "A expedição deveria emitir um sinal a cada hora.",
      "A estática significava a falta do sinal combinado.",
    ],
  },
  {
    id: "o-passageiro-que-desceu",
    level: "MEDIUM",
    title: "O passageiro que desceu",
    intro:
      "Um homem embarca num trem lotado, viaja por três horas e desce exatamente na estação de onde partiu. Ele considera a viagem um sucesso.",
    answer:
      "Ele é maquinista em treinamento e precisava observar o trajeto completo de ida e volta.",
    explanation:
      "O destino nunca foi o ponto. O objetivo era o percurso — algo invisível para quem assume que todo passageiro quer chegar a algum lugar.",
    hints: [
      "O destino nunca foi o ponto da viagem.",
      "Importava o percurso, não chegar a algum lugar.",
      "Ele é maquinista em treinamento observando o trajeto.",
    ],
  },
  {
    id: "o-palito-mais-curto",
    level: "HARD",
    title: "O palito mais curto",
    intro:
      "Um homem é encontrado morto no meio do deserto, sem roupa, com um palito de fósforo quebrado na mão. Não há pegadas nem veículo em quilômetros.",
    answer:
      "Ele estava num balão de ar quente que perdia altitude. Para aliviar o peso, os passageiros jogaram fora tudo — até as roupas — e ainda assim não bastou. Sortearam com palitos quem saltaria, e ele tirou o mais curto.",
    explanation:
      "A ausência de pegadas e de veículo se explica porque ele caiu do céu, não chegou por terra. O palito é o registro do sorteio que selou sua sorte.",
    hints: [
      "Ele não chegou ao deserto por terra.",
      "Jogaram muita coisa fora para aliviar peso — inclusive as roupas.",
      "Num balão que caía, sortearam com palitos quem saltaria.",
    ],
  },
  {
    id: "o-homem-que-parou-de-comer",
    level: "MEDIUM",
    title: "O homem que parou de comer",
    intro:
      "Um homem faminto recebe um prato de comida, dá uma garfada, empurra o prato e recusa comer qualquer coisa naquela casa novamente.",
    answer: "Ele reconheceu no tempero a receita de alguém que deveria estar morto há anos.",
    explanation:
      "O sabor funcionou como prova. Não é a comida que o assusta — é a conclusão sobre quem está na cozinha.",
    hints: [
      "Não é a comida que o assusta, é uma conclusão.",
      "O tempero revelou quem está na cozinha.",
      "Ele reconheceu a receita de alguém que deveria estar morto.",
    ],
  },
  {
    id: "o-elevador-que-nao-subia",
    level: "MEDIUM",
    title: "O elevador que não subia",
    intro: "Durante um mês, o elevador de um prédio só desce, nunca sobe — e ninguém reclama.",
    answer:
      "O prédio é uma mina. Os trabalhadores descem pelo elevador e sobem por uma rampa ao final do turno.",
    explanation:
      "Assumimos um prédio residencial acima do solo. Invertida a geografia, o comportamento do elevador é perfeitamente comum.",
    hints: [
      "Presumimos um prédio comum acima do solo.",
      "A geografia do lugar está invertida.",
      "É uma mina: descem de elevador e sobem por uma rampa.",
    ],
  },
  {
    id: "a-carta-nunca-enviada",
    level: "MEDIUM",
    title: "A carta nunca enviada",
    intro:
      "Uma carta escrita, selada e endereçada é encontrada numa gaveta trinta anos depois. Ela salvaria um casamento — e o remetente sabia disso.",
    answer: "Ele não a enviou porque o destinatário morreu no dia seguinte ao da escrita.",
    explanation:
      "A carta não foi covardia nem esquecimento. Guardá-la virou a única forma de manter viva uma conversa que nunca aconteceria.",
    hints: [
      "Não foi covardia nem esquecimento que a impediu de ser enviada.",
      "O destinatário nunca poderia recebê-la.",
      "Ele morreu no dia seguinte ao da escrita.",
    ],
  },
  {
    id: "o-quarto-sem-espelhos",
    level: "HARD",
    title: "O quarto sem espelhos",
    intro:
      "Um homem paga uma fortuna para dormir num quarto de hotel e exige que todos os espelhos sejam retirados. Pela manhã, é encontrado morto de susto.",
    answer:
      "Ele sofria de uma condição que o fazia não reconhecer o próprio rosto. Alguém deixou uma janela sem cortina, e ele viu o próprio reflexo no vidro à noite.",
    explanation:
      "A exigência revela o medo. O reflexo não precisava de espelho — bastou o vidro escuro para devolver a imagem que ele passou a vida evitando.",
    hints: [
      "A exigência dos espelhos revela o medo dele.",
      "Ele temia ver um rosto específico.",
      "Ele não reconhecia o próprio rosto e viu seu reflexo no vidro.",
    ],
  },
];
