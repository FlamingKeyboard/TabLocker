/**
 * Popup entry point
 * 
 * Renders the popup UI using Preact
 */

import { h, render, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import TabService from '../services/TabService';
import './popup.css';

// Main Popup Component
function Popup() {
  const [tabs, setTabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const tabService = new TabService();

  // Load current tabs on mount
  useEffect(() => {
    async function loadTabs() {
      try {
        const currentTabs = await tabService.getCurrentWindowTabs();
        setTabs(currentTabs);
        setLoading(false);
      } catch (error) {
        console.error('Error loading tabs:', error);
        setMessage({ type: 'error', text: 'Error loading tabs' });
        setLoading(false);
      }
    }

    loadTabs();
  }, []);

  // Save all tabs
  const handleSaveAllTabs = () => {
    setLoading(true);
    setMessage({ type: 'info', text: 'Saving tabs...' });

    chrome.runtime.sendMessage({ action: 'saveTabs' }, (response) => {
      setLoading(false);
      if (response && response.success) {
        setMessage({ type: 'success', text: `Saved ${tabs.length} tabs!` });
        
        // Clear message after 2 seconds
        setTimeout(() => setMessage(null), 2000);
      } else {
        setMessage({ 
          type: 'error', 
          text: response?.error || 'Error saving tabs'
        });
      }
    });
  };

  // Open the main UI page
  const openMainUI = () => {
    chrome.runtime.openOptionsPage();
    window.close(); // Close the popup
  };

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>TabLocker</h1>
      </header>
      
      <div className="popup-content">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            <div className="tab-count">
              {tabs.length} tab{tabs.length !== 1 ? 's' : ''} in this window
            </div>
            
            {message && (
              <div className={`message message-${message.type}`}>
                {message.text}
              </div>
            )}
            
            <div className="actions">
              <button 
                className="btn btn-primary" 
                onClick={handleSaveAllTabs}
                disabled={tabs.length === 0 || loading}
              >
                Save All Tabs
              </button>
              
              <button 
                className="btn btn-secondary" 
                onClick={openMainUI}
              >
                View Saved Tabs
              </button>
            </div>
          </>
        )}
      </div>
      
      <footer className="popup-footer">
        <div className="privacy-note">
          100% Private & Encrypted
        </div>
      </footer>
    </div>
  );
}

// Render the component
render(<Popup />, document.getElementById('app'));
