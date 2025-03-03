import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import './styles.css';

// Main App component
const App = () => {
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('info');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('main'); // 'main', 'sessions'
  const [searchQuery, setSearchQuery] = useState('');
  const [importFile, setImportFile] = useState(null);

  // Load saved sessions
  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getTabs'
      });
      
      if (response.success) {
        setSessions(response.tabs);
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
        // Switch to sessions view
        setView('sessions');
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

  // Load sessions when the component mounts
  useEffect(() => {
    loadSessions();
  }, []);

  return (
    <div className="container">
      <div className="header">
        <h1>TabLocker</h1>
      </div>
      
      {status && (
        <div className={`status ${statusType}`}>
          {status}
        </div>
      )}
      
      <div className="action-buttons">
        <button onClick={saveAllTabs} disabled={loading}>
          {loading ? 'Saving...' : 'Save All Tabs'}
        </button>
        <button onClick={() => setView(view === 'main' ? 'sessions' : 'main')}>
          {view === 'main' ? 'View Saved Tabs' : 'Back to Main'}
        </button>
      </div>
      
      {view === 'sessions' && (
        <div className="sessions-container">
          <div className="sessions-header">
            <h2>Saved Sessions</h2>
            <div className="search-box">
              <input
                type="text"
                placeholder="Search tabs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="import-export">
            <div className="import-section">
              <input
                type="file"
                id="import-file"
                accept=".tldata"
                onChange={handleFileChange}
              />
              <button onClick={importTabs} disabled={!importFile}>
                Import Tabs
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="loading">Loading...</div>
          ) : filteredSessions.length === 0 ? (
            <div className="no-sessions">
              {sessions.length === 0 ? 'No saved sessions found.' : 'No matching tabs found.'}
            </div>
          ) : (
            <div className="session-list">
              {filteredSessions.map(session => (
                <SessionItem 
                  key={session.id} 
                  session={session} 
                  onRestore={() => restoreSession(session.id)}
                  onRestoreTab={restoreTab}
                  onExport={() => exportSession(session.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
      
      {view === 'main' && (
        <div className="main-view">
          <div className="info-section">
            <h2>Welcome to TabLocker</h2>
            <p>
              TabLocker helps you save and organize your browser tabs securely.
              All data is encrypted and stored locally on your device.
            </p>
            <ul className="feature-list">
              <li>Save all your open tabs with one click</li>
              <li>Restore tabs individually or all at once</li>
              <li>Search through your saved tabs</li>
              <li>Export and import your saved tabs</li>
              <li>All data is encrypted with AES-256-GCM</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

// Session item component
const SessionItem = ({ session, onRestore, onRestoreTab, onExport }) => {
  const [expanded, setExpanded] = useState(false);
  const sessionDate = new Date(session.date);
  const dateString = sessionDate.toLocaleString();
  
  return (
    <div className="session-item">
      <div className="session-header">
        <div className="session-info">
          <span className="session-date">{dateString}</span>
          <span className="tab-count">{session.tabs.length} tabs</span>
        </div>
        <div className="session-actions">
          <button className="restore-btn" onClick={onRestore}>Restore All</button>
          <button className="export-btn" onClick={onExport}>Export</button>
          <button className="toggle-btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="tab-list">
          {session.tabs.map(tab => (
            <div key={tab.id} className="tab-item">
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
              >
                Open
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Render the app
render(<App />, document.getElementById('app'));
