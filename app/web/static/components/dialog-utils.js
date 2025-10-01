// Dialog utilities module
// Provides reusable dialog components for the application

/**
 * Shows a customizable confirmation dialog
 * @param {Object} options - Configuration options for the dialog
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Dialog message (supports HTML)
 * @param {string} [options.confirmText='Confirm'] - Text for confirm button
 * @param {string} [options.cancelText='Cancel'] - Text for cancel button
 * @param {string} [options.confirmClass='btn-primary'] - CSS class for confirm button
 * @param {string} [options.cancelClass='btn-outline-secondary'] - CSS class for cancel button
 * @param {string} [options.icon='fas fa-question-circle'] - Icon class for the dialog
 * @param {string} [options.iconColor='#007bff'] - Color for the icon
 * @param {boolean} [options.dangerous=false] - Whether this is a dangerous action (uses warning styling)
 * @param {number} [options.maxWidth=400] - Maximum width of the dialog in pixels
 * @returns {Promise<boolean>} - Promise that resolves to true if confirmed, false if cancelled
 */
export function showConfirmationDialog(options) {
    const {
        title,
        message,
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        confirmClass = 'btn-primary',
        cancelClass = 'btn-outline-secondary',
        icon = 'fas fa-question-circle',
        iconColor = '#007bff',
        dangerous = false,
        maxWidth = 400
    } = options;

    // Apply dangerous action styling if specified
    const finalConfirmClass = dangerous ? 'btn-danger' : confirmClass;
    const finalIcon = dangerous ? 'fas fa-exclamation-triangle' : icon;
    const finalIconColor = dangerous ? '#dc3545' : iconColor;

    return new Promise((resolve) => {
        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'custom-dialog-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            animation: fadeIn 0.2s ease-out;
        `;

        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'custom-dialog-modal';
        modal.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 24px;
            max-width: ${maxWidth}px;
            width: 90%;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            text-align: center;
            animation: slideIn 0.3s ease-out;
            transform-origin: center;
        `;

        modal.innerHTML = `
            <div class="dialog-header" style="margin-bottom: 16px;">
                <h4 style="margin: 0; color: ${finalIconColor}; display: flex; align-items: center; justify-content: center; font-weight: 600;">
                    <i class="${finalIcon}" style="margin-right: 8px; font-size: 1.2em;"></i>
                    ${title}
                </h4>
            </div>
            <div class="dialog-body" style="margin-bottom: 24px;">
                <div style="color: #6c757d; line-height: 1.5; font-size: 0.95em;">${message}</div>
            </div>
            <div class="dialog-footer" style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                <button class="btn ${cancelClass} dialog-cancel-btn" style="padding: 10px 24px; min-width: 80px;">
                    ${cancelText}
                </button>
                <button class="btn ${finalConfirmClass} dialog-confirm-btn" style="padding: 10px 24px; min-width: 80px;">
                    ${confirmText}
                </button>
            </div>
        `;

        // Add CSS animations if not already present
        addDialogAnimations();

        // Get button references
        const cancelBtn = modal.querySelector('.dialog-cancel-btn');
        const confirmBtn = modal.querySelector('.dialog-confirm-btn');

        // Cleanup function
        function cleanup() {
            backdrop.style.animation = 'fadeOut 0.2s ease-out';
            modal.style.animation = 'slideOut 0.2s ease-out';
            setTimeout(() => {
                if (backdrop.parentNode) {
                    backdrop.remove();
                }
            }, 200);
        }

        // Event handlers
        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve(false);
        });

        confirmBtn.addEventListener('click', () => {
            cleanup();
            resolve(true);
        });

        // Close on backdrop click
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                cleanup();
                resolve(false);
            }
        });

        // Close on escape key
        function handleEscape(e) {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', handleEscape);
                resolve(false);
            }
        }
        document.addEventListener('keydown', handleEscape);

        // Add to DOM
        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        // Focus management - focus cancel button by default for safety
        setTimeout(() => {
            if (dangerous) {
                cancelBtn.focus(); // Focus cancel for dangerous actions
            } else {
                confirmBtn.focus(); // Focus confirm for regular actions
            }
        }, 100);
    });
}

/**
 * Shows an information dialog
 * @param {Object} options - Configuration options
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Dialog message
 * @param {string} [options.buttonText='OK'] - Text for the OK button
 * @param {string} [options.buttonClass='btn-primary'] - CSS class for the button
 * @param {string} [options.icon='fas fa-info-circle'] - Icon class
 * @param {string} [options.iconColor='#17a2b8'] - Icon color
 * @returns {Promise<void>} - Promise that resolves when dialog is closed
 */
