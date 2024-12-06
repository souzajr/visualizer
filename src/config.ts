import { OpenAIConfig, OpenAIVoice } from './types.js';

// Get API key from environment variable or fallback to default
const apiKey = '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'

export const OPENAI_CONFIG: OpenAIConfig = {
    apiKey,
    model: 'gpt-3.5-turbo',
    voice: 'nova' // OpenAI TTS voice
};

export const OPENAI_VOICES: OpenAIVoice[] = [
    { value: 'alloy', text: 'Alloy - Neutral' },
    { value: 'echo', text: 'Echo - Soft' },
    { value: 'fable', text: 'Fable - British' },
    { value: 'onyx', text: 'Onyx - Deep' },
    { value: 'nova', text: 'Nova - Energetic' },
    { value: 'shimmer', text: 'Shimmer - Clear' }
];

export const AUDIO_CONFIG = {
    fftSize: 2048,
    smoothingTimeConstant: 0.7,
    minDecibels: -70,
    maxDecibels: -10,
    // iOS-specific settings
    maxRetries: 3,
    retryDelay: 100,
    audioContextOptions: {
        sampleRate: 44100,
        latencyHint: 'interactive' as AudioContextLatencyCategory
    },
    // Audio element settings
    audioElementSettings: {
        preload: 'auto' as 'auto' | 'metadata' | 'none',
        playbackRate: 1.0,
        preservesPitch: true
    }
};

export const SPEECH_RECOGNITION_CONFIG = {
    continuous: true,
    interimResults: true,
    language: 'en-US'
};

export const API_ENDPOINTS = {
    chatCompletion: 'https://api.openai.com/v1/chat/completions',
    textToSpeech: 'https://api.openai.com/v1/audio/speech',
    oneMindChat: 'https://dialogue-v2.dev.1mind.com/oai/chat/completions',
    oneMindSession: 'https://dialogue-v2.dev.1mind.com/api/v1/session'
};

export const ONEMIND_CONFIG = {
    apiKey: 'b567bcf3-9ec0-441b-abd4-ccad641110d1',
    defaultSystemPrompt: 'You are a helpful AI assistant.',
    ais: [
        { value: '61d8c8d0-bc62-4d7f-9c71-4cbc84dd5d2d', text: 'Mindy Website AI' },
        { value: '58a72e80-1bbd-4fad-a1f0-934718b1a363', text: 'Amanda AI - Sales' },
        { value: 'cc9191a5-2b24-4018-8bcd-7bc2cd2b689f', text: 'Amanda AI - Investor' },
        { value: 'MEADOWS', text: 'Rob-bot' },
        { value: 'custom', text: 'Other' }
    ]
};
