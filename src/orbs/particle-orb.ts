import { OrbConfig } from '../types.js';
import { BaseOrb } from './base-orb.js';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    alpha: number;
    energy: number;
}

export class ParticleOrb extends BaseOrb {
    private particles: Particle[] = [];
    private hue: number = 0;
    private micVolume: number = 0;
    private smoothedMicVolume: number = 0;
    private readonly micVolumeSmoothingFactor: number = 0.3;

    private readonly PARTICLE_COUNT = 100;
    private readonly PARTICLE_BASE_RADIUS = 4;
    private readonly PARTICLE_SPEED_RANGE = { min: 0.5, max: 1.5 };
    private readonly BOUNCE_DAMPING = 0.7;
    private readonly ENERGY_LOSS = 0.98;
    private readonly MIN_SPEED = 0.3;
    private readonly TRAIL_LENGTH = 8;
    private readonly BASE_ALPHA = 0.8;

    constructor(canvasId: string, config?: OrbConfig) {
        super(canvasId, config || {
            radius: 150,
            baseColor: '#4B0082', // Indigo
            glowColor: '#9400D3', // Dark Violet
            pulseSpeed: 0.02,
            minOpacity: 0.6,
            maxOpacity: 0.95
        });
        this.initializeParticles();
    }

    private initializeParticles() {
        this.particles = [];
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        for (let i = 0; i < this.PARTICLE_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * this.config.radius * 0.8;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            const speed = this.PARTICLE_SPEED_RANGE.min + 
                Math.random() * (this.PARTICLE_SPEED_RANGE.max - this.PARTICLE_SPEED_RANGE.min);
            const direction = Math.random() * Math.PI * 2;
            
            this.particles.push({
                x,
                y,
                vx: Math.cos(direction) * speed,
                vy: Math.sin(direction) * speed,
                radius: this.PARTICLE_BASE_RADIUS * (0.8 + Math.random() * 0.4),
                alpha: this.BASE_ALPHA + Math.random() * (1 - this.BASE_ALPHA),
                energy: 1.0
            });
        }
    }

    private createGlowGradient(radius: number, opacity: number): CanvasGradient {
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2,
            this.canvas.height / 2,
            0,
            this.canvas.width / 2,
            this.canvas.height / 2,
            radius
        );

