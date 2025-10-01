// Utils ES6 Module - Common utility functions
// ES6 module version for modern imports

import { safeSetInnerHTML } from './security.js';

export let currentPage = 0;
export const PAGE_SIZE = 10;

export function formatDate(dateString) {
    if (!dateString) return 'N/A'; // Handle empty date strings
    const date = new Date(dateString);
    return date.toLocaleString('en-GB');
}

export function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();

    // If we can't find the cookie, redirect to home page
    if (name === 'secretKey' || name === 'username') {
        // Only redirect if not already on the home page
        const currentPath = window.location.pathname;
        if (currentPath !== '/ui' && currentPath !== '/ui/') {
            window.location.href = '/ui';
        }
        return null;
    }
    return null;
}

export function setCurrentPage(page) {
    currentPage = page;
}

export function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    let paginationHtml = '';

    // Previous button
    paginationHtml += `
        <li class="page-item ${currentPage === 0 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Previous</a>
        </li>
    `;

    // Calculate range of pages to show
    let startPage = Math.max(0, currentPage - 2);
    let endPage = Math.min(totalPages - 1, startPage + 4);

    // Adjust startPage if we're near the end
    if (endPage - startPage < 4) {
        startPage = Math.max(0, endPage - 4);
    }

    // First page
    if (startPage > 0) {
        paginationHtml += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(0)">1</a>
            </li>
            ${startPage > 1 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}
        `;
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `
            <li class="page-item ${currentPage === i ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i + 1}</a>
            </li>
        `;
    }

    // Last page
    if (endPage < totalPages - 1) {
        paginationHtml += `
            ${endPage < totalPages - 2 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${totalPages - 1})">${totalPages}</a>
            </li>
        `;
    }

    // Next button
    paginationHtml += `
        <li class="page-item ${currentPage === totalPages - 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Next</a>
        </li>
    `;

    safeSetInnerHTML(pagination, paginationHtml);
}
