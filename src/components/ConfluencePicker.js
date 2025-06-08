import React, { useState, useEffect } from 'react';
import { confluenceAPI } from '../services/api';

function ConfluencePicker({ selectedPages, onUpdate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(selectedPages);

  useEffect(() => {
    searchPages('');
  }, []);

  const searchPages = async (query) => {
    setLoading(true);
    try {
      const response = await confluenceAPI.searchPages(query);
      setPages(response.data);
    } catch (error) {
      console.error('Error searching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 2 || query.length === 0) {
      searchPages(query);
    }
  };

  const togglePage = (page) => {
    const isSelected = selected.some(s => s.id === page.id);
    let newSelected;
    
    if (isSelected) {
      newSelected = selected.filter(s => s.id !== page.id);
    } else {
      newSelected = [...selected, page];
    }
    
    setSelected(newSelected);
    onUpdate(newSelected);
  };

  const isPageSelected = (page) => {
    return selected.some(s => s.id === page.id);
  };

  return (
    <div className="confluence-picker">
      <h2>Confluence Documentation (Space: FD)</h2>
      
      <div className="search-section">
        <input
          type="text"
          placeholder="Search pages..."
          value={searchQuery}
          onChange={handleSearch}
          className="search-input"
        />
      </div>

      {selected.length > 0 && (
        <div className="selected-items">
          <h3>Selected Pages ({selected.length})</h3>
          <div className="selected-list">
            {selected.map(page => (
              <div key={page.id} className="selected-item">
                <div className="item-info">
                  <a href={page.url} target="_blank" rel="noopener noreferrer" className="item-title">
                    {page.title}
                  </a>
                </div>
                <button onClick={() => togglePage(page)} className="remove-btn">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="available-items">
        <h3>Available Pages</h3>
        {loading ? (
          <div className="loading">Searching...</div>
        ) : (
          <div className="items-list">
            {pages.filter(page => !isPageSelected(page)).map(page => (
              <div key={page.id} className="item-card">
                <h4>
                  <a href={page.url} target="_blank" rel="noopener noreferrer">
                    {page.title}
                  </a>
                </h4>
                {page.excerpt && (
                  <p className="item-description">{page.excerpt}...</p>
                )}
                <button onClick={() => togglePage(page)} className="btn btn-primary">
                  Add to Project
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ConfluencePicker;