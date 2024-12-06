import { DOMElements } from '../ui/dom-manager.js';
import { OrbManager } from '../orb/orb-manager.js';
import { AudioManager } from '../audio/audio-manager.js';
import { ChatManager } from '../chat/chat-manager.js';
import { OpenAIHandler } from '../openai.js';
import { OrbType, LLMConfig } from '../types.js';
import { API_ENDPOINTS } from '../config.js';

export class EventManager {
    private elements: DOMElements;
    private orbManager: OrbManager;
    private audioManager: AudioManager;
    private chatManager: ChatManager;
    private openAIHandler: OpenAIHandler;

    constructor(
        elements: DOMElements,
        orbManager: OrbManager,
        audioManager: AudioManager,
        chatManager: ChatManager,
        openAIHandler: OpenAIHandler
    ) {
        this.elements = elements;
        this.orbManager = orbManager;
        this.audioManager = audioManager;
        this.chatManager = chatManager;
        this.openAIHandler = openAIHandler;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.setupLLMEventListeners();
        this.setupMenuEventListeners();
        this.setupOrbEventListeners();
        this.setupAudioEventListeners();
        this.setupChatEventListeners();
        this.setupWindowEventListeners();
        this.setupGradientEventListeners();
    }

    private setupGradientEventListeners(): void {
        // Handle gradient bar clicks
        this.elements.gradientBar.addEventListener('click', (e) => {
            const rect = this.elements.gradientBar.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const isLeftHalf = x < rect.width / 2;

            // Position the color picker
            if (isLeftHalf) {
                const startPicker = this.elements.bgGradientStart;
                startPicker.style.visibility = 'visible';
                startPicker.style.opacity = '1';
                startPicker.style.pointerEvents = 'auto';
                startPicker.click();
                startPicker.addEventListener('change', this.updateGradient.bind(this), { once: true });
                startPicker.addEventListener('blur', () => {
                    startPicker.style.visibility = 'hidden';
                    startPicker.style.opacity = '0';
                    startPicker.style.pointerEvents = 'none';
                }, { once: true });
            } else {
                const endPicker = this.elements.bgGradientEnd;
                endPicker.style.visibility = 'visible';
                endPicker.style.opacity = '1';
                endPicker.style.pointerEvents = 'auto';
                endPicker.click();
                endPicker.addEventListener('change', this.updateGradient.bind(this), { once: true });
                endPicker.addEventListener('blur', () => {
                    endPicker.style.visibility = 'hidden';
                    endPicker.style.opacity = '0';
                    endPicker.style.pointerEvents = 'none';
                }, { once: true });
            }
        });

        // Initial gradient setup
        this.updateGradient();
    }

    private updateGradient(): void {
        const startColor = this.elements.bgGradientStart.value;
        const endColor = this.elements.bgGradientEnd.value;
        const gradient = `linear-gradient(to right, ${startColor}, ${endColor})`;
        document.body.style.background = gradient;
        this.elements.gradientBar.style.background = gradient;
    }

    private setupLLMEventListeners(): void {
        // Handle voice selection
        this.elements.voiceSelect.addEventListener('change', () => {
            this.openAIHandler.setVoice(this.elements.voiceSelect.value);
        });
      
        // Handle LLM type selection
        this.elements.llmSelect.addEventListener('change', () => {
            const isGPT = this.elements.llmSelect.value === 'gpt';
            this.elements.gptControls.classList.toggle('hidden', !isGPT);
            this.elements.oneMindControls.classList.toggle('hidden', isGPT);

            if (isGPT) {
                const config: LLMConfig = {
                    type: 'gpt',
                    systemPrompt: this.elements.systemPrompt.value,
                    apiEndpoint: API_ENDPOINTS.chatCompletion
                };
                this.openAIHandler.setLLMConfig(config);
            }
        });

        // Handle system prompt changes
        this.elements.systemPrompt.addEventListener('change', () => {
            if (this.elements.llmSelect.value === 'gpt') {
                const config: LLMConfig = {
                    type: 'gpt',
                    systemPrompt: this.elements.systemPrompt.value,
                    apiEndpoint: API_ENDPOINTS.chatCompletion
                };
                this.openAIHandler.setLLMConfig(config);
            }
        });

        // Handle AI selection
        this.elements.aiSelect.addEventListener('change', () => {
            this.elements.customAiId.classList.toggle('hidden', this.elements.aiSelect.value !== 'custom');
        });

        // Handle start session button
        this.elements.startSessionButton.addEventListener('click', async () => {
            try {
                this.elements.startSessionButton.disabled = true;
                const aiId = this.elements.aiSelect.value === 'custom' ? this.elements.customAiId.value : this.elements.aiSelect.value;
                
                const { sessionId, customGreeting } = await this.openAIHandler.createOneMindSession(aiId);
                
                const config: LLMConfig = {
                    type: '1mind',
                    sessionId,
                    apiEndpoint: API_ENDPOINTS.oneMindChat
                };
                this.openAIHandler.setLLMConfig(config);

                // Add the greeting to the chat
                if (customGreeting) {
                    this.chatManager.addMessage(customGreeting, false);
                    // Convert greeting to speech
                    const audioBuffer = await this.openAIHandler.textToSpeech(customGreeting);
                    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
                    const audioUrl = URL.createObjectURL(blob);
                    this.orbManager.setSpeaking(true);
                    await this.audioManager.playAudio(audioUrl);
                    this.orbManager.setSpeaking(false);
                }
            } catch (error) {
                console.error('Error starting 1mind session:', error);
                alert('Failed to start 1mind session. Please try again.');
            } finally {
                this.elements.startSessionButton.disabled = false;
            }
        });
    }

