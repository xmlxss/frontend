import React, { useState, useEffect } from 'react';
import { jiraAPI } from '../services/api';

function JiraIdeasPicker({ selectedIdeas, onUpdate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(selectedIdeas);

  useEffect(() => {
    searchIdeas('');
  }, []);

  const searchIdeas = async (query) => {
    setLoading(true);
    try {
      const response = await jiraAPI.searchIdeas(query);
      setIdeas(response.data);
    } catch (error) {
      console.error('Error searching ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 2 || query.length === 0) {
      searchIdeas(query);
    }
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

  return (
    <div className="jira-ideas-picker">
      <h2>Jira Ideas (Project: DPO)</h2>
      
      <div className="search-section">
        <input
          type="text"
          placeholder="Search ideas..."
          value={searchQuery}
          onChange={handleSearch}
          className="search-input"
        />
      </div>

      {selected.length > 0 && (
        <div className="selected-items">
          <h3>Selected Ideas ({selected.length})</h3>
          <div className="selected-list">
            {selected.map(idea => (
              <div key={idea.key} className="selected-item">
                <div className="item-info">
                  <a href={idea.url} target="_blank" rel="noopener noreferrer" className="item-key">
                    {idea.key}
                  </a>
                  <span className="item-title">{idea.summary}</span>
                  <span className="item-status">{idea.status}</span>
                </div>
                <button onClick={() => toggleIdea(idea)} className="remove-btn">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="available-items">
        <h3>Available Ideas</h3>
        {loading ? (
          <div className="loading">Searching...</div>
        ) : (
          <div className="items-list">
            {ideas.filter(idea => !isIdeaSelected(idea)).map(idea => (
              <div key={idea.key} className="item-card">
                <div className="item-header">
                  <a href={idea.url} target="_blank" rel="noopener noreferrer" className="item-key">
                    {idea.key}
                  </a>
                  <span className="item-status">{idea.status}</span>
                </div>
                <h4>{idea.summary}</h4>
                {idea.description && typeof idea.description === 'string' && (
                  <p className="item-description">{idea.description.substring(0, 150)}...</p>
                )}
                <button onClick={() => toggleIdea(idea)} className="btn btn-primary">
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

export default JiraIdeasPicker;