// Check-in Scanner JavaScript Module
// Handles QR code scanning and check-in functionality

import { formatDate } from './utils/utils-module.js';
import { showSuccessToast } from './components/dialog-utils.js';
import { checkinUser } from './api/checkin-api.js';

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
    requestPermissionBtn: document.getElementById('requestPermissionBtn'),
    permissionRow: document.getElementById('permissionRow'),
    
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
    elements.requestPermissionBtn.addEventListener('click', handlePermissionRequest);
    
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
        // Check browser compatibility first
        if (!checkBrowserSupport()) {
            return;
        }
        
        updateCameraStatus('Checking camera permissions...', 'loading');
        
        // Check and request camera permission
        const permissionGranted = await checkAndRequestCameraPermission();
        if (!permissionGranted) {
            return;
        }
        
        updateCameraStatus('Requesting camera access...', 'loading');
        
        // Get available cameras
        await getAvailableCameras();
        
        // Start with the preferred camera (back camera if available)
        await startCamera();
        
    } catch (error) {
        console.error('Failed to initialize camera:', error);
        updateCameraStatus('Camera access denied', 'error');
        
        let errorMessage = 'Unable to access camera. Please check permissions and try again.';
        if (error.message) {
            errorMessage = error.message;
        }
        
        showError('Camera Error', errorMessage);
    }
}

function checkBrowserSupport() {
    // Check for required APIs
    if (!navigator.mediaDevices) {
        updateCameraStatus('MediaDevices API not supported', 'error');
        showError('Browser Compatibility', 
            'Your browser does not support camera access. Please use a modern browser like Chrome, Firefox, Safari, or Edge.');
        return false;
    }
    
    if (!navigator.mediaDevices.getUserMedia) {
        updateCameraStatus('getUserMedia not supported', 'error');
        showError('Browser Compatibility', 
            'Your browser does not support camera access. Please update your browser to the latest version.');
        return false;
    }
    
    if (!window.isSecureContext) {
        updateCameraStatus('Insecure context', 'error');
        showError('Security Error', 
            'Camera access requires a secure connection (HTTPS). Please access the site using HTTPS or localhost.');
        return false;
    }
    
    // Check for jsQR library
    if (typeof jsQR === 'undefined') {
        updateCameraStatus('QR library not loaded', 'error');
        showError('Library Error', 
            'QR code scanning library is not loaded. Please refresh the page.');
        return false;
    }
    
    return true;
}

// Camera Permission Functions
async function checkAndRequestCameraPermission() {
    try {
        // First check if Permissions API is supported
        if ('permissions' in navigator) {
            const permission = await navigator.permissions.query({ name: 'camera' });
            
            switch (permission.state) {
                case 'granted':
                    updateCameraStatus('Camera permission granted', 'success');
                    updatePermissionStatus('granted');
                    return true;
                    
                case 'denied':
                    updateCameraStatus('Camera permission denied', 'error');
                    updatePermissionStatus('denied');
                    showCameraPermissionError('denied');
                    return false;
                    
                case 'prompt':
                    updateCameraStatus('Requesting camera permission...', 'loading');
                    updatePermissionStatus('prompt');
                    return await requestCameraPermission();
                    
                default:
                    // Fallback to direct request
                    return await requestCameraPermission();
            }
        } else {
            // Permissions API not supported, try direct request
            updateCameraStatus('Requesting camera permission...', 'loading');
            return await requestCameraPermission();
        }
    } catch (error) {
        console.error('Permission check failed:', error);
        // Fallback to direct camera request
        return await requestCameraPermission();
    }
}

async function requestCameraPermission() {
    try {
        // Request minimal camera access to check permission
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 320 }, 
                height: { ideal: 240 } 
            } 
        });
        
        // Permission granted - stop the stream immediately
        stream.getTracks().forEach(track => track.stop());
        
        updateCameraStatus('Camera permission granted', 'success');
        updatePermissionStatus('granted');
        return true;
        
    } catch (error) {
        console.error('Camera permission request failed:', error);
        
        if (error.name === 'NotAllowedError') {
            updateCameraStatus('Camera permission denied', 'error');
            updatePermissionStatus('denied');
            showCameraPermissionError('denied');
        } else if (error.name === 'NotFoundError') {
            updateCameraStatus('No camera found', 'error');
            updatePermissionStatus('denied');
            showCameraPermissionError('no-camera');
        } else if (error.name === 'NotSupportedError') {
            updateCameraStatus('Camera not supported', 'error');
            updatePermissionStatus('denied');
            showCameraPermissionError('not-supported');
        } else {
            updateCameraStatus('Camera permission failed', 'error');
            updatePermissionStatus('denied');
            showCameraPermissionError('unknown', error.message);
        }
        
        return false;
    }
}

