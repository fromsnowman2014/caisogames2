/**
 * Ski Caiso - Skier Entity
 * Player character with state management
 */

export class Skier {
    constructor(x, y) {
        // Position and velocity
        this.x = x;
        this.y = y;
        this.vx = 300;  // Initial horizontal speed
        this.vy = 0;

        // Rotation
        this.angle = 0;
        this.angularVel = 0;
        this.totalRotation = 0; // For trick counting

        // State
        this.grounded = true;
        this.crashed = false;

        // Stats
        this.distance = 0;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
    }

    /**
     * Reset skier for new game
     */
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 300;
        this.vy = 0;
        this.angle = 0;
        this.angularVel = 0;
        this.totalRotation = 0;
        this.grounded = true;
        this.crashed = false;
        this.distance = 0;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
    }

    /**
     * Update skier state
     */
    updateState(newState) {
        Object.assign(this, newState);
    }

    /**
     * Handle landing event
     */
    onLanding(landingResult) {
        if (landingResult.grade === 'crash') {
            this.crashed = true;
        } else if (landingResult.grade === 'perfect') {
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
        } else {
            this.combo = 0;
        }

        // Reset rotation counter
        this.totalRotation = 0;
    }

    /**
     * Add score
     */
    addScore(points, multiplier = 1.0) {
        this.score += Math.floor(points * multiplier);
    }

    /**
     * Get combo multiplier
     */
    getComboMultiplier() {
        if (this.combo >= 10) return 3.0;
        if (this.combo >= 5) return 2.0;
        if (this.combo >= 3) return 1.5;
        return 1.0;
    }
}
