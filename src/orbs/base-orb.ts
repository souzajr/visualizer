import { OrbConfig, OrbVisualizer } from '../types.js';

export class BaseOrb implements OrbVisualizer {
    protected canvas: HTMLCanvasElement;
    protected ctx: CanvasRenderingContext2D;
    protected config: OrbConfig;
    protected currentAmplitude: number = 0;
    protected animationFrameId: number | null = null;
    protected isSpeaking: boolean = false;
    protected isListening: boolean = false;

    constructor(canvasId: string, config?: OrbConfig) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        const ctx = this.canvas.getContext('2d');
        
        if (!ctx) {
            throw new Error('Could not get 2D context from canvas');
        }
        
        this.ctx = ctx;
        this.config = config || {
            radius: 150,
            baseColor: '#FFD700',
            glowColor: '#FFA500',
            pulseSpeed: 0.02,
            minOpacity: 0.6,
            maxOpacity: 0.95
        };

        this.setupBaseCanvas();
        window.addEventListener('resize', () => this.setupBaseCanvas());
    }

    protected setupBaseCanvas() {
        // Make canvas square to avoid distortion
        const size = Math.max(window.innerWidth, window.innerHeight);
        this.canvas.width = size;
        this.canvas.height = size;
    }

    public getConfig(): OrbConfig {
        return { ...this.config };
    }

    public updateAmplitude(amplitude: number) {
        this.currentAmplitude = amplitude;
    }

    // Default empty implementation for mic volume
    public updateMicVolume(volume: number) {
        // Only FluidOrb will override this with actual implementation
    }

    public setSpeaking(speaking: boolean) {
        this.isSpeaking = speaking;
    }

    public setListening(listening: boolean) {
        this.isListening = listening;
    }

    public start() {
        // Override in subclasses
    }

    public stop() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
}
