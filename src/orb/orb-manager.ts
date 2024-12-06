import { OrbType, OrbVisualizer, OrbConfig } from '../types.js';
import { OrbFactory } from '../orb-factory.js';
import { DOMElements } from '../ui/dom-manager.js';

export class OrbManager {
    private orbVisualizer: OrbVisualizer;
    private currentOrbType: OrbType;
    private elements: DOMElements;
    private isListening: boolean = false;
    private micVolumeCallback: ((volume: number) => void) | null = null;

    constructor(elements: DOMElements, initialOrbType: OrbType = OrbType.Fluid) {
        this.elements = elements;
        this.currentOrbType = initialOrbType;
        this.orbVisualizer = this.createOrb(initialOrbType);
        this.initializeDisplayValues();
    }

    private initializeDisplayValues(): void {
        this.elements.pulseSpeedValue.textContent = this.elements.pulseSpeed.value;
        this.elements.minOpacityValue.textContent = this.elements.minOpacity.value;
        this.elements.maxOpacityValue.textContent = this.elements.maxOpacity.value;
    }

    public createOrb(type: OrbType): OrbVisualizer {
        console.log('Creating orb:', type);
        if (this.orbVisualizer) {
            this.orbVisualizer.stop();
        }

        this.currentOrbType = type;
        this.orbVisualizer = OrbFactory.createOrb(type, 'orbCanvas');
        this.orbVisualizer.setSpeaking(false);
        this.orbVisualizer.setListening(this.isListening);
        this.orbVisualizer.start();

        this.updateConfigInputs();
        return this.orbVisualizer;
    }

    public recreateOrbWithConfig(): void {
        const config: OrbConfig = {
            radius: parseInt(this.elements.sizeSlider.value),
            baseColor: this.elements.baseColor.value,
            glowColor: this.elements.glowColor.value,
            pulseSpeed: parseFloat(this.elements.pulseSpeed.value),
            minOpacity: parseFloat(this.elements.minOpacity.value),
            maxOpacity: parseFloat(this.elements.maxOpacity.value)
        };

        if (this.orbVisualizer) {
            this.orbVisualizer.stop();
        }

        this.orbVisualizer = OrbFactory.createOrb(this.currentOrbType, 'orbCanvas', config);
        this.orbVisualizer.setSpeaking(false);
        this.orbVisualizer.setListening(this.isListening);
        this.orbVisualizer.start();
    }

    private updateConfigInputs(): void {
        const config = this.orbVisualizer.getConfig();
        this.elements.baseColor.value = config.baseColor;
        this.elements.glowColor.value = config.glowColor;
        this.elements.pulseSpeed.value = config.pulseSpeed.toString();
        this.elements.minOpacity.value = config.minOpacity.toString();
        this.elements.maxOpacity.value = config.maxOpacity.toString();
        
        // Update value displays
        this.elements.pulseSpeedValue.textContent = config.pulseSpeed.toString();
        this.elements.minOpacityValue.textContent = config.minOpacity.toString();
        this.elements.maxOpacityValue.textContent = config.maxOpacity.toString();
    }

    public updateAmplitude(amplitude: number): void {
        this.orbVisualizer.updateAmplitude(amplitude);
    }

    public updateMicVolume(volume: number): void {
        if (this.orbVisualizer.updateMicVolume) {
            this.orbVisualizer.updateMicVolume(volume);
        }
    }

    public setListening(listening: boolean): void {
        this.isListening = listening;
        this.orbVisualizer.setListening(listening);
    }

    public setSpeaking(speaking: boolean): void {
        this.orbVisualizer.setSpeaking(speaking);
    }

    public getCurrentType(): OrbType {
        return this.currentOrbType;
    }

    public getVisualizer(): OrbVisualizer {
        return this.orbVisualizer;
    }

    public stop(): void {
        if (this.orbVisualizer) {
            this.orbVisualizer.stop();
        }
    }
}
