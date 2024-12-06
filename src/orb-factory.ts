import { OrbType, OrbVisualizer, OrbConfig } from './types.js';
import { FluidOrb } from './orbs/fluid-orb.js';
import { ParticleOrb } from './orbs/particle-orb.js';
import { PlasmaOrb } from './orbs/plasma-orb.js';
import { CrystalOrb } from './orbs/crystal-orb.js';
import { NebulaOrb } from './orbs/nebula-orb.js';
import { WaveOrb } from './orbs/wave-orb.js';
import { EnergyOrb } from './orbs/energy-orb.js';
import { VortexOrb } from './orbs/vortex-orb.js';
import { AuroraOrb } from './orbs/aurora-orb.js';
import { SwirlOrb } from './orbs/swirl-orb.js';
import { DotOrb } from './orbs/dot-orb.js';
import { BubbleOrb } from './orbs/bubble-orb.js';

export class OrbFactory {
    static createOrb(type: OrbType, canvasId: string, config?: OrbConfig): OrbVisualizer {
        // Get current size from slider if no config provided
        const sizeSlider = document.getElementById('sizeSlider') as HTMLInputElement;
        const size = sizeSlider ? parseInt(sizeSlider.value) : 150;

        // If config is provided but missing radius, use slider value
        if (config && !config.radius && sizeSlider) {
            config.radius = parseInt(sizeSlider.value);
        }

        // Create orb with type-specific default config if none provided
        switch (type) {
            case OrbType.Fluid:
                return new FluidOrb(canvasId, config || {
                    radius: size,
                    baseColor: '#50C878', // Emerald Green
                    glowColor: '#40E0D0', // Turquoise
                    pulseSpeed: 0.02,
                    minOpacity: 0.6,
                    maxOpacity: 0.95
                });

            case OrbType.Particle:
                return new ParticleOrb(canvasId, config || {
                    radius: size,
                    baseColor: '#4B0082', // Indigo
                    glowColor: '#9400D3', // Dark Violet
                    pulseSpeed: 0.02,
                    minOpacity: 0.6,
                    maxOpacity: 0.95
                });

            case OrbType.Plasma:
                return new PlasmaOrb(canvasId, config || {
                    radius: size,
                    baseColor: '#00FFFF', // Cyan
                    glowColor: '#4169E1', // Royal Blue
                    pulseSpeed: 0.02,
                    minOpacity: 0.6,
                    maxOpacity: 0.95
                });

            case OrbType.Crystal:
                return new CrystalOrb(canvasId, config || {
                    radius: size,
                    baseColor: '#FF1493', // Deep Pink
                    glowColor: '#4B0082', // Indigo
                    pulseSpeed: 0.02,
                    minOpacity: 0.6,
                    maxOpacity: 0.95
                });

            case OrbType.Nebula:
                return new NebulaOrb(canvasId, config || {
                    radius: size,
                    baseColor: '#8A2BE2', // Blue Violet
                    glowColor: '#9932CC', // Dark Orchid
                    pulseSpeed: 0.02,
                    minOpacity: 0.6,
                    maxOpacity: 0.95
                });

            case OrbType.Wave:
                return new WaveOrb(canvasId, config || {
                    radius: size,
                    baseColor: '#00CED1', // Dark Turquoise
                    glowColor: '#4682B4', // Steel Blue
                    pulseSpeed: 0.02,
                    minOpacity: 0.6,
                    maxOpacity: 0.95
                });

            case OrbType.Energy:
                return new EnergyOrb(canvasId, config || {
                    radius: size,
                    baseColor: '#FFD700', // Gold
                    glowColor: '#FFA500', // Orange
                    pulseSpeed: 0.02,
                    minOpacity: 0.6,
                    maxOpacity: 0.95
                });

            case OrbType.Vortex:
                return new VortexOrb(canvasId, config || {
                    radius: size,
                    baseColor: '#9932CC', // Dark Orchid
                    glowColor: '#8A2BE2', // Blue Violet
                    pulseSpeed: 0.02,
                    minOpacity: 0.6,
                    maxOpacity: 0.95
                });

            case OrbType.Aurora:
                return new AuroraOrb(canvasId, config || {
                    radius: size,
                    baseColor: '#E6C7E6', // Light Pink/Lavender
                    glowColor: '#8B4B8B', // Deep Purple
                    pulseSpeed: 0.02,
                    minOpacity: 0.6,
                    maxOpacity: 0.95
                });

            case OrbType.Swirl:
                return new SwirlOrb(canvasId, config || {
                    radius: size,
                    baseColor: '#FF69B4', // Hot Pink
                    glowColor: '#9370DB', // Medium Purple
                    pulseSpeed: 0.02,
                    minOpacity: 0.6,
                    maxOpacity: 0.95
                });

            case OrbType.Dot:
                return new DotOrb(canvasId, config || {
                    radius: size,
                    baseColor: '#FF1493', // Deep Pink
                    glowColor: '#FF69B4', // Hot Pink
                    pulseSpeed: 0.02,
                    minOpacity: 0.6,
                    maxOpacity: 0.95
                });

            case OrbType.Bubble:
                return new BubbleOrb(canvasId, config || {
                    radius: size,
                    baseColor: '#87CEEB', // Sky Blue
                    glowColor: '#9370DB', // Medium Purple
                    pulseSpeed: 0.02,
                    minOpacity: 0.6,
                    maxOpacity: 0.95
                });

            default:
                throw new Error(`Unknown orb type: ${type}`);
        }
    }
}
