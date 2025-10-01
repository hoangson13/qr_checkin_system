// Home page authentication functionality
import { getCookie } from './utils/utils-module.js';
import { showErrorDialog } from './components/dialog-utils.js';

async function saveSecretKey() {
    const key = document.getElementById('secretKey').value.trim();

    if (!key) {
        await showErrorDialog({
            title: 'Validation Error',
            message: 'Please enter secret key.'
        });
        return;
    }

    try {
        const response = await fetch('/ui/validate', {
            method: 'GET',
            headers: {
                'x-auth-secret-key': key
            }
        });
        
        const data = await response.json();
        
        if (data.role) {
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + 7);
            const cookieOptions = `; expires=${expirationDate.toUTCString()}; path=/`;
            
            document.cookie = `secretKey=${key}${cookieOptions}`;
            document.cookie = `role=${data.role}${cookieOptions}`;
            
            window.location.href = '/ui/users';
        } else {
            await showErrorDialog({
                title: 'Authentication Failed',
                message: 'Invalid secret key!'
            });
        }
    } catch (error) {
        console.error('Validation error:', error);
        await showErrorDialog({
            title: 'Validation Error',
            message: 'Error validating key: ' + error.message
        });
    }
}

// Load saved credentials on page load
function loadSavedCredentials() {
    const savedKey = getCookie("secretKey");
    if (savedKey) {
        document.getElementById('secretKey').value = savedKey;
    }
}

// Setup event listeners
function setupEventListeners() {
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', saveSecretKey);
    }
    
    // Add Enter key support for form submission
    const form = document.querySelector('.login-container');
    form.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveSecretKey();
        }
    });
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadSavedCredentials();
    setupEventListeners();
});