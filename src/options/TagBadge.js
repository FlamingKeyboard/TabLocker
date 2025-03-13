import { h } from 'preact';
import { Icon } from '../options/index';

/**
 * Component for displaying a tag badge with a remove option
 */
function TagBadge({ tag, onRemove, showRemove = true }) {
  if (!tag) return null;
  
  return h('div', {
    className: "tag-badge",
    style: { backgroundColor: tag.color }
  }, [
    tag.name,
    showRemove && h('span', {
      className: "tag-badge-remove",
      onClick: (e) => {
        e.stopPropagation();
        onRemove(tag.id);
      }
    }, [
      h(Icon, { name: "x", size: "0.7em" })
    ])
  ]);
}

export default TagBadge;
