import { OrbConfig } from './types.js';

// Orb-specific configuration
const ORB_CONFIG: OrbConfig = {
    radius: 150,
    baseColor: '#87CEEB',
    glowColor: '#483D8B',
    pulseSpeed: 0.02,
    minOpacity: 0.6,
    maxOpacity: 0.95
};

// Single unified color palette
const FLUID_COLORS = [
    { color: '#E6E6FA', opacity: 0.9 },    // Lavender
    { color: '#87CEEB', opacity: 0.85 },   // Sky blue
    { color: '#9370DB', opacity: 0.8 },    // Medium purple
    { color: '#40E0D0', opacity: 0.75 },   // Turquoise
    { color: '#DA70D6', opacity: 0.7 }     // Orchid
];

export class OrbVisualizer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private config: OrbConfig;
    private currentAmplitude: number = 0;
    private animationFrameId: number | null = null;
    private pulsePhase: number = 0;
    private isSpeaking: boolean = false;
    private isListening: boolean = false;
    private targetRadius: number;
    private currentRadius: number;
    private transitionSpeed: number = 0.15;
    private ripplePhase: number = 0;
    private swirls: Array<{x: number, y: number, phase: number, speed: number}> = [];
    private colorPhase: number = 0;
    private colorIntensity: number = 0;
    private targetColorIntensity: number = 0;

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        const ctx = this.canvas.getContext('2d');
        
        if (!ctx) {
            throw new Error('Could not get 2D context from canvas');
        }
        
        this.ctx = ctx;
        this.config = ORB_CONFIG;
        this.targetRadius = this.config.radius * 0.7;
        this.currentRadius = this.config.radius * 0.7;
        this.setupCanvas();
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

    private setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });
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

        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.05)');
        gradient.addColorStop(0.5, 'rgba(200, 200, 255, 0.03)');
        gradient.addColorStop(0.8, 'rgba(150, 150, 255, 0.05)');
        gradient.addColorStop(0.95, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        return gradient;
    }

    private createFluidGradient(radius: number, opacity: number, offset: {x: number, y: number}, colorIndex: number): CanvasGradient {
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2 + offset.x * radius * 0.4,
            this.canvas.height / 2 + offset.y * radius * 0.4,
            0,
            this.canvas.width / 2,
            this.canvas.height / 2,
            radius
        );

        const baseColor = FLUID_COLORS[colorIndex % FLUID_COLORS.length];
        const nextColor = FLUID_COLORS[(colorIndex + 1) % FLUID_COLORS.length];

        const phase = (this.colorPhase + colorIndex * 0.2) % (Math.PI * 2);
        const mix = (Math.sin(phase) + 1) / 2;

        // Adjust opacity based on color intensity
        const adjustedOpacity = opacity * (0.7 + this.colorIntensity * 0.3);

        gradient.addColorStop(0, `${baseColor.color}${Math.floor(adjustedOpacity * 255).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(0.5, `${nextColor.color}${Math.floor(adjustedOpacity * 200).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, 'rgba(72, 61, 139, 0)');

        return gradient;
    }

    public updateAmplitude(amplitude: number) {
        this.currentAmplitude = Math.pow(amplitude, 0.5);
    }

    public setSpeaking(speaking: boolean) {
        this.isSpeaking = speaking;
        this.targetColorIntensity = speaking ? 1.0 : 0.0;
    }

    public setListening(listening: boolean) {
        this.isListening = listening;
    }

    private updateRadius() {
        const baseRadius = this.config.radius * 0.7;
        let amplitudeEffect = 0;
        
        if (this.isSpeaking) {
            amplitudeEffect = this.currentAmplitude * baseRadius * 2.0;
        } else if (this.isListening) {
            amplitudeEffect = this.currentAmplitude * baseRadius * 2.5;
        } else {
            const pulseFactor = Math.sin(this.pulsePhase) * 0.5 + 0.5;
            amplitudeEffect = pulseFactor * baseRadius * 0.3;
        }

        this.targetRadius = baseRadius + amplitudeEffect;
        const diff = this.targetRadius - this.currentRadius;
        this.currentRadius += diff * this.transitionSpeed;

        // Smooth color intensity transition
        const colorDiff = this.targetColorIntensity - this.colorIntensity;
        this.colorIntensity += colorDiff * 0.05;
    }

    private updateSwirls() {
        const baseSpeed = 1 + this.colorIntensity;
        this.swirls.forEach(swirl => {
            swirl.phase += this.config.pulseSpeed * swirl.speed * baseSpeed * (1 + this.currentAmplitude);
            
            const radius = 0.4 * (1 + this.currentAmplitude * 0.8);
            swirl.x = Math.cos(swirl.phase) * radius + Math.cos(swirl.phase * 0.5) * 0.2;
            swirl.y = Math.sin(swirl.phase) * radius + Math.sin(swirl.phase * 0.5) * 0.2;
        });
    }

    private draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.pulsePhase += this.config.pulseSpeed * (1 + this.colorIntensity * 0.5);
        this.ripplePhase += this.config.pulseSpeed * 0.5;
        this.colorPhase += this.config.pulseSpeed * 0.3;
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

        // Draw outer glass sphere
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

        // Draw fluid layers
        this.swirls.forEach((swirl, index) => {
            const layerOpacity = opacity * (1 - index * 0.1);
            const layerRadius = this.currentRadius * (1 + Math.sin(this.ripplePhase + index) * 0.15);
            
            this.ctx.beginPath();
            this.ctx.fillStyle = this.createFluidGradient(
                layerRadius,
                layerOpacity,
                { x: swirl.x, y: swirl.y },
                index
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

        // Draw glass sphere edge
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.lineWidth = 2;
        this.ctx.arc(
            this.canvas.width / 2,
            this.canvas.height / 2,
            this.config.radius,
            0,
            Math.PI * 2
        );
        this.ctx.stroke();
    }

    public start() {
        const animate = () => {
            this.animationFrameId = requestAnimationFrame(animate);
            this.draw();
        };
        animate();
    }

    public stop() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
}
