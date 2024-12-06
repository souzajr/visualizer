import { OrbConfig } from '../types.js';
import { BaseOrb } from './base-orb.js';

interface PlasmaPoint {
    x: number;
    y: number;
    phase: number;
    speed: number;
    radius: number;
    amplitude: number;
}

export class PlasmaOrb extends BaseOrb {
    private time: number = 0;
    private plasmaPoints: PlasmaPoint[] = [];
    private noiseCanvas: HTMLCanvasElement;
    private noiseCtx: CanvasRenderingContext2D;
    private colorIntensity: number = 0;
    private targetColorIntensity: number = 0;
    private micVolume: number = 0;
    private smoothedMicVolume: number = 0;
    private readonly micVolumeSmoothingFactor: number = 0.3;

    constructor(canvasId: string, config?: OrbConfig) {
        super(canvasId, config || {
            radius: 150,
            baseColor: '#00FFFF', // Cyan
            glowColor: '#4169E1', // Royal Blue
            pulseSpeed: 0.02,
            minOpacity: 0.6,
            maxOpacity: 0.95
        });

        // Create noise canvas
        this.noiseCanvas = document.createElement('canvas');
        const noiseCtx = this.noiseCanvas.getContext('2d');
        if (!noiseCtx) {
            throw new Error('Could not get noise canvas context');
        }
        this.noiseCtx = noiseCtx;

        this.setupNoiseCanvas();
        this.initializePlasmaPoints();
    }

    private setupNoiseCanvas() {
        // Only set up the noise canvas size based on the radius
        this.noiseCanvas.width = this.config.radius * 2;
        this.noiseCanvas.height = this.config.radius * 2;
    }

    private initializePlasmaPoints() {
        this.plasmaPoints = [];
        for (let i = 0; i < 12; i++) {
            this.plasmaPoints.push({
                x: Math.random() * 2 - 1,
                y: Math.random() * 2 - 1,
                phase: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 0.5,
                radius: 0.2 + Math.random() * 0.3,
                amplitude: 0.5 + Math.random() * 0.5
            });
        }
    }

    public override updateMicVolume(volume: number) {
        // Smooth the mic volume to reduce jitter
        this.smoothedMicVolume += (volume - this.smoothedMicVolume) * this.micVolumeSmoothingFactor;
        this.micVolume = this.smoothedMicVolume;
    }

