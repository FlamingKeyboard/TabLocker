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
          <h2>Saved Sessions</h2>
          {loading ? (
            <div>Loading...</div>
          ) : sessions.length === 0 ? (
            <div>No saved sessions found.</div>
          ) : (
            <div className="session-list">
              {sessions.map(session => (
                <SessionItem 
                  key={session.id} 
                  session={session} 
                  onRestore={() => restoreSession(session.id)} 
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Session item component
const SessionItem = ({ session, onRestore }) => {
  const [expanded, setExpanded] = useState(false);
  const sessionDate = new Date(session.date);
  const dateString = sessionDate.toLocaleString();
  
  return (
    <div className="session-item">
      <div className="session-header">
        <div className="session-info">
          <strong>{dateString}</strong> - {session.tabs.length} tabs
        </div>
        <div className="session-actions">
          <button onClick={onRestore}>Restore All</button>
          <button onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Hide' : 'Show Tabs'}
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="tab-list">
          {session.tabs.map(tab => (
            <div key={tab.id} className="tab-item">
              <img 
                className="favicon" 
                src={tab.favIconUrl || 'icons/default-favicon.png'} 
                onError={(e) => { e.target.src = 'icons/default-favicon.png'; }}
                alt=""
              />
              <div className="tab-title">{tab.title}</div>
              <button 
                className="open-tab-btn"
                onClick={() => chrome.tabs.create({ url: tab.url })}
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
