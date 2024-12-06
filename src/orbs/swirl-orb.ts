import { OrbConfig } from '../types.js';
import { BaseOrb } from './base-orb.js';

interface PaintStreak {
    points: { x: number; y: number; width: number; }[];
    phase: number;
    speed: number;
    length: number;
    opacity: number;
}

export class SwirlOrb extends BaseOrb {
    private streaks: PaintStreak[] = [];
    private time: number = 0;
    private speedIntensity: number = 0;
    private targetSpeedIntensity: number = 0;
    private micVolume: number = 0;
    private smoothedMicVolume: number = 0;
    private readonly micVolumeSmoothingFactor: number = 0.3;

    private readonly STREAK_COUNT = 12;
    private readonly POINTS_PER_STREAK = 30;

    constructor(canvasId: string, config?: OrbConfig) {
        super(canvasId, config || {
            radius: 150,
            baseColor: '#FF69B4', // Hot Pink
            glowColor: '#9370DB', // Medium Purple
            pulseSpeed: 0.02,
            minOpacity: 0.6,
            maxOpacity: 0.95
        });
        this.initializeStreaks();
    }

    private initializeStreaks() {
        this.streaks = [];
        for (let i = 0; i < this.STREAK_COUNT; i++) {
            const points = [];
            const baseAngle = (i / this.STREAK_COUNT) * Math.PI * 2;
            const length = this.config.radius * (0.5 + Math.random() * 0.5);

            for (let j = 0; j < this.POINTS_PER_STREAK; j++) {
                const t = j / (this.POINTS_PER_STREAK - 1);
                const angle = baseAngle + Math.sin(t * Math.PI * 2) * 0.5;
                const radius = length * t;
                points.push({
                    x: Math.cos(angle) * radius,
                    y: Math.sin(angle) * radius,
                    width: 15 + Math.sin(t * Math.PI) * 15
                });
            }

            this.streaks.push({
                points,
                phase: Math.random() * Math.PI * 2,
                speed: 0.3 + Math.random() * 0.3,
                length,
                opacity: 0.6 + Math.random() * 0.4
            });
        }
    }

    public override updateMicVolume(volume: number) {
        // Smooth the mic volume to reduce jitter
        this.smoothedMicVolume += (volume - this.smoothedMicVolume) * this.micVolumeSmoothingFactor;
        this.micVolume = this.smoothedMicVolume;
    }

    private drawPaintStreak(centerX: number, centerY: number, streak: PaintStreak, index: number) {
        // Calculate speed multiplier based on state
        let speedMultiplier = 1 + this.speedIntensity;
        if (this.isListening) {
            // Apply non-linear transformation to mic volume
            const micEffect = Math.pow(this.micVolume, 0.7);
            speedMultiplier *= (1 + micEffect);
        }

        const timeOffset = this.time * streak.speed * speedMultiplier;
        const points: { x: number; y: number; width: number; }[] = [];

        // Calculate transformed points
        streak.points.forEach((point, i) => {
            const t = i / (streak.points.length - 1);
            const angle = timeOffset + streak.phase + Math.sin(t * Math.PI * 4 + timeOffset) * 0.5;
            const currentRadius = Math.sqrt(point.x * point.x + point.y * point.y);
            
            // Add organic movement with state-based modulation
            let wobbleAmount = 10;
            if (this.isListening) {
                wobbleAmount += this.micVolume * 15;
            }
            const wobble = Math.sin(t * Math.PI * 6 + timeOffset * 2) * wobbleAmount;
            const spiralX = Math.cos(angle * 2) * wobble;
            const spiralY = Math.sin(angle * 2) * wobble;

            points.push({
                x: centerX + point.x * Math.cos(angle) - point.y * Math.sin(angle) + spiralX,
                y: centerY + point.x * Math.sin(angle) + point.y * Math.cos(angle) + spiralY,
                width: point.width * (1 + Math.sin(t * Math.PI * 2 + timeOffset) * 0.3)
            });
        });

        // Draw the paint streak
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);

        // Create smooth curve through points
        for (let i = 1; i < points.length - 2; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            
            // Calculate width based on state
            let width = points[i].width;
            if (this.isSpeaking) {
                width *= (1 + this.currentAmplitude * 0.5);
            } else if (this.isListening) {
                width *= (1 + this.micVolume * 0.3);
            }
            
            this.ctx.lineWidth = width;
            this.ctx.lineTo(points[i].x, points[i].y);
        }

        // Create paint-like gradient using config colors
        const gradient = this.ctx.createLinearGradient(
            points[0].x, points[0].y,
            points[points.length - 1].x, points[points.length - 1].y
        );

