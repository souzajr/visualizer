import { AudioAnalyzer, AudioVisualizerCallback } from './types.js';
import { AUDIO_CONFIG } from './config.js';

export class AudioHandler {
    private audioContext: AudioContext | null = null;
    private audioElement: HTMLAudioElement | null = null;
    private analyzer: AnalyserNode | null = null;
    private dataArray: Uint8Array | null = null;
    private source: MediaElementAudioSourceNode | null = null;
    private visualizerCallback: AudioVisualizerCallback | null = null;
    private animationFrameId: number | null = null;
    private onPlaybackEndCallback: (() => void) | null = null;
    private isInitialized: boolean = false;
    private maxRetries: number = AUDIO_CONFIG.maxRetries;
    private retryDelay: number = AUDIO_CONFIG.retryDelay;
    private userInteractionPromise: Promise<void> | null = null;
    private userInteractionResolver: (() => void) | null = null;

    constructor() {
        // Create a promise that resolves on user interaction
        this.userInteractionPromise = new Promise((resolve) => {
            this.userInteractionResolver = resolve;
        });
        
        // Set up user interaction listeners
        this.initOnUserInteraction();
        console.log('AudioHandler initialized');
    }

    private initOnUserInteraction() {
        const initAudio = async () => {
            if (this.isInitialized) return;
            
            try {
                // Create a silent audio context
                this.audioContext = new AudioContext(AUDIO_CONFIG.audioContextOptions);
                
                // Create and play a silent buffer to unlock audio
                const buffer = this.audioContext.createBuffer(1, 1, 22050);
                const source = this.audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(this.audioContext.destination);
                source.start(0);
                
                this.analyzer = this.audioContext.createAnalyser();
                this.analyzer.fftSize = AUDIO_CONFIG.fftSize;
                this.analyzer.smoothingTimeConstant = AUDIO_CONFIG.smoothingTimeConstant;
                this.analyzer.minDecibels = AUDIO_CONFIG.minDecibels;
                this.analyzer.maxDecibels = AUDIO_CONFIG.maxDecibels;

                this.dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
                
                // Resume the audio context
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }

                this.isInitialized = true;
                console.log('Audio system initialized on user interaction');

                // Resolve the user interaction promise
                if (this.userInteractionResolver) {
                    this.userInteractionResolver();
                }

                // Remove event listeners after initialization
                document.removeEventListener('touchstart', initAudio, true);
                document.removeEventListener('touchend', initAudio, true);
                document.removeEventListener('click', initAudio, true);
                document.removeEventListener('keydown', initAudio, true);
            } catch (error) {
                console.error('Error initializing audio system:', error);
            }
        };

