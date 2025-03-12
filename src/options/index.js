/**
 * TabLocker Options Page
 * 
 * The main UI for managing saved tabs, including search, import/export,
 * and configuration options.
 */

import { h, render, Fragment } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import StorageService from '../services/StorageService';
import ExportImportService from '../services/ExportImportService';
import TabService from '../services/TabService';
import { createNotificationManager } from '../components/Toast';
import './options.css';
import './toast.css';

// Create a simple notification manager
const notificationManager = createNotificationManager();

// Highlight text helper - highlights matching parts of text based on search query
function HighlightText({ text, searchQuery, className = '' }) {
  // If no search query or no matchInfo, just return the text
  if (!searchQuery || !text) {
    return <span className={className}>{text}</span>;
  }
  
  // Case insensitive search
  const lowerText = text.toLowerCase();
  const lowerQuery = searchQuery.toLowerCase();
  
  if (!lowerText.includes(lowerQuery)) {
    return <span className={className}>{text}</span>;
  }
  
  const parts = [];
  let lastIndex = 0;
  let startIndex = lowerText.indexOf(lowerQuery);
  
  while (startIndex !== -1) {
    // Add the non-matching part before the match
    if (startIndex > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.substring(lastIndex, startIndex)}
        </span>
      );
    }
    
    // Add the matching part with highlighting
    parts.push(
      <span key={`highlight-${startIndex}`} className="search-highlight">
        {text.substring(startIndex, startIndex + lowerQuery.length)}
      </span>
    );
    
    // Move past this match for the next iteration
    lastIndex = startIndex + lowerQuery.length;
    startIndex = lowerText.indexOf(lowerQuery, lastIndex);
  }
  
  // Add any text after the last match
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-end`}>
        {text.substring(lastIndex)}
      </span>
    );
  }
  
  return <span className={className}>{parts}</span>;
}

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
  const [fullTabData, setFullTabData] = useState(null);
  const [loadingTabs, setLoadingTabs] = useState(false);
  
  // Add isEditing flag to the group object to track if any editing is happening
  // This will be used by parent component to disable dragging of all groups when any group is being edited
  useEffect(() => {
    if (isEditingGroupName || editingTabIndex !== null) {
      onUpdateGroup(group.id, { isEditing: true }, false); // false = don't persist this flag to storage
    } else {
      onUpdateGroup(group.id, { isEditing: false }, false);
    }
  }, [isEditingGroupName, editingTabIndex]);
  
  // Format date from timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString();
  };
  
  // Handle tab drag start
  const handleTabDragStart = (index) => {
    // Prevent drag start if any editing is happening
    if (isEditingGroupName || editingTabIndex !== null) {
      return;
    }
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
  
  // Load full tab data if not already available
  // This is particularly important for search results which may not have the full tabs data
  const loadFullTabDataIfNeeded = async () => {
    // If we already have tabs data or are already loading, don't reload
    if ((group.tabs && group.tabs.length > 0) || fullTabData || loadingTabs) {
      return;
    }
    
    console.log(`Loading full tab data for group ${group.id}`);
    setLoadingTabs(true);
    
    try {
      // Use the existing StorageService instance
      chrome.runtime.sendMessage(
        { action: 'getTabGroup', id: group.id },
        (response) => {
          if (response && response.success && response.group) {
            const fullGroup = response.group;
            console.log(`Successfully loaded ${fullGroup.tabs ? fullGroup.tabs.length : 0} tabs for group ${group.id}`);
            setFullTabData(fullGroup);
          } else {
            console.error(`Failed to load tab data for group ${group.id}`, response?.error || 'Unknown error');
          }
          setLoadingTabs(false);
        }
      );
    } catch (error) {
      console.error(`Error loading tab data for group ${group.id}:`, error);
      setLoadingTabs(false);
    }
  };

  // Reset drag states
  const handleTabDragEnd = () => {
    setDraggedTabIndex(null);
    setDragOverTabIndex(null);
  };

  // Handle expansion state change
  useEffect(() => {
    if (expanded) {
      loadFullTabDataIfNeeded();
    }
  }, [expanded]);

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
                {group.matchInfo && group.matchInfo.field === 'name' ? (
                  <HighlightText 
                    text={group.name} 
                    searchQuery={group.matchInfo.query} 
                  />
                ) : (
                  group.name
                )}
                <button 
                  className="btn-icon edit-icon" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingGroupName(true);
                  }} 
                  title="Edit group name"
                >
                  <Icon name="edit-2" size="0.8em" />
                </button>
              </h3>
            </div>
          )}
          <div className="tab-group-meta">
            <span className="tab-group-date">
              {group.matchInfo && group.matchInfo.field === 'date' ? (
                <HighlightText 
                  text={formatDate(group.created)} 
                  searchQuery={group.matchInfo.query} 
                />
              ) : (
                formatDate(group.created)
              )}
            </span>
            <span className="tab-group-count">{group.tabCount} tab{group.tabCount !== 1 && 's'}</span>
          </div>
        </div>
        
        <div className="tab-group-actions">
          <button 
            className="btn btn-sm btn-primary"
            onClick={() => onRestore(group.id)}
            title="Restore all tabs"
          >
            <Icon name="external-link" /> Restore All
          </button>
          
          <button 
            className="btn btn-sm btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            title={expanded ? "Collapse" : "Expand"}
          >
            <Icon name={expanded ? "chevron-up" : "chevron-down"} /> {expanded ? "Collapse" : "Expand"}
          </button>
          
          <button 
            className="btn btn-sm btn-danger"
            onClick={() => onDelete(group.id)}
            title="Delete group"
          >
            <Icon name="trash-2" /> Delete
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="tab-list">
          {loadingTabs && (
            <div className="loading-tabs">
              <p>Loading tabs...</p>
            </div>
          )}
          
          {!loadingTabs && !fullTabData && !group.tabs && (
            <div className="no-tabs">
              <p>No tabs available. This might be due to a data loading issue.</p>
            </div>
          )}
          
          {((fullTabData && fullTabData.tabs) || group.tabs) && 
           ((fullTabData ? fullTabData.tabs : group.tabs).map((tab, index) => (
            <div 
              key={index} 
              className={`tab-item ${draggedTabIndex === index ? 'tab-dragging' : ''} ${dragOverTabIndex === index ? 'tab-drag-over' : ''}`}
              draggable={editingTabIndex === null}
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
                    {group.matchInfo && group.matchInfo.field === 'title' ? (
                      <HighlightText 
                        text={tab.title || "Untitled Tab"} 
                        searchQuery={group.matchInfo.query} 
                      />
                    ) : (
                      tab.title || "Untitled Tab"
                    )}
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
                      <Icon name="edit-2" size="0.8em" />
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
                    {group.matchInfo && group.matchInfo.field === 'url' ? (
                      <HighlightText 
                        text={tab.url} 
                        searchQuery={group.matchInfo.query} 
                      />
                    ) : (
                      tab.url
                    )}
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
                      <Icon name="edit-2" size="0.8em" />
                    </button>
                  </div>
                )}
              </div>
              
              <button 
                className="btn btn-sm btn-link"
                onClick={() => onRestoreTab(tab)}
                title="Restore this tab"
              >
                <Icon name="external-link" /> Restore
              </button>
            </div>
          )))}
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
        <Icon name="search" /> Search
      </button>
    </form>
  );
}

// Export/Import Component
function ExportImport({ onImport, showToast }) {
  const [exportPassword, setExportPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importText, setImportText] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const exportImportService = new ExportImportService();
  const storageService = new StorageService();
  const fileInputRef = useRef(null);
  const dragDropAreaRef = useRef(null);

  const handleExport = async (format) => {
    try {
      setIsExporting(true);
      // Get all tab groups
      const groups = await storageService.getAllTabGroups();
      
      if (groups.length === 0) {
        showToast('No tab groups to export', 'warning');
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
        setIsExporting(false);
        return;
      }

      // Show export options dialog with download and copy options
      const dialog = document.createElement('div');
      dialog.className = 'export-options-dialog';
      dialog.innerHTML = `
        <div class="export-options-content">
          <h3>Export Options</h3>
          <div class="export-options-buttons">
            <button class="download-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download as File
            </button>
            <button class="copy-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
              Copy to Clipboard
            </button>
          </div>
          <button class="close-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `;
      
      document.body.appendChild(dialog);
      
      // Add event listeners
      dialog.querySelector('.download-btn').addEventListener('click', () => {
        exportImportService.downloadAsFile(exportData, filename);
        showToast('Export saved to file successfully!', 'success');
        document.body.removeChild(dialog);
      });
      
      dialog.querySelector('.copy-btn').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(exportData);
          showToast('Copied to clipboard!', 'success');
        } catch (error) {
          console.error('Failed to copy:', error);
          showToast('Failed to copy to clipboard', 'error');
        }
        document.body.removeChild(dialog);
      });
      
      dialog.querySelector('.close-btn').addEventListener('click', () => {
        document.body.removeChild(dialog);
      });
      
      // Close on click outside
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          document.body.removeChild(dialog);
        }
      });
      
      setIsExporting(false);
    } catch (error) {
      console.error('Export error:', error);
      showToast(`Export failed: ${error.message}`);
    }
  };
  
  const handleImport = async () => {
    try {
      if (!importText.trim()) {
        showToast('Please enter import data', 'warning');
        return;
      }
      
      setIsImporting(true);
      
      if (importPassword) {
        exportImportService.setPassword(importPassword);
      }
      
      const result = await exportImportService.autoImport(importText, importPassword);
      
      if (result.type === 'tablocker') {
        // Handle TabLocker format import
        showToast('TabLocker import successful!', 'success');
        onImport(result.data);
      } else if (result.type === 'onetab') {
        // Handle OneTab format import
        showToast('OneTab import successful!', 'success');
        onImport(result.data);
      }
      setIsImporting(false);
      
      // Clear the import form
      setImportText('');
      setImportPassword('');
    } catch (error) {
      console.error('Import error:', error);
      showToast(`Import failed: ${error.message}`, 'error');
      setIsImporting(false);
    }
  };

  // Handle file import
  const handleFileImport = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) {
        return;
      }
      
      setIsImporting(true);
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
              showToast('TabLocker import successful!', 'success');
              onImport(result.data);
            } else if (result.type === 'onetab') {
              showToast('OneTab import successful!', 'success');
              onImport(result.data);
            }
            
            // Clear the import form
            setImportText('');
            setImportPassword('');
          }
          setIsImporting(false);
        } catch (error) {
          console.error('File import error:', error);
          showToast(`File import failed: ${error.message}`, 'error');
          setIsImporting(false);
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
  
  // Set up drag and drop handlers
  useEffect(() => {
    const dragDropArea = dragDropAreaRef.current;
    if (!dragDropArea) return;
    
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragDropArea.classList.add('dragover');
    };
    
    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragDropArea.classList.remove('dragover');
    };
    
    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragDropArea.classList.remove('dragover');
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const fileInput = fileInputRef.current;
        if (fileInput) {
          // Create a new FileList-like object or directly set the files
          try {
            // Modern browsers
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(e.dataTransfer.files[0]);
            fileInput.files = dataTransfer.files;
          } catch (error) {
            // Fallback for older browsers
            console.error('DataTransfer not supported:', error);
            // Just trigger the file input click as fallback
            triggerFileInput();
            return;
          }
          
          // Trigger the change event manually
          const event = new Event('change', { bubbles: true });
          fileInput.dispatchEvent(event);
        }
      }
    };
    
    dragDropArea.addEventListener('dragover', handleDragOver);
    dragDropArea.addEventListener('dragleave', handleDragLeave);
    dragDropArea.addEventListener('drop', handleDrop);
    
    return () => {
      dragDropArea.removeEventListener('dragover', handleDragOver);
      dragDropArea.removeEventListener('dragleave', handleDragLeave);
      dragDropArea.removeEventListener('drop', handleDrop);
    };
  }, []);
  
  return (
    <div className="export-import-container">
      
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
              <Icon name="lock" /> Export Encrypted
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => handleExport('onetab')}
              title="Export in OneTab compatible format (download or copy)"
            >
              <Icon name="share" /> Export OneTab Compatible
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
              disabled={isImporting}
            >
              {isImporting ? 'Importing...' : 'Import'}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={triggerFileInput}
              title="Import from file"
              disabled={isImporting}
            >
              <Icon name="file-plus" /> Import from File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.tlbk,text/plain"
              onChange={handleFileImport}
              style={{ display: 'none' }}
            />
          </div>
          
          {/* Drag and drop area */}
          <div 
            className="drag-drop-area" 
            ref={dragDropAreaRef}
            onClick={triggerFileInput}
          >
            <Icon name="upload-cloud" size="2.5em" />
            <p>Drag and drop a file here or click to select</p>
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
              <label htmlFor="password"><Icon name="key" /> Encryption Password:</label>
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
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  <Icon name={showPassword ? "eye-off" : "eye"} />
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
              <Icon name="save" /> Save Settings
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// Custom SVG icon component that doesn't rely on external libraries
function Icon({ name, className = '', size = '1em', ...rest }) {
  // Collection of SVG path data for different icons
  const iconPaths = {
    // Export/Import related icons
    'download': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-download ${className}`} style={{ width: size, height: size }} {...rest}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
    
    'clipboard-copy': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-clipboard ${className}`} style={{ width: size, height: size }} {...rest}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>,
    
    'lock': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-lock ${className}`} style={{ width: size, height: size }} {...rest}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
    
    'share': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-share ${className}`} style={{ width: size, height: size }} {...rest}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>,
    
    'x': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-x ${className}`} style={{ width: size, height: size }} {...rest}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
    
    'file-plus': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-file-plus ${className}`} style={{ width: size, height: size }} {...rest}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>,
    
    'upload': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-upload ${className}`} style={{ width: size, height: size }} {...rest}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>,
    
    'upload-cloud': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-upload-cloud ${className}`} style={{ width: size, height: size }} {...rest}><polyline points="16 16 12 12 8 16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path><polyline points="16 16 12 12 8 16"></polyline></svg>,
    
    // Settings icons
    'settings': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-settings ${className}`} style={{ width: size, height: size }} {...rest}><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
    
    'save': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-save ${className}`} style={{ width: size, height: size }} {...rest}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>,
    
    'key': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-key ${className}`} style={{ width: size, height: size }} {...rest}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>,
    
    'eye': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-eye ${className}`} style={{ width: size, height: size }} {...rest}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
    
    'eye-off': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-eye-off ${className}`} style={{ width: size, height: size }} {...rest}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>,
    
    // Tab management icons
    'trash-2': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-trash-2 ${className}`} style={{ width: size, height: size }} {...rest}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>,
    
    'external-link': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-external-link ${className}`} style={{ width: size, height: size }} {...rest}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>,
    
    'search': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-search ${className}`} style={{ width: size, height: size }} {...rest}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    
    'edit-2': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-edit-2 ${className}`} style={{ width: size, height: size }} {...rest}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>,
    
    'chevron-down': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-chevron-down ${className}`} style={{ width: size, height: size }} {...rest}><polyline points="6 9 12 15 18 9"></polyline></svg>,
    
    'chevron-up': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-chevron-up ${className}`} style={{ width: size, height: size }} {...rest}><polyline points="18 15 12 9 6 15"></polyline></svg>,
    
    'refresh-cw': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-refresh-cw ${className}`} style={{ width: size, height: size }} {...rest}><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>,
    
    'database': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-database ${className}`} style={{ width: size, height: size }} {...rest}><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>,
    
    'layers': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`feather feather-layers ${className}`} style={{ width: size, height: size }} {...rest}><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
  };
  
  // Return the SVG for the requested icon, or null if not found
  return iconPaths[name] || null;
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
  // Simple notification helper function - only show for errors
  const showToast = (message, type = 'info') => {
    // Only display notifications for errors
    if (type === 'error') {
      notificationManager.showNotification(message, type);
    }
    // For non-errors, we can log to console for debugging if needed
    console.log(`${type}: ${message}`);
  };
  
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
        showToast('Error loading data', 'error');
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);
  
  // Load tab groups from storage
  async function loadTabGroups() {
    try {
      console.log('loadTabGroups called, searchQuery:', searchQuery);
      let groups;
      
      if (searchQuery) {
        console.log('Calling searchTabGroups with query:', searchQuery);
        groups = await storageService.searchTabGroups(searchQuery);
        console.log('Search returned', groups.length, 'results');
      } else {
        console.log('Getting all tab groups');
        groups = await storageService.getAllTabGroups();
      }
      
      console.log('Processing search results...');
      
      // If this is a search result, we need a different approach
      if (searchQuery) {
        console.log('Search mode: Will display results directly without reloading full data');
        
        // For search results, we'll use the metadata we already have
        // and add tab counts where available
        const searchResultGroups = [];
        
        for (let i = 0; i < groups.length; i++) {
          try {
            const group = groups[i];
            // Add debugging information to track which search terms matched
            console.log(`Including search result ${i+1}/${groups.length}: Group ID ${group.id}, Name: ${group.name}`);
            
            // For search results, we only need minimal processing
            // The full details are already loaded by searchTabGroups
            searchResultGroups.push({
              ...group,
              tabCount: group.tabCount || 0, // Use existing count or default to 0
              _searchMatch: true // Mark as a search match for debugging
            });
          } catch (error) {
            console.error(`Error processing search result ${groups[i]?.id}:`, error);
          }
        }
        
        console.log(`Setting tab groups with ${searchResultGroups.length} search results`);
        setTabGroups(searchResultGroups);
      } else {
        // Normal loading (not search)
        console.log('Normal mode: Loading full data for each group');
        const fullGroups = [];
        let needsOrderUpdate = false;
        
        for (let i = 0; i < groups.length; i++) {
          try {
            const group = groups[i];
            const fullGroup = await storageService.getTabGroup(group.id);
            
            // Check if orderIndex needs to be initialized
            if (fullGroup && fullGroup.orderIndex === undefined) {
              fullGroup.orderIndex = i;
              needsOrderUpdate = true;
              // Update in background without waiting
              storageService.updateTabGroup(fullGroup.id, { orderIndex: i })
                .catch(err => console.error(`Error setting initial orderIndex for group ${fullGroup.id}:`, err));
            }
            
            if (fullGroup) {
              fullGroup.tabCount = fullGroup.tabs ? fullGroup.tabs.length : 0;
              fullGroups.push(fullGroup);
            }
          } catch (error) {
            console.error(`Error loading group ${group.id}:`, error);
          }
        }
        
        console.log(`Setting tab groups with ${fullGroups.length} groups from normal load`);
        setTabGroups(fullGroups);
      }
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
    console.log('handleSearch called with query:', query);
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
      
      showToast('Tab group deleted!', 'success');
    } catch (error) {
      console.error('Error deleting tab group:', error);
      showToast(`Error deleting tab group: ${error.message}`, 'error');
    }
  };
  
  // Handle updating a tab group
  const handleUpdateGroup = async (groupId, updates, persist = true) => {
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
      
      // Save to storage (unless persist is false)
      if (persist) {
        await storageService.updateTabGroup(groupId, updates);
      }
      
      showToast('Group updated!', 'success');
    } catch (error) {
      console.error('Error updating group:', error);
      showToast(`Error updating group: ${error.message}`, 'error');
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
      
      showToast('Tab updated!', 'success');
    } catch (error) {
      console.error('Error updating tab:', error);
      showToast(`Error updating tab: ${error.message}`, 'error');
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
      
      showToast('Tab order updated!', 'success');
    } catch (error) {
      console.error('Error reordering tabs:', error);
      showToast(`Error updating tab order: ${error.message}`, 'error');
    }
  };
  
  // Handle group drag start
  const handleGroupDragStart = (index) => {
    // Don't allow dragging if any group is being edited
    if (tabGroups.some(g => g.isEditing)) {
      return;
    }
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
        const updatePromises = [];
        
        // Update orderIndex for each group
        for (let i = 0; i < updatedGroups.length; i++) {
          // Add order updates to a batch of promises
          updatePromises.push(
            storageService.updateTabGroup(updatedGroups[i].id, { orderIndex: i })
          );
        }
        
        // Wait for all updates to complete
        await Promise.all(updatePromises);
        
        showToast('Group order updated!', 'success');
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
            <Icon name="database" /> Saved Tabs
          </li>
          <li 
            className={activeTab === 'export-import' ? 'active' : ''}
            onClick={() => setActiveTab('export-import')}
          >
            <Icon name="share" /> Export/Import
          </li>
          <li 
            className={activeTab === 'settings' ? 'active' : ''}
            onClick={() => setActiveTab('settings')}
          >
            <Icon name="settings" /> Settings
          </li>
        </ul>
      </nav>
      
      <main className="app-content">
        {/* Notifications are now created dynamically by the notification manager */}
        
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
                    draggable={tabGroups.every(g => !g.isEditing)}
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
          <ExportImport onImport={handleImport} showToast={showToast} />
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
