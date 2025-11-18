/**
 * ELMA Platform Onboarding Guide
 * Simple, elegant step-by-step tutorial for first-time users
 */

class OnboardingGuide {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.hasSeenGuide = localStorage.getItem('elma_hasSeenGuide') === 'true';
        
        // Define tutorial steps
        this.steps = [
            {
                element: '.region-selector',
                title: 'Sélection de région',
                content: 'Choisissez la zone géographique que vous souhaitez explorer. Chaque région contient des données spécifiques sur les bassins et nappes.',
                position: 'right'
            },
            {
                element: '#map',
                title: 'Carte interactive',
                content: 'Explorez la carte interactive pour visualiser les bassins et points d\'analyse. Utilisez le zoom et le déplacement pour naviguer.',
                position: 'center'
            },
            {
                element: '.data-layers',
                title: 'Couches de données',
                content: 'Activez ou désactivez l’affichage de la délimitation des bassins, et de l’emplacement des bassins d’irrigation selon vos besoins.',
                position: 'right'
            },
            {
                element: '.stats-panel',
                title: 'Indicateurs clés',
                content: 'Ces indicateurs se mettent à jour automatiquement en fonction de la zone visible sur la carte. Suivez la superficie, le nombre de bassins et leur évolution.',
                position: 'left'
            },
            {
                element: '.analytics-button',
                title: 'Analytics avancés',
                content: 'Accédez à des graphiques détaillés et des analyses approfondies des données hydrologiques et météorologiques.',
                position: 'bottom'
            }
        ];
        
