/**
 * Ski Caiso - Terrain Generator
 * Procedural terrain generation using sine wave synthesis
 * Based on Design Document V1.1 Section 6
 */

export class TerrainGenerator {
    constructor() {
        this.chunkWidth = 800;  // px - width of each terrain chunk
        this.pointSpacing = 10; // px - distance between terrain points
        this.seed = Math.random() * 1000;
    }

    /**
     * Generate a terrain chunk based on difficulty parameters
     * @param {number} chunkIndex - Sequential chunk number
     * @param {object} params - Difficulty tier parameters
     * @param {object} previousEnd - {x, y, slope} of previous chunk end
     * @returns {object} - {points: Array<{x,y}>, obstacles: Array}
     */
    generateChunk(chunkIndex, params, previousEnd = null) {
        const startX = chunkIndex * this.chunkWidth;
        const points = [];

        // Generate terrain points using sine wave synthesis
        const numPoints = Math.floor(this.chunkWidth / this.pointSpacing) + 1;

        for (let i = 0; i <= numPoints; i++) {
            const x = startX + i * this.pointSpacing;
            const y = this._getTerrainY(x, params, chunkIndex);
            points.push({ x, y });
        }

        // Smooth connection to previous chunk
        if (previousEnd) {
            this._smoothConnection(points, previousEnd);
        }

        // Generate obstacles based on chunk parameters
        const obstacles = this._generateObstacles(points, params, chunkIndex);

        return {
            index: chunkIndex,
            startX,
            endX: startX + this.chunkWidth,
            points,
            obstacles,
            params
        };
    }

    /**
     * Calculate terrain height at given X coordinate
     * Uses multi-frequency sine wave synthesis (Design Doc Section 6.3)
     * @private
     */
    _getTerrainY(x, params, chunkIndex) {
        const {
            baseY = 400,
            amp1 = 80,
            freq1 = 0.003,
            amp2 = 20,
            freq2 = 0.010,
            amp3 = 5,
            freq3 = 0.030
        } = params;

        // First chunk: Start at PEAK (highest point) for gravity assist
        if (chunkIndex === 0) {
            // Create a smooth descent from peak
            const relativeX = x; // x starts at 0 for first chunk
            const progress = relativeX / this.chunkWidth;

            // Start high, descend smoothly (quarter sine wave)
            const peakHeight = baseY - amp1 * 1.5; // Start 1.5x amplitude above baseline
            const descentCurve = Math.sin((1 - progress) * Math.PI / 2); // 1.0 -> 0.0 curve

            return peakHeight + (baseY - peakHeight) * (1 - descentCurve);
        }

        // Chunk-specific seed for variation
        const chunkSeed = this.seed + chunkIndex * 13.7;

        // Three-layer sine wave synthesis
        const wave1 = amp1 * Math.sin(freq1 * x + chunkSeed);
        const wave2 = amp2 * Math.sin(freq2 * x + chunkSeed * 1.3);
        const wave3 = amp3 * Math.sin(freq3 * x + chunkSeed * 2.7);

        return baseY + wave1 + wave2 + wave3;
    }

    /**
     * Smooth connection between chunks to avoid gaps/jumps
     * @private
     */
    _smoothConnection(points, previousEnd) {
        if (points.length === 0) return;

        // Blend first few points to match previous chunk's end
        const blendDistance = 5; // number of points to blend
        const deltaY = points[0].y - previousEnd.y;

        for (let i = 0; i < Math.min(blendDistance, points.length); i++) {
            const t = 1 - (i / blendDistance); // 1.0 -> 0.0
            points[i].y -= deltaY * t;
        }
    }

    /**
     * Generate obstacles within a chunk
     * @private
     */
    _generateObstacles(points, params, chunkIndex) {
        const obstacles = [];
        const {
            riverProb = 0,
            cliffProb = 0,
            treeProb = 0,
            moundProb = 0
        } = params;

        // River obstacle (Design Doc Section 6.4)
        if (Math.random() < riverProb && chunkIndex > 5) {
            obstacles.push(this._createRiver(points));
        }

        // Cliff gap (Design Doc Section 6.4)
        if (Math.random() < cliffProb && chunkIndex > 10) {
            obstacles.push(this._createCliff(points));
        }

        // Tree obstacles
        if (Math.random() < treeProb && chunkIndex > 3) {
            const numTrees = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < numTrees; i++) {
                obstacles.push(this._createTree(points));
            }
        }

        // Snow mounds
        if (Math.random() < moundProb) {
            const numMounds = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < numMounds; i++) {
                obstacles.push(this._createMound(points));
            }
        }

        return obstacles;
    }

    /**
     * Create river obstacle
     * @private
     */
    _createRiver(points) {
        const startIdx = Math.floor(points.length * 0.3);
        const width = 100 + Math.random() * 100; // 100-200px wide

        return {
            type: 'river',
            x: points[startIdx].x,
            y: points[startIdx].y,
            width,
            height: 60
        };
    }

    /**
     * Create cliff gap
     * @private
     */
    _createCliff(points) {
        const startIdx = Math.floor(points.length * 0.4);
        const width = 80 + Math.random() * 120; // 80-200px gap

        return {
            type: 'cliff',
            x: points[startIdx].x,
            y: points[startIdx].y,
            width,
            height: 200,
            needsJump: true
        };
    }

    /**
     * Create tree obstacle
     * @private
     */
    _createTree(points) {
        const idx = Math.floor(Math.random() * points.length);

        return {
            type: 'tree',
            x: points[idx].x,
            y: points[idx].y,
            width: 48,
            height: 96
        };
    }

    /**
     * Create snow mound
     * @private
     */
    _createMound(points) {
        const idx = Math.floor(Math.random() * points.length);

        return {
            type: 'mound',
            x: points[idx].x,
            y: points[idx].y,
            width: 128,
            height: 64,
            radius: 64
        };
    }

    /**
     * Get slope angle at given point index
     * @param {Array} points - Terrain points
     * @param {number} idx - Point index
     * @returns {number} - Slope angle in radians
     */
    getSlopeAngle(points, idx) {
        if (idx <= 0 || idx >= points.length - 1) return 0;

        const prev = points[idx - 1];
        const next = points[idx + 1];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;

        return Math.atan2(dy, dx);
    }

    /**
     * Find terrain Y at specific X coordinate (interpolation)
     * @param {Array} points - Terrain points
     * @param {number} x - X coordinate
     * @returns {number} - Interpolated Y coordinate
     */
    getTerrainYAt(points, x) {
        // Find surrounding points
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];

            if (x >= p1.x && x <= p2.x) {
                // Linear interpolation
                const t = (x - p1.x) / (p2.x - p1.x);
                return p1.y + t * (p2.y - p1.y);
            }
        }

        return points[points.length - 1].y;
    }
}
