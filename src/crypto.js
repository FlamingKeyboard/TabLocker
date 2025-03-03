/**
 * Crypto utility functions for TabLocker
 * Handles encryption and decryption of session data
 */

// Get the encryption key from storage
export async function getEncryptionKey() {
  try {
    const storage = await chrome.storage.local.get('encryptionKey');
    if (!storage.encryptionKey) {
      throw new Error('Encryption key not found');
    }
    
    // Convert the base64 key back to an ArrayBuffer
    const keyData = base64ToArrayBuffer(storage.encryptionKey);
    
    // Import the key
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    console.error('Error getting encryption key:', error);
    throw error;
  }
}

// Encrypt data
export async function encryptData(data) {
  try {
    // Get the encryption key
    const key = await getEncryptionKey();
    
    // Generate a random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Convert the data to a string and then to an ArrayBuffer
    const dataString = JSON.stringify(data);
    const dataBuffer = new TextEncoder().encode(dataString);
    
    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      dataBuffer
    );
    
    // Combine the IV and encrypted data
    const combinedBuffer = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combinedBuffer.set(iv);
    combinedBuffer.set(new Uint8Array(encryptedBuffer), iv.length);
    
    // Convert the combined buffer to a base64 string
    return arrayBufferToBase64(combinedBuffer);
  } catch (error) {
    console.error('Error encrypting data:', error);
    throw error;
  }
}

// Decrypt data
export async function decryptData(encryptedData) {
  try {
    // Get the encryption key
    const key = await getEncryptionKey();
    
    // Convert the base64 string to an ArrayBuffer
    const combinedBuffer = base64ToArrayBuffer(encryptedData);
    
    // Extract the IV and encrypted data
    const iv = combinedBuffer.slice(0, 12);
    const encryptedBuffer = combinedBuffer.slice(12);
    
    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedBuffer
    );
    
    // Convert the decrypted data back to a string and parse it
    const decryptedString = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Error decrypting data:', error);
    throw error;
  }
}

// Helper function to convert an ArrayBuffer to a base64 string
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper function to convert a base64 string to an ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
