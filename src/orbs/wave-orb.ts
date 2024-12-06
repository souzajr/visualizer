import { OrbConfig } from '../types.js';
import { BaseOrb } from './base-orb.js';

interface WaveRing {
    radius: number;
    phase: number;
    speed: number;
    amplitude: number;
    thickness: number;
}

export class WaveOrb extends BaseOrb {
    private rings: WaveRing[] = [];
    private time: number = 0;
    private micVolume: number = 0;
    private smoothedMicVolume: number = 0;
    private readonly micVolumeSmoothingFactor: number = 0.3;

    private readonly RING_COUNT = 12;

    constructor(canvasId: string, config?: OrbConfig) {
        super(canvasId, config || {
            radius: 150,
            baseColor: '#00CED1', // Dark Turquoise
            glowColor: '#4682B4', // Steel Blue
            pulseSpeed: 0.02,
            minOpacity: 0.6,
            maxOpacity: 0.95
        });
        this.initializeRings();
    }

    private initializeRings() {
        this.rings = [];
        const baseRadius = this.config.radius * 0.2;
        const radiusStep = (this.config.radius - baseRadius) / this.RING_COUNT;

        for (let i = 0; i < this.RING_COUNT; i++) {
            this.rings.push({
                radius: baseRadius + i * radiusStep,
                phase: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 0.5,
                amplitude: 2 + Math.random() * 2,
                thickness: 2 + Math.random() * 2
            });
        }
    }

    public override updateMicVolume(volume: number) {
        // Smooth the mic volume to reduce jitter
        this.smoothedMicVolume += (volume - this.smoothedMicVolume) * this.micVolumeSmoothingFactor;
        this.micVolume = this.smoothedMicVolume;
    }

    private drawWaveRing(centerX: number, centerY: number, ring: WaveRing, index: number) {
        const segments = 180;
        const angleStep = (Math.PI * 2) / segments;
        
        // Calculate wave properties based on state
        let baseAmplitude = ring.amplitude;
        let waveFrequency = 3;
        let waveSpeed = 1;

        if (this.isSpeaking) {
            baseAmplitude *= (1 + this.currentAmplitude * 2);
            waveFrequency = 6 + this.currentAmplitude * 4;
            waveSpeed = 2 + this.currentAmplitude * 2;
        } else if (this.isListening) {
            // Apply non-linear transformation to mic volume
            const micEffect = Math.pow(this.micVolume, 0.7);
            baseAmplitude *= (1 + micEffect * 1.5);
            waveFrequency = 3 + micEffect * 3;
            waveSpeed = 1 + micEffect;
        }
        
        // Create path for the wave ring
        this.ctx.beginPath();
        
        for (let i = 0; i <= segments; i++) {
            const angle = i * angleStep;
            const wavePhase = ring.phase + this.time * ring.speed * waveSpeed;
            
            // Calculate wave displacement with additional modulation
            let displacement = Math.sin(angle * waveFrequency + wavePhase) * 
                             baseAmplitude * (1 + Math.sin(this.time + ring.phase) * 0.3);
            
            // Add secondary wave for more complex motion
            if (this.isListening) {
                const micEffect = Math.pow(this.micVolume, 0.7);
                displacement += Math.sin(angle * 2 + wavePhase * 0.5) * 
                              baseAmplitude * 0.3 * micEffect;
            }
            
            const radius = ring.radius + displacement;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.closePath();

        // Create gradient for the stroke using config colors
        const gradient = this.ctx.createLinearGradient(
            centerX - ring.radius,
            centerY - ring.radius,
            centerX + ring.radius,
            centerY + ring.radius
        );

        // Calculate alpha based on state
        let alpha = 0.3;
        if (this.isSpeaking) {
            alpha += this.currentAmplitude * 0.4;
        } else if (this.isListening) {
            alpha += this.micVolume * 0.3;
        }

        const t = (Math.sin(this.time + index) + 1) / 2; // Time-based color transition

        gradient.addColorStop(0, `${this.config.baseColor}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(0.5, `${this.config.glowColor}${Math.floor(alpha * 200).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, `${this.config.baseColor}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);

        // Calculate line thickness based on state
        let thickness = ring.thickness;
        if (this.isSpeaking) {
            thickness *= (1 + this.currentAmplitude);
        } else if (this.isListening) {
            thickness *= (1 + this.micVolume * 0.5);
        }

        // Draw the wave ring
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = thickness;
        this.ctx.stroke();
    }

    private draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Update time based on state
        let timeSpeed = 0.01;
        if (this.isSpeaking) {
            timeSpeed = 0.03 * (1 + this.currentAmplitude);
        } else if (this.isListening) {
            timeSpeed = 0.01 * (1 + Math.pow(this.micVolume, 0.7));
        }
        this.time += timeSpeed;

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

        // Draw wave rings
        this.ctx.globalCompositeOperation = 'screen';
        this.rings.forEach((ring, index) => {
            this.drawWaveRing(centerX, centerY, ring, index);
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
