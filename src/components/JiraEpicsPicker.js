import React, { useState, useEffect, useCallback } from 'react';
import { jiraAPI, debounce } from '../services/api';
import { format } from 'date-fns';
import '../styles/JiraEpicsPicker.css';

function JiraEpicsPicker({ selectedEpics, onUpdate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [epics, setEpics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(selectedEpics);
  const [showAll, setShowAll] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [startAt, setStartAt] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (showAll) {
      loadAllEpics();
    } else {
      searchEpics(searchQuery);
    }
  }, [showAll, statusFilter]);

  const loadAllEpics = async () => {
    setLoading(true);
    try {
      const response = await jiraAPI.getAllEpics({ 
        startAt: 0, 
        maxResults: 50,
        status: statusFilter 
      });
      setEpics(response.data.issues || response.data);
      setHasMore(response.data.total > response.data.issues?.length);
      setStartAt(50);
    } catch (error) {
      console.error('Error loading epics:', error);
      setEpics([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreEpics = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const response = showAll 
        ? await jiraAPI.getAllEpics({ startAt, maxResults: 50, status: statusFilter })
        : await jiraAPI.searchEpics(searchQuery, { startAt, maxResults: 50, status: statusFilter });
      
      const newEpics = response.data.issues || response.data;
      setEpics(prev => [...prev, ...newEpics]);
      setStartAt(prev => prev + 50);
      setHasMore(response.data.total > startAt + newEpics.length);
    } catch (error) {
      console.error('Error loading more epics:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchEpics = async (query) => {
    setLoading(true);
    setStartAt(0);
    try {
      const response = await jiraAPI.searchEpics(query, { 
        maxResults: 50,
        status: statusFilter 
      });
      setEpics(response.data.issues || response.data);
      setHasMore(response.data.total > response.data.issues?.length);
      setStartAt(50);
    } catch (error) {
      console.error('Error searching epics:', error);
      setEpics([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query) => {
      if (query.length > 0) {
        setShowAll(false);
        searchEpics(query);
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

  const toggleEpic = (epic) => {
    const isSelected = selected.some(s => s.key === epic.key);
    let newSelected;
    
    if (isSelected) {
      newSelected = selected.filter(s => s.key !== epic.key);
    } else {
      newSelected = [...selected, epic];
    }
    
    setSelected(newSelected);
    onUpdate(newSelected);
  };

  const isEpicSelected = (epic) => {
    return selected.some(s => s.key === epic.key);
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

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'var(--accent-green)';
    if (progress >= 50) return 'var(--accent-blue)';
    if (progress >= 20) return 'var(--accent-orange)';
    return 'var(--accent-red)';
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

  return (
    <div className="jira-epics-picker fade-in">
      <div className="picker-header">
        <div className="picker-title-section">
          <h2>Jira Epics</h2>
          <span className="picker-subtitle">Project: DFS • {epics.length} epics loaded</span>
        </div>
        <div className="picker-actions">
          <button 
            onClick={loadAllEpics} 
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
            placeholder="Search epics by title, description, or key..."
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
            <span className="filter-icon">📋</span>
            All Statuses
          </button>
          <button 
            className={`filter-tab ${statusFilter === 'In Progress' ? 'active' : ''}`}
            onClick={() => setStatusFilter('In Progress')}
          >
            <span className="filter-icon">🔄</span>
            In Progress
          </button>
          <button 
            className={`filter-tab ${statusFilter === 'To Do' ? 'active' : ''}`}
            onClick={() => setStatusFilter('To Do')}
          >
            <span className="filter-icon">📝</span>
            To Do
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
              <span className="icon">🎯</span>
              Selected Epics
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
            {selected.map(epic => (
              <div key={epic.key} className="selected-epic-card glass">
                <div className="epic-card-header">
                  <a href={epic.url} target="_blank" rel="noopener noreferrer" className="epic-key">
                    {epic.key}
                  </a>
                  <button onClick={() => toggleEpic(epic)} className="remove-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2"/>
                      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                </div>
                <h4 className="epic-title">{epic.title}</h4>
                <div className="epic-meta">
                  <span 
                    className="status-badge"
                    style={{ 
                      borderColor: getStatusColor(epic.status),
                      color: getStatusColor(epic.status)
                    }}
                  >
                    {epic.status}
                  </span>
                  {epic.progress !== undefined && (
                    <div className="progress-mini">
                      <div className="progress-bar mini">
                        <div 
                          className="progress-fill" 
                          style={{ 
                            width: `${epic.progress || 0}%`,
                            background: getProgressColor(epic.progress || 0)
                          }}
                        ></div>
                      </div>
                      <span className="progress-text">{epic.progress || 0}%</span>
                    </div>
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
            {statusFilter === 'all' ? 'All Epics' : `${statusFilter} Epics`}
            {searchQuery && ` matching "${searchQuery}"`}
          </h3>
          <div className="items-actions">
            <span className="items-count">{epics.filter(epic => !isEpicSelected(epic)).length} available</span>
          </div>
        </div>
        
        {loading && epics.length === 0 ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h4>Loading epics...</h4>
            <p>Fetching epic data from Jira</p>
          </div>
        ) : (
          <>
            <div className="items-grid">
              {epics.filter(epic => !isEpicSelected(epic)).length === 0 ? (
                <div className="empty-state-inline">
                  <div className="empty-icon">
                    <svg width="48\" height="48\" viewBox="0 0 24 24\" fill="none">
                      <circle cx="12\" cy="12\" r="10\" stroke="currentColor\" strokeWidth="2"/>
                      <path d="M16 16s-1.5-2-4-2-4 2-4 2\" stroke="currentColor\" strokeWidth="2"/>
                      <line x1="9\" y1="9\" x2="9.01\" y2="9\" stroke="currentColor\" strokeWidth="2"/>
                      <line x1="15\" y1="9\" x2="15.01\" y2="9\" stroke="currentColor\" strokeWidth="2"/>
                    </svg>
                  </div>
                  <h4>No epics found</h4>
                  <p>
                    {searchQuery 
                      ? `No epics match your search for "${searchQuery}"`
                      : 'No epics available with the current filters'
                    }
                  </p>
                </div>
              ) : (
                epics.filter(epic => !isEpicSelected(epic)).map(epic => (
                  <div key={epic.key} className="epic-card glass">
                    <div className="epic-card-header">
                      <div className="epic-key-section">
                        <a href={epic.url} target="_blank" rel="noopener noreferrer" className="epic-key">
                          {epic.key}
                        </a>
                        <span 
                          className="status-badge"
                          style={{ 
                            borderColor: getStatusColor(epic.status),
                            color: getStatusColor(epic.status)
                          }}
                        >
                          {epic.status}
                        </span>
                      </div>
                      <div className="epic-actions">
                        <button onClick={() => toggleEpic(epic)} className="btn btn-primary btn-sm">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2"/>
                            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          Add Epic
                        </button>
                      </div>
                    </div>
                    
                    <h4 className="epic-title">{epic.title}</h4>
                    
                    <div className="epic-progress-section">
                      <div className="progress-info">
                        <span className="progress-label">Progress</span>
                        <span className="progress-percentage">{epic.progress || 0}%</span>
                      </div>
                      <div className="progress-bar large">
                        <div 
                          className="progress-fill" 
                          style={{ 
                            width: `${epic.progress || 0}%`,
                            background: `linear-gradient(90deg, ${getProgressColor(epic.progress || 0)}, ${getProgressColor(epic.progress || 0)}dd)`
                          }}
                        >
                          <span className="progress-label-inner">{epic.progress || 0}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="epic-meta-grid">
                      {epic.duedate && (
                        <div className="meta-item">
                          <span className="meta-icon">📅</span>
                          <div className="meta-content">
                            <span className="meta-label">Due Date</span>
                            <span className="meta-value">{format(new Date(epic.duedate), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      )}
                      {epic.assignee && (
                        <div className="meta-item">
                          <span className="meta-icon">👤</span>
                          <div className="meta-content">
                            <span className="meta-label">Assignee</span>
                            <span className="meta-value">{epic.assignee}</span>
                          </div>
                        </div>
                      )}
                      {epic.storyCount > 0 && (
                        <div className="meta-item">
                          <span className="meta-icon">📋</span>
                          <div className="meta-content">
                            <span className="meta-label">Stories</span>
                            <span className="meta-value">{epic.storyCount} stories</span>
                          </div>
                        </div>
                      )}
                      {epic.priority && (
                        <div className="meta-item">
                          <span className="meta-icon">{getPriorityIcon(epic.priority)}</span>
                          <div className="meta-content">
                            <span className="meta-label">Priority</span>
                            <span className="meta-value">{epic.priority}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {epic.labels && epic.labels.length > 0 && (
                      <div className="epic-labels">
                        {epic.labels.slice(0, 3).map((label, index) => (
                          <span key={index} className="label-tag">
                            {label}
                          </span>
                        ))}
                        {epic.labels.length > 3 && (
                          <span className="label-tag more">+{epic.labels.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {hasMore && !loading && (
              <div className="load-more-section">
                <button onClick={loadMoreEpics} className="btn btn-secondary btn-large">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Load More Epics
                </button>
              </div>
            )}
            
            {loading && epics.length > 0 && (
              <div className="loading-more">
                <div className="loading-spinner"></div>
                <span>Loading more epics...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default JiraEpicsPicker;