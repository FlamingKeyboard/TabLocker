/**
 * Compression Service
 * 
 * Provides compression/decompression functionality using LZString.
 * Used to reduce storage size before encryption.
 */

import LZString from 'lz-string';

class CompressionService {
  /**
   * Compress data using LZString
   * @param {string|Object} data - Data to compress (objects will be JSON stringified)
   * @returns {string} - Compressed data
   */
  compress(data) {
    const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
    return LZString.compressToUTF16(dataString);
  }

  /**
   * Decompress data using LZString
   * @param {string} compressedData - Data to decompress
   * @returns {any} - Decompressed data (parsed from JSON if possible)
   */
  decompress(compressedData) {
    const decompressed = LZString.decompressFromUTF16(compressedData);
    
    if (!decompressed) {
      return null;
    }
    
    try {
      // Try to parse as JSON
      return JSON.parse(decompressed);
    } catch (e) {
      // If not valid JSON, return as string
      return decompressed;
    }
  }

  /**
   * Compress to Base64 (useful for export/import operations)
   * @param {string|Object} data - Data to compress
   * @returns {string} - Base64 compressed data
   */
  compressToBase64(data) {
    const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
    return LZString.compressToBase64(dataString);
  }

  /**
   * Decompress from Base64
   * @param {string} compressedData - Base64 compressed data
   * @returns {any} - Decompressed data (parsed from JSON if possible)
   */
  decompressFromBase64(compressedData) {
    const decompressed = LZString.decompressFromBase64(compressedData);
    
    if (!decompressed) {
      return null;
    }
    
    try {
      // Try to parse as JSON
      return JSON.parse(decompressed);
    } catch (e) {
      // If not valid JSON, return as string
      return decompressed;
    }
  }
}

export default CompressionService;
