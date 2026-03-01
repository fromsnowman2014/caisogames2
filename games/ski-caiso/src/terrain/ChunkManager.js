/**
 * Ski Caiso - Chunk Manager
 * Infinite terrain streaming with memory management
 * Based on Design Document V1.1 Section 6.1-6.2
 */

import { TerrainGenerator } from './TerrainGenerator.js';

export class ChunkManager {
    constructor(difficultyManager) {
        this.difficultyManager = difficultyManager;
        this.generator = new TerrainGenerator();

        // Chunk streaming constants (Design Doc Section 10.3)
        this.chunkWidth = 800;
        this.preloadAhead = 3;   // Always have 3 chunks ahead ready
        this.unloadBehind = 2;   // Keep 2 chunks behind for smooth scrolling

        // Chunk storage
        this.chunks = [];
        this.nextChunkIndex = 0;

        // Initialize with first chunks
        this._initializeChunks();
    }

    /**
     * Initialize the first few chunks
     * @private
     */
    _initializeChunks() {
        // Generate initial chunks (preload)
        for (let i = 0; i < this.preloadAhead + 1; i++) {
            this._spawnNextChunk();
        }
    }

    /**
     * Spawn the next chunk in sequence
     * @private
     */
    _spawnNextChunk() {
        const params = this.difficultyManager.getParamsForChunk(this.nextChunkIndex);

        // Get previous chunk's end for smooth connection
        const previousEnd = this._getPreviousChunkEnd();

        // Generate new chunk
        const chunk = this.generator.generateChunk(
            this.nextChunkIndex,
            params,
            previousEnd
        );

        this.chunks.push(chunk);
        this.nextChunkIndex++;

        return chunk;
    }

    /**
     * Get the end point of the last chunk
     * @private
     */
    _getPreviousChunkEnd() {
        if (this.chunks.length === 0) return null;

        const lastChunk = this.chunks[this.chunks.length - 1];
        const lastPoint = lastChunk.points[lastChunk.points.length - 1];

        // Calculate slope at end
        const prevPoint = lastChunk.points[lastChunk.points.length - 2];
        const slope = Math.atan2(
            lastPoint.y - prevPoint.y,
            lastPoint.x - prevPoint.x
        );

        return {
            x: lastPoint.x,
            y: lastPoint.y,
            slope
        };
    }

    /**
     * Update chunks based on camera position
     * Spawns new chunks ahead, unloads old chunks behind
     * @param {number} cameraX - Current camera X position
     */
    update(cameraX) {
        // Spawn new chunks if needed
        const rightmostChunkEnd = this._getRightmostChunkEnd();
        const targetEndX = cameraX + this.chunkWidth * this.preloadAhead;

        while (rightmostChunkEnd < targetEndX) {
            this._spawnNextChunk();
        }

        // Unload old chunks
        const leftmostKeepX = cameraX - this.chunkWidth * this.unloadBehind;
        this._unloadChunksBefore(leftmostKeepX);
    }

    /**
     * Get the rightmost chunk's end X coordinate
     * @private
     */
    _getRightmostChunkEnd() {
        if (this.chunks.length === 0) return 0;
        return this.chunks[this.chunks.length - 1].endX;
    }

    /**
     * Unload chunks that are too far behind the camera
     * @private
     */
    _unloadChunksBefore(minX) {
        const originalLength = this.chunks.length;

        // Remove chunks that are completely before minX
        this.chunks = this.chunks.filter(chunk => chunk.endX > minX);

        const unloadedCount = originalLength - this.chunks.length;
        if (unloadedCount > 0) {
            console.log(`[ChunkManager] Unloaded ${unloadedCount} chunks (memory optimization)`);
        }
    }

    /**
     * Get all active chunks
     * @returns {Array} - Array of chunk objects
     */
    getChunks() {
        return this.chunks;
    }

    /**
     * Get chunks visible in viewport
     * @param {number} cameraX - Camera X position
     * @param {number} viewportWidth - Viewport width
     * @returns {Array} - Visible chunks
     */
    getVisibleChunks(cameraX, viewportWidth) {
        const leftBound = cameraX - this.chunkWidth;
        const rightBound = cameraX + viewportWidth + this.chunkWidth;

        return this.chunks.filter(chunk =>
            chunk.startX < rightBound && chunk.endX > leftBound
        );
    }

    /**
     * Get terrain Y at specific X coordinate
     * @param {number} x - X coordinate
     * @returns {number|null} - Y coordinate or null if outside loaded chunks
     */
    getTerrainYAt(x) {
        // Find chunk containing this X
        for (const chunk of this.chunks) {
            if (x >= chunk.startX && x <= chunk.endX) {
                return this.generator.getTerrainYAt(chunk.points, x);
            }
        }

        return null;
    }

    /**
     * Get slope angle at specific X coordinate
     * @param {number} x - X coordinate
     * @returns {number} - Slope angle in radians
     */
    getSlopeAt(x) {
        // Find chunk containing this X
        for (const chunk of this.chunks) {
            if (x >= chunk.startX && x <= chunk.endX) {
                // Find closest point
                const idx = Math.floor((x - chunk.startX) / this.generator.pointSpacing);
                return this.generator.getSlopeAngle(chunk.points, idx);
            }
        }

        return 0;
    }

    /**
     * Get all obstacles in visible chunks
     * @param {number} cameraX - Camera X position
     * @param {number} viewportWidth - Viewport width
     * @returns {Array} - Array of obstacles
     */
    getVisibleObstacles(cameraX, viewportWidth) {
        const visibleChunks = this.getVisibleChunks(cameraX, viewportWidth);
        const obstacles = [];

        for (const chunk of visibleChunks) {
            obstacles.push(...chunk.obstacles);
        }

        return obstacles;
    }

    /**
     * Get total distance traveled (in meters)
     * @returns {number} - Distance in meters
     */
    getTotalDistance() {
        return Math.floor(this.nextChunkIndex * this.chunkWidth / 10); // 10px = 1m
    }

    /**
     * Reset chunk manager (for new game)
     */
    reset() {
        this.chunks = [];
        this.nextChunkIndex = 0;
        this.generator.seed = Math.random() * 1000;
        this._initializeChunks();
    }
}
