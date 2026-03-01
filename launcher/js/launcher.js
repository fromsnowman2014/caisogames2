/**
 * CaisoGames Launcher - Main Application
 * Xbox-style game launcher interface
 */

import { gameLoader } from './game-loader.js';

class LauncherApp {
    constructor() {
        this.currentFilter = 'all';
        this.games = [];

        this.elements = {
            gamesGrid: document.getElementById('gamesGrid'),
            filterButtons: document.querySelectorAll('.filter-btn'),
            refreshBtn: document.getElementById('refreshBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            addGameCard: document.getElementById('addGameCard'),
            gameModal: document.getElementById('gameModal'),
            modalClose: document.getElementById('modalClose'),
            modalBody: document.getElementById('modalBody'),
            createGameModal: document.getElementById('createGameModal'),
            createModalClose: document.getElementById('createModalClose'),
            createGameForm: document.getElementById('createGameForm'),
            cancelCreate: document.getElementById('cancelCreate')
        };

        this.init();
    }

    async init() {
        console.log('🎮 Initializing CaisoGames Launcher...');

        // Load games
        await this.loadGames();

        // Setup event listeners
        this.setupEventListeners();

        console.log('✅ Launcher ready!');
    }

    async loadGames() {
        try {
            this.games = await gameLoader.loadGames();
            console.log(`Loaded ${this.games.length} games:`, this.games);
            this.renderGames();
        } catch (error) {
            console.error('Failed to load games:', error);
            this.showError('Failed to load games. Please refresh the page.');
        }
    }

    setupEventListeners() {
        // Filter buttons
        this.elements.filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Refresh button
        this.elements.refreshBtn.addEventListener('click', () => {
            this.loadGames();
        });

        // Settings button
        this.elements.settingsBtn.addEventListener('click', () => {
            alert('Settings coming soon!');
        });

        // Add game card
        this.elements.addGameCard.addEventListener('click', () => {
            this.openCreateGameModal();
        });

        // Modal close buttons
        this.elements.modalClose.addEventListener('click', () => {
            this.closeGameModal();
        });

        this.elements.createModalClose.addEventListener('click', () => {
            this.closeCreateGameModal();
        });

        this.elements.cancelCreate.addEventListener('click', () => {
            this.closeCreateGameModal();
        });

        // Create game form
        this.elements.createGameForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateGame();
        });

        // Close modals on outside click
        this.elements.gameModal.addEventListener('click', (e) => {
            if (e.target === this.elements.gameModal) {
                this.closeGameModal();
            }
        });