function showCameraPermissionError(type, customMessage = '') {
    let title = 'Camera Permission Required';
    let message = '';
    let showButton = false;
    
    switch (type) {
        case 'denied':
            title = 'Camera Access Denied';
            message = `Camera permission has been denied. To use the QR scanner:
            
1. Look for a camera icon in your browser's address bar
2. Click it and select "Allow" for camera access
3. Refresh this page

Or use the "Request Camera Permission" button below to try again.`;
            showButton = true;
            break;
            
        case 'no-camera':
            title = 'No Camera Found';
            message = 'No camera was detected on your device. Please make sure a camera is connected and try again.';
            break;
            
        case 'not-supported':
            title = 'Camera Not Supported';
            message = 'Camera access is not supported by your browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge.';
            break;
            
        default:
            title = 'Camera Error';
            message = customMessage || 'An error occurred while accessing the camera. Please check your browser settings and try again.';
            showButton = true;
            break;
    }
    
    // Show or hide permission button based on error type
    showPermissionButton(showButton);
    
    showError(title, message);
}

async function checkCameraPermissionStatus() {
    if ('permissions' in navigator) {
        try {
            const permission = await navigator.permissions.query({ name: 'camera' });
            return permission.state;
        } catch (error) {
            console.error('Failed to check camera permission:', error);
            return 'unknown';
        }
    }
    return 'unknown';
}

async function handlePermissionRequest() {
    try {
        elements.requestPermissionBtn.disabled = true;
        elements.requestPermissionBtn.innerHTML = '<div class="spinner-border spinner-border-sm me-2" role="status"></div>Requesting...';
        
        const granted = await requestCameraPermission();
        
        if (granted) {
            elements.permissionRow.style.display = 'none';
            showSuccessToast('Camera permission granted! You can now start the camera.');
            // Auto-start camera after permission is granted
            setTimeout(() => {
                if (!cameraStream) {
                    startCamera();
                }
            }, 1000);
        }
    } catch (error) {
        console.error('Permission request error:', error);
    } finally {
        elements.requestPermissionBtn.disabled = false;
        elements.requestPermissionBtn.innerHTML = '<i class="bi bi-shield-exclamation me-1"></i>Request Camera Permission';
    }
}

function showPermissionButton(show = true) {
    if (elements.permissionRow) {
        elements.permissionRow.style.display = show ? 'block' : 'none';
    }
}

function updatePermissionStatus(status) {
    switch (status) {
        case 'granted':
            showPermissionButton(false);
            break;
        case 'denied':
            showPermissionButton(true);
            break;
        case 'prompt':
            showPermissionButton(true);
            break;
        default:
            showPermissionButton(false);
            break;
    }
}

async function getAvailableCameras() {
    try {
        // Check if MediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            throw new Error('MediaDevices API is not supported in this browser or context');
        }
        
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
        
        // Check if MediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera access is not supported in this browser or context. Please ensure you are using HTTPS and a modern browser.');
        }
        
        // Check if we're in a secure context
        if (!window.isSecureContext) {
            throw new Error('Camera access requires a secure context (HTTPS). Please access the site using HTTPS.');
        }
        
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
        
        // Provide more specific error messages
        let errorMessage = error.message || 'Failed to start camera';
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Camera access was denied. Please allow camera access and refresh the page.';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'No camera was found on this device.';
        } else if (error.name === 'NotSupportedError') {
            errorMessage = 'Camera is not supported in this browser.';
        }
        
        showError('Camera Error', errorMessage);
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
    try {
        if (cameraStream) {
            stopCamera();
        } else {
            // Re-check browser support before starting
            if (!checkBrowserSupport()) {
                return;
            }
            
            // Check permission again before starting
            updateCameraStatus('Checking camera permissions...', 'loading');
            const permissionGranted = await checkAndRequestCameraPermission();
            if (!permissionGranted) {
                return;
            }
            
            await startCamera();
        }
    } catch (error) {
        console.error('Error toggling camera:', error);
        updateCameraStatus('Camera toggle failed', 'error');
        showError('Camera Error', error.message || 'Failed to toggle camera');
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
        // Perform check-in - API returns user info in result.data
        const result = await checkinUser(userId);
        
        // Show success modal with user data from check-in result
        showCheckinResult(result.data,  true);
        
    } catch (error) {
        console.error('Check-in error:', error);
        showError('Check-in Failed', error.message || 'Unknown user or check-in failed');
    }
}

// UI Functions
function showCheckinResult(user, success, errorMessage = null) {
    // Update modal header
    if (success) {
        elements.checkinModalHeader.className = 'modal-header';
        elements.checkinModalLabel.innerHTML = `
            <i class="bi bi-check-circle me-2 text-success"></i>
            ${user.is_checked_in ? 'Checked In' : 'Checked Out'}
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
    if (success && user) {
        const isCheckedIn = user.is_checked_in;
        elements.statusBadge.className = `status-badge ${isCheckedIn ? 'checked-in' : 'checked-out'}`;
        elements.statusBadge.textContent = isCheckedIn ? 'Checked In' : 'Checked Out';

        elements.checkinTime.textContent = formatDate(user.check_in_time || new Date().toISOString());
        elements.checkinStatus.textContent = user.is_checked_in ? 'Present' : 'Left';
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