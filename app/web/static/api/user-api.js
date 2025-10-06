// User API Module
// Handles all API communications for user management

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
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Load users from API
export async function loadUsersAPI(page = 0, search = '') {
    const params = new URLSearchParams({
        page_number: page.toString(),
        page_size: '10', // PAGE_SIZE
        search: search
    });

    return await apiRequest(`${window.location.origin}/api/users?${params}`);
}

// Create or update user
export async function saveUserAPI(userData, userId = null) {
    const isEdit = userId !== null;
    const endpoint = isEdit ? `${window.location.origin}/api/users/${userId}` : `${window.location.origin}/api/users`;
    const method = isEdit ? 'PUT' : 'POST';
    
    return await apiRequest(endpoint, {
        method: method,
        body: JSON.stringify(userData)
    });
}

// Delete user
export async function deleteUserAPI(userId) {
    return await apiRequest(`${window.location.origin}/api/users/${userId}`, {
        method: 'DELETE'
    });
}

// Get single user by ID
export async function getUserAPI(userId) {
    return await apiRequest(`${window.location.origin}/api/users/${userId}`);
}
