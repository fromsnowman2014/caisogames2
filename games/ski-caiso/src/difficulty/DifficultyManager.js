/**
 * Ski Caiso - Difficulty Manager
 * Dynamic difficulty scaling based on distance
 * Based on Design Document V1.1 Section 7
 */

export class DifficultyManager {
    constructor() {
        // Tier boundaries in meters (Design Doc Section 7.1)
        this.tierBoundaries = [
            { tier: 1, startDist: 0,    endDist: 500   },  // 초원 입문
            { tier: 2, startDist: 500,  endDist: 1200  },  // 숲 경사
            { tier: 3, startDist: 1200, endDist: 2500  },  // 중턱
            { tier: 4, startDist: 2500, endDist: 4000  },  // 고지대
            { tier: 5, startDist: 4000, endDist: 6000  },  // 폭풍 설원
            { tier: 6, startDist: 6000, endDist: Infinity } // 극한의 산
        ];

        // Tier-specific terrain generation parameters (Design Doc Section 7.2)
        this.tierParams = {
            1: {
                baseY: 400,
                amp1: 80,   freq1: 0.003,
                amp2: 20,   freq2: 0.010,
                amp3: 5,    freq3: 0.030,
                riverProb: 0,    cliffProb: 0,    treeProb: 0,    moundProb: 0.05,
                scoreMultiplier: 1.0
            },
            2: {
                baseY: 400,
                amp1: 150,  freq1: 0.004,
                amp2: 40,   freq2: 0.015,
                amp3: 10,   freq3: 0.045,
                riverProb: 0.10, cliffProb: 0,    treeProb: 0,    moundProb: 0.15,
                scoreMultiplier: 1.5
            },
            3: {
                baseY: 400,
                amp1: 220,  freq1: 0.005,
                amp2: 70,   freq2: 0.020,
                amp3: 20,   freq3: 0.060,
                riverProb: 0.15, cliffProb: 0.05, treeProb: 0.10, moundProb: 0.20,
                scoreMultiplier: 2.0
            },
            4: {
                baseY: 400,
                amp1: 300,  freq1: 0.006,
                amp2: 100,  freq2: 0.025,
                amp3: 30,   freq3: 0.080,
                riverProb: 0.20, cliffProb: 0.10, treeProb: 0.20, moundProb: 0.25,
                scoreMultiplier: 3.0
            },
            5: {
                baseY: 400,
                amp1: 400,  freq1: 0.007,
                amp2: 150,  freq2: 0.035,
                amp3: 50,   freq3: 0.100,
                riverProb: 0.25, cliffProb: 0.15, treeProb: 0.25, moundProb: 0.30,
                scoreMultiplier: 4.0
            },
            6: {
                baseY: 400,
                amp1: 500,  freq1: 0.008,
                amp2: 200,  freq2: 0.040,
                amp3: 80,   freq3: 0.120,
                riverProb: 0.30, cliffProb: 0.20, treeProb: 0.35, moundProb: 0.40,
                scoreMultiplier: 6.0
            }
        };

        this.currentTier = 1;
        this.currentDistance = 0;
    }

    /**
     * Update current distance and tier
     * @param {number} distanceMeters - Current distance in meters
     */
    update(distanceMeters) {
        this.currentDistance = distanceMeters;
        this.currentTier = this._getTierForDistance(distanceMeters);
    }

    /**
     * Get current difficulty tier
     * @returns {number} - Tier number (1-6)
     */
    getCurrentTier() {
        return this.currentTier;
    }

    /**
     * Get current distance
     * @returns {number} - Distance in meters
     */
    getCurrentDistance() {
        return this.currentDistance;
    }

    /**
     * Get score multiplier for current tier
     * @returns {number} - Score multiplier
     */
    getScoreMultiplier() {
        return this.tierParams[this.currentTier].scoreMultiplier;
    }

