// User Management JavaScript Module
// Handles CRUD operations for user management

import { formatDate } from './utils/utils-module.js';
import { showSuccessToast, showErrorToast } from './components/dialog-utils.js';
import { loadUsersAPI, saveUserAPI, deleteUserAPI } from './api/user-api.js';
import { escapeHtml } from './utils/security.js';

// Global variables
let users = [];
let currentUser = null;
let currentPage = 0;
const PAGE_SIZE = 10;
let totalUsers = 0;
let totalCheckin = 0;
let autoRefreshInterval = null;



// DOM elements
const elements = {
    // Table and data
    usersTableBody: document.getElementById('usersTableBody'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    
    // Pagination
    pagination: document.getElementById('pagination'),
    
    // Search and controls
    searchInput: document.getElementById('searchInput'),
    
    // Modal elements
    userModal: document.getElementById('userModal'),
    userModalLabel: document.getElementById('userModalLabel'),
    userForm: document.getElementById('userForm'),
    saveUserBtn: document.getElementById('saveUserBtn'),
    
    // Form fields
    userId: document.getElementById('userId'),
    userName: document.getElementById('userName'),
    userTitle: document.getElementById('userTitle'),
    userDepartment: document.getElementById('userDepartment'),
    seatNumber: document.getElementById('seatNumber'),
    checkInStatus: document.getElementById('checkInStatus'),
    checkInTime: document.getElementById('checkInTime'),
    checkInTimeGroup: document.getElementById('checkInTimeGroup'),
    
    // Delete modal
    deleteModal: document.getElementById('deleteModal'),
    deleteUserName: document.getElementById('deleteUserName'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    
    // QR modal
    qrModal: document.getElementById('qrModal'),
    qrUserName: document.getElementById('qrUserName'),
    qrUserId: document.getElementById('qrUserId'),
    qrCodeImage: document.getElementById('qrCodeImage'),
    downloadQrBtn: document.getElementById('downloadQrBtn'),
    
    // Action buttons
    addUserBtn: document.getElementById('addUserBtn')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadUsers();
    startAutoRefresh();
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    stopAutoRefresh();
});

// Auto-refresh functionality using WebSocket
let websocket = null;

function startAutoRefresh() {
    // Clear any existing connections
    stopAutoRefresh();
    
    try {
        // Determine WebSocket protocol based on current protocol
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws/checkin`;
        
        websocket = new WebSocket(wsUrl);
        
        websocket.onopen = function(event) {
            console.log('WebSocket connected for user updates');
        };
        
        websocket.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                console.log('WebSocket message received:', data);
                
                // Check if this is a new check-in event
                if (data.action === 'new_checkin') {
                    // Only reload if no modals are open and not currently loading
                    if (!isAnyModalOpen() && !isLoading()) {
                        // force reload page
                        window.location.reload();
                    }
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        websocket.onclose = function(event) {
            console.log('WebSocket connection closed:', event.code, event.reason);
            
            // Attempt to reconnect after 5 seconds if not manually closed
            if (event.code !== 1000) {
                setTimeout(() => {
                    if (!websocket || websocket.readyState === WebSocket.CLOSED) {
                        console.log('Attempting to reconnect WebSocket...');
                        startAutoRefresh();
                    }
                }, 5000);
            }
        };
        
        websocket.onerror = function(error) {
            console.error('WebSocket error:', error);
        };
        
    } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        // Fallback to polling if WebSocket fails
        fallbackToPolling();
    }
}

function stopAutoRefresh() {
    if (websocket) {
        websocket.close(1000, 'Page refresh or navigation');
        websocket = null;
    }
    
    // Also clear any polling interval if it exists
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Fallback to polling if WebSocket is not available
function fallbackToPolling() {
    console.log('Falling back to polling for user updates');
    
    // Set up auto-refresh every 60 seconds (60000 ms)
    autoRefreshInterval = setInterval(() => {
        // Only auto-refresh if no modals are open and not currently loading
        if (!isAnyModalOpen() && !isLoading()) {
            const currentSearch = elements.searchInput.value;
            loadUsers(currentPage, currentSearch);
        }
    }, 60000);
}

function isAnyModalOpen() {
    // Check if any Bootstrap modals are currently shown
    const modals = document.querySelectorAll('.modal.show');
    return modals.length > 0;
}

function isLoading() {
    // Check if loading indicator is visible
    return elements.loadingIndicator.style.display !== 'none';
}

// Event Listeners
function initializeEventListeners() {
    // Search functionality
    elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
    
    // Modal events
    elements.addUserBtn.addEventListener('click', openAddUserModal);
    elements.userForm.addEventListener('submit', handleUserSubmit);
    elements.checkInStatus.addEventListener('change', toggleCheckInTimeField);
    
    // Delete modal
    elements.confirmDeleteBtn.addEventListener('click', confirmDelete);
    
    // QR modal
    elements.downloadQrBtn.addEventListener('click', downloadQRCode);
    
    // Modal reset on close
    elements.userModal.addEventListener('hidden.bs.modal', resetUserForm);
}

// API wrapper functions with error handling
async function loadUsers(page = 0, search = '') {
    showLoading(true);
    
    try {
        const data = await loadUsersAPI(page, search);
        
        users = data.data || [];
        totalCheckin = data.checkin_total || 0;
        totalUsers = data.total || 0;
        currentPage = page;
        
        renderUsersTable();
        renderPagination();
        
        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('totalCheckin').textContent = totalCheckin;
    } catch (error) {
        handleAPIError(error);
    }
    
    showLoading(false);
}

// Create or update user
async function saveUser(userData) {
    const isEdit = currentUser && currentUser._id;
    
    try {
        await saveUserAPI(userData, isEdit ? currentUser._id : null);
        showSuccessToast(isEdit ? 'User updated successfully!' : 'User created successfully!');
        loadUsers(currentPage);
        closeUserModal();
        return true;
    } catch (error) {
        handleAPIError(error);
        return false;
    }
}

// Delete user
async function deleteUser(userId) {
    try {
        await deleteUserAPI(userId);
        showSuccessToast('User deleted successfully!');
        loadUsers(currentPage);
        return true;
    } catch (error) {
        handleAPIError(error);
        return false;
    }
}

// Handle API errors consistently
function handleAPIError(error) {
    if (error.message === 'AUTH_REQUIRED') {
        showErrorToast('Authentication required. Please log in again.');
        setTimeout(() => {
            window.location.href = '/ui';
        }, 2000);
    } else if (error.message === 'SESSION_EXPIRED') {
        showErrorToast('Session expired. Please log in again.');
        setTimeout(() => {
            window.location.href = '/ui';
        }, 2000);
    } else {
        console.error('API Error:', error);
        showErrorToast(`Request failed: ${error.message}`);
    }
}

// Render functions
function renderUsersTable() {
    const tbody = elements.usersTableBody;
    tbody.innerHTML = '';
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-muted">
                    <i class="bi bi-inbox fs-3"></i>
                    <p class="mt-2">No users found matching your criteria</p>
                </td>
            </tr>
        `;
        return;
    }
    
    users.forEach(user => {
        const row = createUserRow(user);
        tbody.appendChild(row);
    });
}

function createUserRow(user) {
    const row = document.createElement('tr');
    row.className = 'fade-in';
    
    const isCheckedIn = user.is_checked_in;
    const statusIcon = isCheckedIn 
        ? '<i class="bi bi-check-circle text-success fs-5" title="Checked In"></i>'
        : '<i class="bi bi-x-circle text-danger fs-5" title="Checked Out"></i>';
    
    const checkInTime = user.check_in_time ? formatDate(user.check_in_time) : 'N/A';
    const createdAt = formatDate(user.created_at);
    
    row.innerHTML = `
        <td>
            <span class="fw-medium text-primary">${user.user_id}</span>
        </td>
        <td>
            <span class="fw-medium">${escapeHtml(user.name || 'N/A')}</span>
        </td>
        <td>
            <span class="badge bg-secondary">
                <i class="bi bi-geo-alt me-1"></i>${user.seat_number || 'N/A'}
            </span>
        </td>
        <td class="text-center">${statusIcon}</td>
        <td>
            <small class="text-muted">
                <i class="bi bi-clock me-1"></i>${checkInTime}
            </small>
        </td>
        <td>
            <div class="btn-group" role="group">
                <button class="btn btn-action btn-view" onclick="viewUserQR('${user._id}')" 
                        title="View QR Code">
                    <i class="bi bi-qr-code"></i>
                </button>
                <button class="btn btn-action btn-edit" onclick="editUser('${user._id}')" 
                        title="Edit User">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-action btn-delete" onclick="deleteUserConfirm('${user._id}')" 
                        title="Delete User">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </td>
    `;
    
    return row;
}

function renderPagination() {
    const totalPages = Math.ceil(totalUsers / PAGE_SIZE);
    const pagination = elements.pagination;
    pagination.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 0 ? 'disabled' : ''}`;
    prevLi.innerHTML = `
        <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">
            <i class="bi bi-chevron-left"></i> Previous
        </a>
    `;
    pagination.appendChild(prevLi);
    
    // Page numbers
    const startPage = Math.max(0, currentPage - 2);
    const endPage = Math.min(totalPages - 1, currentPage + 2);
    
    if (startPage > 0) {
        pagination.appendChild(createPageItem(0, '1'));
        if (startPage > 1) {
            const ellipsis = document.createElement('li');
            ellipsis.className = 'page-item disabled';
            ellipsis.innerHTML = '<span class="page-link">...</span>';
            pagination.appendChild(ellipsis);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        pagination.appendChild(createPageItem(i, (i + 1).toString()));
    }
    
    if (endPage < totalPages - 1) {
        if (endPage < totalPages - 2) {
            const ellipsis = document.createElement('li');
            ellipsis.className = 'page-item disabled';
            ellipsis.innerHTML = '<span class="page-link">...</span>';
            pagination.appendChild(ellipsis);
        }
        pagination.appendChild(createPageItem(totalPages - 1, totalPages.toString()));
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage >= totalPages - 1 ? 'disabled' : ''}`;
    nextLi.innerHTML = `
        <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">
            Next <i class="bi bi-chevron-right"></i>
        </a>
    `;
    pagination.appendChild(nextLi);
}

