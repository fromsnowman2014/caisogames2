/**
 * CaisoGames - Game Loader
 * Dynamically loads and manages game configurations
 */

export class GameLoader {
    constructor() {
        this.games = [];
        // Use absolute path from root for production compatibility
        this.gamesPath = '/games';
    }

    /**
     * Load all games by scanning the games directory
     * In production, this would call a backend API
     * For now, we'll manually register known games
     */
    async loadGames() {
        try {
            // Manually register games (in production, this would scan the directory)
            const gameIds = await this.discoverGames();

            const gamePromises = gameIds.map(id => this.loadGameConfig(id));
            const configs = await Promise.allSettled(gamePromises);

            this.games = configs
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value);

            return this.games;
        } catch (error) {
            console.error('Failed to load games:', error);
            return [];
        }
    }

    /**
     * Discover available games
     * TODO: In production, make API call to backend to list games
     */
    async discoverGames() {
        // For now, hardcode known games
        // In production, this would be: fetch('/api/games/list')
        return ['ski-caiso', 'feeding-caiso'];
    }

    /**
     * Load game configuration from game.config.json
     */
    async loadGameConfig(gameId) {
        try {
            const response = await fetch(`${this.gamesPath}/${gameId}/game.config.json`);

            if (!response.ok) {
                // If no config file, create a default one
                return this.createDefaultConfig(gameId);
            }

            const config = await response.json();
            return config;
        } catch (error) {
            console.warn(`Failed to load config for ${gameId}, using defaults:`, error);
            return this.createDefaultConfig(gameId);
        }
    }

    /**
     * Create default configuration for games without config file
     */
    createDefaultConfig(gameId) {
        const gameNames = {
            'ski-caiso': 'Ski Caiso',
            'feeding-caiso': 'Feeding Caiso'
        };

        const descriptions = {
            'ski-caiso': 'Endless 2D skiing game with procedural terrain and rhythmic flow mechanics',
            'feeding-caiso': 'Feed the hungry Caiso character in this fun arcade game'
        };

        return {
            id: gameId,
            name: gameNames[gameId] || gameId.split('-').map(w =>
                w.charAt(0).toUpperCase() + w.slice(1)
            ).join(' '),
            version: '0.1.0',
            description: descriptions[gameId] || 'An AI-generated game created with CaisoGames',
            author: 'CaisoGames AI Team',
            genre: 'Casual',
            tags: ['ai-generated', 'web'],

            thumbnail: `${this.gamesPath}/${gameId}/assets/ui/thumbnail.png`,
            banner: `${this.gamesPath}/${gameId}/assets/ui/banner.png`,
            icon: `${this.gamesPath}/${gameId}/assets/ui/icon.png`,

            entryPoint: `${this.gamesPath}/${gameId}/src/index.html`,

            controls: {
                keyboard: {
                    arrows: 'Move',
                    space: 'Action'
                }
            },

            features: [
                'AI-generated design',
                'Browser-based gameplay',
                'No installation required'
            ],

            stats: {
                playtime: '5-10 minutes',
                difficulty: 'Medium',
                replayability: 'High'
            },

            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0],
            status: 'in-development'
        };
    }

    /**
     * Get all games
     */
    getGames() {
        return this.games;
    }

    /**
     * Get games filtered by status
     */
    getGamesByStatus(status) {
        if (status === 'all') return this.games;
        return this.games.filter(game => game.status === status);
    }

    /**
     * Get single game by ID
     */
    getGameById(id) {
        return this.games.find(game => game.id === id);
    }

    /**
     * Launch a game
     */
    launchGame(gameId) {
        const game = this.getGameById(gameId);

        if (!game) {
            console.error(`Game not found: ${gameId}`);
            return;
        }

        if (game.status === 'coming-soon') {
            alert('This game is coming soon!');
            return;
        }

        // Open game in new window
        const gameUrl = game.entryPoint;
        const gameWindow = window.open(
            gameUrl,
            `game_${gameId}`,
            'width=800,height=600,menubar=no,toolbar=no,location=no,status=no'
        );

        if (!gameWindow) {
            // Fallback: open in same window
            window.location.href = gameUrl;
        }
    }

    /**
     * Create new game using PM Agent
     */
    async createGame(gameIdea, genre) {
        try {
            // In production, this would call the PM Agent API
            // For now, just show a message
            console.log('Creating game with idea:', gameIdea, 'genre:', genre);

            // TODO: Implement PM Agent API call
            // const response = await fetch('/api/pm-agent/create-game', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ gameIdea, genre })
            // });

            alert(
                'Game creation started!\n\n' +
                'The PM Agent will:\n' +
                '1. Design game concept\n' +
                '2. Create level designs\n' +
                '3. Write narrative\n' +
                '4. Generate assets\n' +
                '5. Write game code\n\n' +
                'This feature will be fully integrated soon.'
            );

            return { success: true, message: 'Game creation initiated' };
        } catch (error) {
            console.error('Failed to create game:', error);
            return { success: false, error: error.message };
        }
    }
}

// Export singleton instance
export const gameLoader = new GameLoader();
