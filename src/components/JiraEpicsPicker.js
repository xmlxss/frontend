import React, { useState, useEffect } from 'react';
import { jiraAPI } from '../services/api';
import { format } from 'date-fns';

function JiraEpicsPicker({ selectedEpics, onUpdate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [epics, setEpics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(selectedEpics);

  useEffect(() => {
    searchEpics('');
  }, []);

  const searchEpics = async (query) => {
    setLoading(true);
    try {
      const response = await jiraAPI.searchEpics(query);
      setEpics(response.data);
    } catch (error) {
      console.error('Error searching epics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 2 || query.length === 0) {
      searchEpics(query);
    }
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

  return (
    <div className="jira-epics-picker">
      <h2>Jira Epics (Project: DFS)</h2>
      
      <div className="search-section">
        <input
          type="text"
          placeholder="Search epics..."
          value={searchQuery}
          onChange={handleSearch}
          className="search-input"
        />
      </div>

      {selected.length > 0 && (
        <div className="selected-items">
          <h3>Selected Epics ({selected.length})</h3>
          <div className="selected-list">
            {selected.map(epic => (
              <div key={epic.key} className="selected-item">
                <div className="item-info">
                  <a href={epic.url} target="_blank" rel="noopener noreferrer" className="item-key">
                    {epic.key}
                  </a>
                  <span className="item-title">{epic.title}</span>
                  <span className="item-status">{epic.status}</span>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${epic.progress}%` }}></div>
                  </div>
                </div>
                <button onClick={() => toggleEpic(epic)} className="remove-btn">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="available-items">
        <h3>Available Epics</h3>
        {loading ? (
          <div className="loading">Searching...</div>
        ) : (
          <div className="items-list">
            {epics.filter(epic => !isEpicSelected(epic)).map(epic => (
              <div key={epic.key} className="item-card">
                <div className="item-header">
                  <a href={epic.url} target="_blank" rel="noopener noreferrer" className="item-key">
                    {epic.key}
                  </a>
                  <span className="item-status">{epic.status}</span>
                </div>
                <h4>{epic.title}</h4>
                <div className="epic-meta">
                  <div className="progress-info">
                    <span>Progress: {epic.progress}%</span>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${epic.progress}%` }}></div>
                    </div>
                  </div>
                  {epic.duedate && (
                    <span className="due-date">Due: {format(new Date(epic.duedate), 'MMM d, yyyy')}</span>
                  )}
                </div>
                <button onClick={() => toggleEpic(epic)} className="btn btn-primary">
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

export default JiraEpicsPicker;