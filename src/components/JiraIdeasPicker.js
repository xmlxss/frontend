import React, { useState, useEffect, useCallback } from 'react';
import { jiraAPI, debounce } from '../services/api';

function JiraIdeasPicker({ selectedIdeas, onUpdate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(selectedIdeas);
  const [showAll, setShowAll] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [startAt, setStartAt] = useState(0);

  useEffect(() => {
    if (showAll) {
      loadAllIdeas();
    } else {
      searchIdeas(searchQuery);
    }
  }, [showAll]);

  const loadAllIdeas = async () => {
    setLoading(true);
    try {
      const response = await jiraAPI.getAllIdeas({ startAt: 0, maxResults: 50 });
      setIdeas(response.data.issues || response.data);
      setHasMore(response.data.total > response.data.issues?.length);
      setStartAt(50);
    } catch (error) {
      console.error('Error loading ideas:', error);
      setIdeas([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreIdeas = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const response = showAll 
        ? await jiraAPI.getAllIdeas({ startAt, maxResults: 50 })
        : await jiraAPI.searchIdeas(searchQuery, { startAt, maxResults: 50 });
      
      const newIdeas = response.data.issues || response.data;
      setIdeas(prev => [...prev, ...newIdeas]);
      setStartAt(prev => prev + 50);
      setHasMore(response.data.total > startAt + newIdeas.length);
    } catch (error) {
      console.error('Error loading more ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchIdeas = async (query) => {
    setLoading(true);
    setStartAt(0);
    try {
      const response = await jiraAPI.searchIdeas(query, { maxResults: 50 });
      setIdeas(response.data.issues || response.data);
      setHasMore(response.data.total > response.data.issues?.length);
      setStartAt(50);
    } catch (error) {
      console.error('Error searching ideas:', error);
      setIdeas([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query) => {
      if (query.length > 0) {
        setShowAll(false);
        searchIdeas(query);
      } else {
        setShowAll(true);
      }
    }, 500),
    []
  );

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const toggleIdea = (idea) => {
    const isSelected = selected.some(s => s.key === idea.key);
    let newSelected;
    
    if (isSelected) {
      newSelected = selected.filter(s => s.key !== idea.key);
    } else {
      newSelected = [...selected, idea];
    }
    
    setSelected(newSelected);
    onUpdate(newSelected);
  };

  const isIdeaSelected = (idea) => {
    return selected.some(s => s.key === idea.key);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Done': 'var(--accent-green)',
      'In Progress': 'var(--accent-blue)',
      'To Do': 'var(--text-secondary)',
      'Blocked': 'var(--accent-red)',
      'Review': 'var(--accent-purple)'
    };
    return colors[status] || 'var(--text-tertiary)';
  };

  return (
    <div className="jira-ideas-picker fade-in">
      <div className="picker-header">
        <h2>Jira Ideas</h2>
        <span className="picker-subtitle">Project: DPO</span>
      </div>
      
      <div className="search-section">
        <input
          type="text"
          placeholder="Search ideas by title, description, or ID..."
          value={searchQuery}
          onChange={handleSearch}
          className="search-input"
        />
        <div className="search-hints">
          {searchQuery ? (
            <span>Searching for "{searchQuery}"</span>
          ) : (
            <span>Showing all ideas • Use search to filter</span>
          )}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="selected-items glass">
          <h3>
            <span className="icon">✓</span>
            Selected Ideas ({selected.length})
          </h3>
          <div className="selected-list">
            {selected.map(idea => (
              <div key={idea.key} className="selected-item">
                <div className="item-info">
                  <a href={idea.url} target="_blank" rel="noopener noreferrer" className="item-key">
                    {idea.key}
                  </a>
                  <span className="item-title">{idea.summary}</span>
                  <span 
                    className="item-status"
                    style={{ 
                      borderColor: getStatusColor(idea.status),
                      color: getStatusColor(idea.status)
                    }}
                  >
                    {idea.status}
                  </span>
                </div>
                <button onClick={() => toggleIdea(idea)} className="remove-btn">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="available-items">
        <div className="items-header">
          <h3>Available Ideas</h3>
          <span className="items-count">{ideas.length} items loaded</span>
        </div>
        
        {loading && ideas.length === 0 ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <span>Loading ideas...</span>
          </div>
        ) : (
          <>
            <div className="items-list">
              {ideas.filter(idea => !isIdeaSelected(idea)).map(idea => (
                <div key={idea.key} className="item-card glass">
                  <div className="item-header">
                    <a href={idea.url} target="_blank" rel="noopener noreferrer" className="item-key">
                      {idea.key}
                    </a>
                    <span 
                      className="item-status"
                      style={{ 
                        borderColor: getStatusColor(idea.status),
                        color: getStatusColor(idea.status)
                      }}
                    >
                      {idea.status}
                    </span>
                  </div>
                  <h4>{idea.summary}</h4>
                  {idea.description && typeof idea.description === 'string' && (
                    <p className="item-description">
                      {idea.description.substring(0, 200)}
                      {idea.description.length > 200 && '...'}
                    </p>
                  )}
                  <div className="item-meta">
                    {idea.assignee && (
                      <span className="meta-item">
                        <span className="icon">👤</span> {idea.assignee}
                      </span>
                    )}
                    {idea.priority && (
                      <span className="meta-item">
                        <span className="icon">⚡</span> {idea.priority}
                      </span>
                    )}
                  </div>
                  <button onClick={() => toggleIdea(idea)} className="btn btn-primary">
                    Add to Project
                  </button>
                </div>
              ))}
            </div>
            
            {hasMore && !loading && (
              <div className="load-more-section">
                <button onClick={loadMoreIdeas} className="btn btn-secondary">
                  Load More Ideas
                </button>
              </div>
            )}
            
            {loading && ideas.length > 0 && (
              <div className="loading-more">
                <div className="loading-spinner"></div>
                <span>Loading more...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default JiraIdeasPicker;