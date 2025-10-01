/**
 * Security utilities for preventing XSS attacks
 * Uses DOMPurify for robust HTML sanitization
 */

// Check if DOMPurify is available
let DOMPurify = null;
if (typeof window !== 'undefined' && window.DOMPurify) {
    DOMPurify = window.DOMPurify;
}

/**
 * Escapes HTML characters to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML insertion
 */
export function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    if (typeof text !== 'string') text = String(text);
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Escapes HTML attributes
 * @param {string} text - Text to escape for attribute
 * @returns {string} Escaped text safe for HTML attributes
 */
export function escapeHtmlAttribute(text) {
    if (text === null || text === undefined) return '';
    if (typeof text !== 'string') text = String(text);
    
    return text
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Sanitizes HTML content using DOMPurify (if available) or basic escaping
 * @param {string} html - HTML content to sanitize
 * @param {Object} options - DOMPurify options
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html, options = {}) {
    if (html === null || html === undefined) return '';
    if (typeof html !== 'string') html = String(html);
    
    if (DOMPurify) {
        // Use DOMPurify with safe defaults
        const defaultOptions = {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span', 'div', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
            ALLOWED_ATTR: ['href', 'target', 'class', 'id', 'title'],
            ALLOW_DATA_ATTR: false,
            FORBID_SCRIPT: true,
            FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'button'],
            FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit']
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        return DOMPurify.sanitize(html, mergedOptions);
    } else {
        // Fallback to basic HTML escaping if DOMPurify is not available
        console.warn('DOMPurify not available, falling back to basic HTML escaping');
        return escapeHtml(html);
    }
}

/**
 * Safe template literal helper for user data
 * @param {string} template - Template string with ${key} placeholders
 * @param {Object} data - Data to interpolate
 * @param {boolean} allowBasicHtml - Whether to allow basic HTML tags
 * @returns {string} Safe HTML string
 */
export function safeTemplate(template, data, allowBasicHtml = false) {
    return template.replace(/\$\{(\w+)\}/g, (match, key) => {
        const value = data[key] || '';
        return allowBasicHtml ? sanitizeHtml(value) : escapeHtml(value);
    });
}

/**
 * Safely sets innerHTML with automatic sanitization
 * For admin interfaces - allows onclick and other admin functionality
 * @param {HTMLElement} element - DOM element to set content on
 * @param {string} html - HTML content to set
 * @param {Object} options - Sanitization options
 */
export function safeSetInnerHTML(element, html, options = {}) {
    if (!element || typeof element.innerHTML !== 'string') {
        console.error('Invalid element provided to safeSetInnerHTML');
        return;
    }
    
    // Allow admin functionality while still preventing XSS
    const adminOptions = {
        ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'b', 'i', 'u', 'br', 'a', 'button', 'svg', 'path', 'ul', 'li', 'img', 'small', 'input', 'label', 'form', 'textarea', 'select', 'option'],
        ALLOWED_ATTR: ['class', 'id', 'href', 'target', 'data-bs-toggle', 'data-bs-target', 'onclick', 'type', 'aria-expanded', 'aria-labelledby', 'style', 'xmlns', 'width', 'height', 'fill', 'viewBox', 'd', 'src', 'alt', 'value', 'checked', 'required', 'name', 'for', 'placeholder', 'aria-label'],
        KEEP_CONTENT: true,
        ...options
    };
    element.innerHTML = DOMPurify.sanitize(html, adminOptions);
}

/**
 * Safely creates a text node or HTML element
 * @param {string} content - Content to create element from
 * @param {boolean} allowHtml - Whether to parse as HTML or treat as text
 * @param {Object} sanitizeOptions - Options for HTML sanitization
 * @returns {DocumentFragment} Safe DOM fragment
 */
export function createSafeElement(content, allowHtml = false, sanitizeOptions = {}) {
    const fragment = document.createDocumentFragment();
    
    if (allowHtml) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = sanitizeHtml(content, sanitizeOptions);
        while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
        }
    } else {
        const textNode = document.createTextNode(content || '');
        fragment.appendChild(textNode);
    }
    
    return fragment;
}

/**
 * Validates and sanitizes JSON input
 * @param {string} jsonString - JSON string to validate
 * @returns {Object} Object with isValid boolean and parsed data or error
 */
export function sanitizeJsonInput(jsonString) {
    try {
        if (!jsonString || typeof jsonString !== 'string') {
            return { isValid: false, error: 'Invalid JSON input' };
        }
        
        // Basic validation to prevent code injection
        const trimmed = jsonString.trim();
        if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
            return { isValid: false, error: 'JSON must be an object' };
        }
        
        const parsed = JSON.parse(trimmed);
        
        // Additional validation for specific patterns that could be dangerous
        const jsonStr = JSON.stringify(parsed);
        const dangerousPatterns = [
            /javascript:/i,
            /data:/i,
            /vbscript:/i,
            /<script/i,
            /on\w+\s*=/i
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(jsonStr)) {
                return { isValid: false, error: 'JSON contains potentially dangerous content' };
            }
        }
        
        return { isValid: true, data: parsed };
    } catch (error) {
        return { isValid: false, error: error.message };
    }
}

// Export configuration for checking if DOMPurify is loaded
export function isDOMPurifyLoaded() {
    return DOMPurify !== null;
}

// Initialize DOMPurify when it becomes available
export function initializeDOMPurify() {
    if (typeof window !== 'undefined' && window.DOMPurify && !DOMPurify) {
        DOMPurify = window.DOMPurify;
        return true;
    } else if (typeof window !== 'undefined' && window.DOMPurify) {
        DOMPurify = window.DOMPurify;
        return true;
    }
    console.warn('DOMPurify not available');
    return false;
}
