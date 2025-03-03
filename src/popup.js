import { h, render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { initDragAndDrop, reorderTabs } from './dragdrop';
import './styles.css';

// Main App component
export default function App() {
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('info');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [memorySaved, setMemorySaved] = useState(0);
  const [starredSessions, setStarredSessions] = useState({});
  const sessionListRef = useRef(null);

  // Load saved sessions
  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getTabs'
      });
      
      if (response.success) {
        setSessions(response.tabs);
        
        // Load starred sessions from storage
        const starredData = await chrome.storage.local.get('starredSessions');
        if (starredData.starredSessions) {
          setStarredSessions(starredData.starredSessions);
        }
        
        // Calculate approximate memory saved (based on OneTab's claim of up to 95% memory savings)
        const totalTabs = response.tabs.reduce((count, session) => count + session.tabs.length, 0);
        // Rough estimate: 100MB per tab saved
        const estimatedMemorySaved = totalTabs * 100;
        setMemorySaved(estimatedMemorySaved);
      } else {
        showStatus(`Error: ${response.error}`, 'error');
      }
    } catch (error) {
      showStatus(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Save all tabs
  const saveAllTabs = async () => {
    setLoading(true);
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      
      // Simplify the tab objects
      const simplifiedTabs = tabs.map(tab => ({
        id: tab.id,
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl
      }));
      
      const response = await chrome.runtime.sendMessage({
        action: 'saveTabs',
        tabs: simplifiedTabs
      });
      
      if (response.success) {
        showStatus(`Saved ${response.result.tabCount} tabs successfully!`, 'success');
        // Reload sessions after saving
        loadSessions();
      } else {
        showStatus(`Error: ${response.error}`, 'error');
      }
    } catch (error) {
      showStatus(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Restore a session
  const restoreSession = (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      showStatus('Session not found', 'error');
      return;
    }
    
    // Open each tab in the session
    session.tabs.forEach(tab => {
      chrome.tabs.create({ url: tab.url });
    });
    
    showStatus(`Restored ${session.tabs.length} tabs`, 'success');
  };

  // Restore a single tab
  const restoreTab = (url) => {
    chrome.tabs.create({ url });
    showStatus('Tab restored', 'success');
  };

  // Delete a session
  const deleteSession = async (sessionId) => {
    try {
      // Get existing saved sessions
      const existingData = await chrome.storage.local.get('savedSessions');
      const savedSessions = existingData.savedSessions || [];
      
      // Filter out the session to delete
      const updatedSessions = savedSessions.filter(session => session.id !== sessionId);
      
      // Save the updated sessions
      await chrome.storage.local.set({ savedSessions: updatedSessions });
      
      // Update the UI
      loadSessions();
      
      showStatus('Session deleted successfully', 'success');
    } catch (error) {
      showStatus(`Error deleting session: ${error.message}`, 'error');
    }
  };

  // Toggle starred status for a session
  const toggleStarred = async (sessionId) => {
    try {
      const updatedStarred = { ...starredSessions };
      
      if (updatedStarred[sessionId]) {
        delete updatedStarred[sessionId];
      } else {
        updatedStarred[sessionId] = true;
      }
      
      // Save to storage
      await chrome.storage.local.set({ starredSessions: updatedStarred });
      
      // Update state
      setStarredSessions(updatedStarred);
      
      showStatus(
        updatedStarred[sessionId] ? 'Session starred' : 'Session unstarred', 
        'success'
      );
    } catch (error) {
      showStatus(`Error updating starred status: ${error.message}`, 'error');
    }
  };

  // Export session to file
  const exportSession = async (sessionId) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'exportTabs',
        sessionId
      });
      
      if (!response.success) {
        showStatus(`Error: ${response.error}`, 'error');
        return;
      }
      
      // Create a blob with the data
      const blob = new Blob([response.data], { type: 'application/octet-stream' });
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tablocker-export-${new Date().toISOString().slice(0, 10)}.tldata`;
      
      // Trigger the download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      
      showStatus('Session exported successfully', 'success');
    } catch (error) {
      showStatus(`Error exporting session: ${error.message}`, 'error');
    }
  };

  // Export session as plain text URLs
  const exportAsText = (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      showStatus('Session not found', 'error');
      return;
    }
    
    // Create a text list of URLs
    const urlList = session.tabs.map(tab => tab.url).join('\n');
    
    // Copy to clipboard
    navigator.clipboard.writeText(urlList)
      .then(() => {
        showStatus('URLs copied to clipboard', 'success');
      })
      .catch(error => {
        showStatus(`Error copying to clipboard: ${error.message}`, 'error');
      });
  };

  // Handle file import
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImportFile(file);
    }
  };

  // Import tabs from file
  const importTabs = async () => {
    if (!importFile) {
      showStatus('Please select a file to import', 'error');
      return;
    }
    
    try {
      // Read the file
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const fileData = e.target.result;
          
          const response = await chrome.runtime.sendMessage({
            action: 'importTabs',
            data: fileData
          });
          
          if (response.success) {
            showStatus(`Imported ${response.result.tabCount} tabs successfully!`, 'success');
            // Reload sessions and reset import file
            loadSessions();
            setImportFile(null);
            // Reset the file input
            document.getElementById('import-file').value = '';
          } else {
            showStatus(`Error: ${response.error}`, 'error');
          }
        } catch (error) {
          showStatus(`Error importing tabs: ${error.message}`, 'error');
        }
      };
      
      reader.readAsText(importFile);
    } catch (error) {
      showStatus(`Error reading file: ${error.message}`, 'error');
    }
  };

  // Handle tab reordering
  const handleTabReorder = async (reorderInfo) => {
    try {
      // Update the sessions data with the reordered tabs
      const updatedSessions = reorderTabs(sessions, reorderInfo);
      
      // Update the state with the new order
      setSessions(updatedSessions);
      
      // Save the updated sessions to storage
      const response = await chrome.runtime.sendMessage({
        action: 'updateSessions',
        sessions: updatedSessions
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update sessions');
      }
      
      showStatus('Tab order updated', 'success');
    } catch (error) {
      showStatus(`Error reordering tabs: ${error.message}`, 'error');
    }
  };

  // Filter sessions based on search query
  const filteredSessions = sessions.map(session => {
    if (!searchQuery) return session;
    
    const filteredTabs = session.tabs.filter(tab => 
      tab.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      tab.url.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return {
      ...session,
      tabs: filteredTabs
    };
  }).filter(session => session.tabs.length > 0);

  // Sort sessions with starred ones first
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    // Starred sessions come first
    if (starredSessions[a.id] && !starredSessions[b.id]) return -1;
    if (!starredSessions[a.id] && starredSessions[b.id]) return 1;
    
    // Then sort by date (newest first)
    return new Date(b.date) - new Date(a.date);
  });

  // Show status message
  const showStatus = (message, type = 'info') => {
    setStatus(message);
    setStatusType(type);
    
    // Clear the status after 3 seconds
    setTimeout(() => {
      setStatus('');
      setStatusType('info');
    }, 3000);
  };

  // Open dashboard page
  const openDashboard = () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('dashboard.html')
    });
    window.close(); // Close the popup
  };

  // Initialize drag and drop after the component mounts and sessions are loaded
  useEffect(() => {
    if (sessionListRef.current && sessions.length > 0) {
      console.log('Initializing drag and drop with', sessions.length, 'sessions');
      // Small delay to ensure the DOM is fully rendered
      setTimeout(() => {
        initDragAndDrop(sessionListRef.current, handleTabReorder);
      }, 100);
    }
  }, [sessions]);

  // Load sessions when the component mounts
  useEffect(() => {
    loadSessions();
  }, []);

  return (
    <div className="container">
      <div className="popup-header">
        <h1>TabLocker</h1>
        {memorySaved > 0 && (
          <div className="memory-saved">
            ~{memorySaved} MB memory saved
          </div>
        )}
        <button 
          className="dashboard-button" 
          onClick={openDashboard}
          title="Open full dashboard"
          style={{
            backgroundColor: '#4285f4',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '4px',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginLeft: '10px'
          }}
        >
          Open Dashboard
        </button>
      </div>
      
      {status && (
        <div className={`status ${statusType}`}>
          {status}
        </div>
      )}
      
      <div className="action-buttons">
        <button 
          className="save-button" 
          onClick={saveAllTabs} 
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save All Tabs'}
        </button>
        
        <div className="search-box">
          <input
            type="text"
            placeholder="Search tabs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="import-export-bar">
        <div className="import-section">
          <input
            type="file"
            id="import-file"
            accept=".tldata"
            onChange={handleFileChange}
          />
          <button 
            className="import-button" 
            onClick={importTabs} 
            disabled={!importFile}
          >
            Import
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="loading">Loading...</div>
      ) : sortedSessions.length === 0 ? (
        <div className="no-sessions">
          {sessions.length === 0 ? 'No saved sessions found.' : 'No matching tabs found.'}
        </div>
      ) : (
        <div className="session-list" ref={sessionListRef}>
          {sortedSessions.map(session => (
            <SessionItem 
              key={session.id} 
              session={session} 
              isStarred={!!starredSessions[session.id]}
              onRestore={() => restoreSession(session.id)}
              onRestoreTab={restoreTab}
              onDelete={() => deleteSession(session.id)}
              onExport={() => exportSession(session.id)}
              onExportText={() => exportAsText(session.id)}
              onToggleStar={() => toggleStarred(session.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Session item component
function SessionItem({ 
  session, 
  isStarred,
  onRestore, 
  onRestoreTab, 
  onDelete,
  onExport, 
  onExportText,
  onToggleStar
}) {
  // Start with expanded view for better usability with drag and drop
  const [expanded, setExpanded] = useState(true);
  const sessionDate = new Date(session.date);
  const dateString = sessionDate.toLocaleString();
  
  return (
    <div className={`session-item ${isStarred ? 'starred' : ''}`} data-session-id={session.id}>
      <div className="session-header">
        <div className="session-info">
          <div className="session-title-row">
            <button 
              className={`star-button ${isStarred ? 'starred' : ''}`} 
              onClick={onToggleStar}
              title={isStarred ? "Unstar this session" : "Star this session"}
            >
              {isStarred ? '★' : '☆'}
            </button>
            <span className="session-date">{dateString}</span>
          </div>
          <span className="tab-count">{session.tabs.length} tabs</span>
        </div>
        <div className="session-actions">
          <button className="restore-btn" onClick={onRestore} title="Restore all tabs">
            Restore All
          </button>
          <div className="dropdown">
            <button className="dropdown-btn">⋮</button>
            <div className="dropdown-content">
              <button onClick={onExport}>Export as File</button>
              <button onClick={onExportText}>Copy URLs to Clipboard</button>
              <button onClick={onDelete} className="delete-btn">Delete</button>
            </div>
          </div>
          <button 
            className="toggle-btn" 
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Hide tabs" : "Show tabs"}
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="tab-list">
          {session.tabs.map((tab, index) => (
            <div key={tab.id} className="tab-item" data-index={index}>
              <img 
                className="favicon" 
                src={tab.favIconUrl || 'icons/default-favicon.svg'} 
                onError={(e) => { e.target.src = 'icons/default-favicon.svg'; }}
                alt=""
              />
              <div className="tab-title" title={tab.title}>{tab.title}</div>
              <button 
                className="open-tab-btn"
                onClick={() => onRestoreTab(tab.url)}
                title="Open this tab"
              >
                Open
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Render the app
render(<App />, document.getElementById('app'));