export function showInfoDialog(options) {
    const {
        title,
        message,
        buttonText = 'OK',
        buttonClass = 'btn-primary',
        icon = 'fas fa-info-circle',
        iconColor = '#17a2b8'
    } = options;

    return new Promise((resolve) => {
        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'custom-dialog-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            animation: fadeIn 0.2s ease-out;
        `;

        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'custom-dialog-modal';
        modal.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            text-align: center;
            animation: slideIn 0.3s ease-out;
        `;

        modal.innerHTML = `
            <div class="dialog-header" style="margin-bottom: 16px;">
                <h4 style="margin: 0; color: ${iconColor}; display: flex; align-items: center; justify-content: center; font-weight: 600;">
                    <i class="${icon}" style="margin-right: 8px; font-size: 1.2em;"></i>
                    ${title}
                </h4>
            </div>
            <div class="dialog-body" style="margin-bottom: 24px;">
                <div style="color: #6c757d; line-height: 1.5; font-size: 0.95em;">${message}</div>
            </div>
            <div class="dialog-footer" style="display: flex; justify-content: center;">
                <button class="btn ${buttonClass} dialog-ok-btn" style="padding: 10px 24px; min-width: 80px;">
                    ${buttonText}
                </button>
            </div>
        `;

        // Add CSS animations
        addDialogAnimations();

        // Get button reference
        const okBtn = modal.querySelector('.dialog-ok-btn');

        // Cleanup function
        function cleanup() {
            backdrop.style.animation = 'fadeOut 0.2s ease-out';
            modal.style.animation = 'slideOut 0.2s ease-out';
            setTimeout(() => {
                if (backdrop.parentNode) {
                    backdrop.remove();
                }
            }, 200);
        }

        // Event handlers
        okBtn.addEventListener('click', () => {
            cleanup();
            resolve();
        });

        // Close on backdrop click
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                cleanup();
                resolve();
            }
        });

        // Close on escape key
        function handleEscape(e) {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', handleEscape);
                resolve();
            }
        }
        document.addEventListener('keydown', handleEscape);

        // Add to DOM
        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        // Focus the OK button
        setTimeout(() => okBtn.focus(), 100);
    });
}

/**
 * Shows an error dialog
 * @param {Object} options - Configuration options
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Error message
 * @param {string} [options.buttonText='OK'] - Text for the OK button
 * @returns {Promise<void>} - Promise that resolves when dialog is closed
 */
export function showErrorDialog(options) {
    return showInfoDialog({
        ...options,
        buttonClass: 'btn-outline-danger',
        icon: 'fas fa-exclamation-circle',
        iconColor: '#dc3545'
    });
}

/**
 * Shows a success dialog
 * @param {Object} options - Configuration options
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Success message
 * @param {string} [options.buttonText='OK'] - Text for the OK button
 * @returns {Promise<void>} - Promise that resolves when dialog is closed
 */
export function showSuccessDialog(options) {
    return showInfoDialog({
        ...options,
        buttonClass: 'btn-outline-success',
        icon: 'fas fa-check-circle',
        iconColor: '#28a745'
    });
}

/**
 * Shows a warning dialog
 * @param {Object} options - Configuration options
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Warning message
 * @param {string} [options.buttonText='OK'] - Text for the OK button
 * @returns {Promise<void>} - Promise that resolves when dialog is closed
 */
export function showWarningDialog(options) {
    return showInfoDialog({
        ...options,
        buttonClass: 'btn-outline-warning',
        icon: 'fas fa-exclamation-triangle',
        iconColor: '#ffc107'
    });
}

/**
 * Helper function to add CSS animations for dialogs (only adds once)
 */
