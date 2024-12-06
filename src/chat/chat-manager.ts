import { ChatMessage } from '../types.js';
import { DOMElements } from '../ui/dom-manager.js';

export class ChatManager {
    private chatMessages: ChatMessage[] = [];
    private currentAIMessage: HTMLDivElement | null = null;
    private currentAIMessageText: string = '';
    private isProcessing: boolean = false;
    private elements: DOMElements;

    constructor(elements: DOMElements) {
        this.elements = elements;
    }

    public addMessage(text: string, isUser: boolean): void {
        console.log(`Adding ${isUser ? 'user' : 'AI'} message:`, text);
        const message: ChatMessage = {
            text,
            isUser,
            timestamp: Date.now()
        };
        this.chatMessages.push(message);
        this.updateChatDisplay();
    }

    private updateChatDisplay(): void {
        console.log('Updating chat display with messages:', this.chatMessages);

        const newMessage = document.createElement('div');
        newMessage.className = `chat-message ${this.chatMessages[this.chatMessages.length - 1].isUser ? 'user-message' : 'ai-message'}`;
        newMessage.textContent = this.chatMessages[this.chatMessages.length - 1].text;

        this.elements.chatMessagesContainer.appendChild(newMessage);
        this.elements.chatMessagesContainer.scrollTop = this.elements.chatMessagesContainer.scrollHeight;
    }

    public startAIMessage(): void {
        this.currentAIMessageText = '';
        this.currentAIMessage = document.createElement('div');
        this.currentAIMessage.className = 'chat-message ai-message';
        this.elements.chatMessagesContainer.appendChild(this.currentAIMessage);
        this.elements.chatMessagesContainer.scrollTop = this.elements.chatMessagesContainer.scrollHeight;
    }

    public updateAIMessage(chunk: string): void {
        if (this.currentAIMessage) {
            this.currentAIMessageText += chunk;
            this.currentAIMessage.textContent = this.currentAIMessageText;
            this.elements.chatMessagesContainer.scrollTop = this.elements.chatMessagesContainer.scrollHeight;
        }
    }

    public endAIMessage(): void {
        this.currentAIMessage = null;
        this.currentAIMessageText = '';
    }

    public setProcessing(isProcessing: boolean): void {
        this.isProcessing = isProcessing;
    }

    public isCurrentlyProcessing(): boolean {
        return this.isProcessing;
    }

    public toggleChatVisibility(visible: boolean): void {
        this.elements.chatOverlay.style.display = visible ? 'flex' : 'none';
    }

    public getChatMessages(): ChatMessage[] {
        return this.chatMessages;
    }
}
