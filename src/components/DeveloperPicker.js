import React, { useState, useEffect, useCallback } from 'react';
import { teamsAPI, debounce } from '../services/api';

function DeveloperPicker({ selectedDevelopers, onUpdate }) {
  const [allDevelopers, setAllDevelopers] = useState([]); // Store all developers
  const [displayedDevelopers, setDisplayedDevelopers] = useState([]); // Filtered developers to display
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(selectedDevelopers);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTeam, setActiveTeam] = useState('all'); // Filter by team
  const [availableTeams, setAvailableTeams] = useState([]); // List of unique teams

  useEffect(() => {
    fetchDevelopers();
  }, []);

  useEffect(() => {
    // Filter developers based on search query and active team
    filterDevelopers();
  }, [searchQuery, activeTeam, allDevelopers]);

  const fetchDevelopers = async () => {
    setLoading(true);
    try {
      const response = await teamsAPI.getMembers();
      const developers = response.data || [];
      setAllDevelopers(developers);
      setDisplayedDevelopers(developers);
      
      // Extract unique teams
      const teams = new Set();
      developers.forEach(dev => {
        if (dev.primary_team && dev.primary_team !== 'No Team Assigned') {
          teams.add(dev.primary_team);
        }
        // Also add individual teams
        dev.teams?.forEach(team => teams.add(team));
      });
      setAvailableTeams(Array.from(teams).sort());
    } catch (error) {
      console.error('Error fetching developers:', error);
      setAllDevelopers([]);
      setDisplayedDevelopers([]);
    } finally {
      setLoading(false);
    }
  };

  const filterDevelopers = () => {
    let filtered = [...allDevelopers];

    // Apply team filter
    if (activeTeam !== 'all') {
      filtered = filtered.filter(dev => 
        dev.teams?.includes(activeTeam) || dev.primary_team === activeTeam
      );
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(dev => 
        dev.name.toLowerCase().includes(query) ||
        dev.email.toLowerCase().includes(query) ||
        dev.primary_team?.toLowerCase().includes(query) ||
        dev.teams?.some(team => team.toLowerCase().includes(query))
      );
    }

    setDisplayedDevelopers(filtered);
  };

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((query) => {
      setSearchQuery(query);
    }, 300),
    []
  );

  const handleSearch = (e) => {
    const query = e.target.value;
    debouncedSearch(query);
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

  const getTeamColor = (team) => {
    // Generate consistent color based on team name
    const colors = [
      'var(--accent-blue)',
      'var(--accent-green)',
      'var(--accent-purple)',
      'var(--accent-orange)',
      'var(--accent-cyan)',
      'var(--accent-red)'
    ];
    
    let hash = 0;
    for (let i = 0; i < team.length; i++) {
      hash = team.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="developer-picker fade-in">
      <div className="picker-header">
        <h2>Team Members</h2>
        <span className="picker-subtitle">{allDevelopers.length} total members</span>
      </div>
      
      <div className="search-section">
        <input
          type="text"
          placeholder="Search by name, email, or team..."
          onChange={handleSearch}
          className="search-input"
        />
        
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${activeTeam === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTeam('all')}
          >
            All Teams
          </button>
          {availableTeams.slice(0, 5).map(team => (
            <button 
              key={team}
              className={`filter-tab ${activeTeam === team ? 'active' : ''}`}
              onClick={() => setActiveTeam(team)}
            >
              {team}
            </button>
          ))}
          {availableTeams.length > 5 && (
            <select 
              className="filter-tab"
              value={activeTeam}
              onChange={(e) => setActiveTeam(e.target.value)}
            >
              <option value="">More Teams...</option>
              {availableTeams.slice(5).map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="selected-items glass">
          <h3>
            <span className="icon">👥</span>
            Assigned Members ({selected.length})
          </h3>
          <div className="developer-grid">
            {selected.map(developer => (
              <div key={developer.id} className="developer-card selected glass">
                <img 
                  src={developer.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(developer.name)}&background=random`} 
                  alt={developer.name} 
                  className="developer-avatar" 
                />
                <div className="developer-info">
                  <h4>{developer.name}</h4>
                  <p>{developer.email}</p>
                  <div className="developer-teams">
                    {developer.primary_team && developer.primary_team !== 'No Team Assigned' && (
                      <span 
                        className="team-badge primary"
                        style={{ 
                          background: `${getTeamColor(developer.primary_team)}20`,
                          color: getTeamColor(developer.primary_team),
                          borderColor: getTeamColor(developer.primary_team) 
                        }}
                      >
                        {developer.primary_team}
                      </span>
                    )}
                    {developer.teams?.filter(team => team !== developer.primary_team).map((team, index) => (
                      <span 
                        key={index}
                        className="team-badge"
                        style={{ 
                          background: `${getTeamColor(team)}10`,
                          color: getTeamColor(team),
                          borderColor: getTeamColor(team) 
                        }}
                      >
                        {team}
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={() => toggleDeveloper(developer)} className="remove-btn">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="available-items">
        <div className="items-header">
          <h3>
            {activeTeam === 'all' ? 'All Team Members' : `Team: ${activeTeam}`}
          </h3>
          <span className="items-count">
            {displayedDevelopers.filter(dev => !isDeveloperSelected(dev)).length} available
          </span>
        </div>
        
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <span>Loading team members...</span>
          </div>
        ) : (
          <div className="developer-grid">
            {displayedDevelopers.length === 0 ? (
              <div className="empty-state">
                <p>No team members found matching your search.</p>
              </div>
            ) : (
              displayedDevelopers.filter(dev => !isDeveloperSelected(dev)).map(developer => (
                <div 
                  key={developer.id} 
                  className="developer-card glass" 
                  onClick={() => toggleDeveloper(developer)}
                >
                  <img 
                    src={developer.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(developer.name)}&background=random`} 
                    alt={developer.name} 
                    className="developer-avatar" 
                  />
                  <div className="developer-info">
                    <h4>{developer.name}</h4>
                    <p className="developer-email">{developer.email}</p>
                    <div className="developer-teams">
                      {developer.primary_team && developer.primary_team !== 'No Team Assigned' && (
                        <span 
                          className="team-badge primary"
                          style={{ 
                            background: `${getTeamColor(developer.primary_team)}20`,
                            color: getTeamColor(developer.primary_team),
                            borderColor: getTeamColor(developer.primary_team) 
                          }}
                        >
                          {developer.primary_team}
                        </span>
                      )}
                      {developer.teams?.filter(team => team !== developer.primary_team).slice(0, 2).map((team, index) => (
                        <span 
                          key={index}
                          className="team-badge"
                          style={{ 
                            background: `${getTeamColor(team)}10`,
                            color: getTeamColor(team),
                            borderColor: getTeamColor(team) 
                          }}
                        >
                          {team}
                        </span>
                      ))}
                      {developer.teams?.length > 3 && (
                        <span className="team-badge more">+{developer.teams.length - 3}</span>
                      )}
                    </div>
                  </div>
                  <button className="btn btn-sm btn-primary">Add</button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DeveloperPicker;