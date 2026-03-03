import { Physics } from './Physics.js';
import { DifficultyManager } from '../difficulty/DifficultyManager.js';
import { ChunkManager } from '../terrain/ChunkManager.js';
import { Skier } from '../entities/Skier.js';
import { Camera } from '../entities/Camera.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        this.physics = new Physics();
        this.difficultyManager = new DifficultyManager();
        this.chunkManager = new ChunkManager(this.difficultyManager);

        // Start at peak of first hill (x=50 to be near start)
        // Y will be calculated from terrain
        const startX = 50;
        const startY = 250; // Initial estimate, will snap to terrain
        this.skier = new Skier(startX, startY);
        this.camera = new Camera(this.width, this.height);

        this.input = { down: false, up: false, left: false, right: false, jumpPressed: false };
        this.running = false;
        this.lastTime = 0;

        this._setupInput();
    }

    _setupInput() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') this.input.down = true;
            if ((e.key === 'ArrowUp' || e.key === ' ') && !this.input.up) {
                this.input.up = true;
                this.input.jumpPressed = true; // One-time jump trigger
            }
            if (e.key === 'ArrowLeft') this.input.left = true;
            if (e.key === 'ArrowRight') this.input.right = true;
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowDown') this.input.down = false;
            if (e.key === 'ArrowUp' || e.key === ' ') {
                this.input.up = false;
                this.input.jumpPressed = false;
            }
            if (e.key === 'ArrowLeft') this.input.left = false;
            if (e.key === 'ArrowRight') this.input.right = false;
        });
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();

        // Snap skier to terrain at start position
        const terrainY = this.chunkManager.getTerrainYAt(this.skier.x);
        if (terrainY !== null) {
            this.skier.y = terrainY;
        }

        this._gameLoop();
    }

    _gameLoop(currentTime = 0) {
        if (!this.running) return;

        const dt = Math.min((currentTime - this.lastTime) / 1000, 0.033);
        this.lastTime = currentTime;

        this._update(dt);
        this._render();

        requestAnimationFrame((t) => this._gameLoop(t));
    }

    _update(dt) {
        const newState = this.physics.update(this.skier, this.input, this.chunkManager, dt);
        this.skier.updateState(newState);

        this.camera.follow(this.skier, dt);
        this.chunkManager.update(this.camera.x);

        this.skier.distance = Math.floor(this.skier.x / 10);
        this.difficultyManager.update(this.skier.distance);
    }

    _render() {
        const ctx = this.ctx;

        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);

        this._renderTerrain();
        this._renderSkier();

        ctx.restore();
        this._renderHUD();
    }

    _renderTerrain() {
        const ctx = this.ctx;
        const chunks = this.chunkManager.getVisibleChunks(this.camera.x, this.width);

        for (const chunk of chunks) {
            ctx.beginPath();
            for (let i = 0; i < chunk.points.length; i++) {
                const p = chunk.points[i];
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }

            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.lineTo(chunk.endX, this.height + this.camera.y);
            ctx.lineTo(chunk.startX, this.height + this.camera.y);
            ctx.closePath();
            ctx.fillStyle = '#FFF';
            ctx.fill();
        }
    }

    _renderSkier() {
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(this.skier.x, this.skier.y);
        ctx.rotate(this.skier.angle);

        ctx.fillStyle = '#FF0000';
        ctx.fillRect(-16, -16, 32, 32);

        ctx.restore();
    }

    _renderHUD() {
        const ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Distance: ' + this.skier.distance + 'm', 10, 30);
        ctx.fillText('Speed: ' + Math.floor(Math.abs(this.skier.vx)), 10, 60);

        if (this.skier.combo > 0) {
            ctx.fillStyle = '#FF0000';
            ctx.fillText('COMBO x' + this.skier.combo, 10, 90);
        }
    }
}