        // Add event listeners with capture phase to ensure they fire first
        document.addEventListener('touchstart', initAudio, true);
        document.addEventListener('touchend', initAudio, true);
        document.addEventListener('click', initAudio, true);
        document.addEventListener('keydown', initAudio, true);
    }

    private async ensureInitialized(): Promise<void> {
        // Wait for user interaction if not already initialized
        if (!this.isInitialized && this.userInteractionPromise) {
            console.log('Waiting for user interaction...');
            await this.userInteractionPromise;
        }

        if (!this.isInitialized) {
            throw new Error('Audio system not initialized. User interaction required.');
        }

        if (this.audioContext?.state === 'suspended') {
            console.log('Resuming AudioContext');
            try {
                await this.audioContext.resume();
                // Add a small delay after resuming
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error('Error resuming AudioContext:', error);
                throw error;
            }
        }
    }

    private configureAudioElement(element: HTMLAudioElement): void {
        element.setAttribute('playsinline', '');
        element.setAttribute('webkit-playsinline', '');
        element.crossOrigin = 'anonymous';
        element.preload = AUDIO_CONFIG.audioElementSettings.preload;
        element.playbackRate = AUDIO_CONFIG.audioElementSettings.playbackRate;
        // @ts-ignore - preservesPitch is not in the type definitions but is supported
        element.preservesPitch = AUDIO_CONFIG.audioElementSettings.preservesPitch;
        element.muted = false;
        element.autoplay = false;
    }

    public async playAudio(audioUrl: string, retryCount: number = 0): Promise<void> {
        console.log('Starting audio playback:', audioUrl);
        
        try {
            await this.ensureInitialized();

            if (!this.audioContext || !this.analyzer || !this.dataArray) {
                throw new Error('Audio context not initialized');
            }

            // Clean up previous audio if exists
            await this.stop();

            // Create new audio element
            this.audioElement = new Audio();
            this.configureAudioElement(this.audioElement);

            return new Promise((resolve, reject) => {
                if (!this.audioElement || !this.audioContext || !this.analyzer) {
                    return reject(new Error('Audio system not initialized'));
                }

                // Set up audio element
                this.audioElement.oncanplay = async () => {
                    try {
                        if (!this.audioElement || !this.audioContext || !this.analyzer) {
                            throw new Error('Audio system not initialized');
                        }

                        // Create and connect nodes
                        this.source = this.audioContext.createMediaElementSource(this.audioElement);
                        this.source.connect(this.analyzer);
                        this.analyzer.connect(this.audioContext.destination);

                        // Ensure audio context is running
                        if (this.audioContext.state === 'suspended') {
                            await this.audioContext.resume();
                        }

                        // Start playback and visualization
                        try {
                            await this.audioElement.play();
                            this.startVisualization();
                            console.log('Audio playback started');
                        } catch (error) {
                            console.error('Error during audio playback:', error);
                            if (retryCount < this.maxRetries) {
                                console.log(`Retrying audio playback (attempt ${retryCount + 1})`);
                                setTimeout(() => {
                                    this.playAudio(audioUrl, retryCount + 1)
                                        .then(resolve)
                                        .catch(reject);
                                }, this.retryDelay);
                            } else {
                                reject(error);
                            }
                        }
                    } catch (error) {
                        console.error('Error during audio setup:', error);
                        reject(error);
                    }
                };

                // Handle playback end
                this.audioElement.onended = () => {
                    console.log('Audio playback ended');
                    this.stop().then(() => {
                        if (this.onPlaybackEndCallback) {
                            this.onPlaybackEndCallback();
                        }
                        resolve();
                    });
                };

                // Handle errors
                this.audioElement.onerror = (error) => {
                    console.error('Audio element error:', error);
                    reject(error);
                };

                // Set source and load
                this.audioElement.src = audioUrl;
                this.audioElement.load();
            });
        } catch (error) {
            console.error('Error in playAudio:', error);
            throw error;
        }
    }

    public async stop(): Promise<void> {
        console.log('Stopping audio playback');
        
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.source) {
            try {
                this.source.disconnect();
                this.source = null;
            } catch (error) {
                console.error('Error disconnecting source:', error);
            }
        }

        if (this.audioElement) {
            try {
                this.audioElement.pause();
                this.audioElement.currentTime = 0;
                this.audioElement.src = '';
                this.audioElement.removeAttribute('src');
                this.audioElement.load();
                this.audioElement = null;
            } catch (error) {
                console.error('Error stopping audio element:', error);
            }
        }
    }

    public setVisualizerCallback(callback: AudioVisualizerCallback) {
        this.visualizerCallback = callback;
    }

    public setPlaybackEndCallback(callback: () => void) {
        this.onPlaybackEndCallback = callback;
    }

    private startVisualization() {
        if (!this.analyzer || !this.dataArray) return;

        const analyze = () => {
            if (!this.analyzer || !this.dataArray) return;

            this.animationFrameId = requestAnimationFrame(analyze);
            this.analyzer.getByteFrequencyData(this.dataArray);
            
            // Calculate average amplitude with emphasis on peaks
            let sum = 0;
            let peakCount = 0;
            for (let i = 0; i < this.dataArray.length; i++) {
                const value = this.dataArray[i];
                if (value > 128) { // Count peaks above half amplitude
                    peakCount++;
                }
                sum += value;
            }
            
            // Weighted average giving more importance to peaks
            const average = (sum / this.dataArray.length) * (1 + peakCount / this.dataArray.length);
            
            // Normalize to 0-1 range with enhanced sensitivity
            const normalizedAmplitude = Math.min(1, (average / 128) * 1.5);
            
            if (this.visualizerCallback) {
                this.visualizerCallback(normalizedAmplitude);
            }
        };

        analyze();
    }

    public isPlaying(): boolean {
        return this.audioElement !== null && !this.audioElement.paused;
    }
}
