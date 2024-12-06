import { OrbConfig } from '../types.js';
import { BaseOrb } from './base-orb.js';

interface SwirlPoint {
    x: number;
    y: number;
    phase: number;
    speed: number;
}

export class FluidOrb extends BaseOrb {
    private pulsePhase: number = 0;
    private targetRadius: number;
    private currentRadius: number;
    private transitionSpeed: number = 0.15;
    private ripplePhase: number = 0;
    private swirls: Array<{x: number, y: number, phase: number, speed: number}> = [];
    private colorPhase: number = 0;
    private colorIntensity: number = 0;
    private targetColorIntensity: number = 0;
    private micVolume: number = 0;
    private smoothedMicVolume: number = 0;
    private readonly micVolumeSmoothingFactor: number = 0.3;

    constructor(canvasId: string, config?: OrbConfig) {
        super(canvasId, config);
        this.targetRadius = this.config.radius * 0.7;
        this.currentRadius = this.config.radius * 0.7;
        this.initializeSwirls();
    }

    private initializeSwirls() {
        for (let i = 0; i < 8; i++) {
            this.swirls.push({
                x: Math.random() * 2 - 1,
                y: Math.random() * 2 - 1,
                phase: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 0.5
            });
        }
    }

    private createGlassSphereGradient(radius: number): CanvasGradient {
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2 - radius * 0.3,
            this.canvas.height / 2 - radius * 0.3,
            0,
            this.canvas.width / 2,
            this.canvas.height / 2,
            radius
        );