    private generatePlasma() {
        const { width, height } = this.noiseCanvas;
        const imageData = this.noiseCtx.createImageData(width, height);
        const data = imageData.data;
        
        const centerX = width / 2;
        const centerY = height / 2;
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
        
        // Calculate movement speed based on state
        let speedMultiplier = 1.0;
        let amplitudeMultiplier = 1.0;
        let turbulence = 1.0;

        if (this.isSpeaking) {
            speedMultiplier = 5.0;
            amplitudeMultiplier = 4.0;
            turbulence = 2.0;
        } else if (this.isListening) {
            // Apply non-linear transformation to mic volume
            const normalizedVolume = Math.pow(this.micVolume, 0.7);
            speedMultiplier = 1.0 + normalizedVolume * 2.0;
            amplitudeMultiplier = 1.0 + normalizedVolume * 1.5;
            turbulence = 1.0 + normalizedVolume;
        }
        
        // Convert hex colors to RGB
        const baseColorRGB = this.hexToRgb(this.config.baseColor);
        const glowColorRGB = this.hexToRgb(this.config.glowColor);
        
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                let value = 0;
                
                // Calculate plasma value based on plasma points
                this.plasmaPoints.forEach((point, index) => {
                    const timeOffset = this.time * point.speed * speedMultiplier;
                    
                    const xOffset = (this.isSpeaking || this.isListening) ? 
                        Math.sin(timeOffset * 0.5 + index) * 0.3 * turbulence : 0;
                    const yOffset = (this.isSpeaking || this.isListening) ? 
                        Math.cos(timeOffset * 0.3 + index) * 0.3 * turbulence : 0;

                    const dx = x - centerX + 
                        point.x * centerX * Math.cos(timeOffset + point.phase) + 
                        centerX * xOffset;
                    const dy = y - centerY + 
                        point.y * centerY * Math.sin(timeOffset + point.phase * 1.5) + 
                        centerY * yOffset;
                    
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    const turbulentPhase = (this.isSpeaking || this.isListening) ? 
                        Math.sin(timeOffset * 2 + index) * 0.5 * turbulence : 0;
                    
                    value += (Math.sin(dist * point.radius * 0.1 + timeOffset + turbulentPhase) * 
                            point.amplitude * (1 - dist / maxDist) * amplitudeMultiplier);
                });

                // Add distance from center factor with stronger edge falloff
                const dx = x - centerX;
                const dy = y - centerY;
                const distFromCenter = Math.sqrt(dx * dx + dy * dy);
                const edgeFactor = Math.pow(Math.max(0, 1 - distFromCenter / (width / 2)), 2);
                value *= edgeFactor;

                // Apply circular mask
                if (distFromCenter > width / 2) {
                    continue;
                }

                // Amplify based on current amplitude
                value *= (1 + this.currentAmplitude * (this.isSpeaking ? 4 : 2));

                // Convert to color with interpolation between base and glow colors
                const index = (y * width + x) * 4;
                const t = (Math.sin(value) + 1) / 2; // Normalized value for interpolation
                
                // Interpolate between base and glow colors
                data[index] = Math.floor(baseColorRGB.r * (1 - t) + glowColorRGB.r * t);     // R
                data[index + 1] = Math.floor(baseColorRGB.g * (1 - t) + glowColorRGB.g * t); // G
                data[index + 2] = Math.floor(baseColorRGB.b * (1 - t) + glowColorRGB.b * t); // B
                
                // Apply additional edge transparency
                const alpha = Math.floor(255 * 0.8 * edgeFactor);
                data[index + 3] = alpha;
            }
        }

        this.noiseCtx.putImageData(imageData, 0, 0);
    }

    private hexToRgb(hex: string) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    public override setSpeaking(speaking: boolean) {
        this.targetColorIntensity = speaking ? 1.0 : 0.0;
        this.isSpeaking = speaking;
    }

    private draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update time and color intensity
        let timeSpeed = this.isSpeaking ? 0.06 : 0.02;
        if (this.isListening) {
            // Make time speed responsive to mic volume
            const normalizedVolume = Math.pow(this.micVolume, 0.7);
            timeSpeed = 0.02 + normalizedVolume * 0.04;
        }
        this.time += timeSpeed * (1 + this.currentAmplitude);
        
        // Smooth color intensity transition
        const colorDiff = this.targetColorIntensity - this.colorIntensity;
        this.colorIntensity += colorDiff * 0.05;

        this.generatePlasma();

        // Draw base glow
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, this.config.radius
        );

        let glowIntensity = 0.2 + this.currentAmplitude * (this.isSpeaking ? 0.5 : 0.3);
        if (this.isListening) {
            // Add mic volume influence to glow
            glowIntensity += this.micVolume * 0.3;
        }
        gradient.addColorStop(0, `${this.config.baseColor}${Math.floor(glowIntensity * 255).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(0.5, `${this.config.glowColor}${Math.floor(glowIntensity * 127).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(
            this.canvas.width / 2,
            this.canvas.height / 2,
            this.config.radius,
            0,
            Math.PI * 2
        );
        this.ctx.fill();

        // Create circular clip path
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(
            this.canvas.width / 2,
            this.canvas.height / 2,
            this.config.radius,
            0,
            Math.PI * 2
        );
        this.ctx.clip();

        // Draw plasma
        this.ctx.globalCompositeOperation = 'screen';
        this.ctx.drawImage(
            this.noiseCanvas,
            this.canvas.width / 2 - this.config.radius,
            this.canvas.height / 2 - this.config.radius
        );
        this.ctx.restore();
        this.ctx.globalCompositeOperation = 'source-over';

        // Draw outer glow
        const outerGradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, this.config.radius * 0.8,
            this.canvas.width / 2, this.canvas.height / 2, this.config.radius * 1.2
        );

        outerGradient.addColorStop(0, `${this.config.baseColor}1A`); // 10% opacity
        outerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.fillStyle = outerGradient;
        this.ctx.beginPath();
        this.ctx.arc(
            this.canvas.width / 2,
            this.canvas.height / 2,
            this.config.radius * 1.2,
            0,
            Math.PI * 2
        );
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
