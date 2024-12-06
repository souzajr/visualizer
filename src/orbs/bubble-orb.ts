import { OrbConfig } from '../types.js';
import { BaseOrb } from './base-orb.js';

interface BubbleRegion {
    x: number;
    y: number;
    size: number;
    color: string;
    baseOpacity: number;
    opacity: number;
    targetX: number;
    targetY: number;
    targetSize: number;
    phase: number;
    baseSize: number;
    velocity: { x: number; y: number };
    noiseOffset: number;
}

export class BubbleOrb extends BaseOrb {
    private regions: BubbleRegion[] = [];
    private readonly numRegions = 15;
    private readonly blurAmount = 20;
    private offscreenCanvas: HTMLCanvasElement = document.createElement('canvas');
    private offscreenCtx: CanvasRenderingContext2D;
    private rotationAngle: number = 0;
    private readonly containerRadius: number;
    private scale: number = 1;
    private targetScale: number = 1;
    private time: number = 0;

    constructor(canvasId: string, config?: OrbConfig) {
        super(canvasId, config);
        const ctx = this.offscreenCanvas.getContext('2d');
        if (!ctx) throw new Error('Could not get offscreen context');
        this.offscreenCtx = ctx;
        this.containerRadius = this.config.radius * 0.8;
        this.setupOffscreenCanvas();
        this.initializeRegions();
    }

    private setupOffscreenCanvas() {
        this.offscreenCanvas.width = this.canvas.width;
        this.offscreenCanvas.height = this.canvas.height;
        this.offscreenCtx.filter = `blur(${this.blurAmount}px)`;
    }

    private initializeRegions() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = this.containerRadius * 0.98;

        const colors = [
            '#50F5FF', // Brighter cyan
            '#B060FF', // Rich purple
            '#FF70FF', // Vibrant pink
            '#70B5FF', // Bright blue
            '#D4A5FF', // Light purple
            '#F0E0FF', // Soft white with purple tint
            '#60A0FF', // Another blue
            '#E090FF', // Another purple
            '#FF90FF', // Another pink
            '#90E0FF', // Another cyan
            '#A0D0FF', // Light blue
            '#E080FF', // Bright purple
            '#FF85FF', // Light pink
            '#70E0FF', // Bright cyan
            '#C0A0FF'  // Soft purple
        ];

