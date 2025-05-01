// --- game_config.js ---

// Default Elo rating for new players or unrated games
const DEFAULT_ELO = 1000;

// K-Factor for Elo calculation (adjust based on desired volatility)
const K_FACTOR = 32;

// Configuration for different game types
const gameTypesConfig = {
    'golf': 'Golf',
    'pool_8ball': 'Billiards (8 Ball)',
    'pool_9ball': 'Billiards (9 Ball)',
    'pool_cutthroat': 'Billiards (Cutthroat)',
    'chess': 'Chess',
    'ping_pong': 'Ping Pong',
    'putt_pong': 'Putt Pong',
    'foosball': 'Foosball',
    'bowling': 'Bowling',
    // Specific Board Games
    'board_game_monopoly': 'Board Game: Monopoly',
    'board_game_clue': 'Board Game: Clue',
    'board_game_sorry': 'Board Game: Sorry!',
    'board_game_chutes': 'Board Game: Chutes and Ladders',
    'board_game': 'Board Game (Other)', // Keep generic as fallback/category
    // Team Sports
    'basketball': 'Basketball',
    'pickleball': 'Pickleball',
    'football': 'Football',
    'soccer': 'Soccer',
    'volleyball': 'Volleyball',
    // TCGs / Wargames
    'magic_gathering': 'Magic: The Gathering',
    'disney_lorcana': 'Disney Lorcana',
    'warhammer_40k': 'Warhammer 40k',
    // Add more game types here as needed
    // 'darts': 'Darts',
    // 'shuffleboard': 'Shuffleboard',
    // 'cornhole': 'Cornhole',
};

// Keys used for Elo ratings within the player document's 'elos' map
// Exclude games using different systems (Golf Handicap, Bowling Average)
// Exclude team games and solo games for now, focus Elo on 1v1 competitive games.
const ELO_GAME_KEYS = Object.keys(gameTypesConfig).filter(key =>
    ![
        'golf',
        'bowling',
        'basketball', // Team
        'pickleball', // Often 2v2
        'football',   // Team
        'soccer',     // Team
        'volleyball', // Team
        'pool_cutthroat', // Multi-player variable
        // Add other non-1v1 or non-Elo games here if needed
        // e.g., solo pool formats if added, specific board games unless ranked 1v1
    ].includes(key)
    && !key.startsWith('board_game_') // Exclude specific board games unless explicitly ranked later
);

console.log("[Config] game_config.js loaded. DEFAULT_ELO, K_FACTOR, gameTypesConfig, ELO_GAME_KEYS defined.");
console.log("[Config] ELO_GAME_KEYS:", ELO_GAME_KEYS); // Log the keys being used for Elo