        // Create glass-like effect with highlights and reflections
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)'); // Core highlight
        gradient.addColorStop(0.2, `${this.config.baseColor}0A`); // Very subtle base color (4% opacity)
        gradient.addColorStop(0.7, `${this.config.glowColor}08`); // Very subtle glow (3% opacity)
        gradient.addColorStop(0.9, 'rgba(255, 255, 255, 0.1)'); // Edge highlight
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.15)'); // Rim highlight

        return gradient;
    }

    private createReflectionGradient(radius: number): CanvasGradient {
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2 - radius * 0.5,
            this.canvas.height / 2 - radius * 0.5,
            0,
            this.canvas.width / 2 - radius * 0.3,
            this.canvas.height / 2 - radius * 0.3,
            radius * 0.8
        );

        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        return gradient;
    }

    private createFluidGradient(radius: number, opacity: number, offset: {x: number, y: number}): CanvasGradient {
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2 + offset.x * radius * 0.4,
            this.canvas.height / 2 + offset.y * radius * 0.4,
            0,
            this.canvas.width / 2,
            this.canvas.height / 2,
            radius
        );

        // Adjust opacity based on color intensity
        const adjustedOpacity = opacity * (0.7 + this.colorIntensity * 0.3);
        const phase = this.colorPhase % (Math.PI * 2);

        // Create bright inner core with intense glow
        gradient.addColorStop(0, '#FFFFFF'); // Pure white center
        gradient.addColorStop(0.2, `${this.config.glowColor}${Math.floor(adjustedOpacity * 255).toString(16).padStart(2, '0')}`); // Intense glow color
        gradient.addColorStop(0.4, `${this.config.glowColor}${Math.floor(adjustedOpacity * 230).toString(16).padStart(2, '0')}`); // Bright glow
        gradient.addColorStop(0.7, `${this.config.baseColor}${Math.floor(adjustedOpacity * 200).toString(16).padStart(2, '0')}`); // Transition to base
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Fade to transparent

        return gradient;
    }

    public updateMicVolume(volume: number) {
        // Smooth the mic volume to reduce jitter
        this.smoothedMicVolume += (volume - this.smoothedMicVolume) * this.micVolumeSmoothingFactor;
        this.micVolume = this.smoothedMicVolume;
    }

    public override setSpeaking(speaking: boolean) {
        this.targetColorIntensity = speaking ? 1.0 : 0.0;
        this.isSpeaking = speaking;
    }

    private updateRadius() {
        const baseRadius = this.config.radius * 0.7;
        let amplitudeEffect = 0;
        
        if (this.isSpeaking) {
            amplitudeEffect = this.currentAmplitude * baseRadius * 2.0;
        } else if (this.isListening) {
            // Apply a non-linear transformation to the mic volume
            // This makes small volumes more noticeable while preventing large volumes from being too extreme
            const minEffect = 0.2; // Minimum effect for very quiet sounds
            const normalizedVolume = Math.pow(this.micVolume, 0.7); // Apply power curve to compress high values
            const scaledEffect = minEffect + (1 - minEffect) * normalizedVolume;
            
            // Contract when listening based on transformed mic volume
            amplitudeEffect = -scaledEffect * baseRadius * 0.5; // Reduced from 1.0 to 0.5 for less extreme movement
        } else {
            const pulseFactor = Math.sin(this.pulsePhase) * 0.5 + 0.5;
            amplitudeEffect = pulseFactor * baseRadius * 0.3;
        }

        this.targetRadius = baseRadius + amplitudeEffect;
        // Increase transition speed for more responsive shrinking
        const transitionSpeed = this.isListening ? 0.3 : 0.15;
        const diff = this.targetRadius - this.currentRadius;
        this.currentRadius += diff * transitionSpeed;

        // Smooth color intensity transition
        const colorDiff = this.targetColorIntensity - this.colorIntensity;
        this.colorIntensity += colorDiff * 0.05;
    }

    private updateSwirls() {
        const baseSpeed = 1 + this.colorIntensity;
        this.swirls.forEach(swirl => {
            // Make swirls more responsive to mic volume when listening
            // Apply similar non-linear transformation for swirl speed
            const volumeEffect = this.isListening ? 
                Math.pow(this.micVolume, 0.7) : 0; // Compress high values
            const speedMultiplier = 1 + volumeEffect;
            
            // Reverse direction when listening
            const direction = this.isSpeaking ? -1 : 1;
            swirl.phase += direction * this.config.pulseSpeed * swirl.speed * baseSpeed * speedMultiplier * (1 + this.currentAmplitude);
            
            const radius = 0.4 * (1 + this.currentAmplitude * 0.8);
            swirl.x = Math.cos(swirl.phase) * radius + Math.cos(swirl.phase * 0.5) * 0.2;
            swirl.y = Math.sin(swirl.phase) * radius + Math.sin(swirl.phase * 0.5) * 0.2;
        });

    }

    private draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Reverse all phase updates when listening
        const direction = this.isSpeaking ? -1 : 1;
        this.pulsePhase += direction * this.config.pulseSpeed * (1 + this.colorIntensity * 0.5);
        this.ripplePhase += direction * this.config.pulseSpeed * 0.5;
        this.colorPhase += direction * this.config.pulseSpeed * 0.3;
        this.updateRadius();
        this.updateSwirls();

    const opacityRange = this.config.maxOpacity - this.config.minOpacity;
    const pulseFactor = Math.sin(this.pulsePhase) * 0.5 + 0.5;

    let opacity;
    if (this.isSpeaking || this.isListening) {
      opacity = this.config.minOpacity +
        (this.currentAmplitude * 0.8 + pulseFactor * 0.2) * opacityRange;
    } else {
      opacity = this.config.minOpacity + (pulseFactor * 0.3) * opacityRange;
    }

    // Create clipping path for the entire orb
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(
      this.canvas.width / 2,
      this.canvas.height / 2,
      this.config.radius * 1.2, // Slightly larger to accommodate effects
      0,
      Math.PI * 2
    );
    this.ctx.clip();

    // Draw base glass sphere with screen blend for glow
    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.beginPath();
    this.ctx.fillStyle = this.createGlassSphereGradient(this.config.radius);
    this.ctx.arc(
      this.canvas.width / 2,
      this.canvas.height / 2,
      this.config.radius,
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    // Draw reflection highlight
    this.ctx.beginPath();
    this.ctx.fillStyle = this.createReflectionGradient(this.config.radius);
    this.ctx.arc(
      this.canvas.width / 2,
      this.canvas.height / 2,
      this.config.radius,
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    // Draw fluid layers with screen blend mode
    this.swirls.forEach((swirl, index) => {
      const layerOpacity = opacity * (1 - index * 0.1);
      const layerRadius = this.currentRadius * (1 + Math.sin(this.ripplePhase + index) * 0.15);

      this.ctx.beginPath();
      this.ctx.fillStyle = this.createFluidGradient(
        layerRadius,
        layerOpacity,
        { x: swirl.x, y: swirl.y }
      );
      this.ctx.arc(
        this.canvas.width / 2,
        this.canvas.height / 2,
        layerRadius,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    });

        // Reset composite operation
        this.ctx.globalCompositeOperation = 'source-over';

        // Draw glass edge highlight
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 2;
        this.ctx.arc(
            this.canvas.width / 2,
            this.canvas.height / 2,
            this.config.radius,
            0,
            Math.PI * 2
        );
        this.ctx.stroke();

        // Add subtle inner highlight
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        this.ctx.arc(
            this.canvas.width / 2,
            this.canvas.height / 2,
            this.config.radius * 0.95,
            0,
            Math.PI * 2
        );
        this.ctx.stroke();

        // Restore context (removes clipping)
        this.ctx.restore();
    }

    public override start() {
        const animate = () => {
            this.animationFrameId = requestAnimationFrame(animate);
            this.draw();
        };
        animate();
    }
}
