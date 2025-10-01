// Check-in Scanner JavaScript Module
// Handles QR code scanning and check-in functionality

import { formatDate } from './utils/utils-module.js';
import { showSuccessToast, showErrorToast } from './components/dialog-utils.js';
import { checkinUser, getUserById } from './api/checkin-api.js';

// Global variables
let cameraStream = null;
let isScanning = false;
let animationFrame = null;
let currentCameraIndex = 0;
let availableCameras = [];

// DOM elements
const elements = {
    // Camera elements
    cameraPreview: document.getElementById('cameraPreview'),
    scannerCanvas: document.getElementById('scannerCanvas'),
    cameraStatus: document.getElementById('cameraStatus'),
    
    // Scanner elements
    scannerFrame: document.querySelector('.scanner-frame'),
    
    // Control buttons
    toggleCameraBtn: document.getElementById('toggleCameraBtn'),
    switchCameraBtn: document.getElementById('switchCameraBtn'),
    
    // Modals
    checkinModal: document.getElementById('checkinModal'),
    checkinModalHeader: document.getElementById('checkinModalHeader'),
    checkinModalLabel: document.getElementById('checkinModalLabel'),
    errorModal: document.getElementById('errorModal'),
    errorMessage: document.getElementById('errorMessage'),
    errorDetails: document.getElementById('errorDetails'),
    
    // Check-in result elements
    userName: document.getElementById('userName'),
    userDetails: document.getElementById('userDetails'),
    userAvatar: document.getElementById('userAvatar'),
    statusBadge: document.getElementById('statusBadge'),
    checkinTime: document.getElementById('checkinTime'),
    checkinStatus: document.getElementById('checkinStatus')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    initializeCamera();
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    stopCamera();
});

// Event Listeners
function initializeEventListeners() {
    // Camera controls
    elements.toggleCameraBtn.addEventListener('click', toggleCamera);
    elements.switchCameraBtn.addEventListener('click', switchCamera);
    
    // Modal events
    elements.checkinModal.addEventListener('hidden.bs.modal', () => {
        // Resume scanning after modal closes
        setTimeout(() => {
            if (cameraStream && !isScanning) {
                startScanning();
            }
        }, 500);
    });
    
    elements.errorModal.addEventListener('hidden.bs.modal', () => {
        // Resume scanning after error modal closes
        setTimeout(() => {
            if (cameraStream && !isScanning) {
                startScanning();
            }
        }, 500);
    });
}

// Camera Functions
async function initializeCamera() {
    try {
        updateCameraStatus('Requesting camera access...', 'loading');
        
        // Get available cameras
        await getAvailableCameras();
        
        // Start with the preferred camera (back camera if available)
        await startCamera();
        
    } catch (error) {
        console.error('Failed to initialize camera:', error);
        updateCameraStatus('Camera access denied', 'error');
        showError('Camera Error', 'Unable to access camera. Please check permissions and try again.');
    }
}

async function getAvailableCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        availableCameras = devices.filter(device => device.kind === 'videoinput');
        
        // Prefer back camera for mobile devices
        const backCameraIndex = availableCameras.findIndex(camera => 
            camera.label.toLowerCase().includes('back') || 
            camera.label.toLowerCase().includes('rear') ||
            camera.label.toLowerCase().includes('environment')
        );
        
        if (backCameraIndex !== -1) {
            currentCameraIndex = backCameraIndex;
        }
        
        // Enable/disable switch camera button
        elements.switchCameraBtn.disabled = availableCameras.length <= 1;
        
    } catch (error) {
        console.error('Failed to enumerate cameras:', error);
        availableCameras = [];
    }
}

async function startCamera() {
    try {
        // Stop existing stream
        stopCamera();
        
        updateCameraStatus('Starting camera...', 'loading');
        
        const constraints = {
            video: {
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
                facingMode: availableCameras.length > 0 ? undefined : 'environment'
            }
        };
        
        // Use specific camera if available
        if (availableCameras.length > 0 && availableCameras[currentCameraIndex]) {
            constraints.video.deviceId = { exact: availableCameras[currentCameraIndex].deviceId };
        }
        
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        elements.cameraPreview.srcObject = cameraStream;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
            elements.cameraPreview.onloadedmetadata = resolve;
        });
        
        updateCameraStatus('Camera ready', 'success');
        elements.toggleCameraBtn.innerHTML = '<i class="bi bi-camera-video-off me-1"></i>Stop Camera';
        
        // Start scanning
        startScanning();
        
    } catch (error) {
        console.error('Failed to start camera:', error);
        updateCameraStatus('Camera failed to start', 'error');
        showError('Camera Error', error.message || 'Failed to start camera');
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    stopScanning();
    elements.cameraPreview.srcObject = null;
    updateCameraStatus('Camera stopped', 'error');
    elements.toggleCameraBtn.innerHTML = '<i class="bi bi-camera-video me-1"></i>Start Camera';
}

async function toggleCamera() {
    if (cameraStream) {
        stopCamera();
    } else {
        await startCamera();
    }
}

