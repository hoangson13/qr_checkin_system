// Display Page JavaScript Module
// Handles welcome display for newly checked-in guests

import { formatDate } from './utils/utils-module.js';
import { connectWebSocket, disconnectWebSocket } from './api/websocket-api.js';
import { escapeHtml } from './utils/security.js';

// Global variables
let welcomeTimeout = null;
let clockInterval = null;

// DOM elements
const elements = {
    // Screens
    defaultScreen: document.getElementById('defaultScreen'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    
    // Connection status
    connectionStatus: document.getElementById('connectionStatus'),
    currentTime: document.getElementById('currentTime'),
    
    // Guest information
    guestName: document.getElementById('guestName'),
    guestTitle: document.getElementById('guestTitle'),
    guestDepartment: document.getElementById('guestDepartment'),
    guestSeat: document.getElementById('guestSeat'),
    seatNumber: document.getElementById('seatNumber'),
    checkinTime: document.getElementById('checkinTime')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeDisplay();
    initializeWebSocket();
    startClock();
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    disconnectWebSocket();
    stopClock();
    clearWelcomeTimeout();
});

// Display Functions
function initializeDisplay() {
    console.log('Display page initialized');
    
    // Show default screen initially
    showDefaultScreen();
    
    // Add keyboard shortcuts for testing/admin
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function handleKeyboardShortcuts(event) {
    // ESC key - return to default screen
    if (event.key === 'Escape') {
        showDefaultScreen();
    }
    
    // F11 key - toggle fullscreen
    if (event.key === 'F11') {
        event.preventDefault();
        toggleFullscreen();
    }
    
    // F5 key - refresh page
    if (event.key === 'F5') {
        event.preventDefault();
        window.location.reload();
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log('Error attempting to enable fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

// Clock Functions
function startClock() {
    updateClock();
    clockInterval = setInterval(updateClock, 1000);
}

function stopClock() {
    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
}

function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    const dateString = now.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    elements.currentTime.innerHTML = `
        <div>${timeString}</div>
        <small>${dateString}</small>
    `;
}

// WebSocket Functions
function initializeWebSocket() {
    // Define message handlers for different WebSocket actions
    const messageHandlers = {
        'new_checkin': (data) => {
            console.log('New checkin received:', data);
            handleNewCheckin(data);
        },
        'user_checkout': (data) => {
            console.log('User checkout received:', data);
            // Could show a different message for checkout if needed
            // handleCheckout(data);
        }
        // Add more display-specific message handlers here as needed
    };
    
    // Define connection event handlers
    const connectionHandlers = {
        onOpen: (event) => {
            console.log('WebSocket connected for display updates');
            updateConnectionStatus(true);
        },
        onClose: (event) => {
            console.log('Display page WebSocket connection closed:', event.code, event.reason);
            updateConnectionStatus(false);
        },
        onError: (error) => {
            console.error('Display page WebSocket error:', error);
            updateConnectionStatus(false);
        },
        onReconnect: (attempt) => {
            console.log(`Display page WebSocket reconnecting... (attempt ${attempt})`);
            updateConnectionStatus(false, `Reconnecting... (${attempt})`);
        }
    };
    
    // Connect to WebSocket with display-specific handlers
    connectWebSocket('/ws/checkin', messageHandlers, connectionHandlers);
}

function updateConnectionStatus(connected, message = null) {
    if (connected) {
        elements.connectionStatus.className = 'badge bg-success';
        elements.connectionStatus.innerHTML = '<i class="bi bi-wifi me-1"></i>Connected';
    } else {
        elements.connectionStatus.className = 'badge bg-danger';
        elements.connectionStatus.innerHTML = `<i class="bi bi-wifi-off me-1"></i>${message || 'Disconnected'}`;
    }
}

// Welcome Display Functions
function handleNewCheckin(data) {
    // Extract user data from the WebSocket message
    const userData = data.data;
    
    if (!userData) {
        console.warn('No user data in checkin message:', data);
        return;
    }
    
    console.log('Displaying welcome for user:', userData);
    showWelcomeScreen(userData);
}

function showWelcomeScreen(userData) {
    // Clear any existing timeout
    clearWelcomeTimeout();
    
    // Populate user information with safe HTML escaping
    elements.guestName.textContent = userData.name || 'Khách quý';
    elements.guestTitle.textContent = userData.title || 'Đại biểu';
    elements.guestDepartment.textContent = userData.department || 'Tổ chức';
    elements.seatNumber.textContent = userData.seat_number || '--';
    
    // Show current check-in time
    const now = new Date();
    elements.checkinTime.textContent = now.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Hide default screen with animation
    elements.defaultScreen.classList.add('screen-fade-out');
    
    setTimeout(() => {
        elements.defaultScreen.style.display = 'none';
        elements.welcomeScreen.style.display = 'block';
        elements.welcomeScreen.classList.remove('screen-fade-out');
        elements.welcomeScreen.classList.add('screen-fade-in');
        
        // Auto-return to default screen after 60 seconds
        welcomeTimeout = setTimeout(() => {
            showDefaultScreen();
        }, 60000);
    }, 500);
}

function showDefaultScreen() {
    // Clear any existing timeout
    clearWelcomeTimeout();
    
    // Hide welcome screen with animation
    if (elements.welcomeScreen.style.display !== 'none') {
        elements.welcomeScreen.classList.add('screen-fade-out');
        
        setTimeout(() => {
            elements.welcomeScreen.style.display = 'none';
            elements.defaultScreen.style.display = 'block';
            elements.defaultScreen.classList.remove('screen-fade-out');
            elements.defaultScreen.classList.add('screen-fade-in');
        }, 500);
    } else {
        // Already on default screen or initializing
        elements.welcomeScreen.style.display = 'none';
        elements.defaultScreen.style.display = 'block';
    }
}

function clearWelcomeTimeout() {
    if (welcomeTimeout) {
        clearTimeout(welcomeTimeout);
        welcomeTimeout = null;
    }
}

window.showDefault = function() {
    console.log('Returning to default screen');
    showDefaultScreen();
};

// Export functions for potential external use
export { showWelcomeScreen, showDefaultScreen, handleNewCheckin };