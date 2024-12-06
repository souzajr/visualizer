import { OrbConfig } from '../types.js';
import { BaseOrb } from './base-orb.js';

interface CloudParticle {
    x: number;
    y: number;
    size: number;
    alpha: number;
    phase: number;
    speed: number;
    radius: number;
    angle: number;
}

export class NebulaOrb extends BaseOrb {
    private particles: CloudParticle[] = [];
    private colorPhase: number = 0;
    private colorIntensity: number = 0;
    private targetColorIntensity: number = 0;
    private speedIntensity: number = 0;
    private targetSpeedIntensity: number = 0;
    private time: number = 0;
    private micVolume: number = 0;
    private smoothedMicVolume: number = 0;
    private readonly micVolumeSmoothingFactor: number = 0.3;

    private readonly PARTICLE_COUNT = 50;

    constructor(canvasId: string, config?: OrbConfig) {
        super(canvasId, config || {
            radius: 150,
            baseColor: '#8A2BE2', // Blue Violet
            glowColor: '#9932CC', // Dark Orchid
            pulseSpeed: 0.02,
            minOpacity: 0.6,
            maxOpacity: 0.95
        });
        this.initializeParticles();
    }

    private initializeParticles() {
        this.particles = [];
        for (let i = 0; i < this.PARTICLE_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * this.config.radius * 0.8;
            this.particles.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                size: 20 + Math.random() * 40,
                alpha: 0.1 + Math.random() * 0.3,
                phase: Math.random() * Math.PI * 2,
                speed: 0.05 + Math.random() * 0.1,
                radius: radius,
                angle: angle
            });
        }
    }

    public override updateMicVolume(volume: number) {
        // Smooth the mic volume to reduce jitter
        this.smoothedMicVolume += (volume - this.smoothedMicVolume) * this.micVolumeSmoothingFactor;
        this.micVolume = this.smoothedMicVolume;
    }

    private lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }

    public override setSpeaking(speaking: boolean) {
        this.targetColorIntensity = speaking ? 1.0 : 0.0;
        this.targetSpeedIntensity = speaking ? 1.0 : 0.0;
        this.isSpeaking = speaking;
    }

    private rgbToHex(r: number, g: number, b: number): string {
        return '#' + [r, g, b].map(x => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    private hexToRgb(hex: string) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    private lerpColor(color1: string, color2: string, t: number): string {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);
        
        const r = Math.round(c1.r + (c2.r - c1.r) * t);
        const g = Math.round(c1.g + (c2.g - c1.g) * t);
        const b = Math.round(c1.b + (c2.b - c1.b) * t);
        
        return this.rgbToHex(r, g, b);
    }

    private draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Smooth transitions for both color and speed
        const colorDiff = this.targetColorIntensity - this.colorIntensity;
        this.colorIntensity += colorDiff * 0.05;

        const speedDiff = this.targetSpeedIntensity - this.speedIntensity;
        this.speedIntensity += speedDiff * 0.03;

        // Update time and color phase with state-based speeds
        let timeMultiplier = this.lerp(0.2, 1.0, this.speedIntensity);
        if (this.isListening) {
            // Add mic volume influence to animation speed
            const micEffect = Math.pow(this.micVolume, 0.7);
            timeMultiplier *= (1 + micEffect * 0.5);
        }
        this.time += this.config.pulseSpeed * 0.3 * timeMultiplier * (1 + this.currentAmplitude);
        this.colorPhase += 0.003 * timeMultiplier;

        // Draw base glow
        const baseGradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, this.config.radius
        );
        
        let baseOpacity = 0.2;
        if (this.isListening) {
            baseOpacity += this.micVolume * 0.15;
        }
        
        baseGradient.addColorStop(0, `${this.config.baseColor}${Math.floor(baseOpacity * 255).toString(16).padStart(2, '0')}`);
        baseGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        this.ctx.fillStyle = baseGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Update and draw particles
        this.ctx.globalCompositeOperation = 'screen';
        
        this.particles.forEach(particle => {
            // Calculate speed multiplier based on state
            let speedMultiplier = this.lerp(
                0.2 + this.currentAmplitude * 0.3,
                1 + this.currentAmplitude + this.colorIntensity,
                this.speedIntensity
            );

            if (this.isListening) {
                // Add mic volume influence to particle speed
                const micEffect = Math.pow(this.micVolume, 0.7);
                speedMultiplier *= (1 + micEffect * 0.5);
            }
            
            particle.phase += particle.speed * speedMultiplier * 0.3;
            
            // Calculate wave amplitude based on state
            let waveAmplitude = this.lerp(
                5 + this.currentAmplitude * 8,
                10 + this.currentAmplitude * 20,
                this.speedIntensity
            );

            if (this.isListening) {
                waveAmplitude += this.micVolume * 15;
            }
            
            const waveFactor = Math.sin(particle.phase) * waveAmplitude;
            
            // Calculate orbit speed based on state
            let orbitSpeed = this.lerp(
                0.02 + this.currentAmplitude * 0.03,
                0.1 + this.currentAmplitude * 0.1,
                this.speedIntensity
            );

            if (this.isListening) {
                orbitSpeed *= (1 + this.micVolume * 0.5);
            }
            
            particle.angle += orbitSpeed * particle.speed;
            
            const radius = particle.radius + waveFactor;
            particle.x = Math.cos(particle.angle) * radius;
            particle.y = Math.sin(particle.angle) * radius;

            // Calculate particle size based on state
            let size = particle.size;
            if (this.isSpeaking) {
                size *= (1 + this.currentAmplitude);
            } else if (this.isListening) {
                size *= (1 + this.micVolume * 0.5);
            }

            // Create cloud-like gradient using config colors
            const gradient = this.ctx.createRadialGradient(
                centerX + particle.x,
                centerY + particle.y,
                0,
                centerX + particle.x,
                centerY + particle.y,
                size
            );

            // Calculate alpha based on state
            let alpha = particle.alpha;
            if (this.isSpeaking) {
                alpha *= (1 + this.currentAmplitude * 0.5);
            } else if (this.isListening) {
                alpha *= (1 + this.micVolume * 0.3);
            }
            const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
            const midAlphaHex = Math.floor(alpha * 128).toString(16).padStart(2, '0');

            // Interpolate colors based on state
            let baseColor = this.config.baseColor;
            let glowColor = this.config.glowColor;
            if (this.isListening) {
                // Blend colors based on mic volume
                const micEffect = Math.pow(this.micVolume, 0.7);
                baseColor = this.lerpColor(this.config.baseColor, this.config.glowColor, micEffect * 0.5);
                glowColor = this.lerpColor(this.config.glowColor, '#FFFFFF', micEffect * 0.3);
            }

            gradient.addColorStop(0, `${baseColor}${alphaHex}`);
            gradient.addColorStop(0.5, `${glowColor}${midAlphaHex}`);
            gradient.addColorStop(1, `${baseColor}00`);

            // Draw cloud particle
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(
                centerX + particle.x,
                centerY + particle.y,
                size,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        });

        // Reset blend mode
        this.ctx.globalCompositeOperation = 'source-over';

        // Draw containing sphere edge
        const edgeGradient = this.ctx.createRadialGradient(
            centerX, centerY,
            this.config.radius * 0.9,
            centerX, centerY,
            this.config.radius * 1.1
        );

        let edgeOpacity = 0.2;
        if (this.isListening) {
            edgeOpacity += this.micVolume * 0.15;
        }

        edgeGradient.addColorStop(0, `${this.config.glowColor}${Math.floor(edgeOpacity * 255).toString(16).padStart(2, '0')}`);
        edgeGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.fillStyle = edgeGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, this.config.radius * 1.1, 0, Math.PI * 2);
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