function createPageItem(pageNum, text) {
    const li = document.createElement('li');
    li.className = `page-item ${pageNum === currentPage ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#" onclick="changePage(${pageNum})">${text}</a>`;
    return li;
}



// Event Handlers
function handleSearch() {
    const searchTerm = elements.searchInput.value;
    loadUsers(0, searchTerm);
    // Restart auto-refresh timer when user searches
    startAutoRefresh();
}





function handleUserSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(elements.userForm);
    const userData = {};
    
    // Convert form data to object
    for (const [key, value] of formData.entries()) {
        if (key === 'seat_number') {
            userData[key] = value ? parseInt(value) : null;
        } else if (key === 'is_checked_in') {
            userData[key] = value === 'true';
        } else if (key === 'check_in_time') {
            userData[key] = value || null;
        } else {
            userData[key] = value || null;
        }
    }
    
    // Validation
    if (!userData.user_id || !userData.name) {
        showErrorToast('User ID and Name are required fields.');
        return;
    }
    
    saveUser(userData);
}

function toggleCheckInTimeField() {
    const isCheckedIn = elements.checkInStatus.value === 'true';
    elements.checkInTimeGroup.style.display = isCheckedIn ? 'block' : 'none';
    
    if (isCheckedIn && !elements.checkInTime.value) {
        // Set current datetime
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        elements.checkInTime.value = now.toISOString().slice(0, 16);
    }
}