function addDialogAnimations() {
    // Check if animations are already added
    if (document.querySelector('#dialog-animations')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'dialog-animations';
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        
        @keyframes slideIn {
            from { 
                opacity: 0;
                transform: scale(0.9) translateY(-20px);
            }
            to { 
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }
        
        @keyframes slideOut {
            from { 
                opacity: 1;
                transform: scale(1) translateY(0);
            }
            to { 
                opacity: 0;
                transform: scale(0.9) translateY(-20px);
            }
        }
        
        .custom-dialog-backdrop {
            backdrop-filter: blur(2px);
        }
        
        .custom-dialog-modal {
            position: relative;
        }
        
        .custom-dialog-modal .btn {
            transition: all 0.2s ease;
        }
        
        .custom-dialog-modal .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        .custom-dialog-modal .btn:active {
            transform: translateY(0);
        }
        
        @media (max-width: 480px) {
            .custom-dialog-modal {
                padding: 20px;
                margin: 20px;
            }
            
            .dialog-footer {
                flex-direction: column !important;
            }
            
            .dialog-footer .btn {
                width: 100%;
                margin: 4px 0 !important;
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Utility function for delete confirmation specifically
 * @param {string} itemName - Name of the item being deleted
 * @param {string} [itemType='item'] - Type of item (e.g., 'conversation', 'task', 'file')
 * @returns {Promise<boolean>} - Promise that resolves to true if confirmed
 */
export function showDeleteConfirmation(itemName, itemType = 'item') {
    return showConfirmationDialog({
        title: `Delete ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`,
        message: `Are you sure you want to delete "<strong>${itemName}</strong>"?<br><br>This action cannot be undone and will permanently remove this ${itemType}.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        dangerous: true,
        icon: 'fas fa-trash-alt'
    });
}

/**
 * Shows a success toast notification
 * @param {string} message - Success message to display
 * @param {number} [duration=3000] - How long to show the toast in milliseconds
 */
export function showSuccessToast(message, duration = 3000) {
    showToast(message, 'success', duration);
}

/**
 * Shows an error toast notification
 * @param {string} message - Error message to display
 * @param {number} [duration=5000] - How long to show the toast in milliseconds
 */
export function showErrorToast(message, duration = 5000) {
    showToast(message, 'error', duration);
}

/**
 * Shows an info toast notification
 * @param {string} message - Info message to display
 * @param {number} [duration=3000] - How long to show the toast in milliseconds
 */
export function showInfoToast(message, duration = 3000) {
    showToast(message, 'info', duration);
}

/**
 * Shows a warning toast notification
 * @param {string} message - Warning message to display
 * @param {number} [duration=4000] - How long to show the toast in milliseconds
 */
export function showWarningToast(message, duration = 4000) {
    showToast(message, 'warning', duration);
}

/**
 * Creates and shows a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast (success, error, info, warning)
 * @param {number} duration - How long to show the toast
 */
function showToast(message, type, duration) {
    // Ensure toast container exists
    let container = document.querySelector('.toast-notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    
    // Get type-specific styling
    const typeConfig = {
        success: {
            backgroundColor: '#d4edda',
            borderColor: '#c3e6cb',
            textColor: '#155724',
            icon: 'fas fa-check-circle'
        },
        error: {
            backgroundColor: '#f8d7da',
            borderColor: '#f5c6cb',
            textColor: '#721c24',
            icon: 'fas fa-exclamation-circle'
        },
        warning: {
            backgroundColor: '#fff3cd',
            borderColor: '#ffeaa7',
            textColor: '#856404',
            icon: 'fas fa-exclamation-triangle'
        },
        info: {
            backgroundColor: '#d1ecf1',
            borderColor: '#bee5eb',
            textColor: '#0c5460',
            icon: 'fas fa-info-circle'
        }
    };

    const config = typeConfig[type] || typeConfig.info;

    toast.style.cssText = `
        background-color: ${config.backgroundColor};
        border: 1px solid ${config.borderColor};
        color: ${config.textColor};
        padding: 12px 16px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 350px;
        min-width: 250px;
        font-size: 14px;
        line-height: 1.4;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        align-items: center;
        gap: 8px;
        pointer-events: auto;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s ease-out;
        cursor: pointer;
        position: relative;
        overflow: hidden;
    `;

    // Add progress bar for duration visualization
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background-color: ${config.textColor};
        opacity: 0.3;
        width: 100%;
        transform-origin: left;
        animation: toast-progress ${duration}ms linear forwards;
    `;

    toast.innerHTML = `
        <i class="${config.icon}" style="flex-shrink: 0; font-size: 16px;"></i>
        <span style="flex: 1;">${message}</span>
        <i class="fas fa-times" style="flex-shrink: 0; font-size: 12px; opacity: 0.7; margin-left: 8px;"></i>
    `;

    toast.appendChild(progressBar);

    // Add CSS for progress bar animation if not already present
    if (!document.querySelector('#toast-animations')) {
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.textContent = `
            @keyframes toast-progress {
                from { transform: scaleX(1); }
                to { transform: scaleX(0); }
            }
        `;
        document.head.appendChild(style);
    }

    // Add to container
    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    }, 10);

    // Auto remove after duration
    const timeoutId = setTimeout(() => {
        removeToast(toast);
    }, duration);

    // Click to dismiss
    toast.addEventListener('click', () => {
        clearTimeout(timeoutId);
        removeToast(toast);
    });

    // Remove empty container if no toasts left
    function removeToast(toastElement) {
        toastElement.style.transform = 'translateX(100%)';
        toastElement.style.opacity = '0';
        setTimeout(() => {
            if (toastElement.parentNode) {
                toastElement.parentNode.removeChild(toastElement);
            }
            // Remove container if empty
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }
}