async function switchCamera() {
    if (availableCameras.length > 1) {
        currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
        await startCamera();
        showSuccessToast(`Switched to ${availableCameras[currentCameraIndex].label || 'Camera ' + (currentCameraIndex + 1)}`);
    }
}

function updateCameraStatus(message, type = 'loading') {
    elements.cameraStatus.textContent = message;
    elements.cameraStatus.className = `camera-status ${type}`;
    
    if (type === 'loading') {
        elements.cameraStatus.innerHTML = `
            <div class="spinner-border spinner-border-sm me-2" role="status"></div>
            ${message}
        `;
    }
}

// Scanning Functions
function startScanning() {
    if (!cameraStream || isScanning) return;
    
    isScanning = true;
    elements.scannerFrame.classList.add('scanning');
    scanForQRCode();
}

function stopScanning() {
    isScanning = false;
    elements.scannerFrame.classList.remove('scanning', 'success', 'error');
    
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
}

function scanForQRCode() {
    if (!isScanning || !cameraStream) return;
    
    const canvas = elements.scannerCanvas;
    const context = canvas.getContext('2d');
    const video = elements.cameraPreview;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    if (video.videoWidth > 0 && video.videoHeight > 0) {
        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get image data for QR code detection
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Scan for QR code
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (qrCode) {
            handleQRCodeDetected(qrCode.data);
            return;
        }
    }
    
    // Continue scanning
    animationFrame = requestAnimationFrame(scanForQRCode);
}

async function handleQRCodeDetected(qrData) {
    // Stop scanning temporarily
    stopScanning();
    elements.scannerFrame.classList.add('success');
    
    try {
        // Extract user ID from QR code data
        const userId = extractUserIdFromQR(qrData);
        
        if (!userId) {
            throw new Error('Invalid QR code format');
        }
        
        // Perform check-in
        await performCheckin(userId);
        
    } catch (error) {
        console.error('QR code processing error:', error);
        elements.scannerFrame.classList.remove('success');
        elements.scannerFrame.classList.add('error');
        
        showError('Scan Error', error.message || 'Failed to process QR code');
        
        // Resume scanning after error
        setTimeout(() => {
            if (cameraStream) {
                elements.scannerFrame.classList.remove('error');
                startScanning();
            }
        }, 2000);
    }
}

function extractUserIdFromQR(qrData) {
    try {
        // Try parsing as JSON first
        const parsed = JSON.parse(qrData);
        return parsed.user_id || parsed.id || parsed._id;
    } catch {
        // If not JSON, treat as plain user ID
        return qrData.trim();
    }
}

async function performCheckin(userId) {
    try {
        // Get user details first for verification
        const user = await getUserById(userId);
        
        // Perform check-in
        const result = await checkinUser(userId);
        
        // Show success modal
        showCheckinResult(user, result, true);
        
    } catch (error) {
        console.error('Check-in error:', error);
        
        // Try to get user info even if check-in failed
        try {
            const user = await getUserById(userId);
            showCheckinResult(user, null, false, error.message);
        } catch (userError) {
            showError('Check-in Failed', error.message || 'Unknown user or check-in failed');
        }
    }
}

// UI Functions
function showCheckinResult(user, result, success, errorMessage = null) {
    // Update modal header
    if (success) {
        elements.checkinModalHeader.className = 'modal-header';
        elements.checkinModalLabel.innerHTML = `
            <i class="bi bi-check-circle me-2 text-success"></i>
            ${result.action === 'check-in' ? 'Checked In' : 'Checked Out'}
        `;
    } else {
        elements.checkinModalHeader.className = 'modal-header bg-danger text-white';
        elements.checkinModalLabel.innerHTML = `
            <i class="bi bi-x-circle me-2"></i>Check-in Failed
        `;
    }
    
    // Update user info
    elements.userName.textContent = user.name || 'Unknown User';
    elements.userDetails.textContent = `${user.title || 'No title'} • ${user.department || 'No department'}`;
    
    // Update avatar
    const initial = (user.name || 'U').charAt(0).toUpperCase();
    elements.userAvatar.innerHTML = initial;
    
    // Update status badge
    if (success && result) {
        const isCheckedIn = result.action === 'check-in';
        elements.statusBadge.className = `status-badge ${isCheckedIn ? 'checked-in' : 'checked-out'}`;
        elements.statusBadge.textContent = isCheckedIn ? 'Checked In' : 'Checked Out';
        
        elements.checkinTime.textContent = formatDate(result.timestamp || new Date().toISOString());
        elements.checkinStatus.textContent = result.action === 'check-in' ? 'Present' : 'Left';
    } else {
        elements.statusBadge.className = 'status-badge error';
        elements.statusBadge.textContent = 'Error';
        
        elements.checkinTime.textContent = formatDate(new Date().toISOString());
        elements.checkinStatus.textContent = errorMessage || 'Failed';
    }
    
    // Show modal
    const modal = new bootstrap.Modal(elements.checkinModal);
    modal.show();
}

function showError(title, message) {
    elements.errorMessage.textContent = title;
    elements.errorDetails.textContent = message;
    
    const modal = new bootstrap.Modal(elements.errorModal);
    modal.show();
}



// Utility Functions
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}