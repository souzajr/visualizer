export interface OpenAIConfig {
    apiKey: string;
    model: string;
    voice: string;
}

export interface OpenAIVoice {
    value: string;
    text: string;
}

export interface OrbConfig {
    radius: number;
    baseColor: string;
    glowColor: string;
    pulseSpeed: number;
    minOpacity: number;
    maxOpacity: number;
}

export interface SpeechRecognitionResult {
    transcript: string;
    isFinal: boolean;
}

export interface AIResponse {
    text: string;
    audioUrl: string;
}

export interface AudioAnalyzer {
    analyser: AnalyserNode;
    dataArray: Uint8Array;
    bufferLength: number;
}

export type AudioVisualizerCallback = (amplitude: number) => void;

// LLM Configuration interfaces
export interface OneMindAI {
    value: string;
    text: string;
}

export interface LLMConfig {
    type: 'gpt' | '1mind';
    systemPrompt?: string;
    oneMindAI?: string;
    sessionId?: string;
    apiEndpoint: string;
}

export interface OneMindSessionResponse {
    sessionId: string;
    customGreeting: string;
}

// Streaming response handlers
export type StreamChunkHandler = (chunk: string) => void;
export type StreamCompleteHandler = (fullText: string) => void;

// Base interface for all orb visualizers
export interface OrbVisualizer {
    updateAmplitude(amplitude: number): void;
    updateMicVolume?(volume: number): void;  // Optional method for mic volume
    setSpeaking(speaking: boolean): void;
    setListening(listening: boolean): void;
    start(): void;
    stop(): void;
    getConfig(): OrbConfig;
}

// Registry of available orb types
export enum OrbType {
    Fluid = "Fluid Orb",
    Particle = "Particle Orb",
    Plasma = "Plasma Orb",
    Crystal = "Crystal Orb",
    Nebula = "Nebula Orb",
    Wave = "Wave Orb",
    Energy = "Energy Orb",
    Vortex = "Vortex Orb",
    Aurora = "Aurora Orb",
    Swirl = "Swirl Orb",
    Dot = "Dot Orb",
    Bubble = "Bubble Orb"
}

// Chat message interface for the chat overlay
export interface ChatMessage {
    text: string;
    isUser: boolean;
    timestamp?: number;
}
