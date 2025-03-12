/**
 * Common utility functions for TabLocker
 */

/**
 * Generate a random UUID
 * @returns {string} UUID
 */
export function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Format a date nicely
 * @param {number} timestamp - Timestamp in milliseconds
 * @returns {string} Formatted date
 */
export function formatDate(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Truncate a string to a maximum length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
export function truncateString(str, maxLength) {
  if (!str) return '';
  
  if (str.length <= maxLength) {
    return str;
  }
  
  return str.substring(0, maxLength) + '...';
}

/**
 * Extract domain from URL
 * @param {string} url - URL to extract domain from
 * @returns {string} Domain
 */
export function extractDomain(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (e) {
    // Invalid URL, return as is
    return url;
  }
}

/**
 * Download data as a file
 * @param {string|Blob} data - Data to download
 * @param {string} filename - Filename
 * @param {string} type - MIME type
 */
export function downloadAsFile(data, filename, type = 'text/plain') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  
  // Append to body, click, and remove
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Release the blob URL
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Convert a Uint8Array to a hex string
 * @param {Uint8Array} bytes - Bytes to convert
 * @returns {string} Hex string
 */
export function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert a hex string to a Uint8Array
 * @param {string} hex - Hex string to convert
 * @returns {Uint8Array} Byte array
 */
export function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  
  return bytes;
}

/**
 * Check if the extension has the required permissions
 * @param {Array} permissions - List of permission strings
 * @returns {Promise<boolean>} Whether all permissions are granted
 */
export async function hasPermissions(permissions) {
  return new Promise((resolve) => {
    chrome.permissions.contains(
      { permissions },
      (result) => resolve(result)
    );
  });
}

/**
 * Request the specified permissions
 * @param {Array} permissions - List of permission strings
 * @returns {Promise<boolean>} Whether permissions were granted
 */
export async function requestPermissions(permissions) {
  return new Promise((resolve) => {
    chrome.permissions.request(
      { permissions },
      (granted) => resolve(granted)
    );
  });
}