        // Calculate alpha based on state
        let alpha = streak.opacity;
        if (this.isSpeaking) {
            alpha *= (1 + this.currentAmplitude * 0.3);
        } else if (this.isListening) {
            alpha *= (1 + this.micVolume * 0.2);
        }

        gradient.addColorStop(0, this.colorWithOpacity(this.config.baseColor, alpha));
        gradient.addColorStop(0.5, `rgba(255, 255, 255, ${alpha})`);
        gradient.addColorStop(1, this.colorWithOpacity(this.config.glowColor, alpha));

        // Draw with paint effect
        this.ctx.strokeStyle = gradient;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Add glow effect using config colors
        let glowColor = this.config.baseColor;
        let glowIntensity = 15;
        if (this.isSpeaking) {
            glowColor = this.config.glowColor;
            glowIntensity *= (1 + this.currentAmplitude);
        } else if (this.isListening) {
            // Interpolate between base and glow colors based on mic volume
            const micEffect = Math.pow(this.micVolume, 0.7);
            glowColor = this.lerpColor(this.config.baseColor, this.config.glowColor, micEffect);
            glowIntensity *= (1 + micEffect * 0.5);
        }

        this.ctx.shadowColor = glowColor;
        this.ctx.shadowBlur = glowIntensity;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // Add highlight spots with state-based intensity
        points.forEach((point, i) => {
            if (i % 4 === 0) { // Add highlights periodically
                let highlightSize = point.width * 0.5;
                if (this.isListening) {
                    highlightSize *= (1 + this.micVolume * 0.3);
                }

                const highlightGradient = this.ctx.createRadialGradient(
                    point.x, point.y, 0,
                    point.x, point.y, highlightSize
                );
                
                let highlightOpacity = 0.5;
                if (this.isListening) {
                    highlightOpacity += this.micVolume * 0.3;
                }
                
                highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${highlightOpacity})`);
                highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

                this.ctx.fillStyle = highlightGradient;
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, highlightSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }

    private lerpColor(color1: string, color2: string, t: number): string {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);
        
        const r = Math.round(c1.r + (c2.r - c1.r) * t);
        const g = Math.round(c1.g + (c2.g - c1.g) * t);
        const b = Math.round(c1.b + (c2.b - c1.b) * t);
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    private hexToRgb(hex: string) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    private colorWithOpacity(color: string, opacity: number): string {
        const rgb = this.hexToRgb(color);
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    }

    private lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }

    private draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Smooth speed transition
        const speedDiff = this.targetSpeedIntensity - this.speedIntensity;
        this.speedIntensity += speedDiff * 0.03;

        // Update time with state-based speed
        let timeMultiplier = this.lerp(0.2, 1.0, this.speedIntensity);
        if (this.isListening) {
            // Add mic volume influence to animation speed
            const micEffect = Math.pow(this.micVolume, 0.7);
            timeMultiplier *= (1 + micEffect * 0.5);
        }
        this.time += 0.01 * timeMultiplier * (1 + this.currentAmplitude);

        // Draw base glow
        const baseGradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, this.config.radius
        );

        let glowIntensity = 0.2;
        if (this.isSpeaking) {
            glowIntensity += this.currentAmplitude * 0.3;
        } else if (this.isListening) {
            glowIntensity += this.micVolume * 0.2;
        }

        baseGradient.addColorStop(0, this.colorWithOpacity(this.config.baseColor, glowIntensity));
        baseGradient.addColorStop(0.5, this.colorWithOpacity(this.config.glowColor, glowIntensity * 0.5));
        baseGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.fillStyle = baseGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, this.config.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw paint streaks
        this.ctx.globalCompositeOperation = 'screen';
        this.streaks.forEach((streak, index) => {
            this.drawPaintStreak(centerX, centerY, streak, index);
        });
        this.ctx.globalCompositeOperation = 'source-over';

        // Draw outer glow
        const outerGradient = this.ctx.createRadialGradient(
            centerX, centerY, this.config.radius * 0.8,
            centerX, centerY, this.config.radius * 1.2
        );

        let outerGlowIntensity = 0.1;
        if (this.isListening) {
            outerGlowIntensity += this.micVolume * 0.1;
        }

        outerGradient.addColorStop(0, this.colorWithOpacity(this.config.baseColor, outerGlowIntensity));
        outerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.fillStyle = outerGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, this.config.radius * 1.2, 0, Math.PI * 2);
        this.ctx.fill();
    }

    public override start() {
        const animate = () => {
            this.animationFrameId = requestAnimationFrame(animate);
            this.draw();
        };
        animate();
    }
}
