import { OPENAI_CONFIG, API_ENDPOINTS, ONEMIND_CONFIG } from './config.js';
import { AIResponse, ChatMessage, LLMConfig, OneMindSessionResponse, StreamChunkHandler, StreamCompleteHandler } from './types.js';

interface ChatCompletionMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export class OpenAIHandler {
    private apiKey: string;
    private model: string;
    private voice: string;
    private messageHistory: ChatCompletionMessage[] = [];
    private readonly MAX_HISTORY = 5;
    private llmConfig: LLMConfig;
    private abortController: AbortController | null = null;
    private audioUrls: string[] = [];

    constructor() {
        this.apiKey = OPENAI_CONFIG.apiKey;
        this.model = OPENAI_CONFIG.model;
        this.voice = OPENAI_CONFIG.voice;
        this.llmConfig = {
            type: 'gpt',
            systemPrompt: ONEMIND_CONFIG.defaultSystemPrompt,
            apiEndpoint: API_ENDPOINTS.chatCompletion
        };

        if (this.apiKey === 'your-api-key-here') {
            throw new Error('Please set your OpenAI API key in config.ts');
        }

        // Initialize with system message
        this.messageHistory.push({ 
            role: 'system', 
            content: this.llmConfig.systemPrompt || ONEMIND_CONFIG.defaultSystemPrompt
        });
    }

    private cleanup() {
        // Clean up old audio URLs
        this.audioUrls.forEach(url => {
            try {
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Error cleaning up audio URL:', error);
            }
        });
        this.audioUrls = [];
    }

    public setVoice(voice: string) {
        console.log('Setting voice to:', voice);
        this.voice = voice;
    }

    public async createOneMindSession(aiId: string): Promise<OneMindSessionResponse> {
        const userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0,
                v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });

        const response = await fetch(API_ENDPOINTS.oneMindSession, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ONEMIND_CONFIG.apiKey
            },
            body: JSON.stringify({ aiId, userId }),
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`Failed to create 1mind session: ${response.status}`);
        }

        const data = await response.json();
        if (!data.session_id) {
            throw new Error('Failed to create 1mind session');
        }

        return {
            sessionId: data.session_id,
            customGreeting: data.result
        };
    }

    public setLLMConfig(config: LLMConfig) {
        this.llmConfig = config;
        
        // Update system message
        if (config.type === '1mind' && config.sessionId) {
            this.messageHistory[0] = {
                role: 'system',
                content: `[[session: ${config.sessionId}]]`
            };
        } else {
            this.messageHistory[0] = {
                role: 'system',
                content: config.systemPrompt || ONEMIND_CONFIG.defaultSystemPrompt
            };
        }
    }

    private async fetchWithAuth(url: string, options: RequestInit): Promise<Response> {
        const headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            ...options.headers
        };

        console.log('Making API request to:', url);
        const response = await fetch(url, { ...options, headers });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API error:', errorText);
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        return response;
    }

    private updateMessageHistory(userMessage: string, assistantMessage: string) {
        // Add new messages
        this.messageHistory.push({ role: 'user', content: userMessage });
        this.messageHistory.push({ role: 'assistant', content: assistantMessage });

        // Keep only system message plus last MAX_HISTORY turns (user + assistant pairs)
        const systemMessage = this.messageHistory[0];
        const recentMessages = this.messageHistory.slice(-(this.MAX_HISTORY * 2)); // Last 5 pairs
        this.messageHistory = [systemMessage, ...recentMessages];
    }

    private async processStreamResponse(response: Response, onChunk: StreamChunkHandler): Promise<string> {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        if (!reader) {
            throw new Error('Response body is null');
        }

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices[0]?.delta?.content || '';
                            if (content) {
                                fullText += content;
                                onChunk(content);
                            }
                        } catch (e) {
                            console.error('Error parsing stream chunk:', e);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        return fullText;
    }

    public async getChatResponseStream(
        userInput: string,
        onChunk: StreamChunkHandler,
        onComplete: StreamCompleteHandler
    ): Promise<void> {
        console.log('Getting streaming chat response for:', userInput);
        
        // Cancel any existing request
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();

        try {
            const response = await this.fetchWithAuth(this.llmConfig.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        ...this.messageHistory,
                        { role: 'user', content: userInput }
                    ],
                    temperature: 0.7,
                    max_tokens: 150,
                    stream: true
                }),
                signal: this.abortController.signal
            });

            const fullText = await this.processStreamResponse(response, onChunk);
            this.updateMessageHistory(userInput, fullText);
            onComplete(fullText);
        } finally {
            this.abortController = null;
        }
    }

    public async textToSpeech(text: string): Promise<ArrayBuffer> {
        console.log('Converting text to speech:', text);
        
        const response = await this.fetchWithAuth(API_ENDPOINTS.textToSpeech, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'tts-1',
                voice: this.voice,
                input: text,
                response_format: 'mp3'
            })
        });

        // Get the audio data
        const buffer = await response.arrayBuffer();
        console.log('Received audio buffer size:', buffer.byteLength);

        // Verify buffer is not empty
        if (buffer.byteLength === 0) {
            throw new Error('Received empty audio buffer from OpenAI');
        }

        return buffer;
    }

    public async processInputWithStream(
        userInput: string,
        onChunk: StreamChunkHandler
    ): Promise<AIResponse> {
        try {
            // Clean up old audio URLs first
            this.cleanup();

            console.log('Processing user input with streaming:', userInput);
            
            let fullText = '';
            
            // Get streaming chat response
            await this.getChatResponseStream(
                userInput,
                (chunk) => {
                    onChunk(chunk);
                },
                (text) => {
                    fullText = text;
                }
            );
            
            // Convert final response to speech
            const audioBuffer = await this.textToSpeech(fullText);

            // Create blob with explicit MIME type and codec info for iOS
            const blob = new Blob([audioBuffer], { 
                type: 'audio/mpeg; codecs="mp3"'
            });

            // Create and store URL
            const audioUrl = URL.createObjectURL(blob);
            this.audioUrls.push(audioUrl);

            return {
                text: fullText,
                audioUrl
            };
        } catch (error) {
            console.error('Error processing input:', error);
            throw error;
        }
    }
}
