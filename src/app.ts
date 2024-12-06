import { DOMManager } from './ui/dom-manager.js';
import { ChatManager } from './chat/chat-manager.js';
import { AudioManager } from './audio/audio-manager.js';
import { OrbManager } from './orb/orb-manager.js';
import { EventManager } from './events/event-manager.js';
import { OpenAIHandler } from './openai.js';
import { OrbType } from './types.js';

class App {
    private domManager: DOMManager;
    private chatManager: ChatManager;
    private audioManager: AudioManager;
    private orbManager: OrbManager;
    private eventManager: EventManager;
    private openAIHandler: OpenAIHandler;

    constructor() {
        // Initialize managers in dependency order
        this.domManager = new DOMManager();
        const elements = this.domManager.getElements();

        this.orbManager = new OrbManager(elements, OrbType.Fluid);
        this.openAIHandler = new OpenAIHandler();
        this.chatManager = new ChatManager(elements);
        
        // Audio manager needs orb manager and speech result handler
        this.audioManager = new AudioManager(
            elements,
            this.orbManager,
            this.handleSpeechResult.bind(this)
        );

        // Event manager coordinates all other managers
        this.eventManager = new EventManager(
            elements,
            this.orbManager,
            this.audioManager,
            this.chatManager,
            this.openAIHandler
        );

        console.log('App initialized');
    }

    private async handleSpeechResult(result: { transcript: string; isFinal: boolean }): Promise<void> {
        if (!this.chatManager.isCurrentlyProcessing() && this.audioManager.isListening()) {
            this.orbManager.setListening(true);
            this.orbManager.setSpeaking(false);
        }
        
        if (result.isFinal && !this.chatManager.isCurrentlyProcessing() && this.audioManager.isListening()) {
            // Let the event manager handle the input processing
            await this.eventManager.processUserInput(result.transcript);
        }
    }

    public cleanup(): void {
        this.orbManager.stop();
        this.audioManager.cleanup();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app');
    const app = new App();

    window.addEventListener('beforeunload', () => {
        app.cleanup();
    });
});
