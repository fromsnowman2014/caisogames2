/**
 * Ski Caiso - Camera System
 * Dynamic camera following with smooth tracking
 */

export class Camera {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.smoothing = 0.1; // Camera smoothing factor
    }

    /**
     * Follow target (skier)
     */
    follow(target, dt) {
        // Camera should keep skier in left third of screen
        this.targetX = target.x - this.width * 0.3;
        this.targetY = target.y - this.height * 0.5;

        // Smooth camera movement
        this.x += (this.targetX - this.x) * this.smoothing;
        this.y += (this.targetY - this.y) * this.smoothing;
    }

    /**
     * Get world coordinates from screen coordinates
     */
    screenToWorld(screenX, screenY) {
        return {
            x: screenX + this.x,
            y: screenY + this.y
        };
    }

    /**
     * Get screen coordinates from world coordinates
     */
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.x,
            y: worldY - this.y
        };
    }
}
