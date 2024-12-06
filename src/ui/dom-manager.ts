export interface DOMElements {
    micButton: HTMLButtonElement;
    orbSelector: HTMLSelectElement;
    sizeSlider: HTMLInputElement;
    sizeValue: HTMLSpanElement;
    baseColor: HTMLInputElement;
    glowColor: HTMLInputElement;
    pulseSpeed: HTMLInputElement;
    pulseSpeedValue: HTMLSpanElement;
    minOpacity: HTMLInputElement;
    minOpacityValue: HTMLSpanElement;
    maxOpacity: HTMLInputElement;
    maxOpacityValue: HTMLSpanElement;
    bgGradientStart: HTMLInputElement;
    bgGradientEnd: HTMLInputElement;
    gradientBar: HTMLDivElement;
    textInput: HTMLInputElement;
    showChatCheckbox: HTMLInputElement;
    chatOverlay: HTMLDivElement;
    chatMessagesContainer: HTMLDivElement;
    menu: HTMLDivElement;
    hamburgerButton: HTMLButtonElement;
    orbCanvas: HTMLCanvasElement;
    llmSelect: HTMLSelectElement;
    systemPrompt: HTMLTextAreaElement;
    aiSelect: HTMLSelectElement;
    customAiId: HTMLInputElement;
    startSessionButton: HTMLButtonElement;
    gptControls: HTMLDivElement;
    oneMindControls: HTMLDivElement;
    voiceSelect: HTMLSelectElement;
}

export class DOMManager {
    private elements: DOMElements;

    constructor() {
        this.elements = this.initializeElements();
    }

    private initializeElements(): DOMElements {
        const micButton = document.getElementById('micButton') as HTMLButtonElement | null;
        const orbSelector = document.getElementById('orbSelector') as HTMLSelectElement | null;
        const sizeSlider = document.getElementById('sizeSlider') as HTMLInputElement | null;
        const sizeValue = document.getElementById('sizeValue') as HTMLSpanElement | null;
        const baseColor = document.getElementById('baseColor') as HTMLInputElement | null;
        const glowColor = document.getElementById('glowColor') as HTMLInputElement | null;
        const pulseSpeed = document.getElementById('pulseSpeed') as HTMLInputElement | null;
        const pulseSpeedValue = document.getElementById('pulseSpeedValue') as HTMLSpanElement | null;
        const minOpacity = document.getElementById('minOpacity') as HTMLInputElement | null;
        const minOpacityValue = document.getElementById('minOpacityValue') as HTMLSpanElement | null;
        const maxOpacity = document.getElementById('maxOpacity') as HTMLInputElement | null;
        const maxOpacityValue = document.getElementById('maxOpacityValue') as HTMLSpanElement | null;
        const bgGradientStart = document.getElementById('bgGradientStart') as HTMLInputElement | null;
        const bgGradientEnd = document.getElementById('bgGradientEnd') as HTMLInputElement | null;
        const gradientBar = document.getElementById('gradientBar') as HTMLDivElement | null;
        const textInput = document.getElementById('textInput') as HTMLInputElement | null;
        const showChatCheckbox = document.getElementById('showChat') as HTMLInputElement | null;
        const chatOverlay = document.getElementById('chatOverlay') as HTMLDivElement | null;
        const chatMessagesContainer = document.querySelector('.chat-messages') as HTMLDivElement | null;
        const menu = document.querySelector('.menu') as HTMLDivElement | null;
        const hamburgerButton = document.querySelector('.hamburger-menu') as HTMLButtonElement | null;
        const orbCanvas = document.getElementById('orbCanvas') as HTMLCanvasElement | null;
        const llmSelect = document.getElementById('llmSelect') as HTMLSelectElement | null;
        const systemPrompt = document.getElementById('systemPrompt') as HTMLTextAreaElement | null;
        const aiSelect = document.getElementById('aiSelect') as HTMLSelectElement | null;
        const customAiId = document.getElementById('customAiId') as HTMLInputElement | null;
        const startSessionButton = document.getElementById('startSession') as HTMLButtonElement | null;
        const gptControls = document.getElementById('gptControls') as HTMLDivElement | null;
        const oneMindControls = document.getElementById('oneMindControls') as HTMLDivElement | null;
        const voiceSelect = document.getElementById('voiceSelect') as HTMLSelectElement | null;
        
        if (!micButton || !orbSelector || !sizeSlider || !sizeValue || !baseColor || !glowColor || 
            !pulseSpeed || !pulseSpeedValue || !minOpacity || !minOpacityValue || !maxOpacity || !maxOpacityValue ||
            !bgGradientStart || !bgGradientEnd || !gradientBar || !textInput || !showChatCheckbox || 
            !chatOverlay || !chatMessagesContainer || !menu || !hamburgerButton || !orbCanvas ||
            !llmSelect || !systemPrompt || !aiSelect || !customAiId || !startSessionButton || 
            !gptControls || !oneMindControls || !voiceSelect) {
            throw new Error('Required DOM elements not found');
        }

        return {
            micButton,
            orbSelector,
            sizeSlider,
            sizeValue,
            baseColor,
            glowColor,
            pulseSpeed,
            pulseSpeedValue,
            minOpacity,
            minOpacityValue,
            maxOpacity,
            maxOpacityValue,
            bgGradientStart,
            bgGradientEnd,
            gradientBar,
            textInput,
            showChatCheckbox,
            chatOverlay,
            chatMessagesContainer,
            menu,
            hamburgerButton,
            orbCanvas,
            llmSelect,
            systemPrompt,
            aiSelect,
            customAiId,
            startSessionButton,
            gptControls,
            oneMindControls,
            voiceSelect
        };
    }

    public getElements(): DOMElements {
        return this.elements;
    }

    public updateBackgroundGradient(startColor: string, endColor: string): void {
        const gradient = `linear-gradient(to right, ${startColor}, ${endColor})`;
        document.body.style.background = gradient;
        this.elements.gradientBar.style.background = gradient;
    }
}
