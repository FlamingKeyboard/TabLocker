import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import StorageService from '../services/StorageService';
import TagBadge from './TagBadge';
import TagSelector from './TagSelector';

/**
 * Component for displaying and managing tags for a tab group
 */
function TabGroupTags({ groupId, tags = [] }) {
  const [allTags, setAllTags] = useState([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [groupTags, setGroupTags] = useState(tags);
  
  // Reference to the storage service
  const storageService = useRef(new StorageService());
  
  // Load all tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoadingTags(true);
        const fetchedTags = await storageService.current.getAllTags();
        setAllTags(fetchedTags);
      } catch (error) {
        console.error('Error loading tags:', error);
      } finally {
        setLoadingTags(false);
      }
    };
    
    fetchTags();
  }, []);
  
  // Update group tags when the tags prop changes
  useEffect(() => {
    setGroupTags(tags);
  }, [tags]);
  
  // Handle tag add to group
  const handleAddTag = async (tagId) => {
    try {
      await storageService.current.addTagToTabGroup(groupId, tagId);
      
      // Get the updated group data to refresh the UI
      const updatedGroup = await storageService.current.getTabGroup(groupId);
      setGroupTags(updatedGroup.tags || []);
      
      setShowTagSelector(false);
    } catch (error) {
      console.error('Error adding tag to group:', error);
    }
  };
  
  // Handle tag remove from group
  const handleRemoveTag = async (tagId) => {
    try {
      await storageService.current.removeTagFromTabGroup(groupId, tagId);
      
      // Get the updated group data to refresh the UI
      const updatedGroup = await storageService.current.getTabGroup(groupId);
      setGroupTags(updatedGroup.tags || []);
    } catch (error) {
      console.error('Error removing tag from group:', error);
    }
  };
  
  // Find tag by id
  const getTagById = (tagId) => {
    return allTags.find(tag => tag.id === tagId);
  };
  
  return h('div', { className: "tab-group-tags-container" }, [
    h('div', { className: "tab-group-tags" }, [
      ...(groupTags && groupTags.map(tagId => {
        const tag = getTagById(tagId);
        return tag ? h(TagBadge, { key: tag.id, tag, onRemove: handleRemoveTag }) : null;
      })),
      
      h('button', { 
        className: "btn btn-sm btn-icon tag-add-button",
        onClick: (e) => {
          e.stopPropagation();
          setShowTagSelector(!showTagSelector);
        },
        title: "Add tags"
      }, [
        h('svg', {
          width: "1em", 
          height: "1em", 
          viewBox: "0 0 24 24", 
          fill: "none", 
          stroke: "currentColor", 
          strokeWidth: "2", 
          strokeLinecap: "round", 
          strokeLinejoin: "round"
        }, [
          h('path', { d: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" }),
          h('line', { x1: "7", y1: "7", x2: "7.01", y2: "7" })
        ])
      ])
    ]),
    
    showTagSelector && h('div', { className: "tag-selector-dropdown" }, [
      h(TagSelector, { 
        tags: allTags, 
        selectedTagIds: groupTags, 
        onTagSelect: handleAddTag, 
        loading: loadingTags 
      })
    ])
  ]);
}

export default TabGroupTags;
