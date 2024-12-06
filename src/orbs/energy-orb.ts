import { OrbConfig } from '../types.js';
import { BaseOrb } from './base-orb.js';

interface Arc {
    startAngle: number;
    endAngle: number;
    radius: number;
    segments: number[];
    phase: number;
    speed: number;
    thickness: number;
}

export class EnergyOrb extends BaseOrb {
    private arcs: Arc[] = [];
    private time: number = 0;
    private micVolume: number = 0;
    private smoothedMicVolume: number = 0;
    private readonly micVolumeSmoothingFactor: number = 0.3;

    private readonly ARC_COUNT = 8;
    private readonly SEGMENT_COUNT = 12;

    constructor(canvasId: string, config?: OrbConfig) {
        super(canvasId, config || {
            radius: 150,
            baseColor: '#FFD700', // Gold
            glowColor: '#FFA500', // Orange
            pulseSpeed: 0.02,
            minOpacity: 0.6,
            maxOpacity: 0.95
        });
        this.initializeArcs();
    }

    private initializeArcs() {
        this.arcs = [];
        for (let i = 0; i < this.ARC_COUNT; i++) {
            const startAngle = (Math.PI * 2 * i) / this.ARC_COUNT;
            const arcLength = Math.PI * 0.5 + Math.random() * Math.PI * 0.5;
            
            this.arcs.push({
                startAngle: startAngle,
                endAngle: startAngle + arcLength,
                radius: this.config.radius * (0.4 + Math.random() * 0.4),
                segments: Array(this.SEGMENT_COUNT).fill(0).map(() => Math.random() * 10 - 5),
                phase: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 0.5,
                thickness: 2 + Math.random() * 2
            });
        }
    }

    public override updateMicVolume(volume: number) {
        // Smooth the mic volume to reduce jitter
        this.smoothedMicVolume += (volume - this.smoothedMicVolume) * this.micVolumeSmoothingFactor;
        this.micVolume = this.smoothedMicVolume;
    }

