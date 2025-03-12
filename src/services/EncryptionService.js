/**
 * Encryption Service
 * 
 * Provides encryption/decryption functionality using AES-256-GCM via Web Crypto API.
 * All operations are performed locally without any data leaving the browser.
 */

class EncryptionService {
  /**
   * Initialize the encryption service
   * @param {string} password - Optional user password for encryption/decryption
   */
  constructor(password = null) {
    this.password = password;
    this.algorithm = { name: 'AES-GCM', length: 256 };
    this.ivLength = 12; // 96 bits
    this.saltLength = 16; // 128 bits
    this.iterations = 100000;
    // Use globalThis to access crypto in both window and service worker contexts
    this.cryptoObj = globalThis.crypto;
  }

  /**
   * Set or update the encryption password
   * @param {string} password - New password to use
   */
  setPassword(password) {
    this.password = password;
  }

  /**
   * Generate a derived key from password using PBKDF2
   * @param {string} password - Password to derive key from
   * @param {Uint8Array} salt - Salt for key derivation
   * @returns {Promise<CryptoKey>} - Derived crypto key
   */
  async deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await this.cryptoObj.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    return this.cryptoObj.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      this.algorithm,
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate a random encryption key
   * @returns {Promise<CryptoKey>} - Generated crypto key
   */
  async generateKey() {
    return this.cryptoObj.subtle.generateKey(
      this.algorithm,
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Export a CryptoKey to raw format
   * @param {CryptoKey} key - The key to export
   * @returns {Promise<ArrayBuffer>} - Exported key in raw format
   */
  async exportKey(key) {
    return this.cryptoObj.subtle.exportKey('raw', key);
  }

  /**
   * Import a raw key into a CryptoKey
   * @param {ArrayBuffer} rawKey - The raw key to import
   * @returns {Promise<CryptoKey>} - Imported crypto key
   */
  async importKey(rawKey) {
    return this.cryptoObj.subtle.importKey(
      'raw',
      rawKey,
      this.algorithm,
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data
   * @param {string|Object} data - Data to encrypt (will be JSON stringified if object)
   * @param {string} [customPassword=null] - Optional custom password to use for this operation
   * @returns {Promise<string>} - Base64 encoded encrypted data
   */
  async encrypt(data, customPassword = null) {
    const password = customPassword || this.password;
    if (!password) {
      throw new Error('No password set for encryption');
    }

    // Generate random salt and IV
    const salt = this.cryptoObj.getRandomValues(new Uint8Array(this.saltLength));
    const iv = this.cryptoObj.getRandomValues(new Uint8Array(this.ivLength));
    
    // Derive the key from password
    const key = await this.deriveKey(password, salt);
    
    // Convert data to ArrayBuffer
    const encoder = new TextEncoder();
    const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
    const plaintext = encoder.encode(dataString);
    
    // Encrypt the data
    const ciphertext = await this.cryptoObj.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      plaintext
    );

    // Combine salt + iv + ciphertext
    const result = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(ciphertext), salt.length + iv.length);
    
    // Convert to Base64 for storage
    return btoa(String.fromCharCode(...result));
  }

  /**
   * Decrypt data
   * @param {string} encryptedData - Base64 encoded encrypted data
   * @param {string} [customPassword=null] - Optional custom password to use for this operation
   * @returns {Promise<any>} - Decrypted data (parsed from JSON if possible)
   */
  async decrypt(encryptedData, customPassword = null) {
    const password = customPassword || this.password;
    if (!password) {
      throw new Error('No password set for decryption');
    }

    try {
      // Validate input
      if (!encryptedData || typeof encryptedData !== 'string') {
        throw new Error('Invalid encrypted data format');
      }

      // Convert from Base64
      let encryptedBytes;
      try {
        encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      } catch (e) {
        console.error('Error decoding Base64:', e);
        throw new Error('Invalid Base64 data format');
      }
      
      // Ensure we have enough data for salt and iv
      if (encryptedBytes.length <= this.saltLength + this.ivLength) {
        throw new Error('Encrypted data is too short');
      }
      
      // Extract salt, iv, and ciphertext
      const salt = encryptedBytes.slice(0, this.saltLength);
      const iv = encryptedBytes.slice(this.saltLength, this.saltLength + this.ivLength);
      const ciphertext = encryptedBytes.slice(this.saltLength + this.ivLength);
      
      // Derive the key from password
      const key = await this.deriveKey(password, salt);
      
      // Decrypt the data
      try {
        const decrypted = await this.cryptoObj.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv
          },
          key,
          ciphertext
        );
        
        // Convert ArrayBuffer to string and parse if JSON
        const decoder = new TextDecoder();
        const decryptedText = decoder.decode(decrypted);
        
        try {
          return JSON.parse(decryptedText);
        } catch (e) {
          // If not valid JSON, return as string
          return decryptedText;
        }
      } catch (error) {
        console.error('WebCrypto decryption failed:', error);
        throw new Error('Decryption failed: Incorrect password or corrupted data');
      }
    } catch (error) {
      console.error('Decryption error:', error);
      throw error;
    }
  }
}

export default EncryptionService;