    private setupMenuEventListeners(): void {
        // Hamburger menu toggle
        this.elements.hamburgerButton.addEventListener('click', () => {
            this.elements.menu.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (!this.elements.menu.contains(target) && !this.elements.hamburgerButton.contains(target)) {
                this.elements.menu.classList.remove('active');
            }
        });
    }

    private setupOrbEventListeners(): void {
        this.elements.orbSelector.addEventListener('change', (e) => {
            const selectedType = (e.target as HTMLSelectElement).value as OrbType;
            console.log('Orb selection changed:', selectedType);
            this.orbManager.createOrb(selectedType);
        });

        this.elements.sizeSlider.addEventListener('input', () => {
            const size = parseInt(this.elements.sizeSlider.value);
            this.elements.sizeValue.textContent = size.toString();
            this.orbManager.recreateOrbWithConfig();
        });

        this.elements.baseColor.addEventListener('change', () => this.orbManager.recreateOrbWithConfig());
        this.elements.glowColor.addEventListener('change', () => this.orbManager.recreateOrbWithConfig());

        // Handle range inputs
        this.elements.pulseSpeed.addEventListener('input', () => {
            this.elements.pulseSpeedValue.textContent = this.elements.pulseSpeed.value;
            this.orbManager.recreateOrbWithConfig();
        });

        this.elements.minOpacity.addEventListener('input', () => {
            this.elements.minOpacityValue.textContent = this.elements.minOpacity.value;
            this.orbManager.recreateOrbWithConfig();
        });

        this.elements.maxOpacity.addEventListener('input', () => {
            this.elements.maxOpacityValue.textContent = this.elements.maxOpacity.value;
            this.orbManager.recreateOrbWithConfig();
        });
    }

    private setupAudioEventListeners(): void {
        this.elements.micButton.addEventListener('click', async () => {
            // Ensure audio is initialized before toggling listening state
            await this.audioManager.ensureAudioInitialized();
            
            if (this.audioManager.isListening()) {
                this.audioManager.disableListening();
            } else {
                await this.audioManager.enableListening();
            }
        });

        this.elements.orbCanvas.addEventListener('click', () => {
            if (this.audioManager.isPlaying()) {
                this.audioManager.stopAudioAndResumeListen();
            }
        });
    }

    private setupChatEventListeners(): void {
        // Initialize audio on chat input focus
        this.elements.textInput.addEventListener('focus', async () => {
            await this.audioManager.ensureAudioInitialized();
        });

        this.elements.textInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && this.elements.textInput.value.trim()) {
                // Ensure audio is initialized before processing input
                await this.audioManager.ensureAudioInitialized();
                
                const text = this.elements.textInput.value.trim();
                this.elements.textInput.value = '';
                await this.processUserInput(text);
            }
        });

        this.elements.showChatCheckbox.addEventListener('change', () => {
            console.log('Chat visibility changed:', this.elements.showChatCheckbox.checked);
            this.chatManager.toggleChatVisibility(this.elements.showChatCheckbox.checked);
        });
    }

    private setupWindowEventListeners(): void {
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                this.elements.menu.classList.remove('active');
            }
        });
    }

    public async processUserInput(text: string): Promise<void> {
        if (this.chatManager.isCurrentlyProcessing()) return;
        
        // Ensure audio is initialized before processing
        await this.audioManager.ensureAudioInitialized();
        
        this.chatManager.addMessage(text, true);
        this.chatManager.setProcessing(true);

        try {
            await this.audioManager.startAudioPlayback();
            this.chatManager.startAIMessage();

            const response = await this.openAIHandler.processInputWithStream(
                text,
                (chunk) => this.chatManager.updateAIMessage(chunk)
            );

            // Don't add the message again since it's already been added through updateAIMessage
            await this.audioManager.playAudio(response.audioUrl);
        } catch (error) {
            console.error('Error processing user input:', error);
            if (this.audioManager.isListening()) {
                this.orbManager.setSpeaking(false);
                this.orbManager.setListening(true);
                this.audioManager.endAudioPlayback();
            }
        } finally {
            this.chatManager.setProcessing(false);
            this.chatManager.endAIMessage();
            this.orbManager.setSpeaking(false);
        }
    }
}
