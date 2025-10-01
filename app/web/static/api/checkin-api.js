// Check-in API Module
// Handles check-in/check-out API communications

import { getCookie } from '../utils/utils-module.js';

// API endpoints
const API_BASE = `${window.location.origin}/api/checkin`;

// Generic API request handler
export async function apiRequest(endpoint, options = {}) {
    const secretKey = getCookie('secretKey');
    if (!secretKey) {
        throw new Error('AUTH_REQUIRED');
    }

    try {
        const response = await fetch(endpoint, {
            headers: {
                'Content-Type': 'application/json',
                'x-auth-secret-key': secretKey,
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('SESSION_EXPIRED');
            }
            
            // Try to parse error response
            try {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            } catch (parseError) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Check-in user by ID
export async function checkinUser(userId) {
    if (!userId) {
        throw new Error('INVALID_USER_ID');
    }
    const parts = userId.split(':');
    userId = parts[parts.length - 1];
    return await apiRequest(`${API_BASE}/checkin`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId })
    });
}

// Get user by ID for verification
export async function getUserById(userId) {
    return await apiRequest(`${API_BASE}/${userId}`);
}