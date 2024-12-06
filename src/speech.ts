import { SpeechRecognitionResult } from './types.js';
import { SPEECH_RECOGNITION_CONFIG } from './config.js';

export class SpeechHandler {
    private recognition: SpeechRecognition;
    private isListening: boolean = false;
    private shouldBeListening: boolean = false;
    private isAudioPlaying: boolean = false;
    private onResultCallback: (result: SpeechRecognitionResult) => void;
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private mediaStream: MediaStream | null = null;
    private micVolumeCallback: ((volume: number) => void) | null = null;
    private animationFrameId: number | null = null;
    private dataArray: Uint8Array | null = null;
    private isInitialized: boolean = false;

    constructor(
        onResult: (result: SpeechRecognitionResult) => void
    ) {
        if (!('webkitSpeechRecognition' in window)) {
            throw new Error('Speech recognition is not supported in this browser');
        }

        this.onResultCallback = onResult;

        // Initialize speech recognition
        this.recognition = new (window as any).webkitSpeechRecognition();
        this.setupRecognition();
        this.initOnUserInteraction();
    }

    private initOnUserInteraction() {
        const initAudio = async () => {
            if (this.isInitialized) return;
            
            try {
                this.audioContext = new AudioContext();
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 256;
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
                this.isInitialized = true;

                // Remove event listeners after initialization
                document.removeEventListener('touchstart', initAudio);
                document.removeEventListener('mousedown', initAudio);
                document.removeEventListener('keydown', initAudio);

                console.log('Audio system initialized on user interaction');
            } catch (error) {
                console.error('Error initializing audio system:', error);
            }
        };

        // Add event listeners for various user interactions
        document.addEventListener('touchstart', initAudio);
        document.addEventListener('mousedown', initAudio);
        document.addEventListener('keydown', initAudio);
    }

    private async ensureAudioContext(): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Audio system not initialized. User interaction required.');
        }

        if (this.audioContext?.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('AudioContext resumed');
            } catch (error) {
                console.error('Error resuming AudioContext:', error);
            }
        }
    }

    private async setupAudioContext() {
        try {
            await this.ensureAudioContext();

            if (!this.mediaStream) {
                this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
                
                if (this.audioContext && this.analyser) {
                    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
                    source.connect(this.analyser);
                    this.startVolumeAnalysis();
                }
            } else {
                this.startVolumeAnalysis();
            }
        } catch (error) {
            console.error('Error accessing microphone:', error);
        }
    }

    private startVolumeAnalysis() {
        if (!this.analyser || !this.dataArray) {
            console.log('Cannot start volume analysis - missing analyzer or data array');
            return;
        }

        const analyzeVolume = () => {
            if (!this.analyser || !this.dataArray || !this.isListening) {
                if (this.animationFrameId !== null) {
                    cancelAnimationFrame(this.animationFrameId);
                    this.animationFrameId = null;
                }
                return;
            }

            this.animationFrameId = requestAnimationFrame(analyzeVolume);
            this.analyser.getByteFrequencyData(this.dataArray);

            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < this.dataArray.length; i++) {
                sum += this.dataArray[i];
            }
            const average = sum / this.dataArray.length;
            const normalizedVolume = average / 128; // Normalize to 0-1 range

            if (this.micVolumeCallback) {
                this.micVolumeCallback(normalizedVolume);
            }
        };

        analyzeVolume();
    }

    private setupRecognition() {
        this.recognition.continuous = SPEECH_RECOGNITION_CONFIG.continuous;
        this.recognition.interimResults = SPEECH_RECOGNITION_CONFIG.interimResults;
        this.recognition.lang = SPEECH_RECOGNITION_CONFIG.language;

        this.recognition.onstart = () => {
            this.isListening = true;
            console.log('Speech recognition started');
            // Setup audio context immediately when recognition starts
            this.setupAudioContext().catch(error => {
                console.error('Error setting up audio context:', error);
            });
        };

        this.recognition.onend = () => {
            this.isListening = false;
            console.log('Speech recognition ended');
            
            // Only restart if we should be listening and no audio is playing
            if (this.shouldBeListening && !this.isAudioPlaying) {
                setTimeout(() => {
                    if (this.shouldBeListening && !this.isAudioPlaying) {
                        try {
                            this.recognition.start();
                        } catch (error) {
                            console.error('Error restarting speech recognition:', error);
                        }
                    }
                }, 100);
            }
        };

        this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.log('Speech recognition error:', event.error);
            if (event.error !== 'aborted') {
                console.error('Speech recognition error:', event.error);
            }
        };

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
            // Ignore any results if audio is playing
            if (this.isAudioPlaying) return;

            const last = event.results.length - 1;
            const result = event.results[last];
            const transcript = result[0].transcript;
            const isFinal = result.isFinal;

            this.onResultCallback({
                transcript,
                isFinal
            });
        };
    }

    public setMicVolumeCallback(callback: (volume: number) => void) {
        this.micVolumeCallback = callback;
        // If we're already listening, start volume analysis
        if (this.isListening && this.audioContext) {
            this.startVolumeAnalysis();
        }
    }

    public async start() {
        console.log('Starting speech recognition');
        this.shouldBeListening = true;
        if (!this.isListening && !this.isAudioPlaying) {
            try {
                // Set up audio context before starting recognition
                await this.setupAudioContext();
                this.recognition.start();
            } catch (error) {
                console.error('Error starting speech recognition:', error);
            }
        }
    }

    public stop() {
        console.log('Stopping speech recognition');
        this.shouldBeListening = false;
        if (this.isListening) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.error('Error stopping speech recognition:', error);
            }
        }

        // Clean up audio analysis
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        if (this.micVolumeCallback) {
            this.micVolumeCallback(0); // Reset volume to 0
        }
    }

    public startAudioPlayback() {
        console.log('Pausing speech recognition for audio playback');
        this.isAudioPlaying = true;
        if (this.isListening) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.error('Error stopping speech recognition:', error);
            }
        }
    }

    public endAudioPlayback() {
        console.log('Audio playback ended, resuming speech recognition');
        this.isAudioPlaying = false;
        if (this.shouldBeListening && !this.isListening) {
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Error resuming speech recognition:', error);
                // If failed to start, try again after a short delay
                setTimeout(() => {
                    if (this.shouldBeListening && !this.isListening && !this.isAudioPlaying) {
                        try {
                            this.recognition.start();
                        } catch (error) {
                            console.error('Error retrying speech recognition:', error);
                        }
                    }
                }, 100);
            }
        }
    }

    public isActive(): boolean {
        return this.isListening && !this.isAudioPlaying;
    }
}
