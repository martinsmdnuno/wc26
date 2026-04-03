export const translations = {
  'pt-PT': {
    // Header
    appTitle: 'MUNDIAL',
    appYear: '2026',

    // Bottom nav
    navSchedule: 'Calendário',
    navMyMatches: 'Os Meus Jogos',
    navTeams: 'Equipas',

    // Match card
    nextMatch: 'Próximo Jogo',
    group: 'Grupo',
    vs: 'vs',

    // Teams page
    searchPlaceholder: 'Procurar equipa...',
    removeFavourite: 'Remover favorito',
    addFavourite: 'Adicionar favorito',

    // My Matches empty state
    emptyTitle: 'Ainda não segues nenhuma equipa',
    emptyDescription: 'Vai a Equipas e escolhe a tua!',
    emptyCta: 'Escolher Equipas',
    noMatchesInPhase: 'Nenhum jogo nesta fase para as tuas equipas.',

    // Phase names
    'phase.group': 'Fase de Grupos',
    'phase.r32': 'Oitavos de Final',
    'phase.r16': 'Quartos de Final',
    'phase.qf': 'Meias-Finais',
    'phase.sf': 'Semi-Finais',
    'phase.3rd': '3.º Lugar',
    'phase.final': 'Final',

    // Match labels (knockout)
    'label.3º Lugar': '3.º Lugar',
    'label.Final': 'Final',
    'label.Semi-Final 1': 'Semi-Final 1',
    'label.Semi-Final 2': 'Semi-Final 2',

    // Date locale
    dateLocale: 'pt-PT',

    // Language switcher
    language: 'Idioma',
  },

  'en-GB': {
    // Header
    appTitle: 'WORLD CUP',
    appYear: '2026',

    // Bottom nav
    navSchedule: 'Schedule',
    navMyMatches: 'My Matches',
    navTeams: 'Teams',

    // Match card
    nextMatch: 'Next Match',
    group: 'Group',
    vs: 'vs',

    // Teams page
    searchPlaceholder: 'Search team...',
    removeFavourite: 'Remove favourite',
    addFavourite: 'Add favourite',

    // My Matches empty state
    emptyTitle: "You're not following any team yet",
    emptyDescription: 'Head to Teams and pick yours!',
    emptyCta: 'Choose Teams',
    noMatchesInPhase: 'No matches in this phase for your teams.',

    // Phase names
    'phase.group': 'Group Stage',
    'phase.r32': 'Round of 32',
    'phase.r16': 'Round of 16',
    'phase.qf': 'Quarter-Finals',
    'phase.sf': 'Semi-Finals',
    'phase.3rd': '3rd Place',
    'phase.final': 'Final',

    // Match labels (knockout)
    'label.3º Lugar': '3rd Place',
    'label.Final': 'Final',
    'label.Semi-Final 1': 'Semi-Final 1',
    'label.Semi-Final 2': 'Semi-Final 2',

    // Date locale
    dateLocale: 'en-GB',

    // Language switcher
    language: 'Language',
  },
};

// Generate "Jogo XX" → "Match XX" mappings
for (let i = 73; i <= 100; i++) {
  translations['pt-PT'][`label.Jogo ${i}`] = `Jogo ${i}`;
  translations['en-GB'][`label.Jogo ${i}`] = `Match ${i}`;
}
