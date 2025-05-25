import { useState, ChangeEvent } from 'react';
import './SearchFilter.css';

type SearchFilterProps = {
  onSearch: (searchText: string) => void;
  availableTags: string[];
  selectedTags: string[];
  onTagSelect: (tags: string[]) => void;
};

const SearchFilter: React.FC<SearchFilterProps> = ({
  onSearch,
  availableTags,
  selectedTags,
  onTagSelect
}) => {
  const [searchText, setSearchText] = useState<string>('');
  const [showTagMenu, setShowTagMenu] = useState<boolean>(false);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setSearchText(text);
    onSearch(text);
  };

  const handleTagClick = (tag: string) => {
    const updatedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    onTagSelect(updatedTags);
  };

  const toggleTagMenu = () => {
    setShowTagMenu(!showTagMenu);
  };

  return (
    <div className="search-filter">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchText}
          onChange={handleSearchChange}
          className="search-input"
        />
      </div>

      <div className="filter-container">
        <button 
          className="filter-toggle"
          onClick={toggleTagMenu}
        >
          Filter by Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
        </button>
        
        {showTagMenu && (
          <div className="tag-menu">
            {availableTags.length === 0 ? (
              <div className="no-tags">No tags available</div>
            ) : (
              <>
                <div className="tag-list">
                  {availableTags.map(tag => (
                    <div 
                      key={tag}
                      className={`tag-item ${selectedTags.includes(tag) ? 'selected' : ''}`}
                      onClick={() => handleTagClick(tag)}
                    >
                      {tag}
                    </div>
                  ))}
                </div>
                {selectedTags.length > 0 && (
                  <button 
                    className="clear-tags"
                    onClick={() => onTagSelect([])}
                  >
                    Clear All
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchFilter;