// Modal Functions
function openAddUserModal() {
    currentUser = null;
    elements.userModalLabel.innerHTML = '<i class="bi bi-person-plus me-2"></i>Add New User';
    elements.saveUserBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Create User';
    resetUserForm();
    
    const modal = new bootstrap.Modal(elements.userModal);
    modal.show();
}

function resetUserForm() {
    elements.userForm.reset();
    elements.checkInTimeGroup.style.display = 'none';
    currentUser = null;
    
    // Remove any validation classes
    const formControls = elements.userForm.querySelectorAll('.form-control, .form-select');
    formControls.forEach(control => {
        control.classList.remove('is-valid', 'is-invalid');
    });
}

function closeUserModal() {
    const modal = bootstrap.Modal.getInstance(elements.userModal);
    if (modal) {
        modal.hide();
    }
}

// Global functions (called from HTML)
window.changePage = function(page) {
    if (page >= 0 && page < Math.ceil(totalUsers / PAGE_SIZE)) {
        loadUsers(page, elements.searchInput.value);
    }
};

window.editUser = function(userId) {
    const user = users.find(u => u._id === userId);
    if (user) {
        currentUser = user;
        elements.userModalLabel.innerHTML = '<i class="bi bi-pencil me-2"></i>Edit User';
        elements.saveUserBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Update User';
        
        // Populate form fields
        elements.userId.value = user.user_id || '';
        elements.userName.value = user.name || '';
        elements.seatNumber.value = user.seat_number || '';
        elements.checkInStatus.value = user.is_checked_in ? 'true' : 'false';
        
        if (user.check_in_time) {
            const checkInDate = new Date(user.check_in_time);
            checkInDate.setMinutes(checkInDate.getMinutes() - checkInDate.getTimezoneOffset());
            elements.checkInTime.value = checkInDate.toISOString().slice(0, 16);
        }
        
        toggleCheckInTimeField();
        
        const modal = new bootstrap.Modal(elements.userModal);
        modal.show();
    }
};