    private drawArc(centerX: number, centerY: number, arc: Arc, index: number) {
        const points: [number, number][] = [];
        const steps = 30;
        const angleStep = (arc.endAngle - arc.startAngle) / steps;
        
        // Calculate amplitude factor based on state
        let amplitudeFactor = 1;
        if (this.isSpeaking) {
            amplitudeFactor = 2 + this.currentAmplitude * 3;
        } else if (this.isListening) {
            // Apply non-linear transformation to mic volume
            const micEffect = Math.pow(this.micVolume, 0.7);
            amplitudeFactor = 1 + micEffect * 2;
        }
        
        // Calculate arc points with displacement
        for (let i = 0; i <= steps; i++) {
            const angle = arc.startAngle + angleStep * i;
            const segmentIndex = Math.floor((i / steps) * arc.segments.length);
            const displacement = arc.segments[segmentIndex];
            
            // Add time-based movement with state-based modulation
            let timeOffset = Math.sin(this.time * arc.speed + arc.phase + angle);
            if (this.isListening) {
                // Add secondary wave modulated by mic volume
                const micEffect = Math.pow(this.micVolume, 0.7);
                timeOffset += Math.sin(this.time * 2 + angle) * micEffect * 0.5;
            }
            
            const radius = arc.radius + displacement * amplitudeFactor + timeOffset * 10;
            
            points.push([
                centerX + Math.cos(angle) * radius,
                centerY + Math.sin(angle) * radius
            ]);
        }

        // Draw the main arc
        this.ctx.beginPath();
        this.ctx.moveTo(points[0][0], points[0][1]);
        
        // Create smooth curve through points
        for (let i = 0; i < points.length - 1; i++) {
            const xc = (points[i][0] + points[i + 1][0]) / 2;
            const yc = (points[i][1] + points[i + 1][1]) / 2;
            this.ctx.quadraticCurveTo(points[i][0], points[i][1], xc, yc);
        }

        // Create gradient for the stroke using config colors
        const gradient = this.ctx.createLinearGradient(
            centerX - arc.radius,
            centerY - arc.radius,
            centerX + arc.radius,
            centerY + arc.radius
        );

        // Calculate alpha based on state
        let alpha = 0.6;
        if (this.isSpeaking) {
            alpha += this.currentAmplitude * 0.4;
        } else if (this.isListening) {
            alpha += this.micVolume * 0.3;
        }

        gradient.addColorStop(0, `${this.config.baseColor}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(0.5, '#FFFFFF');
        gradient.addColorStop(1, `${this.config.glowColor}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);

        // Calculate line thickness based on state
        let thickness = arc.thickness;
        if (this.isSpeaking) {
            thickness *= (1 + this.currentAmplitude);
        } else if (this.isListening) {
            thickness *= (1 + this.micVolume * 0.5);
        }

        // Draw the arc with glow effect
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = thickness;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();

        // Add glow effect using config colors
        let glowColor = this.config.baseColor;
        let glowIntensity = 20;
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

        // Draw energy particles along the arc
        if (this.isSpeaking || (this.isListening && this.micVolume > 0.1)) {
            let particleCount = 10;
            if (this.isSpeaking) {
                particleCount = Math.floor(10 * (1 + this.currentAmplitude * 2));
            } else if (this.isListening) {
                particleCount = Math.floor(5 + this.micVolume * 15);
            }

            for (let i = 0; i < particleCount; i++) {
                const t = Math.random();
                const index = Math.floor(t * (points.length - 1));
                const [x, y] = points[index];
                
                let particleSize = 2 + Math.random() * 3;
                if (this.isSpeaking) {
                    particleSize *= (1 + this.currentAmplitude);
                } else if (this.isListening) {
                    particleSize *= (1 + this.micVolume * 0.5);
                }

                const particleGradient = this.ctx.createRadialGradient(
                    x, y, 0,
                    x, y, particleSize * 2
                );
                
                particleGradient.addColorStop(0, '#FFFFFF');
                particleGradient.addColorStop(0.5, `${this.config.baseColor}80`);
                particleGradient.addColorStop(1, `${this.config.glowColor}00`);

                this.ctx.fillStyle = particleGradient;
                this.ctx.beginPath();
                this.ctx.arc(x, y, particleSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    private lerpColor(color1: string, color2: string, t: number): string {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);
        
        const r = Math.round(c1.r + (c2.r - c1.r) * t);
        const g = Math.round(c1.g + (c2.g - c1.g) * t);
        const b = Math.round(c1.b + (c2.b - c1.b) * t);
        
        return `rgb(${r}, ${g}, ${b})`;
    }

    private hexToRgb(hex: string) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    private draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Update time based on state
        let timeSpeed = 0.02;
        if (this.isSpeaking) {
            timeSpeed = 0.04 * (1 + this.currentAmplitude);
        } else if (this.isListening) {
            timeSpeed = 0.02 * (1 + Math.pow(this.micVolume, 0.7));
        }
        this.time += timeSpeed;

        // Update arc segments with state-based noise
        this.arcs.forEach(arc => {
            for (let i = 0; i < arc.segments.length; i++) {
                let noiseAmount = 0.2;
                if (this.isSpeaking) {
                    noiseAmount = 0.5;
                } else if (this.isListening) {
                    noiseAmount = 0.2 + this.micVolume * 0.3;
                }

                const noise = (Math.random() - 0.5) * 2 * noiseAmount;
                arc.segments[i] += noise;
                arc.segments[i] *= 0.95; // Damping
            }
        });

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

        baseGradient.addColorStop(0, `${this.config.baseColor}${Math.floor(glowIntensity * 255).toString(16).padStart(2, '0')}`);
        baseGradient.addColorStop(0.5, `${this.config.glowColor}${Math.floor(glowIntensity * 127).toString(16).padStart(2, '0')}`);
        baseGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.fillStyle = baseGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, this.config.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw arcs
        this.ctx.globalCompositeOperation = 'screen';
        this.arcs.forEach((arc, index) => {
            this.drawArc(centerX, centerY, arc, index);
        });
        this.ctx.globalCompositeOperation = 'source-over';

        // Draw outer glow
        const outerGradient = this.ctx.createRadialGradient(
            centerX, centerY, this.config.radius * 0.8,
            centerX, centerY, this.config.radius * 1.2
        );

        let outerGlowIntensity = 0.1; // 10% base opacity
        if (this.isListening) {
            outerGlowIntensity += this.micVolume * 0.1;
        }

        outerGradient.addColorStop(0, `${this.config.baseColor}${Math.floor(outerGlowIntensity * 255).toString(16).padStart(2, '0')}`);
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
