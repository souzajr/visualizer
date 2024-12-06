import { OrbConfig } from '../types.js';
import { BaseOrb } from './base-orb.js';

interface AuroraWave {
    points: { x: number; y: number; }[];
    phase: number;
    speed: number;
    amplitude: number;
    thickness: number;
    currentAmplitude: number;
    targetAmplitude: number;
}

export class AuroraOrb extends BaseOrb {
    private waves: AuroraWave[] = [];
    private time: number = 0;
    private micVolume: number = 0;
    private smoothedMicVolume: number = 0;
    private readonly micVolumeSmoothingFactor: number = 0.3;
    private readonly amplitudeLerpFactor: number = 0.05; // Slower transitions

    private readonly WAVE_COUNT = 8;
    private readonly POINTS_PER_WAVE = 50;

    constructor(canvasId: string, config?: OrbConfig) {
        super(canvasId, config || {
            radius: 150,
            baseColor: '#E6C7E6', // Light Pink/Lavender
            glowColor: '#8B4B8B', // Deep Purple
            pulseSpeed: 0.02,
            minOpacity: 0.6,
            maxOpacity: 0.95
        });
        this.initializeWaves();
    }

    private initializeWaves() {
        this.waves = [];
        for (let i = 0; i < this.WAVE_COUNT; i++) {
            const points = Array(this.POINTS_PER_WAVE).fill(0).map(() => ({
                x: 0,
                y: 0
            }));

            this.waves.push({
                points,
                phase: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 0.5,
                amplitude: 20 + Math.random() * 20,
                thickness: 3 + Math.random() * 3,
                currentAmplitude: 1,
                targetAmplitude: 1
            });
        }
    }

    public override updateMicVolume(volume: number) {
        // Smooth the mic volume to reduce jitter
        this.smoothedMicVolume += (volume - this.smoothedMicVolume) * this.micVolumeSmoothingFactor;
        this.micVolume = this.smoothedMicVolume;
    }

    private updateWavePoints(wave: AuroraWave, centerX: number, centerY: number) {
        const baseRadius = this.config.radius * 0.7;
        const timeOffset = this.time * wave.speed;

        // Calculate target amplitude based on state
        if (this.isSpeaking) {
            wave.targetAmplitude = 1.3 + this.currentAmplitude * 1.5; // Further reduced multipliers
        } else if (this.isListening) {
            const micEffect = Math.pow(this.micVolume, 0.7);
            wave.targetAmplitude = 1 + micEffect * 1.2; // Further reduced multiplier
        } else {
            wave.targetAmplitude = 1;
        }

        // Smoothly interpolate to target amplitude
        wave.currentAmplitude += (wave.targetAmplitude - wave.currentAmplitude) * this.amplitudeLerpFactor;

        for (let i = 0; i < wave.points.length; i++) {
            const t = i / (wave.points.length - 1);
            const angle = Math.PI * 2 * t + timeOffset;
            
            // Create flowing motion with smoothed state-based modulation
            let radiusOffset = Math.sin(angle * 3 + wave.phase + timeOffset) * 
                             wave.amplitude * wave.currentAmplitude;

            // Add secondary wave motion when listening with smooth transition
            if (this.isListening) {
                const micEffect = Math.pow(this.micVolume, 0.7);
                const secondaryAmplitude = wave.amplitude * 0.2 * micEffect; // Reduced multiplier
                radiusOffset += Math.sin(angle * 5 + timeOffset * 2) * secondaryAmplitude;
            }

            const radius = baseRadius + radiusOffset;

            // Add vertical flowing motion with smoothed state-based modulation
            let verticalOffset = Math.sin(angle * 2 + timeOffset) * 
                               wave.amplitude * 0.4 * wave.currentAmplitude; // Reduced multiplier

            // Add additional vertical motion when listening with smooth transition
            if (this.isListening) {
                const micEffect = Math.pow(this.micVolume, 0.7);
                const additionalOffset = Math.sin(angle * 4 + timeOffset * 1.5) * 
                                      wave.amplitude * 0.2 * micEffect; // Reduced multiplier
                verticalOffset += additionalOffset;
            }

            wave.points[i].x = centerX + Math.cos(angle) * radius;
            wave.points[i].y = centerY + Math.sin(angle) * radius + verticalOffset;
        }
    }