window.viewUserQR = function(userId) {
    const user = users.find(u => u._id === userId);
    if (user) {
        // Set user info in modal
        elements.qrUserName.textContent = user.name || 'Unknown User';
        elements.qrUserId.textContent = `ID: ${user.user_id || 'N/A'}`;
        
        // Set QR code image source
        elements.qrCodeImage.src = `/qr/${user._id}.png`;
        elements.qrCodeImage.alt = `QR Code for ${user.name || user.user_id}`;
        
        // Store current user for download functionality
        currentUser = user;
        
        // Show modal
        const modal = new bootstrap.Modal(elements.qrModal);
        modal.show();
    }
};

function downloadQRCode() {
    if (currentUser && currentUser._id) {
        // Create a temporary link to download the QR code
        const link = document.createElement('a');
        link.href = `/qr/${currentUser._id}.png`;
        link.download = `qr-code-${currentUser.user_id || currentUser._id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showSuccessToast('QR code download started!');
    }
}

window.deleteUserConfirm = function(userId) {
    const user = users.find(u => u._id === userId);
    if (user) {
        elements.deleteUserName.textContent = user.name || user.user_id || 'Unknown User';
        currentUser = user;
        
        const modal = new bootstrap.Modal(elements.deleteModal);
        modal.show();
    }
};

function confirmDelete() {
    if (currentUser) {
        deleteUser(currentUser._id);
        const modal = bootstrap.Modal.getInstance(elements.deleteModal);
        if (modal) {
            modal.hide();
        }
    }
}



// Utility Functions
function showLoading(show) {
    elements.loadingIndicator.style.display = show ? 'block' : 'none';
    elements.usersTableBody.style.opacity = show ? '0.5' : '1';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}