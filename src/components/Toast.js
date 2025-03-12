/**
 * Simple Notification
 * 
 * A minimal notification system for displaying status messages in the UI.
 */

import { h } from 'preact';

// Simple function to display notifications in the UI
export function createNotificationManager() {
  // This function will be called from components to display notifications
  const showNotification = (message, type = 'info') => {
    // Create a simple DOM element for the notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add it to the container or create one if it doesn't exist
    let container = document.querySelector('.notification-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'notification-container';
      document.body.appendChild(container);
    }
    
    container.appendChild(notification);
    
    // Auto-remove after 2 seconds
    setTimeout(() => {
      notification.classList.add('notification-hide');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
        // Remove the container if empty
        if (container.children.length === 0 && container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }, 300); // Time for fade-out animation
    }, 2000);
  };
  
  return {
    // Simple API
    showNotification
  };
}

// Export a dummy component for compatibility
export const createToastManager = () => {
  return {
    showNotification: (message, type) => {
      const notificationManager = createNotificationManager();
      notificationManager.showNotification(message, type);
    }
  };
};

// No need for a separate component
export const ToastContainer = () => null;
