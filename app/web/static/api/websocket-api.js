// WebSocket API Module
// Provides reusable WebSocket functionality for real-time updates

import { getCookie } from '../utils/utils-module.js';

class WebSocketManager {
    constructor() {
        this.websocket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
        this.messageHandlers = new Map();
        this.connectionHandlers = {
            onOpen: null,
            onClose: null,
            onError: null,
            onReconnect: null
        };
    }

    /**
     * Initialize WebSocket connection
     * @param {string} endpoint - WebSocket endpoint (e.g., '/ws/checkin')
     * @param {Object} handlers - Event handlers for different message types
     * @param {Object} connectionHandlers - Connection event handlers
     */
    connect(endpoint = '/ws/checkin', handlers = {}, connectionHandlers = {}) {
        // Store handlers
        this.messageHandlers.clear();
        Object.entries(handlers).forEach(([action, handler]) => {
            this.messageHandlers.set(action, handler);
        });

        // Store connection handlers
        this.connectionHandlers = { ...this.connectionHandlers, ...connectionHandlers };

        // Close existing connection if any
        this.disconnect();

        try {
            // Determine WebSocket protocol based on current protocol
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}${endpoint}`;
            
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onopen = (event) => {
                console.log('WebSocket connected:', wsUrl);
                this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
                
                if (this.connectionHandlers.onOpen) {
                    this.connectionHandlers.onOpen(event);
                }
            };
            
            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('WebSocket message received:', data);
                    
                    // Handle message based on action type
                    if (data.action && this.messageHandlers.has(data.action)) {
                        const handler = this.messageHandlers.get(data.action);
                        handler(data);
                    } else {
                        // Default handler for unregistered actions
                        console.warn('No handler registered for action:', data.action);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
            
            this.websocket.onclose = (event) => {
                console.log('WebSocket connection closed:', event.code, event.reason);
                
                if (this.connectionHandlers.onClose) {
                    this.connectionHandlers.onClose(event);
                }
                
                // Attempt to reconnect if not manually closed and under retry limit
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`Attempting to reconnect WebSocket... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                    
                    setTimeout(() => {
                        if (!this.websocket || this.websocket.readyState === WebSocket.CLOSED) {
                            if (this.connectionHandlers.onReconnect) {
                                this.connectionHandlers.onReconnect(this.reconnectAttempts);
                            }
                            this.connect(endpoint, Object.fromEntries(this.messageHandlers), this.connectionHandlers);
                        }
                    }, this.reconnectDelay);
                } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    console.error('Max reconnection attempts reached. WebSocket connection failed.');
                }
            };
            
            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                
                if (this.connectionHandlers.onError) {
                    this.connectionHandlers.onError(error);
                }
            };
            
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            
            if (this.connectionHandlers.onError) {
                this.connectionHandlers.onError(error);
            }
        }
    }

    /**
     * Disconnect WebSocket
     * @param {number} code - Close code (default: 1000 for normal closure)
     * @param {string} reason - Close reason
     */
    disconnect(code = 1000, reason = 'Manual disconnect') {
        if (this.websocket) {
            this.websocket.close(code, reason);
            this.websocket = null;
        }
        this.reconnectAttempts = 0;
    }

    /**
     * Send message through WebSocket
     * @param {Object} message - Message to send
     */
    send(message) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket is not connected. Cannot send message:', message);
        }
    }

    /**
     * Check if WebSocket is connected
     * @returns {boolean} - Connection status
     */
    isConnected() {
        return this.websocket && this.websocket.readyState === WebSocket.OPEN;
    }

    /**
     * Get current WebSocket ready state
     * @returns {number} - WebSocket ready state
     */
    getReadyState() {
        return this.websocket ? this.websocket.readyState : WebSocket.CLOSED;
    }

    /**
     * Register a new message handler for a specific action
     * @param {string} action - Action type to handle
     * @param {function} handler - Handler function
     */
    addMessageHandler(action, handler) {
        this.messageHandlers.set(action, handler);
    }

    /**
     * Remove a message handler
     * @param {string} action - Action type to remove
     */
    removeMessageHandler(action) {
        this.messageHandlers.delete(action);
    }

    /**
     * Update connection handlers
     * @param {Object} handlers - New connection handlers
     */
    updateConnectionHandlers(handlers) {
        this.connectionHandlers = { ...this.connectionHandlers, ...handlers };
    }
}

// Create a singleton instance for global use
const webSocketManager = new WebSocketManager();

// Export both the class and the singleton instance
export { WebSocketManager, webSocketManager };

// Convenience functions for common WebSocket operations
export function connectWebSocket(endpoint, messageHandlers, connectionHandlers) {
    return webSocketManager.connect(endpoint, messageHandlers, connectionHandlers);
}

export function disconnectWebSocket() {
    return webSocketManager.disconnect();
}

export function sendWebSocketMessage(message) {
    return webSocketManager.send(message);
}

export function isWebSocketConnected() {
    return webSocketManager.isConnected();
}

export function addWebSocketHandler(action, handler) {
    return webSocketManager.addMessageHandler(action, handler);
}

export function removeWebSocketHandler(action) {
    return webSocketManager.removeMessageHandler(action);
}

/**
 * Helper function for pages that need polling fallback
 * @param {function} pollFunction - Function to call for polling
 * @param {number} interval - Polling interval in milliseconds (default: 60000)
 * @returns {number} - Interval ID for clearing
 */
export function startPollingFallback(pollFunction, interval = 60000) {
    console.log('Starting polling fallback for WebSocket');
    return setInterval(pollFunction, interval);
}

/**
 * Helper function to stop polling fallback
 * @param {number} intervalId - Interval ID to clear
 */
export function stopPollingFallback(intervalId) {
    if (intervalId) {
        clearInterval(intervalId);
    }
}