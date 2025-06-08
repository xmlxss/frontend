import React, { useState, useEffect } from 'react';
import { teamsAPI } from '../services/api';

function DeveloperPicker({ selectedDevelopers, onUpdate }) {
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(selectedDevelopers);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDevelopers();
  }, []);

  const fetchDevelopers = async () => {
    setLoading(true);
    try {
      const response = await teamsAPI.getMembers();
      setDevelopers(response.data);
    } catch (error) {
      console.error('Error fetching developers:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDeveloper = (developer) => {
    const isSelected = selected.some(s => s.id === developer.id);
    let newSelected;
    
    if (isSelected) {
      newSelected = selected.filter(s => s.id !== developer.id);
    } else {
      newSelected = [...selected, developer];
    }
    
    setSelected(newSelected);
    onUpdate(newSelected);
  };

  const isDeveloperSelected = (developer) => {
    return selected.some(s => s.id === developer.id);
  };

  const filteredDevelopers = developers.filter(dev => 
    dev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dev.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="developer-picker">
      <h2>Team Members</h2>
      
      <div className="search-section">
        <input
          type="text"
          placeholder="Search team members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {selected.length > 0 && (
        <div className="selected-items">
          <h3>Assigned Developers ({selected.length})</h3>
          <div className="developer-grid">
            {selected.map(developer => (
              <div key={developer.id} className="developer-card selected">
                <img src={developer.avatar} alt={developer.name} className="developer-avatar" />
                <div className="developer-info">
                  <h4>{developer.name}</h4>
                  <p>{developer.email}</p>
                  <span className="developer-role">{developer.role}</span>
                </div>
                <button onClick={() => toggleDeveloper(developer)} className="remove-btn">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="available-items">
        <h3>Available Team Members</h3>
        {loading ? (
          <div className="loading">Loading team members...</div>
        ) : (
          <div className="developer-grid">
            {filteredDevelopers.filter(dev => !isDeveloperSelected(dev)).map(developer => (
              <div key={developer.id} className="developer-card" onClick={() => toggleDeveloper(developer)}>
                <img src={developer.avatar} alt={developer.name} className="developer-avatar" />
                <div className="developer-info">
                  <h4>{developer.name}</h4>
                  <p>{developer.email}</p>
                  <span className="developer-role">{developer.role}</span>
                </div>
                <button className="btn btn-sm btn-primary">Add</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DeveloperPicker;