        this.elements.createGameModal.addEventListener('click', (e) => {
            if (e.target === this.elements.createGameModal) {
                this.closeCreateGameModal();
            }
        });
    }

    setFilter(filter) {
        this.currentFilter = filter;

        // Update active button
        this.elements.filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        // Re-render games
        this.renderGames();
    }

    renderGames() {
        const filteredGames = gameLoader.getGamesByStatus(this.currentFilter);

        if (filteredGames.length === 0) {
            this.showEmptyState();
            return;
        }

        const gamesHTML = filteredGames.map(game => this.createGameCard(game)).join('');
        this.elements.gamesGrid.innerHTML = gamesHTML;

        // Add event listeners to game cards
        this.attachGameCardListeners();
    }

    createGameCard(game) {
        const statusClass = `badge-${game.status}`;
        const statusText = game.status.replace('-', ' ').toUpperCase();

        const isPlayable = game.status === 'playable';
        const playButtonHTML = isPlayable
            ? `<button class="card-btn btn-play" data-action="play" data-game-id="${game.id}">
                   <span>▶️</span> Play Now
               </button>`
            : `<button class="card-btn btn-disabled">
                   <span>🔒</span> ${statusText}
               </button>`;

        return `
            <div class="game-card" data-game-id="${game.id}">
                <div class="card-thumbnail">
                    <div class="card-thumbnail-placeholder">🎮</div>
                    <div class="card-badge ${statusClass}">${statusText}</div>
                </div>
                <div class="card-content">
                    <div class="card-header">
                        <h3 class="card-title">${game.name}</h3>
                        <p class="card-genre">${game.genre || 'Casual'}</p>
                    </div>
                    <p class="card-description">${game.description}</p>
                    <div class="card-tags">
                        ${(game.tags || []).slice(0, 3).map(tag =>
                            `<span class="tag">${tag}</span>`
                        ).join('')}
                    </div>
                    <div class="card-stats">
                        <div class="stat">
                            <span class="stat-icon">⏱️</span>
                            <span class="stat-label">Playtime</span>
                            <span class="stat-value">${game.stats?.playtime || 'N/A'}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-icon">🎯</span>
                            <span class="stat-label">Difficulty</span>
                            <span class="stat-value">${game.stats?.difficulty || 'N/A'}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-icon">🔄</span>
                            <span class="stat-label">Replay</span>
                            <span class="stat-value">${game.stats?.replayability || 'N/A'}</span>
                        </div>
                    </div>
                    <div class="card-actions">
                        ${playButtonHTML}
                        <button class="card-btn btn-info" data-action="info" data-game-id="${game.id}">
                            <span>ℹ️</span> Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    attachGameCardListeners() {
        // Play buttons
        document.querySelectorAll('[data-action="play"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gameId = e.currentTarget.dataset.gameId;
                this.playGame(gameId);
            });
        });

        // Info buttons
        document.querySelectorAll('[data-action="info"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gameId = e.currentTarget.dataset.gameId;
                this.showGameDetails(gameId);
            });
        });

        // Card click (show details)
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    const gameId = card.dataset.gameId;
                    this.showGameDetails(gameId);
                }
            });
        });
    }

    playGame(gameId) {
        console.log(`🎮 Launching game: ${gameId}`);
        gameLoader.launchGame(gameId);
    }

    showGameDetails(gameId) {
        const game = gameLoader.getGameById(gameId);
        if (!game) return;

        const isPlayable = game.status === 'playable';
        const playButton = isPlayable
            ? `<button class="btn-primary" onclick="window.launcher.playGame('${gameId}')">
                   ▶️ Play Now
               </button>`
            : `<button class="btn-secondary" disabled>🔒 ${game.status.toUpperCase()}</button>`;

        this.elements.modalBody.innerHTML = `
            <h2>${game.name}</h2>
            <p style="color: var(--text-secondary); margin-bottom: var(--spacing-lg);">
                ${game.genre} • v${game.version}
            </p>

            <div style="margin-bottom: var(--spacing-xl);">
                <h3 style="margin-bottom: var(--spacing-md);">Description</h3>
                <p style="color: var(--text-secondary);">${game.description}</p>
            </div>

            <div style="margin-bottom: var(--spacing-xl);">
                <h3 style="margin-bottom: var(--spacing-md);">Features</h3>
                <ul style="color: var(--text-secondary); padding-left: var(--spacing-lg);">
                    ${(game.features || []).map(f => `<li>${f}</li>`).join('')}
                </ul>
            </div>

            <div style="margin-bottom: var(--spacing-xl);">
                <h3 style="margin-bottom: var(--spacing-md);">Controls</h3>
                <div style="background: var(--bg-tertiary); padding: var(--spacing-md); border-radius: var(--radius-md);">
                    ${Object.entries(game.controls?.keyboard || {}).map(([key, action]) =>
                        `<p style="color: var(--text-secondary); margin-bottom: var(--spacing-xs);">
                            <strong style="color: var(--accent-blue);">${key.toUpperCase()}</strong>: ${action}
                        </p>`
                    ).join('')}
                </div>
            </div>

            <div style="display: flex; gap: var(--spacing-md);">
                ${playButton}
                <button class="btn-secondary" onclick="window.launcher.closeGameModal()">
                    Close
                </button>
            </div>
        `;

        this.openGameModal();
    }

    openGameModal() {
        this.elements.gameModal.classList.add('active');
    }

    closeGameModal() {
        this.elements.gameModal.classList.remove('active');
    }

    openCreateGameModal() {
        this.elements.createGameModal.classList.add('active');
    }

    closeCreateGameModal() {
        this.elements.createGameModal.classList.remove('active');
        this.elements.createGameForm.reset();
    }

    async handleCreateGame() {
        const gameIdea = document.getElementById('gameIdea').value;
        const gameGenre = document.getElementById('gameGenre').value;

        if (!gameIdea.trim()) {
            alert('Please describe your game idea!');
            return;
        }

        this.closeCreateGameModal();

        const result = await gameLoader.createGame(gameIdea, gameGenre);

        if (result.success) {
            // Reload games after creation
            setTimeout(() => {
                this.loadGames();
            }, 1000);
        }
    }

    showEmptyState() {
        this.elements.gamesGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎮</div>
                <h3>No Games Found</h3>
                <p>No games match the current filter.</p>
                <button class="btn-primary" onclick="window.launcher.setFilter('all')">
                    Show All Games
                </button>
            </div>
        `;
    }

    showError(message) {
        this.elements.gamesGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Error</h3>
                <p>${message}</p>
                <button class="btn-primary" onclick="window.launcher.loadGames()">
                    Retry
                </button>
            </div>
        `;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.launcher = new LauncherApp();
});
