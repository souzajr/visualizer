import { OrbConfig } from '../types.js';
import { BaseOrb } from './base-orb.js';

interface Dot {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    size: number;
    targetSize: number;
    height: number;
    targetHeight: number;
}

export class DotOrb extends BaseOrb {
    private dots: Dot[] = [];
    private readonly numDots = 4;
    private readonly spacing = 2.5;
    private readonly maxHeight = 3;
    private readonly transitionSpeed = 0.15;
    private wavePhase: number = 0;
    private readonly dotSize: number;
    private readonly speakingSize: number;

    constructor(canvasId: string, config?: OrbConfig) {
        super(canvasId, config);
        this.dotSize = this.config.radius * 0.2; // Size for listening dots
        this.speakingSize = this.config.radius * 0.6; // Much larger base size for speaking
        this.initializeDots();
    }

    private initializeDots() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const totalWidth = (this.numDots * this.dotSize * this.spacing) - (this.dotSize * (this.spacing - 1));
        const startX = centerX - (totalWidth / 2) + (this.dotSize / 2);

        this.dots = Array.from({ length: this.numDots }, (_, i) => ({
            x: centerX,
            y: centerY,
            targetX: startX + (i * this.dotSize * this.spacing),
            targetY: centerY,
            size: this.dotSize,
            targetSize: this.dotSize,
            height: 1,
            targetHeight: 1
        }));
    }

    public override setListening(listening: boolean) {
        this.isListening = listening;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        if (!this.isSpeaking) {
            const totalWidth = (this.numDots * this.dotSize * this.spacing) - (this.dotSize * (this.spacing - 1));
            const startX = centerX - (totalWidth / 2) + (this.dotSize / 2);

            this.dots.forEach((dot, i) => {
                dot.targetX = startX + (i * this.dotSize * this.spacing);
                dot.targetY = centerY;
                dot.targetSize = this.dotSize;
                dot.targetHeight = 1;
            });
        }
    }

    public override setSpeaking(speaking: boolean) {
        this.isSpeaking = speaking;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        if (speaking) {
            // Merge to center and expand
            this.dots.forEach(dot => {
                dot.targetX = centerX;
                dot.targetY = centerY;
                dot.targetSize = this.speakingSize;
                dot.targetHeight = 1;
            });
        } else if (!this.isListening) {
            // Return to normal size if not listening
            this.dots.forEach(dot => {
                dot.targetX = centerX;
                dot.targetY = centerY;
                dot.targetSize = this.dotSize;
                dot.targetHeight = 1;
            });
        }
    }

    public override updateAmplitude(amplitude: number) {
        if (this.isSpeaking) {
            // More dramatic size variation with output volume
            const minScale = 0.8; // Can get smaller than base size
            const maxScale = 2.0; // Can get much larger
            const scale = minScale + (Math.pow(amplitude, 0.7) * (maxScale - minScale)); // Non-linear scaling
            const targetSize = this.speakingSize * scale;
            
            this.dots.forEach(dot => {
                dot.targetSize = targetSize;
            });
        }
    }

    public updateMicVolume(volume: number) {
        if (!this.isSpeaking) {
            // Update wave phase
            this.wavePhase += 0.1;
            
            this.dots.forEach((dot, i) => {
                // Calculate wave effect
                const waveOffset = Math.sin(this.wavePhase + (i * Math.PI / 2));
                const heightMultiplier = 1 + (volume * this.maxHeight * Math.max(0, waveOffset));
                dot.targetHeight = heightMultiplier;
            });
        }
    }

    private updatePositions() {
        // Update dot positions, sizes, and heights with smooth transition
        this.dots.forEach(dot => {
            const xDiff = dot.targetX - dot.x;
            const yDiff = dot.targetY - dot.y;
            const sizeDiff = dot.targetSize - dot.size;
            const heightDiff = dot.targetHeight - dot.height;

            dot.x += xDiff * this.transitionSpeed;
            dot.y += yDiff * this.transitionSpeed;
            dot.size += sizeDiff * this.transitionSpeed;
            dot.height += heightDiff * this.transitionSpeed;
        });
    }

    private draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.isSpeaking) {
            // Draw single circle when speaking
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            
            this.ctx.beginPath();
            this.ctx.fillStyle = this.config.baseColor;
            this.ctx.arc(
                centerX,
                centerY,
                this.dots[0].size,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        } else {
            // Draw separate dots
            this.dots.forEach(dot => {
                this.ctx.beginPath();
                this.ctx.fillStyle = this.config.baseColor;

                if (dot.height <= 1.1) {
                    // Draw circle when height is close to normal
                    this.ctx.arc(
                        dot.x,
                        dot.y,
                        dot.size,
                        0,
                        Math.PI * 2
                    );
                } else {
                    // Draw rounded rectangle when elongated
                    const width = dot.size * 2;
                    const height = dot.size * 2 * dot.height;
                    const x = dot.x - width / 2;
                    const y = dot.y - height / 2;
                    const radius = width / 2;

                    this.ctx.beginPath();
                    this.ctx.moveTo(x + radius, y);
                    this.ctx.lineTo(x + width - radius, y);
                    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
                    this.ctx.lineTo(x + width, y + height - radius);
                    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
                    this.ctx.lineTo(x + radius, y + height);
                    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
                    this.ctx.lineTo(x, y + radius);
                    this.ctx.quadraticCurveTo(x, y, x + radius, y);
                }
                this.ctx.fill();
            });
        }
    }

    public override start() {
        const animate = () => {
            this.animationFrameId = requestAnimationFrame(animate);
            this.updatePositions();
            this.draw();
        };
        animate();
    }
}