        gradient.addColorStop(0, `${this.config.baseColor}${Math.floor(opacity * 127).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(0.5, `${this.config.glowColor}${Math.floor(opacity * 76).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        return gradient;
    }

    public override updateMicVolume(volume: number) {
        // Smooth the mic volume to reduce jitter
        this.smoothedMicVolume += (volume - this.smoothedMicVolume) * this.micVolumeSmoothingFactor;
        this.micVolume = this.smoothedMicVolume;
    }

    private updateParticles() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const maxRadius = this.config.radius * (1 + this.currentAmplitude * 0.5);
        const amplitudeEffect = this.currentAmplitude * 2;
        
        this.hue = (this.hue + 0.2) % 360;

        // Calculate mic volume effect
        let micEffect = 0;
        if (this.isListening) {
            // Apply non-linear transformation to mic volume
            micEffect = Math.pow(this.micVolume, 0.7);
        }

        this.particles.forEach(particle => {
            // Add gentler random impulses
            const impulseChance = 0.05 + (this.isListening ? micEffect * 0.1 : 0);
            if (Math.random() < impulseChance) {
                const angle = Math.random() * Math.PI * 2;
                const force = 0.3 * (1 + amplitudeEffect + (this.isListening ? micEffect : 0));
                particle.vx += Math.cos(angle) * force;
                particle.vy += Math.sin(angle) * force;
            }

            // Add state-based behavior
            if (this.isSpeaking) {
                particle.vx *= 1.002;
                particle.vy *= 1.002;
                particle.energy = Math.min(particle.energy * 1.001, 1.1);
            } else if (this.isListening && micEffect > 0) {
                // Add mic volume-based energy
                const energyBoost = 1 + micEffect * 0.1;
                particle.vx *= energyBoost;
                particle.vy *= energyBoost;
                particle.energy = Math.min(particle.energy * energyBoost, 1.2);
            }

            // Update position with state-based speed multiplier
            let speedMultiplier = this.isSpeaking ? 0.7 : 1.0;
            if (this.isListening) {
                // Make particles faster with louder sounds
                speedMultiplier = 1.0 + micEffect * 0.5;
            }
            particle.x += particle.vx * particle.energy * speedMultiplier;
            particle.y += particle.vy * particle.energy * speedMultiplier;

            // Calculate distance from center
            const dx = particle.x - centerX;
            const dy = particle.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Bounce off sphere boundary
            if (distance > maxRadius) {
                const angle = Math.atan2(dy, dx);
                const bounceX = centerX + Math.cos(angle) * maxRadius;
                const bounceY = centerY + Math.sin(angle) * maxRadius;

                particle.x = bounceX;
                particle.y = bounceY;

                const normalX = Math.cos(angle);
                const normalY = Math.sin(angle);
                const dot = particle.vx * normalX + particle.vy * normalY;
                particle.vx = (particle.vx - 2 * dot * normalX) * this.BOUNCE_DAMPING;
                particle.vy = (particle.vy - 2 * dot * normalY) * this.BOUNCE_DAMPING;

                const randomAngle = angle + (Math.random() - 0.5) * Math.PI;
                const bounceForce = 0.5 * (1 + amplitudeEffect + (this.isListening ? micEffect : 0));
                particle.vx += Math.cos(randomAngle) * bounceForce;
                particle.vy += Math.sin(randomAngle) * bounceForce;
            }

            // Apply energy loss
            const energyLoss = this.isListening ? 
                this.ENERGY_LOSS + (1 - this.ENERGY_LOSS) * micEffect : 
                this.ENERGY_LOSS;
            particle.energy *= energyLoss;
            if (particle.energy < 0.5) {
                particle.energy = 0.5;
            }

            // Ensure minimum speed
            const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
            if (speed < this.MIN_SPEED) {
                const angle = Math.random() * Math.PI * 2;
                const newSpeed = this.MIN_SPEED + Math.random() * 0.5;
                particle.vx = Math.cos(angle) * newSpeed;
                particle.vy = Math.sin(angle) * newSpeed;
                particle.energy = 1.0;
            }
        });
    }

    private draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate base opacity with mic volume influence
        let baseOpacity = this.isSpeaking ? 0.4 : 0.2;
        if (this.isListening) {
            baseOpacity = 0.2 + this.micVolume * 0.3;
        }

        // Draw base glow
        this.ctx.fillStyle = this.createGlowGradient(
            this.config.radius * (1 + this.currentAmplitude * 0.5),
            baseOpacity
        );
        this.ctx.beginPath();
        this.ctx.arc(
            this.canvas.width / 2,
            this.canvas.height / 2,
            this.config.radius * (1 + this.currentAmplitude * 0.5),
            0,
            Math.PI * 2
        );
        this.ctx.fill();

        // Draw particles with enhanced trails
        this.ctx.globalCompositeOperation = 'screen';
        this.particles.forEach(particle => {
            // Calculate trail length based on state
            let trailMultiplier = 1.0;
            if (this.isListening) {
                trailMultiplier = 1.0 + this.micVolume * 0.5;
            } else if (this.isSpeaking) {
                trailMultiplier = 1.2;
            }
            const trailRadius = particle.radius * this.TRAIL_LENGTH * trailMultiplier;

            // Draw enhanced particle trail
            const gradient = this.ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, trailRadius
            );
            
            gradient.addColorStop(0, `${this.config.baseColor}FF`);
            gradient.addColorStop(0.4, `${this.config.glowColor}99`);
            gradient.addColorStop(1, `${this.config.baseColor}00`);

            this.ctx.beginPath();
            this.ctx.fillStyle = gradient;
            this.ctx.arc(particle.x, particle.y, trailRadius, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw particle core with increased visibility
            this.ctx.beginPath();
            this.ctx.fillStyle = '#ffffff';
            this.ctx.globalAlpha = particle.alpha;
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw colored overlay
            this.ctx.beginPath();
            this.ctx.fillStyle = this.isSpeaking ? this.config.glowColor : this.config.baseColor;
            this.ctx.arc(particle.x, particle.y, particle.radius * 0.8, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 1;

        // Update particle positions
        this.updateParticles();
    }

    public override start() {
        const animate = () => {
            this.animationFrameId = requestAnimationFrame(animate);
            this.draw();
        };
        animate();
    }
}
