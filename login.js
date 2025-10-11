// ELMA Water Technologies - Login System
// License codes for access control

// Valid license codes (in production, this would be server-side)
const VALID_LICENSES = [
    'ABH2025-C8N-MG3-2P9-XZ'
];

// Combine all valid licenses
const ALL_VALID_LICENSES = [...VALID_LICENSES];

// DOM elements
const licenseForm = document.getElementById('licenseForm');
const licenseInput = document.getElementById('licenseCode');
const loginButton = document.querySelector('.login-button');
const buttonText = document.querySelector('.button-text');
const buttonLoader = document.querySelector('.button-loader');
const errorMessage = document.getElementById('errorMessage');

// Format license code input (ABH2025-C8N-MG3-2P9-XZ format)
licenseInput.addEventListener('input', function(e) {
    let value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    let formattedValue = '';
    
    // Format: 7-3-3-3-2
    const segments = [7, 3, 3, 3, 2];
    let position = 0;
    
    for (let i = 0; i < segments.length && position < value.length; i++) {
        if (i > 0) formattedValue += '-';
        formattedValue += value.substr(position, segments[i]);
        position += segments[i];
    }
    
    e.target.value = formattedValue;
    
    // Clear error message when user starts typing
    if (errorMessage && !errorMessage.classList.contains('hidden')) {
        errorMessage.classList.add('hidden');
    }
});

// Handle form submission
licenseForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const licenseCode = licenseInput.value.trim();
    
    if (!licenseCode) {
        showError('Veuillez entrer un code de licence.');
        return;
    }
    
    // Show loading state
    showLoading();
    
    // Simulate API call delay
    setTimeout(() => {
        validateLicense(licenseCode);
    }, 1500);
});

// Show loading state
function showLoading() {
    loginButton.disabled = true;
    buttonText.style.opacity = '0';
    buttonLoader.classList.remove('hidden');
}

// Hide loading state
function hideLoading() {
    loginButton.disabled = false;
    buttonText.style.opacity = '1';
    buttonLoader.classList.add('hidden');
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    
    // Add shake animation to the card
    const loginCard = document.querySelector('.login-card');
    loginCard.style.animation = 'shake 0.5s ease-in-out';
    
    setTimeout(() => {
        loginCard.style.animation = '';
    }, 500);
}

// Validate license code
function validateLicense(licenseCode) {
    hideLoading();
    
    // Check if license code is valid
    if (ALL_VALID_LICENSES.includes(licenseCode)) {
        // Store license in sessionStorage for the main application
        sessionStorage.setItem('elma_license', licenseCode);
        sessionStorage.setItem('elma_license_valid', 'true');
        sessionStorage.setItem('elma_login_time', Date.now());
        
        // Show success animation
        showSuccess();
        
        // Redirect to main platform after success animation
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } else {
        showError('Code de licence invalide. Veuillez vérifier et réessayer.');
        
        // Clear the input
        setTimeout(() => {
            licenseInput.value = '';
            licenseInput.focus();
        }, 500);
    }
}

// Show success state
// Show success state
function showSuccess() {
    loginButton.style.background = 'rgba(16, 185, 129, 0.15)';
    loginButton.style.borderColor = '#10b981';
    buttonText.textContent = 'Accès Autorisé ✓';
    
    // Add success animation to the card
    const loginCard = document.querySelector('.login-card');
    loginCard.style.transform = 'scale(1.02)';
    loginCard.style.boxShadow = '0 40px 80px rgba(16, 185, 129, 0.2)';
    
    setTimeout(() => {
        loginCard.style.transform = 'scale(1)';
    }, 300);
}

// Add shake animation CSS
const shakeKeyframes = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
}
`;

// Add the shake animation to the document
const styleSheet = document.createElement('style');
styleSheet.textContent = shakeKeyframes;
document.head.appendChild(styleSheet);

// Check if user is already logged in (when page loads)
document.addEventListener('DOMContentLoaded', function() {
    const isValid = sessionStorage.getItem('elma_license_valid');
    const loginTime = sessionStorage.getItem('elma_login_time');
    
    // Check if license is still valid (24 hours)
    if (isValid === 'true' && loginTime) {
        const timeElapsed = Date.now() - parseInt(loginTime);
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        if (timeElapsed < twentyFourHours) {
            // Still valid, redirect to main platform
            window.location.href = 'index.html';
            return;
        } else {
            // License expired, clear storage
            sessionStorage.removeItem('elma_license');
            sessionStorage.removeItem('elma_license_valid');
            sessionStorage.removeItem('elma_login_time');
        }
    }
    
    // Focus on license input
    licenseInput.focus();
});

// Console log for developers (show valid licenses in development)
console.log('🔐 ELMA Water Technologies - Access Control');
console.log('📋 Valid License Code:');
VALID_LICENSES.forEach(license => console.log(`   • ${license}`));
console.log('⏰ License Duration: 24 hours');
console.log('💡 Enter the license code to access the platform');

// Prevent common developer shortcuts
document.addEventListener('keydown', function(e) {
    // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
        console.log('🔒 Developer tools disabled for security');
        return false;
    }
});

// Disable right-click context menu
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
});
