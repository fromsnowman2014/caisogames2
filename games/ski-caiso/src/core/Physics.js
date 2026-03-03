/**
 * Ski Caiso - Physics Engine
 * Slope-based physics, collision detection, landing mechanics
 * Based on Design Document V1.1 Section 5
 */

export class Physics {
    constructor() {
        // Physics constants (Design Doc Section 5.1)
        this.gravity = 1200;          // px/s²
        this.pumpMultiplier = 2.0;    // Down key gravity boost
        this.friction = 0.02;         // Snow friction coefficient
        this.airResistance = 0.995;   // Air drag per frame
        this.jumpBoost = 1.5;         // Jump boost multiplier (2x total height with momentum)
        this.maxSpeed = 2000;         // Maximum speed (px/s)
        this.angularSpeed = 8.0;      // Rotation speed (rad/s)
        this.angularDamping = 0.98;   // Angular velocity decay
    }

    /**
     * Update skier physics for one frame
     * @param {object} skier - Skier state {x, y, vx, vy, angle, angularVel, grounded}
     * @param {object} input - Input state {down, up, left, right}
     * @param {object} terrain - Terrain manager
     * @param {number} dt - Delta time in seconds
     * @returns {object} - Updated skier state
     */
    update(skier, input, terrain, dt) {
        const state = { ...skier };

        if (state.grounded) {
            this._updateGrounded(state, input, terrain, dt);
        } else {
            this._updateAirborne(state, input, dt);
        }

        // Check terrain collision
        this._checkTerrainCollision(state, terrain);

        // Clamp speed
        const speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
        if (speed > this.maxSpeed) {
            const factor = this.maxSpeed / speed;
            state.vx *= factor;
            state.vy *= factor;
        }

        return state;
    }

    /**
     * Update physics when skier is on ground
     * @private
     */
    _updateGrounded(state, input, terrain, dt) {
        // Get terrain slope at current position
        const slope = terrain.getSlopeAt(state.x);
        const slopeAngle = slope;

        // Match skier angle to slope
        state.angle = slopeAngle;
        state.angularVel = 0;

        // Calculate slope-based acceleration (Design Doc Section 5.2)
        const gravityComponent = Math.sin(slopeAngle) * this.gravity;
        const pumpFactor = input.down ? this.pumpMultiplier : 1.0;

        // Horizontal acceleration from gravity
        const accelX = gravityComponent * pumpFactor;

        // Apply acceleration
        state.vx += accelX * dt;

        // Apply friction (very small on snow)
        state.vx *= (1 - this.friction);

        // Vertical velocity matches terrain
        const nextX = state.x + state.vx * dt;
        const nextY = terrain.getTerrainYAt(nextX);
        const currentY = terrain.getTerrainYAt(state.x);

        if (nextY !== null && currentY !== null) {
            state.vy = (nextY - currentY) / dt;
        }

        // Jump input (Design Doc Section 4) - one-time trigger
        if (input.jumpPressed && state.grounded) {
            this._jump(state, slopeAngle);
            input.jumpPressed = false; // Consume jump input
        }

        // Update position
        state.x += state.vx * dt;
        state.y += state.vy * dt;
    }

    /**
     * Update physics when skier is airborne
     * @private
     */
    _updateAirborne(state, input, dt) {
        // Apply gravity
        state.vy += this.gravity * dt;

        // Apply air resistance
        state.vx *= this.airResistance;
        state.vy *= this.airResistance;

        // Handle rotation input (Design Doc Section 4)
        if (input.left) {
            state.angularVel -= this.angularSpeed * dt; // Counter-clockwise (backflip)
        }
        if (input.right) {
            state.angularVel += this.angularSpeed * dt; // Clockwise (frontflip)
        }

        // Apply angular damping
        state.angularVel *= this.angularDamping;

        // Update angle
        state.angle += state.angularVel * dt;

        // Update position
        state.x += state.vx * dt;
        state.y += state.vy * dt;
    }

    /**
     * Execute jump - gives a boost when leaving hills
     * Jump button amplifies natural trajectory by ~2x
     * @private
     */
    _jump(state, slopeAngle) {
        // Only boost upward velocity (when slope creates natural lift)
        // This makes jump feel like "helping" natural momentum

        // Calculate perpendicular direction to slope
        const perpAngle = slopeAngle - Math.PI / 2;

        // Get current velocity magnitude
        const currentSpeed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);

        // Jump boost proportional to speed (faster = higher jump)
        // Base boost is small, scales with speed for natural feel
        const jumpMagnitude = Math.max(currentSpeed * 0.3, 150);

