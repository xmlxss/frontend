import React, { useState, useEffect, useCallback } from 'react';
import { jiraAPI, debounce } from '../services/api';
import { format } from 'date-fns';

function JiraIdeasPicker({ selectedIdeas, onUpdate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(selectedIdeas);
  const [showAll, setShowAll] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [startAt, setStartAt] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (showAll) {
      loadAllIdeas();
    } else {
      searchIdeas(searchQuery);
    }
  }, [showAll, statusFilter]);

  const loadAllIdeas = async () => {
    setLoading(true);
    try {
      const response = await jiraAPI.getAllIdeas({ 
        startAt: 0, 
        maxResults: 50,
        status: statusFilter 
      });
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
        ? await jiraAPI.getAllIdeas({ startAt, maxResults: 50, status: statusFilter })
        : await jiraAPI.searchIdeas(searchQuery, { startAt, maxResults: 50, status: statusFilter });
      
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
      const response = await jiraAPI.searchIdeas(query, { 
        maxResults: 50,
        status: statusFilter 
      });
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
    [statusFilter]
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
      'Review': 'var(--accent-purple)',
      'Closed': 'var(--accent-green)',
      'Open': 'var(--accent-blue)'
    };
    return colors[status] || 'var(--text-tertiary)';
  };

  const getPriorityIcon = (priority) => {
    const icons = {
      'Highest': '🔴',
      'High': '🟠',
      'Medium': '🟡',
      'Low': '🟢',
      'Lowest': '🔵'
    };
    return icons[priority] || '⚪';
  };

  const getIdeaTypeIcon = (type) => {
    const icons = {
      'Idea': '💡',
      'Feature': '⭐',
      'Improvement': '🔧',
      'Bug': '🐛',
      'Task': '📋'
    };
    return icons[type] || '💡';
  };

  return (
    <div className="jira-ideas-picker fade-in">
      <div className="picker-header">
        <div className="picker-title-section">
          <h2>Jira Ideas</h2>
          <span className="picker-subtitle">Project: DPO • {ideas.length} ideas loaded</span>
        </div>
        <div className="picker-actions">
          <button 
            onClick={loadAllIdeas} 
            className="btn btn-secondary"
            disabled={loading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>
      
      <div className="search-section">
        <div className="search-input-container">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <input
            type="text"
            placeholder="Search ideas by title, description, or ID..."
            value={searchQuery}
            onChange={handleSearch}
            className="search-input"
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => {
                setSearchQuery('');
                setShowAll(true);
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2"/>
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          )}
        </div>
        
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <span className="filter-icon">💡</span>
            All Ideas
          </button>
          <button 
            className={`filter-tab ${statusFilter === 'Open' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Open')}
          >
            <span className="filter-icon">🔓</span>
            Open
          </button>
          <button 
            className={`filter-tab ${statusFilter === 'In Progress' ? 'active' : ''}`}
            onClick={() => setStatusFilter('In Progress')}
          >
            <span className="filter-icon">🔄</span>
            In Progress
          </button>
          <button 
            className={`filter-tab ${statusFilter === 'Done' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Done')}
          >
            <span className="filter-icon">✅</span>
            Done
          </button>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="selected-items glass">
          <div className="selected-header">
            <h3>
              <span className="icon">💡</span>
              Selected Ideas
              <span className="count-badge">{selected.length}</span>
            </h3>
            <button 
              className="clear-all-btn"
              onClick={() => {
                setSelected([]);
                onUpdate([]);
              }}
            >
              Clear All
            </button>
          </div>
          <div className="selected-grid">
            {selected.map(idea => (
              <div key={idea.key} className="selected-idea-card glass">
                <div className="idea-card-header">
                  <a href={idea.url} target="_blank" rel="noopener noreferrer" className="idea-key">
                    {idea.key}
                  </a>
                  <button onClick={() => toggleIdea(idea)} className="remove-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2"/>
                      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                </div>
                <h4 className="idea-title">{idea.summary}</h4>
                <div className="idea-meta">
                  <span 
                    className="status-badge"
                    style={{ 
                      borderColor: getStatusColor(idea.status),
                      color: getStatusColor(idea.status)
                    }}
                  >
                    {idea.status}
                  </span>
                  {idea.priority && (
                    <span className="priority-badge">
                      {getPriorityIcon(idea.priority)} {idea.priority}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="available-items">
        <div className="items-header">
          <h3>
            {statusFilter === 'all' ? 'All Ideas' : `${statusFilter} Ideas`}
            {searchQuery && ` matching "${searchQuery}"`}
          </h3>
          <div className="items-actions">
            <span className="items-count">{ideas.filter(idea => !isIdeaSelected(idea)).length} available</span>
          </div>
        </div>
        
        {loading && ideas.length === 0 ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h4>Loading ideas...</h4>
            <p>Fetching idea data from Jira</p>
          </div>
        ) : (
          <>
            <div className="items-grid">
              {ideas.filter(idea => !isIdeaSelected(idea)).length === 0 ? (
                <div className="empty-state-inline">
                  <div className="empty-icon">
                    <svg width="48\" height="48\" viewBox="0 0 24 24\" fill="none">
                      <circle cx="12\" cy="12\" r="10\" stroke="currentColor\" strokeWidth="2"/>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3\" stroke="currentColor\" strokeWidth="2"/>
                      <line x1="12\" y1="17\" x2="12.01\" y2="17\" stroke="currentColor\" strokeWidth="2"/>
                    </svg>
                  </div>
                  <h4>No ideas found</h4>
                  <p>
                    {searchQuery 
                      ? `No ideas match your search for "${searchQuery}"`
                      : 'No ideas available with the current filters'
                    }
                  </p>
                </div>
              ) : (
                ideas.filter(idea => !isIdeaSelected(idea)).map(idea => (
                  <div key={idea.key} className="idea-card glass">
                    <div className="idea-card-header">
                      <div className="idea-key-section">
                        <span className="idea-type-icon">{getIdeaTypeIcon('Idea')}</span>
                        <a href={idea.url} target="_blank" rel="noopener noreferrer" className="idea-key">
                          {idea.key}
                        </a>
                        <span 
                          className="status-badge"
                          style={{ 
                            borderColor: getStatusColor(idea.status),
                            color: getStatusColor(idea.status)
                          }}
                        >
                          {idea.status}
                        </span>
                      </div>
                      <div className="idea-actions">
                        <button onClick={() => toggleIdea(idea)} className="btn btn-primary btn-sm">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2"/>
                            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          Add Idea
                        </button>
                      </div>
                    </div>
                    
                    <h4 className="idea-title">{idea.summary}</h4>
                    
                    {idea.description && typeof idea.description === 'string' && (
                      <p className="idea-description">
                        {idea.description.substring(0, 150)}
                        {idea.description.length > 150 && '...'}
                      </p>
                    )}
                    
                    <div className="idea-meta-grid">
                      {idea.assignee && (
                        <div className="meta-item">
                          <span className="meta-icon">👤</span>
                          <div className="meta-content">
                            <span className="meta-label">Assignee</span>
                            <span className="meta-value">{idea.assignee}</span>
                          </div>
                        </div>
                      )}
                      {idea.priority && (
                        <div className="meta-item">
                          <span className="meta-icon">{getPriorityIcon(idea.priority)}</span>
                          <div className="meta-content">
                            <span className="meta-label">Priority</span>
                            <span className="meta-value">{idea.priority}</span>
                          </div>
                        </div>
                      )}
                      {idea.created && (
                        <div className="meta-item">
                          <span className="meta-icon">📅</span>
                          <div className="meta-content">
                            <span className="meta-label">Created</span>
                            <span className="meta-value">{format(new Date(idea.created), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      )}
                      {idea.updated && (
                        <div className="meta-item">
                          <span className="meta-icon">🔄</span>
                          <div className="meta-content">
                            <span className="meta-label">Updated</span>
                            <span className="meta-value">{format(new Date(idea.updated), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {idea.labels && idea.labels.length > 0 && (
                      <div className="idea-labels">
                        {idea.labels.slice(0, 3).map((label, index) => (
                          <span key={index} className="label-tag">
                            {label}
                          </span>
                        ))}
                        {idea.labels.length > 3 && (
                          <span className="label-tag more">+{idea.labels.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {hasMore && !loading && (
              <div className="load-more-section">
                <button onClick={loadMoreIdeas} className="btn btn-secondary btn-large">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Load More Ideas
                </button>
              </div>
            )}
            
            {loading && ideas.length > 0 && (
              <div className="loading-more">
                <div className="loading-spinner"></div>
                <span>Loading more ideas...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default JiraIdeasPicker;