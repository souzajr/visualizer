import { AudioHandler } from '../audio.js';
import { SpeechHandler } from '../speech.js';
import { DOMElements } from '../ui/dom-manager.js';
import { OrbManager } from '../orb/orb-manager.js';

export class AudioManager {
    private audioHandler: AudioHandler;
    private speechHandler: SpeechHandler;
    private elements: DOMElements;
    private orbManager: OrbManager;
    private isListeningEnabled: boolean = false;
    private audioInitialized: boolean = false;
    private audioContext: AudioContext | null = null;

    constructor(elements: DOMElements, orbManager: OrbManager, onSpeechResult: (result: { transcript: string; isFinal: boolean }) => void) {
        this.elements = elements;
        this.orbManager = orbManager;
        this.audioHandler = new AudioHandler();
        this.speechHandler = new SpeechHandler(onSpeechResult);
        this.initializeHandlers();
        this.initializeAudioOnUserInteraction();
    }

    private initializeHandlers(): void {
        this.audioHandler.setVisualizerCallback((amplitude: number) => {
            this.orbManager.updateAmplitude(amplitude);
        });

        this.audioHandler.setPlaybackEndCallback(() => {
            console.log('Audio playback ended');
            if (this.isListeningEnabled) {
                this.orbManager.setSpeaking(false);
                this.orbManager.setListening(true);
                setTimeout(() => {
                    if (this.isListeningEnabled) {
                        console.log('Resuming speech recognition from audio callback');
                        this.speechHandler.endAudioPlayback();
                    }
                }, 100);
            }
        });

        this.setupMicVolumeCallback();
    }

    private setupMicVolumeCallback(): void {
        this.speechHandler.setMicVolumeCallback((volume: number) => {
            this.orbManager.updateMicVolume(volume);
        });
    }

    private async initializeAudioContext(): Promise<void> {
        if (!this.audioContext) {
            this.audioContext = new AudioContext({
                sampleRate: 44100,
                latencyHint: 'interactive'
            });
        }

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        // Create a brief silent sound to unlock audio
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0; // Silent
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.001);

        this.audioInitialized = true;
        console.log('Audio context initialized/resumed:', this.audioContext.state);
    }

    private initializeAudioOnUserInteraction(): void {
        const initAudio = async () => {
            if (this.audioInitialized && this.audioContext?.state === 'running') return;

            try {
                await this.initializeAudioContext();
                console.log('Audio initialized on user interaction');

                // Only remove listeners if initialization was successful
                if (this.audioContext?.state === 'running') {
                    document.removeEventListener('touchstart', initAudio, true);
                    document.removeEventListener('touchend', initAudio, true);
                    document.removeEventListener('mousedown', initAudio, true);
                    document.removeEventListener('keydown', initAudio, true);
                }
            } catch (error) {
                console.error('Error initializing audio:', error);
            }
        };

        // Add event listeners with capture phase to ensure they fire first
        document.addEventListener('touchstart', initAudio, true);
        document.addEventListener('touchend', initAudio, true);
        document.addEventListener('mousedown', initAudio, true);
        document.addEventListener('keydown', initAudio, true);
    }

    public async playAudio(audioUrl: string): Promise<void> {
        if (!this.audioInitialized || this.audioContext?.state !== 'running') {
            console.log('Ensuring audio context is initialized before playback...');
            await this.initializeAudioContext();
        }

        this.orbManager.setSpeaking(true);
        try {
            // Try to play audio with retries
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    await this.audioHandler.playAudio(audioUrl);
                    console.log('Audio playback completed');
                    break;
                } catch (error) {
                    console.error(`Audio playback attempt ${retryCount + 1} failed:`, error);
                    retryCount++;
                    if (retryCount === maxRetries) {
                        throw error;
                    }
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        } catch (error) {
            console.error('Error playing audio:', error);
            // If audio fails, still allow the conversation to continue
            if (this.isListeningEnabled) {
                this.orbManager.setSpeaking(false);
                this.orbManager.setListening(true);
                this.speechHandler.endAudioPlayback();
            }
        }
    }

    public async stopAudioAndResumeListen(): Promise<void> {
        console.log('Stopping audio and resuming listening');
        await this.audioHandler.stop();
        
        if (this.isListeningEnabled) {
            this.orbManager.setSpeaking(false);
            this.orbManager.setListening(true);
            setTimeout(() => {
                if (this.isListeningEnabled) {
                    console.log('Resuming speech recognition after stopping audio');
                    this.speechHandler.endAudioPlayback();
                }
            }, 100);
        }
    }

    public async enableListening(): Promise<void> {
        console.log('Enabling listening');
        // Ensure audio context is initialized/resumed before enabling listening
        await this.initializeAudioContext();
        
        this.isListeningEnabled = true;
        this.elements.micButton.classList.add('active');
        this.orbManager.setListening(true);
        this.orbManager.setSpeaking(false);
        this.speechHandler.start();
    }

    public disableListening(): void {
        console.log('Disabling listening');
        this.isListeningEnabled = false;
        this.elements.micButton.classList.remove('active');
        this.orbManager.setListening(false);
        this.orbManager.setSpeaking(false);
        this.speechHandler.stop();
    }

    public isListening(): boolean {
        return this.isListeningEnabled;
    }

    public isPlaying(): boolean {
        return this.audioHandler.isPlaying();
    }

    public async startAudioPlayback(): Promise<void> {
        // Ensure audio context is initialized/resumed before starting playback
        await this.initializeAudioContext();
        this.speechHandler.startAudioPlayback();
    }

    public endAudioPlayback(): void {
        this.speechHandler.endAudioPlayback();
    }

    public cleanup(): void {
        this.audioHandler.stop();
        this.speechHandler.stop();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    // Method to check if audio is properly initialized
    public isAudioInitialized(): boolean {
        return this.audioInitialized && this.audioContext?.state === 'running';
    }

    // Method to manually initialize audio (for use with user interactions)
    public async ensureAudioInitialized(): Promise<void> {
        await this.initializeAudioContext();
    }
}
