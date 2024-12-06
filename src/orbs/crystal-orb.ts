import { OrbConfig } from '../types.js';
import { BaseOrb } from './base-orb.js';

interface Crystal {
    angle: number;
    length: number;
    speed: number;
    phase: number;
}

export class CrystalOrb extends BaseOrb {
    private rotation: number = 0;
    private crystals: Crystal[] = [];
    private colorPhase: number = 0;
    private micVolume: number = 0;
    private smoothedMicVolume: number = 0;
    private readonly micVolumeSmoothingFactor: number = 0.3;

    private readonly CRYSTAL_COUNT = 12;

    constructor(canvasId: string, config?: OrbConfig) {
        super(canvasId, config || {
            radius: 150,
            baseColor: '#FF1493', // Deep Pink
            glowColor: '#4B0082', // Indigo
            pulseSpeed: 0.02,
            minOpacity: 0.6,
            maxOpacity: 0.95
        });
        this.initializeCrystals();
    }

    private initializeCrystals() {
        this.crystals = [];
        for (let i = 0; i < this.CRYSTAL_COUNT; i++) {
            this.crystals.push({
                angle: (i / this.CRYSTAL_COUNT) * Math.PI * 2,
                length: this.config.radius * 0.7,
                speed: 0.5 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    public override updateMicVolume(volume: number) {
        // Smooth the mic volume to reduce jitter
        this.smoothedMicVolume += (volume - this.smoothedMicVolume) * this.micVolumeSmoothingFactor;
        this.micVolume = this.smoothedMicVolume;
    }

    private drawCrystal(x: number, y: number, angle: number, length: number, index: number) {
        const width = length * 0.2;
        
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);

        // Create crystal shape
        this.ctx.beginPath();
        this.ctx.moveTo(0, -width);
        this.ctx.lineTo(length, 0);
        this.ctx.lineTo(0, width);
        this.ctx.lineTo(0, -width);

        // Create gradient using config colors with very low opacity
        const gradient = this.ctx.createLinearGradient(0, -width, length, width);
        const t = (Math.sin(this.colorPhase + index) + 1) / 2;

        // Adjust gradient based on state with much lower opacity
        if (this.isSpeaking) {
            gradient.addColorStop(0, `${this.config.baseColor}05`); // 2% opacity
            gradient.addColorStop(0.5, `${this.config.glowColor}10`); // 6% opacity
            gradient.addColorStop(1, `${this.config.baseColor}05`);
        } else if (this.isListening) {
            const micEffect = Math.pow(this.micVolume, 0.7);
            const mixedColor = this.rgbToHex(this.lerpColor(this.config.baseColor, this.config.glowColor, micEffect));
            gradient.addColorStop(0, `${this.config.baseColor}05`);
            gradient.addColorStop(0.5, `${mixedColor}10`);
            gradient.addColorStop(1, `${this.config.baseColor}05`);
        } else {
            gradient.addColorStop(0, `${this.config.baseColor}05`);
            gradient.addColorStop(0.5, `${this.config.baseColor}10`);
            gradient.addColorStop(1, `${this.config.baseColor}05`);
        }

        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        // Add very subtle highlight
        let highlightOpacity = 0.08; // Much lower base opacity
        if (this.isListening) {
            highlightOpacity = 0.08 + this.micVolume * 0.1; // Reduced effect of mic volume
        }
        this.ctx.beginPath();
        this.ctx.moveTo(0, -width * 0.5);
        this.ctx.lineTo(length * 0.8, 0);
        this.ctx.lineTo(0, width * 0.5);
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${highlightOpacity})`;
        this.ctx.lineWidth = 1; // Thinner line
        this.ctx.stroke();

        this.ctx.restore();
    }

    private lerpColor(color1: string, color2: string, t: number): { r: number, g: number, b: number } {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);
        
        return {
            r: Math.round(c1.r + (c2.r - c1.r) * t),
            g: Math.round(c1.g + (c2.g - c1.g) * t),
            b: Math.round(c1.b + (c2.b - c1.b) * t)
        };
    }

    private hexToRgb(hex: string) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    private rgbToHex(rgb: { r: number, g: number, b: number }): string {
        return '#' + [rgb.r, rgb.g, rgb.b]
            .map(x => x.toString(16).padStart(2, '0'))
            .join('');
    }

    private draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Calculate rotation speed based on state
        let rotationSpeed = 0.005;
        if (this.isSpeaking) {
            rotationSpeed = 0.005 * (1 + this.currentAmplitude * 2);
        } else if (this.isListening) {
            const micEffect = Math.pow(this.micVolume, 0.7);
            rotationSpeed = 0.005 * (1 + micEffect);
        }

        this.rotation += rotationSpeed;
        this.colorPhase += 0.02;

        // Draw base glow with reduced opacity
        const baseGradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, this.config.radius
        );

        let glowIntensity = 0.15 + this.currentAmplitude * 0.2; // Reduced intensity
        if (this.isListening) {
            glowIntensity += this.micVolume * 0.15;
        }
        baseGradient.addColorStop(0, `${this.config.baseColor}${Math.floor(glowIntensity * 127).toString(16).padStart(2, '0')}`);
        baseGradient.addColorStop(0.5, `${this.config.glowColor}${Math.floor(glowIntensity * 63).toString(16).padStart(2, '0')}`);
        baseGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.fillStyle = baseGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, this.config.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw crystals with screen blend mode for glass effect
        this.ctx.globalCompositeOperation = 'screen';
        this.crystals.forEach((crystal, index) => {
            let lengthMod = 1 + Math.sin(crystal.phase + this.colorPhase) * 0.2;
            if (this.isListening) {
                const micEffect = Math.pow(this.micVolume, 0.7);
                lengthMod *= (1 + micEffect * 0.3);
            }
            const length = crystal.length * lengthMod * (1 + this.currentAmplitude * 0.5);
            
            const angle = crystal.angle + this.rotation;
            
            let phaseSpeed = crystal.speed * 0.02;
            if (this.isListening) {
                phaseSpeed *= (1 + this.micVolume * 0.5);
            }
            crystal.phase += phaseSpeed * (1 + this.currentAmplitude);

            this.drawCrystal(centerX, centerY, angle, length, index);
            this.drawCrystal(centerX, centerY, angle + Math.PI / this.CRYSTAL_COUNT, length * 0.6, index + this.CRYSTAL_COUNT);
        });
        this.ctx.globalCompositeOperation = 'source-over';

        // Draw center core with reduced opacity
        const coreGradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, this.config.radius * 0.2
        );

        let coreOpacity = 0.3; // Reduced base opacity
        if (this.isListening) {
            coreOpacity = 0.3 + this.micVolume * 0.1;
        }

        coreGradient.addColorStop(0, `${this.config.baseColor}${Math.floor(coreOpacity * 127).toString(16).padStart(2, '0')}`);
        coreGradient.addColorStop(0.5, `${this.config.glowColor}20`);
        coreGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        this.ctx.fillStyle = coreGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, this.config.radius * 0.2, 0, Math.PI * 2);
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
