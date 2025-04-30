// --- game_config.js ---

// Default Elo rating for new players or unrated games
const DEFAULT_ELO = 1000;

// K-Factor for Elo calculation (adjust based on desired volatility)
const K_FACTOR = 32;

// Configuration for different game types
const gameTypesConfig = {
    'golf': 'Golf',
    'pool': 'Pool',
    'chess': 'Chess',
    'board_game': 'Board Game (Generic)',
    // Add more game types here as needed
    // 'ping_pong': 'Ping Pong',
};

// Keys used for Elo ratings within the player document's 'elos' map
// Ensure 'golf' is excluded if it uses a different rating system (like handicap)
const ELO_GAME_KEYS = Object.keys(gameTypesConfig).filter(key => key !== 'golf');

console.log("[Config] game_config.js loaded. DEFAULT_ELO, K_FACTOR, gameTypesConfig, ELO_GAME_KEYS defined.");