        this.regions = Array.from({ length: this.numRegions }, (_, i) => {
            const phase = (i / this.numRegions) * Math.PI * 2;
            const size = radius * (0.3 + Math.random() * 0.2); // Increased from (0.2 + Math.random() * 0.15)
            
            return {
                x: centerX,
                y: centerY,
                size,
                baseSize: size,
                color: colors[i % colors.length],
                baseOpacity: 0.7 + Math.random() * 0.3,
                opacity: 0.7 + Math.random() * 0.3,
                targetX: centerX,
                targetY: centerY,
                targetSize: size,
                phase,
                velocity: { x: 0, y: 0 },
                noiseOffset: Math.random() * 1000
            };
        });
    }

    private resetPositions() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const baseScale = 0.95;
        this.targetScale = baseScale;

        this.regions.forEach(region => {
            region.targetX = centerX;
            region.targetY = centerY;
            region.targetSize = region.baseSize * baseScale;
            region.opacity = region.baseOpacity;
        });
    }

    public override updateAmplitude(amplitude: number) {
        if (this.isSpeaking) {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            
            const minScale = 0.8;
            const maxScale = 0.98;
            const scaledAmplitude = Math.pow(amplitude, 0.2);
            this.targetScale = minScale + (scaledAmplitude * (maxScale - minScale));
            
            this.regions.forEach(region => {
                region.targetX = centerX;
                region.targetY = centerY;
                region.targetSize = region.baseSize * this.targetScale;
                region.opacity = region.baseOpacity * (0.7 + scaledAmplitude * 0.8);
            });
        }
    }

    public updateMicVolume(volume: number) {
        if (this.isListening && !this.isSpeaking) {
            this.targetScale = 0.95;

            const rotationSpeed = 0.0003 * volume;
            this.rotationAngle -= rotationSpeed;

            this.regions.forEach(region => {
                region.opacity = region.baseOpacity * (0.8 + volume * 0.4);
            });
        } else if (!this.isSpeaking) {
            this.targetScale = 0.95;
        }
    }

    private updateRegionPosition(region: BubbleRegion, centerX: number, centerY: number, radius: number) {
        region.noiseOffset += 0.0003;
        const time = this.time + region.noiseOffset;

        const baseMovementRadius = radius * 0.8;
        let movementRadius = baseMovementRadius;

        const xOffset = Math.sin(time * 0.1) * Math.cos(time * 0.08) * movementRadius +
                       Math.sin(time * 0.2) * movementRadius * 0.2;
        const yOffset = Math.cos(time * 0.08) * Math.sin(time * 0.15) * movementRadius +
                       Math.cos(time * 0.25) * movementRadius * 0.2;
        
        const verticalSpeed = 0.05 + Math.sin(time * 0.15) * 0.02;
        const verticalDrift = Math.sin(time * verticalSpeed) * movementRadius * 0.5;
        
        let targetX = centerX + xOffset;
        let targetY = centerY + yOffset + verticalDrift;

        if (this.isSpeaking) {
            const volume = Math.max(0, (region.opacity / region.baseOpacity - 0.7) / 0.8);
            if (volume > 0.05) {
                const currentAngle = Math.atan2(region.y - centerY, region.x - centerX);
                const outwardForce = volume * radius * 0.3;
                targetX += Math.cos(currentAngle) * outwardForce;
                targetY += Math.sin(currentAngle) * outwardForce;
            }
        } else if (this.isListening) {
            // Calculate normalized volume (0 to 1)
            const volume = Math.max(0, (region.opacity / region.baseOpacity - 0.8) / 0.4);
            
            // Always apply some base attraction to create constant inward movement
            const baseAttraction = 0.02;
            
            // Additional volume-based attraction
            const volumeAttraction = volume * 0.08; // Increased from 0.04
            
            const toCenterX = centerX - region.x;
            const toCenterY = centerY - region.y;
            const distanceToCenter = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
            
            // Stronger attraction when further from center
            const distanceMultiplier = Math.min(1, distanceToCenter / (radius * 0.4));
            const totalAttraction = (baseAttraction + volumeAttraction) * distanceMultiplier;
            
            // Apply inward force
            targetX += toCenterX * totalAttraction;
            targetY += toCenterY * totalAttraction;
            
            // Add spiral motion
            const angle = Math.atan2(toCenterY, toCenterX);
            const spiralStrength = 0.15 * (volume + 0.1); // Increased base spiral strength
            const spiralRadius = Math.min(distanceToCenter, radius * 0.4);
            const spiralMultiplier = spiralRadius / (radius * 0.4);
            
            targetX += Math.cos(angle + Math.PI/2) * spiralStrength * spiralMultiplier;
            targetY += Math.sin(angle + Math.PI/2) * spiralStrength * spiralMultiplier;
        }
        
        const safetyMargin = region.size * 0.1;
        const maxDistance = radius - region.size - safetyMargin;
        const dx = targetX - centerX;
        const dy = targetY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > maxDistance) {
            const angle = Math.atan2(dy, dx);
            const constrainedDistance = maxDistance * 0.95;
            targetX = centerX + Math.cos(angle) * constrainedDistance;
            targetY = centerY + Math.sin(angle) * constrainedDistance;
        }
        
        const responsiveness = this.isSpeaking ? 0.008 : 0.006; // Increased non-speaking responsiveness
        const deltaX = targetX - region.x;
        const deltaY = targetY - region.y;
        region.velocity.x += deltaX * responsiveness;
        region.velocity.y += deltaY * responsiveness;
        
        const damping = this.isListening ? 0.92 : 0.96; // Increased damping during listening
        region.velocity.x *= damping;
        region.velocity.y *= damping;
        
        region.x += region.velocity.x;
        region.y += region.velocity.y;
        
        const pulseIntensity = this.isSpeaking ? 0.08 : 0.04;
        const sizePulse = Math.sin(time * 0.15 + region.phase) * pulseIntensity;
        region.size = region.baseSize * (1 + sizePulse) * this.scale;

        if (this.isListening && !this.isSpeaking) {
            const volume = Math.max(0, (region.opacity / region.baseOpacity - 0.8) / 0.4);
            if (volume > 0.02) {
                const toCenterX = centerX - region.x;
                const toCenterY = centerY - region.y;
                const distanceToCenter = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
                const attraction = Math.min(1, distanceToCenter / (radius * 0.6)) * volume * 2;
                
                region.x += toCenterX * 0.04 * attraction;
                region.y += toCenterY * 0.04 * attraction;
                
                const angle = Math.atan2(toCenterY, toCenterX);
                const spiralStrength = 0.12 * volume;
                const spiralRadius = Math.min(distanceToCenter, radius * 0.4);
                region.x += Math.cos(angle + Math.PI/2) * spiralStrength * (spiralRadius / (radius * 0.4));
                region.y += Math.sin(angle + Math.PI/2) * spiralStrength * (spiralRadius / (radius * 0.4));
            }
        }
    }

    private updateRegions() {
        this.time += 0.01;

        const transitionSpeed = this.isSpeaking ? 0.3 : 0.1;
        this.scale += (this.targetScale - this.scale) * transitionSpeed;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = this.containerRadius * 0.9;

        this.regions.forEach(region => {
            this.updateRegionPosition(region, centerX, centerY, radius);
        });
    }

    private draw() {
        this.offscreenCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.isListening) {
            this.ctx.save();
            this.offscreenCtx.save();
            
            this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.rotate(this.rotationAngle);
            this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);
            
            this.offscreenCtx.translate(this.canvas.width / 2, this.canvas.height / 2);
            this.offscreenCtx.rotate(this.rotationAngle);
            this.offscreenCtx.translate(-this.canvas.width / 2, -this.canvas.height / 2);
        }

        this.regions.forEach(region => {
            this.ctx.beginPath();
            this.ctx.fillStyle = region.color;
            this.ctx.globalAlpha = region.opacity * 0.3;
            this.ctx.arc(region.x, region.y, region.size, 0, Math.PI * 2);
            this.ctx.fill();

            this.offscreenCtx.beginPath();
            this.offscreenCtx.fillStyle = region.color;
            this.offscreenCtx.globalAlpha = region.opacity;
            this.offscreenCtx.arc(region.x, region.y, region.size, 0, Math.PI * 2);
            this.offscreenCtx.fill();
        });

        if (this.isListening) {
            this.ctx.restore();
            this.offscreenCtx.restore();
        }

        this.ctx.globalAlpha = 1;
        this.ctx.globalCompositeOperation = 'screen';
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);

        this.ctx.globalCompositeOperation = 'source-over';
        this.drawGlassContainer();
    }

    private drawGlassContainer() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = this.containerRadius * 1.1;

        const shadowGradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, radius
        );
        shadowGradient.addColorStop(0.85, 'rgba(255, 255, 255, 0)');
        shadowGradient.addColorStop(0.95, 'rgba(200, 200, 255, 0.15)');
        shadowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        this.ctx.fillStyle = shadowGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();

        const highlightGradient = this.ctx.createLinearGradient(
            centerX - radius, centerY - radius,
            centerX + radius * 0.5, centerY + radius * 0.5
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        this.ctx.fillStyle = highlightGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    public override start() {
        const animate = () => {
            this.animationFrameId = requestAnimationFrame(animate);
            this.updateRegions();
            this.draw();
        };
        animate();
    }
}