    /**
     * Get terrain generation parameters for a specific chunk
     * Includes smooth blending between tiers (Design Doc Section 7.4)
     * @param {number} chunkIndex - Chunk index
     * @returns {object} - Terrain parameters
     */
    getParamsForChunk(chunkIndex) {
        // Calculate chunk's distance in meters (800px chunk = 80m)
        const chunkDistance = chunkIndex * 80;

        // Get tier for this distance
        const tier = this._getTierForDistance(chunkDistance);

        // Get blend factor for smooth transition
        const blendFactor = this._getBlendFactor(chunkDistance, tier);

        // If at tier boundary, blend parameters
        if (blendFactor < 1.0 && tier < 6) {
            return this._blendParams(
                this.tierParams[tier],
                this.tierParams[tier + 1],
                blendFactor
            );
        }

        // Return pure tier parameters
        return { ...this.tierParams[tier] };
    }

    /**
     * Get difficulty tier for given distance
     * @private
     */
    _getTierForDistance(distanceMeters) {
        for (const boundary of this.tierBoundaries) {
            if (distanceMeters >= boundary.startDist && distanceMeters < boundary.endDist) {
                return boundary.tier;
            }
        }
        return 6; // Max tier
    }

    /**
     * Get blend factor for smooth tier transitions
     * Returns 0.0 at tier start, 1.0 at tier end
     * @private
     */
    _getBlendFactor(distanceMeters, tier) {
        const boundary = this.tierBoundaries.find(b => b.tier === tier);
        if (!boundary || boundary.endDist === Infinity) return 1.0;

        const tierLength = boundary.endDist - boundary.startDist;
        const distanceInTier = distanceMeters - boundary.startDist;

        // Blend in last 20% of tier
        const blendZone = tierLength * 0.2;
        if (distanceInTier < tierLength - blendZone) {
            return 1.0; // Pure tier params
        }

        // Linear blend from 0.0 (pure current) to 1.0 (next tier)
        return (distanceInTier - (tierLength - blendZone)) / blendZone;
    }

    /**
     * Blend parameters between two tiers using linear interpolation
     * @private
     */
    _blendParams(params1, params2, t) {
        const lerp = (a, b, t) => a + (b - a) * t;

        return {
            baseY: params1.baseY, // Keep same baseline
            amp1: lerp(params1.amp1, params2.amp1, t),
            freq1: lerp(params1.freq1, params2.freq1, t),
            amp2: lerp(params1.amp2, params2.amp2, t),
            freq2: lerp(params1.freq2, params2.freq2, t),
            amp3: lerp(params1.amp3, params2.amp3, t),
            freq3: lerp(params1.freq3, params2.freq3, t),
            riverProb: lerp(params1.riverProb, params2.riverProb, t),
            cliffProb: lerp(params1.cliffProb, params2.cliffProb, t),
            treeProb: lerp(params1.treeProb, params2.treeProb, t),
            moundProb: lerp(params1.moundProb, params2.moundProb, t),
            scoreMultiplier: lerp(params1.scoreMultiplier, params2.scoreMultiplier, t)
        };
    }

    /**
     * Get tier name for display
     * @param {number} tier - Tier number (1-6)
     * @returns {string} - Tier display name
     */
    getTierName(tier) {
        const names = {
            1: "🌿 Pinecone Pass",
            2: "🌲 Forest Slopes",
            3: "⛰️ Mountain Ridge",
            4: "🏔️ High Peaks",
            5: "🌪️ Storm Fields",
            6: "💀 Death Summit"
        };
        return names[tier] || "Unknown";
    }

    /**
     * Get current tier information for display
     * @returns {object} - {tier, name, distance, nextTierAt}
     */
    getTierInfo() {
        const tier = this.currentTier;
        const boundary = this.tierBoundaries.find(b => b.tier === tier);

        return {
            tier,
            name: this.getTierName(tier),
            distance: this.currentDistance,
            nextTierAt: boundary.endDist,
            progress: boundary.endDist === Infinity
                ? 1.0
                : (this.currentDistance - boundary.startDist) / (boundary.endDist - boundary.startDist)
        };
    }

    /**
     * Reset difficulty manager
     */
    reset() {
        this.currentTier = 1;
        this.currentDistance = 0;
    }
}
