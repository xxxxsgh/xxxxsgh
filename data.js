// Dados do jogo: classes, NPCs, missões, bosses, itens, missões diárias.
// Tudo em PT-BR. Pensado em torno da primeira missão principal: ENEM.

window.GAME_DATA = (function () {
  const CLASSES = {
    aprendiz: {
      name: 'Aprendiz',
      avatar: '🧙',
      attrs: { inteligencia: 5, disciplina: 5, sabedoria: 5, carisma: 5, foco: 5 },
      desc: 'Equilíbrio em tudo. Bom para começar a jornada.',
    },
    erudito: {
      name: 'Erudito',
      avatar: '🧠',
      attrs: { inteligencia: 8, disciplina: 5, sabedoria: 6, carisma: 4, foco: 5 },
      desc: 'Aprende rápido. Ganha +20% XP em questões.',
    },
    monge: {
      name: 'Monge',
      avatar: '🧘',
      attrs: { inteligencia: 5, disciplina: 8, sabedoria: 6, carisma: 4, foco: 7 },
      desc: 'Sequências são mais fortes. +1 energia máxima por nível.',
    },
    bardo: {
      name: 'Bardo',
      avatar: '🎭',
      attrs: { inteligencia: 5, disciplina: 5, sabedoria: 5, carisma: 8, foco: 5 },
      desc: 'Mestre da palavra. +30% XP em redação.',
    },
  };

  // NPCs que dão missões e dicas
  const NPCS = [
    {
      id: 'ariston',
      name: 'Mestre Ariston',
      role: 'Orientador da Academia',
      avatar: '🧓',
      quote: 'Toda jornada começa com um plano. Vamos construir o seu.',
      dialogues: [
        'O ENEM não é apenas uma prova — é uma estrada. Você precisa estudar com método.',
        'Lembre-se: constância vence intensidade. Estudar 1h por dia, todo dia, é melhor que 10h num domingo.',
        'Ao completar uma sub-missão, volte aqui e relate.',
      ],
      gives: ['main_enem'],
    },
    {
      id: 'lyra',
      name: 'Lyra, a Bibliotecária',
      role: 'Guardiã dos Livros',
      avatar: '📚',
      quote: 'A leitura é o feitiço mais poderoso do mundo.',
      dialogues: [
        'Linguagens e Códigos exige leitura ativa. Não apenas leia: anote, conecte, questione.',
        'Tente ler 20 páginas todo dia. Romances, crônicas, artigos. Tudo conta.',
      ],
      gives: ['side_leitura', 'side_interpretacao'],
    },
    {
      id: 'zenon',
      name: 'Zenon, o Matemágico',
      role: 'Conjurador de Números',
      avatar: '🧙‍♂️',
      quote: 'Matemática é o feitiço que descreve o universo.',
      dialogues: [
        'Comece pelos fundamentos: razão, proporção, porcentagem, função.',
        'Faça 10 questões por dia, sempre revisando os erros.',
      ],
      gives: ['side_questoes_mat', 'side_revisao_erros'],
    },
    {
      id: 'iris',
      name: 'Iris, a Redatora',
      role: 'Mestra da Pena',
      avatar: '✍️',
      quote: 'Cada palavra é uma flecha. Saiba para onde mira.',
      dialogues: [
        'Estude a estrutura dissertativo-argumentativa: tese, argumentos, proposta de intervenção.',
        'Escreva uma redação completa por semana. Não tem revisor? Use IA, professores, colegas.',
      ],
      gives: ['side_redacao_semanal', 'side_repertorio'],
    },
    {
      id: 'aurelio',
      name: 'Doutor Aurélio',
      role: 'Curador do Corpo',
      avatar: '⚕️',
      quote: 'Não existe mente afiada num corpo cansado.',
      dialogues: [
        'Dormir 7-8h é mais importante que estudar 2h a mais.',
        'Beba 2L de água. Faça 20min de atividade física. Seu cérebro agradece.',
      ],
      gives: ['daily_sono', 'daily_agua', 'daily_exercicio'],
    },
    {
      id: 'sombrio',
      name: 'Sombrio',
      role: 'Rival da Procrastinação',
      avatar: '👤',
      quote: '...você acha mesmo que vai passar? Vai dormir mais 5 minutos...',
      dialogues: [
        'Toda vez que você adia, eu fico mais forte.',
        'Mas se você me derrotar todo dia, eu desapareço.',
      ],
      gives: ['side_focus_block'],
    },
  ];

  // Missões diárias (resetam todo dia)
  const DAILY_QUESTS = [
    {
      id: 'daily_estudo',
      title: 'Estudar 1 hora',
      desc: 'Foco em uma única matéria. Sem celular.',
      icon: '📖',
      xp: 30, coins: 5,
      energyCost: 5,
    },
    {
      id: 'daily_questoes',
      title: 'Resolver 10 questões',
      desc: 'Pode ser de qualquer área do ENEM.',
      icon: '🎯',
      xp: 25, coins: 4,
      energyCost: 4,
    },
    {
      id: 'daily_leitura',
      title: 'Ler 20 páginas',
      desc: 'Livro, artigo, crônica. Treina interpretação.',
      icon: '📚',
      xp: 20, coins: 3,
      energyCost: 3,
    },
    {
      id: 'daily_sono',
      title: 'Dormir 7h ou mais',
      desc: 'Mente descansada é mente afiada.',
      icon: '😴',
      xp: 15, coins: 3,
      hpHeal: 30,
    },
    {
      id: 'daily_agua',
      title: 'Beber 2L de água',
      desc: 'Hidratação melhora memória e foco.',
      icon: '💧',
      xp: 10, coins: 2,
      hpHeal: 10,
    },
    {
      id: 'daily_exercicio',
      title: '20 min de exercício',
      desc: 'Caminhada, alongamento, treino. Move o sangue.',
      icon: '🏃',
      xp: 20, coins: 3,
      hpHeal: 15,
      energyHeal: 10,
    },
    {
      id: 'daily_revisao',
      title: 'Revisar erros do dia',
      desc: 'O verdadeiro aprendizado vem do erro.',
      icon: '🔍',
      xp: 20, coins: 4,
    },
  ];

  // Missão principal: ENEM
  const MAIN_QUEST = {
    id: 'main_enem',
    title: 'A Jornada do ENEM',
    desc: 'Conquiste o exame que abre portas. Domine as 4 áreas e a redação.',
    tag: 'main',
    xp: 0, coins: 0, // recompensa por passo
    steps: [
      {
        id: 'enem_plano',
        title: 'Falar com Mestre Ariston e criar um plano de estudos',
        xp: 50, coins: 10,
      },
      {
        id: 'enem_linguagens',
        title: 'Despertar a Linguagem — completar 50 questões de Linguagens',
        xp: 120, coins: 25,
        progressMax: 50, progressLabel: 'questões',
      },
      {
        id: 'enem_matematica',
        title: 'Domínio dos Números — completar 50 questões de Matemática',
        xp: 140, coins: 30,
        progressMax: 50, progressLabel: 'questões',
      },
      {
        id: 'enem_natureza',
        title: 'Segredos da Natureza — completar 50 questões de Ciências da Natureza',
        xp: 130, coins: 28,
        progressMax: 50, progressLabel: 'questões',
      },
      {
        id: 'enem_humanas',
        title: 'Saberes do Mundo — completar 50 questões de Ciências Humanas',
        xp: 120, coins: 25,
        progressMax: 50, progressLabel: 'questões',
      },
      {
        id: 'enem_redacao',
        title: 'A Pena Sagrada — escrever 4 redações treinadas',
        xp: 200, coins: 40,
        progressMax: 4, progressLabel: 'redações',
      },
      {
        id: 'enem_simulado',
        title: 'Encarar um simulado completo',
        xp: 250, coins: 60,
      },
      {
        id: 'enem_final',
        title: 'Confronto Final — derrotar o BOSS "O ENEM"',
        xp: 1000, coins: 300,
        boss: 'boss_enem_final',
      },
    ],
  };

  // Missões secundárias (side quests dadas por NPCs)
  const SIDE_QUESTS = [
    {
      id: 'side_leitura', npc: 'lyra', tag: 'side',
      title: 'Ler 1 livro completo',
      desc: 'Pode ser literatura, divulgação científica, qualquer coisa.',
      xp: 200, coins: 50,
    },
    {
      id: 'side_interpretacao', npc: 'lyra', tag: 'side',
      title: 'Fazer 30 questões de interpretação de texto',
      desc: 'Identifique tese, intencionalidade, recursos.',
      xp: 90, coins: 18,
      progressMax: 30, progressLabel: 'questões',
    },
    {
      id: 'side_questoes_mat', npc: 'zenon', tag: 'side',
      title: 'Treinar 100 questões de Matemática',
      desc: 'Foco em funções, geometria e estatística.',
      xp: 180, coins: 35,
      progressMax: 100, progressLabel: 'questões',
    },
    {
      id: 'side_revisao_erros', npc: 'zenon', tag: 'side',
      title: 'Refazer todas as questões erradas da semana',
      desc: 'Anote o porquê do erro. Conceitual? Distração?',
      xp: 80, coins: 15,
    },
    {
      id: 'side_redacao_semanal', npc: 'iris', tag: 'side',
      title: 'Escrever 1 redação modelo ENEM',
      desc: 'Tema livre. Texto completo, com proposta de intervenção.',
      xp: 100, coins: 20,
    },
    {
      id: 'side_repertorio', npc: 'iris', tag: 'side',
      title: 'Coletar 5 repertórios socioculturais',
      desc: 'Filmes, livros, dados, leis, citações. Anote em um caderno.',
      xp: 70, coins: 14,
      progressMax: 5, progressLabel: 'repertórios',
    },
    {
      id: 'side_focus_block', npc: 'sombrio', tag: 'side',
      title: 'Derrotar Sombrio — 4 blocos de foco profundo',
      desc: '4 sessões de 25min sem celular. Pomodoro clássico.',
      xp: 120, coins: 25,
      progressMax: 4, progressLabel: 'blocos',
    },
  ];

  // Bosses (representam grandes avaliações)
  const BOSSES = [
    {
      id: 'boss_simulado_mensal',
      name: 'Simulado Mensal',
      sub: 'Avaliação completa de meio de mês. Bata-o para validar seu progresso.',
      avatar: '📝',
      maxHp: 100,
      attackLabel: 'Resolver bloco (+10 dano)',
      attackDmg: 10,
      energyCost: 6,
      rewards: { xp: 300, coins: 80, item: 'item_amuleto_disciplina' },
    },
    {
      id: 'boss_linguagens',
      name: 'Lord Verbis (Linguagens)',
      sub: 'Senhor das palavras enganosas. Atordoa com textos longos.',
      avatar: '📜',
      maxHp: 80,
      attackLabel: 'Resolver 5 questões (+10 dano)',
      attackDmg: 10,
      energyCost: 4,
      rewards: { xp: 250, coins: 60, item: 'item_pergaminho_xp' },
    },
    {
      id: 'boss_matematica',
      name: 'Calc, o Devorador de Tempo',
      sub: 'Cada questão consome 4 minutos preciosos. Resista.',
      avatar: '🔢',
      maxHp: 120,
      attackLabel: 'Resolver 5 questões (+10 dano)',
      attackDmg: 10,
      energyCost: 5,
      rewards: { xp: 300, coins: 70, item: 'item_pocao_foco' },
    },
    {
      id: 'boss_natureza',
      name: 'Quimera Elemental',
      sub: 'Mistura de física, química e biologia em proporções caóticas.',
      avatar: '🧪',
      maxHp: 110,
      attackLabel: 'Resolver 5 questões (+10 dano)',
      attackDmg: 10,
      energyCost: 5,
      rewards: { xp: 280, coins: 65, item: 'item_cafe_elfico' },
    },
    {
      id: 'boss_humanas',
      name: 'Cronos, o Historiador',
      sub: 'Conhece toda a história. Você precisa contestá-lo com contexto.',
      avatar: '⏳',
      maxHp: 100,
      attackLabel: 'Resolver 5 questões (+10 dano)',
      attackDmg: 10,
      energyCost: 4,
      rewards: { xp: 260, coins: 60, item: 'item_caderno_encantado' },
    },
    {
      id: 'boss_redacao',
      name: 'Espelho da Redação 1000',
      sub: 'Reflete cada erro seu de coesão, coerência e proposta.',
      avatar: '🪞',
      maxHp: 100,
      attackLabel: 'Treinar 1 parágrafo (+25 dano)',
      attackDmg: 25,
      energyCost: 6,
      rewards: { xp: 350, coins: 90, item: 'item_pena_sagrada' },
    },
    {
      id: 'boss_enem_final',
      name: 'O ENEM',
      sub: 'A Prova Final. Dois dias. 180 questões. Uma redação. Você consegue.',
      avatar: '👑',
      maxHp: 500,
      attackLabel: 'Atacar (+10 dano) — exige tudo de você',
      attackDmg: 10,
      energyCost: 8,
      rewards: { xp: 2000, coins: 500, item: 'item_diploma' },
      finalBoss: true,
    },
  ];

  // Itens (consumíveis e troféus)
  const ITEMS = {
    item_pocao_foco: { name: 'Poção de Foco', icon: '🧪', desc: 'Restaura 20 de energia.', use: { energyHeal: 20 } },
    item_cafe_elfico: { name: 'Café Élfico', icon: '☕', desc: 'Restaura 15 energia e 10 vida.', use: { energyHeal: 15, hpHeal: 10 } },
    item_pergaminho_xp: { name: 'Pergaminho do Saber', icon: '📜', desc: 'Concede 100 XP instantaneamente.', use: { xp: 100 } },
    item_amuleto_disciplina: { name: 'Amuleto da Disciplina', icon: '🧿', desc: 'Troféu. +1 disciplina.', passive: { disciplina: 1 } },
    item_caderno_encantado: { name: 'Caderno Encantado', icon: '📓', desc: 'Troféu. +1 sabedoria.', passive: { sabedoria: 1 } },
    item_pena_sagrada: { name: 'Pena Sagrada', icon: '🪶', desc: 'Troféu. +1 carisma.', passive: { carisma: 1 } },
    item_diploma: { name: 'Diploma do ENEM', icon: '🎓', desc: 'Você venceu. A jornada continua.', passive: {} },
    item_pao_estudante: { name: 'Pão do Estudante', icon: '🥖', desc: 'Restaura 15 vida.', use: { hpHeal: 15 } },
  };

  // Loja simples (compra com moedas)
  const SHOP = [
    { itemId: 'item_pocao_foco', price: 20 },
    { itemId: 'item_cafe_elfico', price: 30 },
    { itemId: 'item_pao_estudante', price: 15 },
    { itemId: 'item_pergaminho_xp', price: 80 },
  ];

  return { CLASSES, NPCS, DAILY_QUESTS, MAIN_QUEST, SIDE_QUESTS, BOSSES, ITEMS, SHOP };
})();