        this.init();
    }
    
    init() {
        if (this.hasSeenGuide) {
            return; // Don't show guide if user has already seen it
        }
        
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createElements());
        } else {
            this.createElements();
        }
    }
    
    createElements() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'onboarding-overlay';
        
        // Create spotlight
        this.spotlight = document.createElement('div');
        this.spotlight.className = 'onboarding-spotlight';
        
        // Create tooltip
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'onboarding-tooltip';
        
        // Create welcome screen
        this.welcomeScreen = this.createWelcomeScreen();
        
        // Append to body
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.spotlight);
        document.body.appendChild(this.tooltip);
        document.body.appendChild(this.welcomeScreen);
        
        // Show welcome screen after a short delay
        setTimeout(() => this.showWelcome(), 500);
    }
    
    createWelcomeScreen() {
        const welcome = document.createElement('div');
        welcome.className = 'onboarding-welcome';
        welcome.innerHTML = `
            <h2 class="onboarding-welcome-title">Bienvenue sur ELMA AquaDetect</h2>
            <p class="onboarding-welcome-subtitle">
                Découvrez comment utiliser la plateforme de gestion des ressources en eau en quelques étapes simples.
            </p>
            <div class="onboarding-welcome-actions">
                <button class="onboarding-btn onboarding-btn-skip" id="onboarding-skip-welcome">
                    Passer
                </button>
                <button class="onboarding-btn onboarding-btn-next" id="onboarding-start">
                    Commencer
                </button>
            </div>
        `;
        
        // Add event listeners
        welcome.querySelector('#onboarding-skip-welcome').addEventListener('click', () => this.skipGuide());
        welcome.querySelector('#onboarding-start').addEventListener('click', () => this.startTour());
        
        return welcome;
    }
    
    showWelcome() {
        this.overlay.classList.add('active');
        setTimeout(() => this.welcomeScreen.classList.add('active'), 100);
    }
    
    startTour() {
        // Hide welcome screen
        this.welcomeScreen.classList.remove('active');
        setTimeout(() => {
            this.welcomeScreen.style.display = 'none';
            this.isActive = true;
            this.showStep(0);
        }, 300);
    }
    
    showStep(stepIndex) {
        if (stepIndex >= this.steps.length) {
            this.complete();
            return;
        }
        
        this.currentStep = stepIndex;
        const step = this.steps[stepIndex];
        const element = document.querySelector(step.element);
        
        if (!element) {
            console.warn(`Element not found: ${step.element}`);
            this.nextStep();
            return;
        }
        
        // Position spotlight
        this.positionSpotlight(element);
        
        // Update tooltip content
        this.updateTooltip(step, stepIndex);
        
        // Position tooltip
        this.positionTooltip(element, step.position);
        
        // Show tooltip
        setTimeout(() => this.tooltip.classList.add('active'), 100);
    }
    
    positionSpotlight(element) {
        const rect = element.getBoundingClientRect();
        const padding = 8;
        
        this.spotlight.style.top = `${rect.top - padding}px`;
        this.spotlight.style.left = `${rect.left - padding}px`;
        this.spotlight.style.width = `${rect.width + padding * 2}px`;
        this.spotlight.style.height = `${rect.height + padding * 2}px`;
        
        // Bring element to front
        element.style.position = 'relative';
        element.style.zIndex = '10000';
    }
    
    updateTooltip(step, stepIndex) {
        const isLastStep = stepIndex === this.steps.length - 1;
        this.tooltip.innerHTML = `
            <div class="onboarding-tooltip-header">
                <h3 class="onboarding-tooltip-title">${step.title}</h3>
                <span class="onboarding-step-counter">${stepIndex + 1}/${this.steps.length}</span>
            </div>
            <div class="onboarding-tooltip-content">
                ${step.content}
            </div>
            <div class="onboarding-tooltip-actions">
                <button class="onboarding-btn onboarding-btn-skip" id="onboarding-skip">
                    Passer
                </button>
                <button class="onboarding-btn onboarding-btn-next" id="onboarding-next">
                    ${isLastStep ? 'Terminer' : 'Suivant'}
                </button>
            </div>
            <div class="onboarding-dots">
                ${this.steps.map((_, i) => `
                    <div class="onboarding-dot ${i === stepIndex ? 'active' : ''}"></div>
                `).join('')}
            </div>
        `;
        
        // Add event listeners
        this.tooltip.querySelector('#onboarding-skip').addEventListener('click', () => this.skipGuide());
        this.tooltip.querySelector('#onboarding-next').addEventListener('click', () => this.nextStep());
    }
    
    positionTooltip(element, position) {
        const rect = element.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const margin = 20;
        
        let top, left;
        
        switch (position) {
            case 'right':
                top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                left = rect.right + margin;
                break;
            case 'left':
                top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                left = rect.left - tooltipRect.width - margin;
                break;
            case 'top':
                top = rect.top - tooltipRect.height - margin;
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'bottom':
                top = rect.bottom + margin;
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'center':
                top = window.innerHeight / 2 - tooltipRect.height / 2;
                left = window.innerWidth / 2 - tooltipRect.width / 2;
                break;
        }
        
        // Ensure tooltip stays within viewport
        top = Math.max(20, Math.min(top, window.innerHeight - tooltipRect.height - 20));
        left = Math.max(20, Math.min(left, window.innerWidth - tooltipRect.width - 20));
        
        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;
    }
    
    nextStep() {
        this.tooltip.classList.remove('active');
        
        // Reset z-index of current element
        const currentElement = document.querySelector(this.steps[this.currentStep].element);
        if (currentElement) {
            currentElement.style.zIndex = '';
        }
        
        setTimeout(() => {
            this.showStep(this.currentStep + 1);
        }, 300);
    }
    
    skipGuide() {
        this.complete();
    }
    
    complete() {
        // Mark guide as seen
        localStorage.setItem('elma_hasSeenGuide', 'true');
        this.hasSeenGuide = true;
        
        // Hide all elements
        this.overlay.classList.remove('active');
        this.tooltip.classList.remove('active');
        this.welcomeScreen.classList.remove('active');
        
        // Reset z-index of all elements
        this.steps.forEach(step => {
            const element = document.querySelector(step.element);
            if (element) {
                element.style.zIndex = '';
            }
        });
        
        // Remove elements after animation
        setTimeout(() => {
            if (this.overlay) this.overlay.remove();
            if (this.spotlight) this.spotlight.remove();
            if (this.tooltip) this.tooltip.remove();
            if (this.welcomeScreen) this.welcomeScreen.remove();
            this.isActive = false;
        }, 300);
    }
    
    // Public method to restart the guide
    static restart() {
        localStorage.removeItem('elma_hasSeenGuide');
        window.location.reload();
    }
}

// Initialize onboarding when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.onboardingGuide = new OnboardingGuide();
    });
} else {
    window.onboardingGuide = new OnboardingGuide();
}

// Expose restart method globally
window.restartOnboarding = () => OnboardingGuide.restart();

