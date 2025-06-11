import React, { useState, useEffect, useCallback } from 'react';
import { teamsAPI, debounce, projectAPI } from '../services/api';
import '../styles/DeveloperPicker.css';

function DeveloperPicker({ selectedDevelopers, onUpdate, maxTeamMembers = null, projectStartDate = null, projectEndDate = null }) {
  const [allDevelopers, setAllDevelopers] = useState([]);
  const [displayedDevelopers, setDisplayedDevelopers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(selectedDevelopers);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTeam, setActiveTeam] = useState('all');
  const [availableTeams, setAvailableTeams] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [developerAvailability, setDeveloperAvailability] = useState({});

  useEffect(() => {
    fetchDevelopers();
    fetchAllProjects();
  }, []);

  useEffect(() => {
    filterDevelopers();
  }, [searchQuery, activeTeam, allDevelopers]);

  useEffect(() => {
    setSelected(selectedDevelopers);
  }, [selectedDevelopers]);

  useEffect(() => {
    if (allProjects.length > 0 && projectStartDate && projectEndDate) {
      checkDeveloperAvailability();
    }
  }, [allProjects, projectStartDate, projectEndDate]);

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

  const fetchAllProjects = async () => {
    try {
      const response = await projectAPI.getAll();
      setAllProjects(response.data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setAllProjects([]);
    }
  };

  // Calculate project progress based on linked epics
  const calculateProjectProgress = (project) => {
    if (!project.jira_epics || project.jira_epics.length === 0) {
      return 0;
    }

    const totalProgress = project.jira_epics.reduce((sum, epic) => {
      return sum + (epic.progress || 0);
    }, 0);

    return Math.round(totalProgress / project.jira_epics.length);
  };

  const checkDeveloperAvailability = () => {
    const availability = {};
    const today = new Date();
    const newProjectStart = new Date(projectStartDate);
    const newProjectEnd = new Date(projectEndDate);

    allDevelopers.forEach(developer => {
      availability[developer.id] = {
        available: true,
        conflicts: []
      };

      // Check all projects for conflicts
      allProjects.forEach(project => {
        if (!project.developers) return;
        
        // Check if developer is assigned to this project
        const isAssigned = project.developers.some(dev => dev.id === developer.id);
        if (!isAssigned) return;
        
        const projectStart = new Date(project.start_date);
        const projectEnd = new Date(project.end_date);
        const projectProgress = calculateProjectProgress(project);
        
        // Skip if project is completed (90%+ progress)
        if (projectProgress >= 90) return;
        
        // Skip if project has already ended
        if (projectEnd < today) return;
        
        // Check for date overlap with new project
        const hasOverlap = (newProjectStart <= projectEnd && newProjectEnd >= projectStart);
        
        if (hasOverlap) {
          availability[developer.id].available = false;
          availability[developer.id].conflicts.push({
            project: project,
            startDate: projectStart,
            endDate: projectEnd,
            progress: projectProgress
          });
        }
      });
    });

    setDeveloperAvailability(availability);
  };

  const filterDevelopers = () => {
    let filtered = [...allDevelopers];

    if (activeTeam !== 'all') {
      filtered = filtered.filter(dev => 
        dev.teams?.includes(activeTeam) || dev.primary_team === activeTeam
      );
    }

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
      // Check if adding this developer would exceed max team members
      if (maxTeamMembers && selected.length >= maxTeamMembers) {
        return; // Don't add if at capacity
      }
      newSelected = [...selected, developer];
    }
    
    setSelected(newSelected);
    onUpdate(newSelected);
  };

  const isDeveloperSelected = (developer) => {
    return selected.some(s => s.id === developer.id);
  };

  const isDeveloperAvailable = (developer) => {
    if (!projectStartDate || !projectEndDate) return true;
    return developerAvailability[developer.id]?.available !== false;
  };

  const getDeveloperConflicts = (developer) => {
    return developerAvailability[developer.id]?.conflicts || [];
  };

  const isAtCapacity = () => {
    return maxTeamMembers && selected.length >= maxTeamMembers;
  };

  const getCapacityPercentage = () => {
    if (!maxTeamMembers) return 0;
    return Math.round((selected.length / maxTeamMembers) * 100);
  };

  const getCapacityStatus = () => {
    const percentage = getCapacityPercentage();
    if (percentage >= 100) return 'full';
    if (percentage >= 80) return 'nearly-full';
    return 'available';
  };

  const getCapacityColor = () => {
    const status = getCapacityStatus();
    switch (status) {
      case 'full': return '#ff3b30';
      case 'nearly-full': return '#ff9500';
      default: return '#34c759';
    }
  };

  const getTeamColor = (team) => {
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

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get availability stats
  const getAvailabilityStats = () => {
    const total = displayedDevelopers.length;
    const available = displayedDevelopers.filter(dev => isDeveloperAvailable(dev)).length;
    const busy = total - available;
    
    return { total, available, busy };
  };

  const availabilityStats = getAvailabilityStats();

  return (
    <div className="developer-picker fade-in">
      <div className="picker-header">
        <div className="picker-title-section">
          <h2>Team Members</h2>
          <span className="picker-subtitle">
            {allDevelopers.length} total members • {availableTeams.length} teams
            {projectStartDate && projectEndDate && (
              <span> • Availability checked for project dates</span>
            )}
          </span>
        </div>
        <div className="picker-actions">
          <button 
            onClick={fetchDevelopers} 
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

      {/* Availability Stats */}
      {projectStartDate && projectEndDate && (
        <div className="availability-stats glass">
          <div className="stats-header">
            <h3>
              <span className="stats-icon">📊</span>
              Developer Availability
            </h3>
            <span className="stats-subtitle">
              For project period: {new Date(projectStartDate).toLocaleDateString()} - {new Date(projectEndDate).toLocaleDateString()}
            </span>
          </div>
          <div className="stats-grid">
            <div className="stat-item available">
              <div className="stat-number">{availabilityStats.available}</div>
              <div className="stat-label">Available</div>
              <div className="stat-icon">🟢</div>
            </div>
            <div className="stat-item busy">
              <div className="stat-number">{availabilityStats.busy}</div>
              <div className="stat-label">Busy</div>
              <div className="stat-icon">🔴</div>
            </div>
            <div className="stat-item total">
              <div className="stat-number">{availabilityStats.total}</div>
              <div className="stat-label">Total</div>
              <div className="stat-icon">👥</div>
            </div>
          </div>
        </div>
      )}

      {/* Team Capacity Indicator */}
      {maxTeamMembers && (
        <div className="team-capacity-indicator">
          <div className="capacity-info">
            <span className="capacity-text">
              Team Capacity: {selected.length}/{maxTeamMembers}
            </span>
            <span className="capacity-percentage">({getCapacityPercentage()}%)</span>
          </div>
          <div className="capacity-bar-mini">
            <div 
              className="capacity-fill-mini"
              style={{ 
                width: `${Math.min(getCapacityPercentage(), 100)}%`,
                backgroundColor: getCapacityColor()
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Capacity Warning */}
      {maxTeamMembers && getCapacityStatus() !== 'available' && (
        <div className={`capacity-warning ${getCapacityStatus() === 'full' ? 'full' : ''}`}>
          <span className="warning-icon">
            {getCapacityStatus() === 'full' ? '🚫' : '⚠️'}
          </span>
          <div className="warning-content">
            <strong>
              {getCapacityStatus() === 'full' ? 'Team at Maximum Capacity' : 'Approaching Team Capacity'}
            </strong>
            <p>
              {getCapacityStatus() === 'full' 
                ? `This project has reached its maximum team size of ${maxTeamMembers} members. Remove a member before adding new ones.`
                : `This project is approaching its maximum team size of ${maxTeamMembers} members.`
              }
            </p>
          </div>
        </div>
      )}
      
      <div className="search-section">
        <div className="search-input-container">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, or team..."
            onChange={handleSearch}
            className="search-input"
          />
        </div>
        
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${activeTeam === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTeam('all')}
          >
            <span className="filter-icon">👥</span>
            All Teams
          </button>
          {availableTeams.slice(0, 4).map(team => (
            <button 
              key={team}
              className={`filter-tab ${activeTeam === team ? 'active' : ''}`}
              onClick={() => setActiveTeam(team)}
            >
              <span 
                className="team-color-dot"
                style={{ backgroundColor: getTeamColor(team) }}
              ></span>
              {team}
            </button>
          ))}
          {availableTeams.length > 4 && (
            <select 
              className="filter-tab select-tab"
              value={activeTeam}
              onChange={(e) => setActiveTeam(e.target.value)}
            >
              <option value="">More Teams...</option>
              {availableTeams.slice(4).map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="selected-items glass">
          <div className="selected-header">
            <h3>
              <span className="icon">👥</span>
              Assigned Members
              <span className="count-badge">{selected.length}</span>
              {maxTeamMembers && (
                <span className="capacity-badge">
                  / {maxTeamMembers} max
                </span>
              )}
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
          <div className="developer-grid selected-grid">
            {selected.map(developer => (
              <div key={developer.id} className="developer-card selected glass">
                <div className="developer-avatar-container">
                  {developer.avatar ? (
                    <img 
                      src={developer.avatar} 
                      alt={developer.name} 
                      className="developer-avatar" 
                    />
                  ) : (
                    <div className="developer-avatar-fallback">
                      {getInitials(developer.name)}
                    </div>
                  )}
                  <div className="online-indicator"></div>
                </div>
                <div className="developer-info">
                  <h4 className="developer-name">{developer.name}</h4>
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
                        <span 
                          className="team-color-dot"
                          style={{ backgroundColor: getTeamColor(developer.primary_team) }}
                        ></span>
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
                        <span 
                          className="team-color-dot"
                          style={{ backgroundColor: getTeamColor(team) }}
                        ></span>
                        {team}
                      </span>
                    ))}
                    {developer.teams?.length > 3 && (
                      <span className="team-badge more">+{developer.teams.length - 3}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => toggleDeveloper(developer)} className="remove-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2"/>
                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </button>
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
          <div className="items-actions">
            <span className="items-count">
              {displayedDevelopers.filter(dev => !isDeveloperSelected(dev)).length} available
            </span>
          </div>
        </div>
        
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h4>Loading team members...</h4>
            <p>Fetching member data from Teams</p>
          </div>
        ) : (
          <div className="developer-grid">
            {displayedDevelopers.length === 0 ? (
              <div className="empty-state-inline">
                <div className="empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <h4>No team members found</h4>
                <p>No team members match your current search and filters.</p>
              </div>
            ) : (
              displayedDevelopers.filter(dev => !isDeveloperSelected(dev)).map(developer => {
                const canAdd = !isAtCapacity();
                const isAvailable = isDeveloperAvailable(developer);
                const conflicts = getDeveloperConflicts(developer);
                const canAssign = canAdd && isAvailable;
                
                return (
                  <div 
                    key={developer.id} 
                    className={`developer-card glass ${!canAssign ? 'disabled' : ''} ${!isAvailable ? 'unavailable' : ''}`}
                    onClick={() => canAssign && toggleDeveloper(developer)}
                  >
                    <div className="developer-avatar-container">
                      {developer.avatar ? (
                        <img 
                          src={developer.avatar} 
                          alt={developer.name} 
                          className="developer-avatar" 
                        />
                      ) : (
                        <div className="developer-avatar-fallback">
                          {getInitials(developer.name)}
                        </div>
                      )}
                      <div className={`availability-indicator ${isAvailable ? 'available' : 'busy'}`}>
                        {isAvailable ? '🟢' : '🔴'}
                      </div>
                    </div>
                    <div className="developer-info">
                      <h4 className="developer-name">{developer.name}</h4>
                      <p className="developer-email">{developer.email}</p>
                      
                      {/* Availability Status */}
                      {projectStartDate && projectEndDate && (
                        <div className="availability-status">
                          {isAvailable ? (
                            <span className="status-available">
                              <span className="status-icon">✅</span>
                              Available for project
                            </span>
                          ) : (
                            <span className="status-busy">
                              <span className="status-icon">⚠️</span>
                              Busy ({conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''})
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Show conflicts if any */}
                      {conflicts.length > 0 && (
                        <div className="conflicts-info">
                          <div className="conflicts-header">
                            <span className="conflicts-icon">📅</span>
                            <span className="conflicts-text">Project Conflicts:</span>
                          </div>
                          {conflicts.slice(0, 2).map((conflict, index) => (
                            <div key={index} className="conflict-item">
                              <span className="conflict-project">{conflict.project.title}</span>
                              <span className="conflict-dates">
                                {conflict.startDate.toLocaleDateString()} - {conflict.endDate.toLocaleDateString()}
                              </span>
                              <span className="conflict-progress">({conflict.progress}% complete)</span>
                            </div>
                          ))}
                          {conflicts.length > 2 && (
                            <div className="conflicts-more">
                              +{conflicts.length - 2} more conflicts
                            </div>
                          )}
                        </div>
                      )}
                      
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
                            <span 
                              className="team-color-dot"
                              style={{ backgroundColor: getTeamColor(developer.primary_team) }}
                            ></span>
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
                            <span 
                              className="team-color-dot"
                              style={{ backgroundColor: getTeamColor(team) }}
                            ></span>
                            {team}
                          </span>
                        ))}
                        {developer.teams?.length > 3 && (
                          <span className="team-badge more">+{developer.teams.length - 3}</span>
                        )}
                      </div>
                    </div>
                    <div className="developer-actions">
                      <button 
                        className={`btn btn-primary btn-sm ${!canAssign ? 'disabled' : ''}`}
                        disabled={!canAssign}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2"/>
                          <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        {!canAdd ? 'Team Full' : !isAvailable ? 'Unavailable' : 'Add Member'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DeveloperPicker;