import React, { useState, useEffect, useCallback } from 'react';
import { jiraAPI, debounce } from '../services/api';
import { format } from 'date-fns';

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

  return (
    <div className="jira-epics-picker fade-in">
      <div className="picker-header">
        <h2>Jira Epics</h2>
        <span className="picker-subtitle">Project: DFS</span>
      </div>
      
      <div className="search-section">
        <input
          type="text"
          placeholder="Search epics by title, description, or key..."
          value={searchQuery}
          onChange={handleSearch}
          className="search-input"
        />
        
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Statuses
          </button>
          <button 
            className={`filter-tab ${statusFilter === 'In Progress' ? 'active' : ''}`}
            onClick={() => setStatusFilter('In Progress')}
          >
            In Progress
          </button>
          <button 
            className={`filter-tab ${statusFilter === 'To Do' ? 'active' : ''}`}
            onClick={() => setStatusFilter('To Do')}
          >
            To Do
          </button>
          <button 
            className={`filter-tab ${statusFilter === 'Done' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Done')}
          >
            Done
          </button>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="selected-items glass">
          <h3>
            <span className="icon">🎯</span>
            Selected Epics ({selected.length})
          </h3>
          <div className="selected-list">
            {selected.map(epic => (
              <div key={epic.key} className="selected-item">
                <div className="item-info">
                  <a href={epic.url} target="_blank" rel="noopener noreferrer" className="item-key">
                    {epic.key}
                  </a>
                  <span className="item-title">{epic.title}</span>
                  <span 
                    className="item-status"
                    style={{ 
                      borderColor: getStatusColor(epic.status),
                      color: getStatusColor(epic.status)
                    }}
                  >
                    {epic.status}
                  </span>
                  <div className="progress-bar mini">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${epic.progress || 0}%`,
                        background: getProgressColor(epic.progress || 0)
                      }}
                    ></div>
                  </div>
                </div>
                <button onClick={() => toggleEpic(epic)} className="remove-btn">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="available-items">
        <div className="items-header">
          <h3>Available Epics</h3>
          <span className="items-count">{epics.length} epics loaded</span>
        </div>
        
        {loading && epics.length === 0 ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <span>Loading epics...</span>
          </div>
        ) : (
          <>
            <div className="items-list">
              {epics.filter(epic => !isEpicSelected(epic)).map(epic => (
                <div key={epic.key} className="item-card glass epic-card">
                  <div className="item-header">
                    <a href={epic.url} target="_blank" rel="noopener noreferrer" className="item-key">
                      {epic.key}
                    </a>
                    <span 
                      className="item-status"
                      style={{ 
                        borderColor: getStatusColor(epic.status),
                        color: getStatusColor(epic.status)
                      }}
                    >
                      {epic.status}
                    </span>
                  </div>
                  <h4>{epic.title}</h4>
                  
                  <div className="epic-progress">
                    <div className="progress-info">
                      <span>Progress</span>
                      <span className="progress-percentage">{epic.progress || 0}%</span>
                    </div>
                    <div className="progress-bar large">
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${epic.progress || 0}%`,
                          background: `linear-gradient(90deg, ${getProgressColor(epic.progress || 0)}, ${getProgressColor(epic.progress || 0)})`
                        }}
                      >
                        <span className="progress-label">{epic.progress || 0}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="epic-meta">
                    {epic.duedate && (
                      <span className="due-date">
                        <span className="icon">📅</span>
                        Due: {format(new Date(epic.duedate), 'MMM d, yyyy')}
                      </span>
                    )}
                    {epic.assignee && (
                      <span className="meta-item">
                        <span className="icon">👤</span>
                        {epic.assignee}
                      </span>
                    )}
                    {epic.storyCount > 0 && (
                      <span className="meta-item">
                        <span className="icon">📋</span>
                        {epic.storyCount} stories
                      </span>
                    )}
                  </div>
                  
                  {epic.labels && epic.labels.length > 0 && (
                    <div className="epic-labels">
                      {epic.labels.map((label, index) => (
                        <span key={index} className="label-tag">
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <button onClick={() => toggleEpic(epic)} className="btn btn-primary">
                    Add to Project
                  </button>
                </div>
              ))}
            </div>
            
            {hasMore && !loading && (
              <div className="load-more-section">
                <button onClick={loadMoreEpics} className="btn btn-secondary">
                  Load More Epics
                </button>
              </div>
            )}
            
            {loading && epics.length > 0 && (
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

export default JiraEpicsPicker;