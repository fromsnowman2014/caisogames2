/**
 * Ski Caiso - Entry Point
 */

import { Game } from './core/Game.js';

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    canvas.width = 800;
    canvas.height = 600;

    const game = new Game(canvas);
    game.start();

    console.log('Ski Caiso started!');
});
