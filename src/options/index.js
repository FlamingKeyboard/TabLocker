/**
 * TabLocker Options Page
 * 
 * The main UI for managing saved tabs, including search, import/export,
 * and configuration options.
 */

import { h, render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import StorageService from '../services/StorageService';
import ExportImportService from '../services/ExportImportService';
import TabService from '../services/TabService';
import './options.css';

// Tab Group Component
function TabGroup({ group, onRestore, onDelete, onRestoreTab, onReorderTabs, onUpdateGroup, onUpdateTab, dragHandleProps }) {
  const [expanded, setExpanded] = useState(false);
  const [draggedTabIndex, setDraggedTabIndex] = useState(null);
  const [dragOverTabIndex, setDragOverTabIndex] = useState(null);
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [groupName, setGroupName] = useState(group.name);
  const [editingTabIndex, setEditingTabIndex] = useState(null);
  const [editingTabField, setEditingTabField] = useState(null); // 'title' or 'url'
  const [editingTabValue, setEditingTabValue] = useState('');
  
  // Format date from timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString();
  };
  
  // Handle tab drag start
  const handleTabDragStart = (index) => {
    setDraggedTabIndex(index);
  };

  // Handle tab drag over
  const handleTabDragOver = (e, index) => {
    e.preventDefault();
    if (draggedTabIndex !== null && draggedTabIndex !== index) {
      setDragOverTabIndex(index);
    }
  };

  // Handle tab drop
  const handleTabDrop = (e, index) => {
    e.preventDefault();
    if (draggedTabIndex !== null && draggedTabIndex !== index) {
      // Call parent handler to update tabs order
      onReorderTabs(group.id, draggedTabIndex, index);
      setDraggedTabIndex(null);
      setDragOverTabIndex(null);
    }
  };

  // Reset drag states
  const handleTabDragEnd = () => {
    setDraggedTabIndex(null);
    setDragOverTabIndex(null);
  };

  return (
    <div className="tab-group" {...(dragHandleProps || {})}>
      <div 
        className="tab-group-header" 
        draggable={!isEditingGroupName} 
        onClick={(e) => {
          // Don't trigger when clicking buttons or inputs
          if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && !isEditingGroupName) {
            setExpanded(!expanded);
          }
        }}
      >
        <div className="tab-group-info">
          {isEditingGroupName ? (
            <form 
              className="edit-group-name-form" 
              onSubmit={(e) => {
                e.preventDefault();
                if (groupName.trim()) {
                  onUpdateGroup(group.id, { name: groupName.trim() });
                  setIsEditingGroupName(false);
                }
              }}
            >
              <input 
                type="text" 
                className="form-control edit-group-name-input" 
                value={groupName} 
                onChange={(e) => setGroupName(e.target.value)}
                autoFocus
                onBlur={() => {
                  if (groupName.trim()) {
                    onUpdateGroup(group.id, { name: groupName.trim() });
                  } else {
                    setGroupName(group.name); // Reset to original name if empty
                  }
                  setIsEditingGroupName(false);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </form>
          ) : (
            <div className="group-name-container">
              <h3 className="tab-group-name">
                {group.name}
                <button 
                  className="btn-icon edit-icon" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingGroupName(true);
                  }} 
                  title="Edit group name"
                >
                  ✎
                </button>
              </h3>
            </div>
          )}
          <div className="tab-group-meta">
            <span className="tab-group-date">{formatDate(group.created)}</span>
            <span className="tab-group-count">{group.tabCount} tab{group.tabCount !== 1 && 's'}</span>
          </div>
        </div>
        
        <div className="tab-group-actions">
          <button 
            className="btn btn-sm btn-primary"
            onClick={() => onRestore(group.id)}
            title="Restore all tabs"
          >
            Restore All
          </button>
          
          <button 
            className="btn btn-sm btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
          
          <button 
            className="btn btn-sm btn-danger"
            onClick={() => onDelete(group.id)}
            title="Delete group"
          >
            Delete
          </button>
        </div>
      </div>
      
      {expanded && group.tabs && (
        <div className="tab-list">
          {group.tabs.map((tab, index) => (
            <div 
              key={index} 
              className={`tab-item ${draggedTabIndex === index ? 'tab-dragging' : ''} ${dragOverTabIndex === index ? 'tab-drag-over' : ''}`}
              draggable="true"
              onDragStart={() => handleTabDragStart(index)}
              onDragOver={(e) => handleTabDragOver(e, index)}
              onDrop={(e) => handleTabDrop(e, index)}
              onDragEnd={handleTabDragEnd}
            >
              <div className="tab-favicon">
                {tab.favIconUrl ? (
                  <img src={tab.favIconUrl} alt="" width="16" height="16" />
                ) : (
                  <div className="default-favicon"></div>
                )}
              </div>
              
              <div className="tab-info">
                {editingTabIndex === index && editingTabField === 'title' ? (
                  <form 
                    className="edit-tab-form" 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (editingTabValue.trim()) {
                        const updatedTab = { ...tab, title: editingTabValue.trim() };
                        onUpdateTab(group.id, index, updatedTab);
                      }
                      setEditingTabIndex(null);
                      setEditingTabField(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input 
                      type="text" 
                      className="form-control edit-tab-input" 
                      value={editingTabValue} 
                      onChange={(e) => setEditingTabValue(e.target.value)}
                      autoFocus
                      onBlur={() => {
                        if (editingTabValue.trim()) {
                          const updatedTab = { ...tab, title: editingTabValue.trim() };
                          onUpdateTab(group.id, index, updatedTab);
                        }
                        setEditingTabIndex(null);
                        setEditingTabField(null);
                      }}
                    />
                  </form>
                ) : (
                  <div 
                    className="tab-title" 
                    title={tab.title}
                    onClick={(e) => {
                      if (e.target.tagName !== 'BUTTON') {
                        e.stopPropagation();
                        setEditingTabIndex(index);
                        setEditingTabField('title');
                        setEditingTabValue(tab.title || '');
                      }
                    }}
                  >
                    {tab.title || "Untitled Tab"}
                    <button 
                      className="btn-icon edit-icon" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTabIndex(index);
                        setEditingTabField('title');
                        setEditingTabValue(tab.title || '');
                      }} 
                      title="Edit tab title"
                    >
                      ✎
                    </button>
                  </div>
                )}

                {editingTabIndex === index && editingTabField === 'url' ? (
                  <form 
                    className="edit-tab-form" 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (editingTabValue.trim()) {
                        try {
                          // Basic URL validation
                          new URL(editingTabValue);
                          const updatedTab = { ...tab, url: editingTabValue.trim() };
                          onUpdateTab(group.id, index, updatedTab);
                        } catch (error) {
                          // Add http:// prefix if missing
                          const urlWithPrefix = `http://${editingTabValue.trim()}`;
                          try {
                            new URL(urlWithPrefix);
                            const updatedTab = { ...tab, url: urlWithPrefix };
                            onUpdateTab(group.id, index, updatedTab);
                          } catch (e) {
                            // Invalid URL even with prefix
                            alert('Please enter a valid URL');
                            return;
                          }
                        }
                      }
                      setEditingTabIndex(null);
                      setEditingTabField(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input 
                      type="text" 
                      className="form-control edit-tab-input" 
                      value={editingTabValue} 
                      onChange={(e) => setEditingTabValue(e.target.value)}
                      autoFocus
                      onBlur={() => {
                        if (editingTabValue.trim()) {
                          try {
                            // Basic URL validation
                            new URL(editingTabValue);
                            const updatedTab = { ...tab, url: editingTabValue.trim() };
                            onUpdateTab(group.id, index, updatedTab);
                          } catch (error) {
                            // Add http:// prefix if missing
                            const urlWithPrefix = `http://${editingTabValue.trim()}`;
                            try {
                              new URL(urlWithPrefix);
                              const updatedTab = { ...tab, url: urlWithPrefix };
                              onUpdateTab(group.id, index, updatedTab);
                            } catch (e) {
                              // If still invalid, keep the original value
                            }
                          }
                        }
                        setEditingTabIndex(null);
                        setEditingTabField(null);
                      }}
                    />
                  </form>
                ) : (
                  <div 
                    className="tab-url" 
                    title={tab.url}
                    onClick={(e) => {
                      if (e.target.tagName !== 'BUTTON') {
                        e.stopPropagation();
                        setEditingTabIndex(index);
                        setEditingTabField('url');
                        setEditingTabValue(tab.url || '');
                      }
                    }}
                  >
                    {tab.url}
                    <button 
                      className="btn-icon edit-icon" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTabIndex(index);
                        setEditingTabField('url');
                        setEditingTabValue(tab.url || '');
                      }} 
                      title="Edit tab URL"
                    >
                      ✎
                    </button>
                  </div>
                )}
              </div>
              
              <button 
                className="btn btn-sm btn-link"
                onClick={() => onRestoreTab(tab)}
                title="Restore this tab"
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Search Component
function Search({ onSearch }) {
  const [query, setQuery] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };
  
  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <input 
        type="text"
        className="search-input"
        placeholder="Search saved tabs..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type="submit" className="btn btn-primary search-button">
        Search
      </button>
    </form>
  );
}

// Export/Import Component
function ExportImport({ onImport }) {
  const [exportPassword, setExportPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState(null);
  const [toast, setToast] = useState(null);
  const exportImportService = new ExportImportService();
  const storageService = new StorageService();
  const fileInputRef = useRef(null);
  
  const showToast = (message, actions) => {
    setToast({ message, actions });
    // Auto-hide toast after 10 seconds if it's just a message without actions
    if (!actions) {
      setTimeout(() => {
        hideToast();
      }, 10000);
    }
  };

  const hideToast = () => {
    const toastElement = document.querySelector('.toast');
    if (toastElement) {
      toastElement.classList.add('hiding');
      setTimeout(() => {
        setToast(null);
      }, 300);
    } else {
      setToast(null);
    }
  };

  const handleExport = async (format) => {
    try {
      // Get all tab groups
      const groups = await storageService.getAllTabGroups();
      
      if (groups.length === 0) {
        showToast('No tab groups to export');
        return;
      }
      
      let exportData = '';
      let filename = '';
      
      if (format === 'onetab') {
        // Get full tab data for all groups
        const allTabs = [];
        for (const group of groups) {
          const fullGroup = await storageService.getTabGroup(group.id);
          if (fullGroup && fullGroup.tabs) {
            allTabs.push(...fullGroup.tabs);
          }
        }
        
        exportData = exportImportService.exportAsOneTabFormat(allTabs);
        filename = `tablocker-onetab-${Date.now()}.txt`;
      } else if (format === 'encrypted') {
        // Get full tab data for all groups
        const allGroups = [];
        for (const group of groups) {
          const fullGroup = await storageService.getTabGroup(group.id);
          if (fullGroup) {
            allGroups.push(fullGroup);
          }
        }
        
        const dataToExport = {
          groups: allGroups,
          version: '1.0',
          exportDate: Date.now()
        };
        
        if (exportPassword) {
          exportImportService.setPassword(exportPassword);
        }
        
        exportData = await exportImportService.exportEncrypted(dataToExport, exportPassword);
        filename = `tablocker-encrypted-${Date.now()}.tlbk`;
      }
      
      // Return early if no export data
      if (!exportData) {
        return;
      }

      showToast('Choose how to export your tabs:', [
        {
          label: 'Save to File',
          onClick: () => {
            exportImportService.downloadAsFile(exportData, filename);
            showToast('Export saved to file successfully!');
          },
          primary: true
        },
        {
          label: 'Copy to Clipboard',
          onClick: async () => {
            const copySuccess = await exportImportService.copyToClipboard(exportData);
            if (copySuccess) {
              showToast('Export copied to clipboard!');
            } else {
              showToast('Failed to copy to clipboard');
            }
          }
        }
      ]);
    } catch (error) {
      console.error('Export error:', error);
      showToast(`Export failed: ${error.message}`);
    }
  };
  
  const handleImport = async () => {
    try {
      if (!importText.trim()) {
        showToast('Please enter import data');
        return;
      }
      
      if (importPassword) {
        exportImportService.setPassword(importPassword);
      }
      
      const result = await exportImportService.autoImport(importText, importPassword);
      
      if (result.type === 'tablocker') {
        // Handle TabLocker format import
        showToast('TabLocker import successful!');
        onImport(result.data);
      } else if (result.type === 'onetab') {
        // Handle OneTab format import
        showToast('OneTab import successful!');
        onImport(result.data);
      }
      
      // Clear the import form
      setImportText('');
      setImportPassword('');
    } catch (error) {
      console.error('Import error:', error);
      showToast(`Import failed: ${error.message}`);
    }
  };

  // Handle file import
  const handleFileImport = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const fileContent = e.target.result;
          setImportText(fileContent);
          
          // Auto-import if we have content
          if (fileContent) {
            if (importPassword) {
              exportImportService.setPassword(importPassword);
            }
            
            const result = await exportImportService.autoImport(fileContent, importPassword);
            
            if (result.type === 'tablocker') {
              showToast('TabLocker import successful!');
              onImport(result.data);
            } else if (result.type === 'onetab') {
              showToast('OneTab import successful!');
              onImport(result.data);
            }
            
            // Clear the import form
            setImportText('');
            setImportPassword('');
          }
        } catch (error) {
          console.error('File import error:', error);
          showToast(`File import failed: ${error.message}`);
        }
      };
      
      reader.onerror = () => {
        showToast('Error reading file');
      };
      
      reader.readAsText(file);
      
      // Reset the file input so the same file can be selected again
      event.target.value = '';
    } catch (error) {
      console.error('File import error:', error);
      showToast(`File import failed: ${error.message}`);
    }
  };
  
  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return (
    <div className="export-import-container">
      {/* Toast notification */}
      {toast && (
        <div className="toast">
          <div className="toast-message">{toast.message}</div>
          {toast.actions && (
            <div className="toast-actions">
              {toast.actions.map((action, index) => (
                <button
                  key={index}
                  className={`btn ${action.primary ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    action.onClick();
                    hideToast();
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div className="card">
        <div className="card-header">
          <h3>Export Tabs</h3>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label htmlFor="exportPassword">Encryption Password (optional):</label>
            <input
              type="password"
              id="exportPassword"
              className="form-control"
              value={exportPassword}
              onChange={(e) => setExportPassword(e.target.value)}
              placeholder="Leave empty for OneTab format"
            />
          </div>
          
          <div className="export-buttons">
            <button 
              className="btn btn-primary" 
              onClick={() => handleExport('encrypted')}
              title="Export as encrypted TabLocker format (download or copy)"
            >
              Export Encrypted
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => handleExport('onetab')}
              title="Export in OneTab compatible format (download or copy)"
            >
              Export OneTab Compatible
            </button>
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h3>Import Tabs</h3>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label htmlFor="importText">Paste exported data:</label>
            <textarea
              id="importText"
              className="form-control"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste OneTab or TabLocker exported data here"
              rows={5}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="importPassword">Decryption Password (if needed):</label>
            <input
              type="password"
              id="importPassword"
              className="form-control"
              value={importPassword}
              onChange={(e) => setImportPassword(e.target.value)}
              placeholder="Only needed for encrypted exports"
            />
          </div>
          
          <div className="import-buttons">
            <button 
              className="btn btn-primary" 
              onClick={handleImport}
              title="Import from pasted text"
            >
              Import
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={triggerFileInput}
              title="Import from file"
            >
              Import from File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.tlbk,text/plain"
              onChange={handleFileImport}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Settings Component
function Settings({ settings, onSaveSettings }) {
  const [formData, setFormData] = useState(settings);
  const [showPassword, setShowPassword] = useState(false);
  
  useEffect(() => {
    setFormData(settings);
  }, [settings]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveSettings(formData);
  };
  
  return (
    <div className="settings-container">
      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-header">
            <h3>General Settings</h3>
          </div>
          <div className="card-body">
            <div className="form-group checkbox">
              <input
                type="checkbox"
                id="closeTabsAfterSave"
                name="closeTabsAfterSave"
                checked={formData.closeTabsAfterSave}
                onChange={handleChange}
              />
              <label htmlFor="closeTabsAfterSave">
                Close tabs after saving
              </label>
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Encryption Password:</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  className="form-control"
                  value={formData.password || ''}
                  onChange={handleChange}
                  placeholder="Enter encryption password"
                />
                <button 
                  type="button" 
                  className="btn btn-sm btn-secondary" 
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <small>
                This password will be used to encrypt your data. If you forget it, you will not be able to recover your saved tabs.
              </small>
            </div>
            
            <div className="form-group checkbox">
              <input
                type="checkbox"
                id="usePinProtection"
                name="usePinProtection"
                checked={formData.usePinProtection}
                onChange={handleChange}
              />
              <label htmlFor="usePinProtection">
                Enable PIN protection for quick access
              </label>
            </div>
            
            {formData.usePinProtection && (
              <div className="form-group">
                <label htmlFor="pin">PIN:</label>
                <input
                  type="password"
                  id="pin"
                  name="pin"
                  className="form-control"
                  value={formData.pin || ''}
                  onChange={handleChange}
                  placeholder="Enter a 4-digit PIN"
                  pattern="[0-9]{4}"
                  maxLength={4}
                />
                <small>
                  This PIN will be used for quick access to your saved tabs.
                </small>
              </div>
            )}
            
            <div className="form-group checkbox">
              <input
                type="checkbox"
                id="autoBackup"
                name="autoBackup"
                checked={formData.autoBackup}
                onChange={handleChange}
              />
              <label htmlFor="autoBackup">
                Automatically back up tab data weekly
              </label>
            </div>
            
            <button type="submit" className="btn btn-primary">
              Save Settings
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// Main Options Component
function Options() {
  const [activeTab, setActiveTab] = useState('tabs');
  const [tabGroups, setTabGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedGroupIndex, setDraggedGroupIndex] = useState(null);
  const [dragOverGroupIndex, setDragOverGroupIndex] = useState(null);
  const [settings, setSettings] = useState({
    closeTabsAfterSave: false,
    usePinProtection: false,
    pin: '',
    autoBackup: true,
    password: '' // Add encryption password to settings
  });
  const [message, setMessage] = useState(null);
  
  const storageService = new StorageService();
  const tabService = new TabService();
  
  // Load tab groups and settings on mount
  useEffect(() => {
    async function loadData() {
      try {
        await loadTabGroups();
        await loadSettings();
      } catch (error) {
        console.error('Error loading data:', error);
        setMessage({ type: 'error', text: 'Error loading data' });
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);
  
  // Load tab groups from storage
  async function loadTabGroups() {
    try {
      let groups;
      
      if (searchQuery) {
        groups = await storageService.searchTabGroups(searchQuery);
      } else {
        groups = await storageService.getAllTabGroups();
      }
      
      // Load full data for each group
      const fullGroups = [];
      
      for (const group of groups) {
        try {
          const fullGroup = await storageService.getTabGroup(group.id);
          
          if (fullGroup) {
            fullGroup.tabCount = fullGroup.tabs ? fullGroup.tabs.length : 0;
            fullGroups.push(fullGroup);
          }
        } catch (error) {
          console.error(`Error loading group ${group.id}:`, error);
        }
      }
      
      setTabGroups(fullGroups);
    } catch (error) {
      console.error('Error loading tab groups:', error);
      throw error;
    }
  }
  
  // Load settings from storage
  async function loadSettings() {
    try {
      chrome.runtime.sendMessage({ action: 'getOptions' }, (response) => {
        if (response && response.success && response.options) {
          setSettings(response.options);
        }
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      throw error;
    }
  }
  
  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
    setLoading(true);
    
    // Reload tab groups with the search query
    loadTabGroups().finally(() => {
      setLoading(false);
    });
  };
  
  // Handle restore tab group
  const handleRestoreGroup = async (groupId) => {
    try {
      const group = tabGroups.find(g => g.id === groupId);
      
      if (!group || !group.tabs) {
        setMessage({ type: 'error', text: 'Tab group not found or empty' });
        return;
      }
      
      chrome.runtime.sendMessage(
        { 
          action: 'restoreTabs', 
          data: { 
            tabs: group.tabs,
            keepSaved: true
          }
        }, 
        (response) => {
          if (response && response.success) {
            setMessage({ 
              type: 'success', 
              text: `Restored ${response.count} tabs!` 
            });
            
            // Clear message after 3 seconds
            setTimeout(() => setMessage(null), 3000);
          } else {
            setMessage({ 
              type: 'error', 
              text: response?.error || 'Error restoring tabs'
            });
          }
        }
      );
    } catch (error) {
      console.error('Error restoring tab group:', error);
      setMessage({ type: 'error', text: `Error restoring tabs: ${error.message}` });
    }
  };
  
  // Handle restore single tab
  const handleRestoreTab = async (tab) => {
    try {
      chrome.runtime.sendMessage(
        { 
          action: 'restoreTabs', 
          data: { 
            tabs: [tab],
            keepSaved: true
          }
        }, 
        (response) => {
          if (response && response.success) {
            setMessage({ 
              type: 'success', 
              text: 'Tab restored!' 
            });
            
            // Clear message after 2 seconds
            setTimeout(() => setMessage(null), 2000);
          } else {
            setMessage({ 
              type: 'error', 
              text: response?.error || 'Error restoring tab'
            });
          }
        }
      );
    } catch (error) {
      console.error('Error restoring tab:', error);
      setMessage({ type: 'error', text: `Error restoring tab: ${error.message}` });
    }
  };
  
  // Handle delete tab group
  const handleDeleteGroup = async (groupId) => {
    try {
      // Confirm deletion
      if (!confirm('Are you sure you want to delete this tab group?')) {
        return;
      }
      
      await storageService.deleteTabGroup(groupId);
      
      // Reload tab groups
      await loadTabGroups();
      
      setMessage({ type: 'success', text: 'Tab group deleted!' });
      
      // Clear message after 2 seconds
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Error deleting tab group:', error);
      setMessage({ type: 'error', text: `Error deleting tab group: ${error.message}` });
    }
  };
  
  // Handle updating a tab group
  const handleUpdateGroup = async (groupId, updates) => {
    try {
      const groupIndex = tabGroups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) return;
      
      // Update local state first for immediate UI update
      const updatedGroups = [...tabGroups];
      updatedGroups[groupIndex] = {
        ...updatedGroups[groupIndex],
        ...updates
      };
      setTabGroups(updatedGroups);
      
      // Save to storage
      await storageService.updateTabGroup(groupId, updates);
      
      setMessage({ type: 'success', text: 'Group updated!' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Error updating group:', error);
      setMessage({ type: 'error', text: `Error updating group: ${error.message}` });
    }
  };
  
  // Handle updating a tab
  const handleUpdateTab = async (groupId, tabIndex, updatedTab) => {
    try {
      const groupIndex = tabGroups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) return;
      
      const group = tabGroups[groupIndex];
      const tabs = [...group.tabs];
      
      // Update the tab at the specified index
      tabs[tabIndex] = updatedTab;
      
      // Create updated group
      const updatedGroup = {
        ...group,
        tabs
      };
      
      // Update local state first for immediate UI update
      const updatedGroups = [...tabGroups];
      updatedGroups[groupIndex] = updatedGroup;
      setTabGroups(updatedGroups);
      
      // Save to storage
      await storageService.updateTabGroup(groupId, { tabs });
      
      setMessage({ type: 'success', text: 'Tab updated!' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Error updating tab:', error);
      setMessage({ type: 'error', text: `Error updating tab: ${error.message}` });
    }
  };

  // Handle reordering tabs within a group
  const handleReorderTabs = async (groupId, fromIndex, toIndex) => {
    try {
      const groupIndex = tabGroups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) return;
      
      const group = tabGroups[groupIndex];
      const tabs = [...group.tabs];
      
      // Remove from old position and insert at new position
      const [movedTab] = tabs.splice(fromIndex, 1);
      tabs.splice(toIndex, 0, movedTab);
      
      // Create updated group
      const updatedGroup = {
        ...group,
        tabs
      };
      
      // Update local state first for immediate UI update
      const updatedGroups = [...tabGroups];
      updatedGroups[groupIndex] = updatedGroup;
      setTabGroups(updatedGroups);
      
      // Save to storage
      await storageService.updateTabGroup(groupId, { tabs });
      
      setMessage({ type: 'success', text: 'Tab order updated!' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Error reordering tabs:', error);
      setMessage({ type: 'error', text: `Error updating tab order: ${error.message}` });
    }
  };
  
  // Handle group drag start
  const handleGroupDragStart = (index) => {
    setDraggedGroupIndex(index);
  };
  
  // Handle group drag over
  const handleGroupDragOver = (e, index) => {
    e.preventDefault();
    if (draggedGroupIndex !== null && draggedGroupIndex !== index) {
      setDragOverGroupIndex(index);
    }
  };
  
  // Handle group drop
  const handleGroupDrop = async (e, index) => {
    e.preventDefault();
    if (draggedGroupIndex !== null && draggedGroupIndex !== index) {
      try {
        // Reorder groups in state
        const updatedGroups = [...tabGroups];
        const [movedGroup] = updatedGroups.splice(draggedGroupIndex, 1);
        updatedGroups.splice(index, 0, movedGroup);
        
        // Update state first for immediate UI update
        setTabGroups(updatedGroups);
        
        // Update the order of groups in storage
        // This is a more complex operation that requires updating each group's orderIndex
        for (let i = 0; i < updatedGroups.length; i++) {
          await storageService.updateTabGroup(updatedGroups[i].id, { orderIndex: i });
        }
        
        setMessage({ type: 'success', text: 'Group order updated!' });
        setTimeout(() => setMessage(null), 2000);
      } catch (error) {
        console.error('Error reordering groups:', error);
        setMessage({ type: 'error', text: `Error updating group order: ${error.message}` });
        // Reload original data on error
        await loadTabGroups();
      } finally {
        setDraggedGroupIndex(null);
        setDragOverGroupIndex(null);
      }
    }
  };
  
  // Reset group drag states
  const handleGroupDragEnd = () => {
    setDraggedGroupIndex(null);
    setDragOverGroupIndex(null);
  };

  // Handle import
  const handleImport = async (data) => {
    try {
      if (data.groups) {
        // TabLocker format with multiple groups
        for (const group of data.groups) {
          await storageService.saveTabGroup(group);
        }
      } else if (data.tabs) {
        // OneTab format or single group
        await storageService.saveTabGroup(data);
      }
      
      // Reload tab groups
      await loadTabGroups();
    } catch (error) {
      console.error('Error processing import:', error);
      setMessage({ type: 'error', text: `Error processing import: ${error.message}` });
    }
  };
  
  // Handle save settings
  const handleSaveSettings = async (newSettings) => {
    try {
      chrome.runtime.sendMessage(
        { 
          action: 'setOptions', 
          options: newSettings
        }, 
        (response) => {
          if (response && response.success) {
            setSettings(newSettings);
            setMessage({ type: 'success', text: 'Settings saved!' });
            
            // Clear message after 2 seconds
            setTimeout(() => setMessage(null), 2000);
          } else {
            setMessage({ 
              type: 'error', 
              text: response?.error || 'Error saving settings'
            });
          }
        }
      );
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: `Error saving settings: ${error.message}` });
    }
  };
  
  return (
    <div className="options-container">
      <header className="app-header">
        <h1>TabLocker</h1>
        <div className="app-subtitle">Secure Tab Management</div>
      </header>
      
      <nav className="app-nav">
        <ul className="nav-tabs">
          <li 
            className={activeTab === 'tabs' ? 'active' : ''}
            onClick={() => setActiveTab('tabs')}
          >
            Saved Tabs
          </li>
          <li 
            className={activeTab === 'export-import' ? 'active' : ''}
            onClick={() => setActiveTab('export-import')}
          >
            Export/Import
          </li>
          <li 
            className={activeTab === 'settings' ? 'active' : ''}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </li>
        </ul>
      </nav>
      
      <main className="app-content">
        {message && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}
        
        {activeTab === 'tabs' && (
          <div className="tabs-container">
            <Search onSearch={handleSearch} />
            
            {loading ? (
              <div className="loading">Loading...</div>
            ) : tabGroups.length === 0 ? (
              <div className="empty-state">
                <p>No saved tabs found.</p>
                {searchQuery && (
                  <p>Try a different search query.</p>
                )}
              </div>
            ) : (
              <div className="tab-groups-list">
                {tabGroups.map((group, index) => (
                  <div 
                    key={group.id}
                    className={`group-container ${draggedGroupIndex === index ? 'group-dragging' : ''} ${dragOverGroupIndex === index ? 'group-drag-over' : ''}`}
                    draggable="true"
                    onDragStart={() => handleGroupDragStart(index)}
                    onDragOver={(e) => handleGroupDragOver(e, index)}
                    onDrop={(e) => handleGroupDrop(e, index)}
                    onDragEnd={handleGroupDragEnd}
                  >
                    <TabGroup 
                      key={group.id}
                      group={group}
                      onRestore={handleRestoreGroup}
                      onDelete={handleDeleteGroup}
                      onRestoreTab={handleRestoreTab}
                      onReorderTabs={handleReorderTabs}
                      onUpdateGroup={handleUpdateGroup}
                      onUpdateTab={handleUpdateTab}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'export-import' && (
          <ExportImport onImport={handleImport} />
        )}
        
        {activeTab === 'settings' && (
          <Settings 
            settings={settings}
            onSaveSettings={handleSaveSettings}
          />
        )}
      </main>
      
      <footer className="app-footer">
        <div className="footer-info">
          <span>TabLocker</span>
          <span className="separator">|</span>
          <span className="privacy-note">100% Private & Encrypted</span>
          <span className="separator">|</span>
          <a href="https://github.com/your-username/tablocker" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
      </footer>
    </div>
  );
}

// Render the component
render(<Options />, document.getElementById('app'));