    private drawAuroraWave(wave: AuroraWave) {
        if (wave.points.length < 2) return;

        // Create path for the wave
        this.ctx.beginPath();
        this.ctx.moveTo(wave.points[0].x, wave.points[0].y);

        // Create smooth curve through points
        for (let i = 1; i < wave.points.length - 2; i++) {
            const xc = (wave.points[i].x + wave.points[i + 1].x) / 2;
            const yc = (wave.points[i].y + wave.points[i + 1].y) / 2;
            this.ctx.quadraticCurveTo(
                wave.points[i].x,
                wave.points[i].y,
                xc,
                yc
            );
        }

        // Connect back to the start for a complete loop
        const last = wave.points.length - 1;
        this.ctx.quadraticCurveTo(
            wave.points[last - 1].x,
            wave.points[last - 1].y,
            wave.points[last].x,
            wave.points[last].y
        );
        this.ctx.closePath();

        // Create gradient for the stroke
        const gradient = this.ctx.createLinearGradient(
            this.canvas.width / 2 - this.config.radius,
            this.canvas.height / 2 - this.config.radius,
            this.canvas.width / 2 + this.config.radius,
            this.canvas.height / 2 + this.config.radius
        );

        // Calculate alpha based on state
        let alpha = 0.4;
        if (this.isSpeaking) {
            alpha += this.currentAmplitude * 0.4;
        } else if (this.isListening) {
            alpha += this.micVolume * 0.3;
        }

        gradient.addColorStop(0, this.colorWithOpacity(this.config.baseColor, alpha));
        gradient.addColorStop(0.5, `rgba(255, 255, 255, ${alpha})`);
        gradient.addColorStop(1, this.colorWithOpacity(this.config.glowColor, alpha));

        // Calculate line thickness based on state
        let thickness = wave.thickness;
        if (this.isSpeaking) {
            thickness *= (1 + this.currentAmplitude);
        } else if (this.isListening) {
            thickness *= (1 + this.micVolume * 0.5);
        }

        // Draw the aurora wave with glow
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = thickness;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Add glow effect with state-based intensity
        let glowColor = this.config.glowColor;
        let glowIntensity = 20;
        if (this.isSpeaking) {
            glowIntensity *= (1 + this.currentAmplitude);
        } else if (this.isListening) {
            // Interpolate between colors based on mic volume
            const micEffect = Math.pow(this.micVolume, 0.7);
            glowColor = this.lerpColor(this.config.baseColor, this.config.glowColor, micEffect);
            glowIntensity *= (1 + micEffect * 0.5);
        }

        this.ctx.shadowColor = glowColor;
        this.ctx.shadowBlur = glowIntensity;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // Fill with subtle gradient
        const fillGradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, this.config.radius
        );

        let fillOpacity = 0.06;
        if (this.isListening) {
            fillOpacity += this.micVolume * 0.06;
        }

        fillGradient.addColorStop(0, this.colorWithOpacity(this.config.baseColor, fillOpacity));
        fillGradient.addColorStop(1, this.colorWithOpacity(this.config.glowColor, 0));

        this.ctx.fillStyle = fillGradient;
        this.ctx.fill();
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

        baseGradient.addColorStop(0, this.colorWithOpacity(this.config.baseColor, glowIntensity));
        baseGradient.addColorStop(0.5, this.colorWithOpacity(this.config.glowColor, glowIntensity * 0.5));
        baseGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.fillStyle = baseGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, this.config.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Update and draw aurora waves
        this.ctx.globalCompositeOperation = 'screen';
        this.waves.forEach(wave => {
            this.updateWavePoints(wave, centerX, centerY);
            this.drawAuroraWave(wave);
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
