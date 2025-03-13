import { h } from 'preact';

/**
 * Component for selecting tags to add to a tab group
 */
function TagSelector({ tags, selectedTagIds = [], onTagSelect, loading = false }) {
  if (loading) {
    return h('div', { className: "tag-selector-loading" }, 'Loading tags...');
  }
  
  if (!tags || tags.length === 0) {
    return (
      h('div', { className: "tag-selector-empty" },
        h('p', null, 'No tags available. Create tags in the Tags tab.')
      )
    );
  }
  
  // Filter out already selected tags
  const availableTags = tags.filter(tag => !selectedTagIds.includes(tag.id));
  
  if (availableTags.length === 0) {
    return (
      h('div', { className: "tag-selector-empty" },
        h('p', null, 'All tags have been added to this group.')
      )
    );
  }
  
  return (
    h('div', { className: "tag-selector-list" },
      availableTags.map(tag => (
        h('div', { 
          key: tag.id, 
          className: "tag-selector-item",
          onClick: () => onTagSelect(tag.id)
        },
          h('div', { 
            className: "tag-selector-color", 
            style: { backgroundColor: tag.color }
          }),
          h('span', { className: "tag-selector-name" }, tag.name)
        )
      ))
    )
  );
}

export default TagSelector;
