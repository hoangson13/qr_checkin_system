// Check-in API Module
// Handles check-in/check-out API communications

import { getCookie } from '../utils/utils-module.js';


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
    return await apiRequest(`${window.location.origin}/api/checkin/${userId}`, {
        method: 'POST',
    });
}