        // Apply boost perpendicular to slope (feels like pushing off)
        state.vx += Math.cos(perpAngle) * jumpMagnitude * this.jumpBoost;
        state.vy += Math.sin(perpAngle) * jumpMagnitude * this.jumpBoost;

        // Set airborne
        state.grounded = false;
    }

    /**
     * Check collision with terrain and handle landing
     * @private
     */
    _checkTerrainCollision(state, terrain) {
        const terrainY = terrain.getTerrainYAt(state.x);

        if (terrainY === null) return;

        // Check if skier has hit the ground
        if (state.y >= terrainY && !state.grounded) {
            // Landing!
            state.y = terrainY;
            state.grounded = true;

            // Calculate landing quality (Design Doc Section 4)
            const slopeAngle = terrain.getSlopeAt(state.x);
            const landingResult = this._evaluateLanding(state, slopeAngle);

            // Apply landing effects
            this._applyLandingEffects(state, landingResult);

            return landingResult;
        }

        // Check if skier has left the ground
        if (state.y < terrainY - 5 && state.grounded) {
            state.grounded = false;
        }

        return null;
    }

    /**
     * Evaluate landing quality based on angle difference
     * (Design Doc Section 4 - Landing Judgment)
     * @private
     */
    _evaluateLanding(state, slopeAngle) {
        // Normalize angles to -PI to PI range
        const normalizeAngle = (angle) => {
            while (angle > Math.PI) angle -= 2 * Math.PI;
            while (angle < -Math.PI) angle += 2 * Math.PI;
            return angle;
        };

        const skierAngle = normalizeAngle(state.angle);
        const normalizedSlope = normalizeAngle(slopeAngle);

        // Calculate angle difference in degrees
        const angleDiff = Math.abs(skierAngle - normalizedSlope);
        const angleDiffDegrees = (angleDiff * 180) / Math.PI;

        // Determine landing grade (Design Doc Section 4)
        if (angleDiffDegrees <= 15) {
            return {
                grade: 'perfect',
                speedMod: 1.2,    // +20% speed boost
                scoreMod: 1.0,
                description: 'Perfect Landing!'
            };
        } else if (angleDiffDegrees <= 35) {
            return {
                grade: 'good',
                speedMod: 0.9,    // -10% speed loss
                scoreMod: 0.5,
                description: 'Good Landing'
            };
        } else if (angleDiffDegrees <= 60) {
            return {
                grade: 'rough',
                speedMod: 0.6,    // -40% speed loss
                scoreMod: 0,
                description: 'Rough Landing'
            };
        } else {
            return {
                grade: 'crash',
                speedMod: 0,      // Game over
                scoreMod: 0,
                description: 'CRASH!'
            };
        }
    }

    /**
     * Apply landing effects to skier state
     * @private
     */
    _applyLandingEffects(state, landingResult) {
        // Apply speed modifier
        state.vx *= landingResult.speedMod;
        state.vy *= landingResult.speedMod;

        // Reset angular velocity on landing
        state.angularVel = 0;

        return landingResult;
    }

    /**
     * Calculate trick score based on rotation
     * @param {number} totalRotation - Total rotation in radians
     * @returns {object} - {trickName, score}
     */
    calculateTrickScore(totalRotation) {
        const rotationDegrees = Math.abs(totalRotation * 180 / Math.PI);
        const fullRotations = Math.floor(rotationDegrees / 360);

        if (fullRotations === 0) {
            return { trickName: null, score: 0 };
        } else if (fullRotations === 1) {
            return { trickName: '360°', score: 100 };
        } else if (fullRotations === 2) {
            return { trickName: 'Double Flip', score: 350 };
        } else if (fullRotations >= 3) {
            return { trickName: 'Triple Flip', score: 800 };
        }

        return { trickName: null, score: 0 };
    }

    /**
     * Check collision with obstacle
     * @param {object} skier - Skier state
     * @param {object} obstacle - Obstacle {type, x, y, width, height}
     * @returns {boolean} - True if collision
     */
    checkObstacleCollision(skier, obstacle) {
        const skierWidth = 32;  // Approximate skier hitbox
        const skierHeight = 32;

        // Simple AABB collision
        return (
            skier.x < obstacle.x + obstacle.width &&
            skier.x + skierWidth > obstacle.x &&
            skier.y < obstacle.y + obstacle.height &&
            skier.y + skierHeight > obstacle.y
        );
    }
}
