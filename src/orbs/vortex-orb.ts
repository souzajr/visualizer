import { OrbConfig } from '../types.js';
import { BaseOrb } from './base-orb.js';

interface SpiralArm {
    rotation: number;
    phase: number;
    speed: number;
    width: number;
    segments: number;
}

export class VortexOrb extends BaseOrb {
    private spiralArms: SpiralArm[] = [];
    private time: number = 0;
    private rotation: number = 0;
    private micVolume: number = 0;
    private smoothedMicVolume: number = 0;
    private readonly micVolumeSmoothingFactor: number = 0.3;

    private readonly ARM_COUNT = 6;

    constructor(canvasId: string, config?: OrbConfig) {
        super(canvasId, config || {
            radius: 150,
            baseColor: '#9932CC', // Dark Orchid
            glowColor: '#8A2BE2', // Blue Violet
            pulseSpeed: 0.02,
            minOpacity: 0.6,
            maxOpacity: 0.95
        });
        this.initializeSpiralArms();
    }

    private initializeSpiralArms() {
        this.spiralArms = [];
        for (let i = 0; i < this.ARM_COUNT; i++) {
            this.spiralArms.push({
                rotation: (Math.PI * 2 * i) / this.ARM_COUNT,
                phase: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 0.5,
                width: 10 + Math.random() * 10,
                segments: 60
            });
        }
    }

    public override updateMicVolume(volume: number) {
        // Smooth the mic volume to reduce jitter
        this.smoothedMicVolume += (volume - this.smoothedMicVolume) * this.micVolumeSmoothingFactor;
        this.micVolume = this.smoothedMicVolume;
    }

    private drawSpiralArm(centerX: number, centerY: number, arm: SpiralArm, index: number) {
        const points: [number, number][] = [];
        
        // Calculate rotation speed based on state
        let rotationSpeed = 1;
        if (this.isSpeaking) {
            rotationSpeed = 2 + this.currentAmplitude * 3;
        } else if (this.isListening) {
            // Apply non-linear transformation to mic volume
            const micEffect = Math.pow(this.micVolume, 0.7);
            rotationSpeed = 1 + micEffect * 2;
        }

        const baseRadius = this.config.radius * 0.2;
        const maxRadius = this.config.radius * 0.9;

        // Generate spiral points
        for (let i = 0; i < arm.segments; i++) {
            const t = i / arm.segments;
            const radius = baseRadius + (maxRadius - baseRadius) * t;
            
            // Add state-based modulation to spiral shape
            let modulation = Math.sin(this.time * arm.speed + arm.phase) * 0.5;
            if (this.isListening) {
                const micEffect = Math.pow(this.micVolume, 0.7);
                modulation += Math.sin(this.time * 2 + t * Math.PI) * micEffect * 0.3;
            }

            const angle = arm.rotation + this.rotation * rotationSpeed + 
                         t * Math.PI * 4 + modulation;

            points.push([
                centerX + Math.cos(angle) * radius,
                centerY + Math.sin(angle) * radius
            ]);
        }

        // Draw the spiral arm
        this.ctx.beginPath();
        this.ctx.moveTo(points[0][0], points[0][1]);

        // Create smooth curve through points
        for (let i = 1; i < points.length - 2; i++) {
            const xc = (points[i][0] + points[i + 1][0]) / 2;
            const yc = (points[i][1] + points[i + 1][1]) / 2;
            this.ctx.quadraticCurveTo(points[i][0], points[i][1], xc, yc);
        }

        // Create gradient for the stroke using config colors
        const gradient = this.ctx.createLinearGradient(
            centerX - this.config.radius,
            centerY - this.config.radius,
            centerX + this.config.radius,
            centerY + this.config.radius
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

        // Calculate line width based on state
        let width = arm.width;
        if (this.isSpeaking) {
            width *= (1 + this.currentAmplitude);
        } else if (this.isListening) {
            width *= (1 + this.micVolume * 0.5);
        }

        // Draw the spiral with glow effect
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = width;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();

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

        // Add particles along the spiral during activity
        if (this.isSpeaking || (this.isListening && this.micVolume > 0.1)) {
            let particleCount = 20;
            if (this.isSpeaking) {
                particleCount = Math.floor(20 * (1 + this.currentAmplitude * 2));
            } else if (this.isListening) {
                particleCount = Math.floor(10 + this.micVolume * 20);
            }

            for (let i = 0; i < particleCount; i++) {
                const index = Math.floor(Math.random() * (points.length - 1));
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

        // Update time and rotation based on state
        let timeSpeed = 0.02;
        let rotationSpeed = 0.01;
        if (this.isSpeaking) {
            timeSpeed = 0.04 * (1 + this.currentAmplitude);
            rotationSpeed = 0.02 * (1 + this.currentAmplitude);
        } else if (this.isListening) {
            const micEffect = Math.pow(this.micVolume, 0.7);
            timeSpeed = 0.02 * (1 + micEffect);
            rotationSpeed = 0.01 * (1 + micEffect);
        }

        this.time += timeSpeed;
        this.rotation += rotationSpeed;

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

        // Draw spiral arms
        this.ctx.globalCompositeOperation = 'screen';
        this.spiralArms.forEach((arm, index) => {
            this.drawSpiralArm(centerX, centerY, arm, index);
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
