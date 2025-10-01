// User API Module
// Handles all API communications for user management

import { getCookie } from '../utils/utils-module.js';

// API endpoints
const API_BASE = `${window.location.origin}/api/users`;

// Generic API request handler
export async function apiRequest(endpoint, options = {}) {
    const secretKey = getCookie('secretKey');
    if (!secretKey) {
        throw new Error('AUTH_REQUIRED');
    }

    try {
        console.log('API Request to:', endpoint, 'with options:', options);
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

    return await apiRequest(`${API_BASE}?${params}`);
}

// Create or update user
export async function saveUserAPI(userData, userId = null) {
    const isEdit = userId !== null;
    const endpoint = isEdit ? `${API_BASE}/${userId}` : API_BASE;
    const method = isEdit ? 'PUT' : 'POST';
    
    return await apiRequest(endpoint, {
        method: method,
        body: JSON.stringify(userData)
    });
}

// Delete user
export async function deleteUserAPI(userId) {
    return await apiRequest(`${API_BASE}/${userId}`, {
        method: 'DELETE'
    });
}

// Get single user by ID
export async function getUserAPI(userId) {
    return await apiRequest(`${API_BASE}/${userId}`);
}
