import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { projectAPI } from '../services/api';
import { format, differenceInDays, addDays, isAfter, isBefore, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import '../styles/ProjectsTimeline.css';

function ProjectsTimeline() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' or 'gantt'
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'active', 'completed', 'urgent'
  const [sortBy, setSortBy] = useState('start_date'); // 'start_date', 'priority', 'progress'

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
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

  const getProjectStatus = (project) => {
    const progress = calculateProjectProgress(project);
    const today = new Date();
    const endDate = new Date(project.end_date);
    const daysRemaining = differenceInDays(endDate, today);
    
    if (progress >= 90) return { label: 'Near Completion', color: '#00d4aa', icon: '🎯' };
    if (progress >= 75) return { label: 'On Track', color: '#34c759', icon: '✅' };
    if (daysRemaining < 7 && progress < 75) return { label: 'At Risk', color: '#ff9500', icon: '⚠️' };
    if (daysRemaining < 0) return { label: 'Overdue', color: '#ff3b30', icon: '🚨' };
    if (progress < 25) return { label: 'Getting Started', color: '#007aff', icon: '🚀' };
    return { label: 'In Progress', color: '#007aff', icon: '⏳' };
  };

  const getPriorityIcon = (priority) => {
    if (priority === 1) return '🥇';
    if (priority <= 3) return '🔴';
    if (priority <= 5) return '🟠';
    if (priority <= 10) return '🟡';
    return '🟢';
  };

  const getPriorityClass = (priority) => {
    if (priority <= 3) return 'priority-very-high';
    if (priority <= 5) return 'priority-high';
    if (priority <= 10) return 'priority-medium';
    if (priority <= 20) return 'priority-low';
    return 'priority-very-low';
  };

  // Filter and sort projects
  const getFilteredAndSortedProjects = () => {
    let filtered = [...projects];

    // Apply filters
    switch (filterBy) {
      case 'active':
        filtered = filtered.filter(p => {
          const progress = calculateProjectProgress(p);
          return progress > 0 && progress < 90;
        });
        break;
      case 'completed':
        filtered = filtered.filter(p => calculateProjectProgress(p) >= 90);
        break;
      case 'urgent':
        filtered = filtered.filter(p => p.company_priority <= 5);
        break;
      default:
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'start_date':
        filtered.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        break;
      case 'priority':
        filtered.sort((a, b) => (a.company_priority || 999) - (b.company_priority || 999));
        break;
      case 'progress':
        filtered.sort((a, b) => calculateProjectProgress(b) - calculateProjectProgress(a));
        break;
      default:
        break;
    }

    return filtered;
  };

  const filteredProjects = getFilteredAndSortedProjects();

  // Calculate timeline bounds
  const timelineBounds = useMemo(() => {
    if (filteredProjects.length === 0) return null;

    const startDates = filteredProjects.map(p => new Date(p.start_date));
    const endDates = filteredProjects.map(p => new Date(p.end_date));
    
    const earliestStart = new Date(Math.min(...startDates));
    const latestEnd = new Date(Math.max(...endDates));
    
    // Add some padding
    const paddedStart = addDays(earliestStart, -30);
    const paddedEnd = addDays(latestEnd, 30);
    
    const totalDays = differenceInDays(paddedEnd, paddedStart);
    
    return {
      start: paddedStart,
      end: paddedEnd,
      totalDays
    };
  }, [filteredProjects]);

  // Generate month markers
  const monthMarkers = useMemo(() => {
    if (!timelineBounds) return [];
    
    return eachMonthOfInterval({
      start: timelineBounds.start,
      end: timelineBounds.end
    }).map(date => ({
      date,
      label: format(date, 'MMM yyyy'),
      position: getPositionForDate(date)
    }));
  }, [timelineBounds]);

  const getPositionForDate = (date) => {
    if (!timelineBounds) return 0;
    const daysDiff = differenceInDays(date, timelineBounds.start);
    return Math.max(0, Math.min(100, (daysDiff / timelineBounds.totalDays) * 100));
  };

  const getWidth = (start, end) => {
    const startPos = getPositionForDate(start);
    const endPos = getPositionForDate(end);
    return Math.max(2, endPos - startPos);
  };

  const getDaysRemaining = (project) => {
    const today = new Date();
    const endDate = new Date(project.end_date);
    const days = differenceInDays(endDate, today);
    
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  };

  const getProjectDuration = (project) => {
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);
    return differenceInDays(endDate, startDate) + 1;
  };

  // Calculate dashboard stats
  const totalProjects = filteredProjects.length;
  const activeProjects = filteredProjects.filter(p => {
    const progress = calculateProjectProgress(p);
    return progress > 0 && progress < 90;
  }).length;
  const completedProjects = filteredProjects.filter(p => calculateProjectProgress(p) >= 90).length;
  const urgentProjects = filteredProjects.filter(p => p.company_priority <= 5).length;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-card glass">
          <div className="loading-spinner large"></div>
          <h3>Loading projects timeline...</h3>
          <p>Please wait while we fetch your project data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="projects-timeline-page">
      {/* Hero Section */}
      <div className="timeline-hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="timeline-title">
              <span className="title-icon">📅</span>
              Projects Timeline
            </h1>
            <p className="timeline-subtitle">
              Visualize all your projects across time with interactive timeline views
            </p>
          </div>
          
          <div className="hero-actions">
            <Link to="/new" className="btn btn-primary btn-large hero-btn">
              <span>✨</span>
              New Project
            </Link>
          </div>
        </div>

        {/* Timeline Stats */}
        <div className="timeline-stats">
          <div className="stat-card glass highlight">
            <div className="stat-icon-container primary">
              <span className="stat-icon">📈</span>
            </div>
            <div className="stat-content">
              <div className="stat-number">{totalProjects}</div>
              <div className="stat-label">Total Projects</div>
              <div className="stat-trend">
                <span className="trend-icon">📊</span>
                <span className="trend-text">In timeline</span>
              </div>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="stat-icon-container success">
              <span className="stat-icon">⚡</span>
            </div>
            <div className="stat-content">
              <div className="stat-number">{activeProjects}</div>
              <div className="stat-label">Active Projects</div>
              <div className="stat-trend">
                <span className="trend-icon">🔄</span>
                <span className="trend-text">In progress</span>
              </div>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="stat-icon-container urgent">
              <span className="stat-icon">🚀</span>
            </div>
            <div className="stat-content">
              <div className="stat-number">{urgentProjects}</div>
              <div className="stat-label">High Priority</div>
              <div className="stat-trend">
                <span className="trend-icon">⚡</span>
                <span className="trend-text">Top priorities</span>
              </div>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="stat-icon-container info">
              <span className="stat-icon">🎯</span>
            </div>
            <div className="stat-content">
              <div className="stat-number">{completedProjects}</div>
              <div className="stat-label">Completed</div>
              <div className="stat-trend">
                <span className="trend-icon">✅</span>
                <span className="trend-text">Delivered</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="timeline-controls-bar glass">
        <div className="controls-left">
          <div className="view-controls">
            <button 
              className={`view-btn ${viewMode === 'timeline' ? 'active' : ''}`}
              onClick={() => setViewMode('timeline')}
              title="Timeline View"
            >
              <span>📅</span>
              Timeline
            </button>
            <button 
              className={`view-btn ${viewMode === 'gantt' ? 'active' : ''}`}
              onClick={() => setViewMode('gantt')}
              title="Gantt Chart View"
            >
              <span>📊</span>
              Gantt
            </button>
          </div>
        </div>

        <div className="controls-right">
          <div className="filter-controls">
            <select 
              value={filterBy} 
              onChange={(e) => setFilterBy(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Projects</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="urgent">High Priority</option>
            </select>

            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="start_date">Sort by Start Date</option>
              <option value="priority">Sort by Priority</option>
              <option value="progress">Sort by Progress</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timeline Container */}
      {filteredProjects.length === 0 ? (
        <div className="empty-state glass">
          <div className="empty-state-content">
            <div className="empty-state-icon">
              <span>📅</span>
            </div>
            <h3>No projects match your filters</h3>
            <p>Try adjusting your filters to see more projects in the timeline</p>
            <button 
              onClick={() => {
                setFilterBy('all');
                setSortBy('start_date');
              }}
              className="btn btn-secondary"
            >
              <span>🔄</span>
              Reset Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="timeline-container glass">
          {/* Timeline Header */}
          <div className="timeline-header">
            <div className="timeline-period">
              <div className="period-info">
                <span className="period-icon">📅</span>
                <div className="period-content">
                  <div className="period-range">
                    {timelineBounds && (
                      <>
                        <span className="period-start">
                          {format(timelineBounds.start, 'MMM d, yyyy')}
                        </span>
                        <span className="period-separator">→</span>
                        <span className="period-end">
                          {format(timelineBounds.end, 'MMM d, yyyy')}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="period-duration">
                    {timelineBounds && `${timelineBounds.totalDays} days span`}
                  </div>
                </div>
              </div>
            </div>

            {/* Month Labels */}
            <div className="month-labels">
              {monthMarkers.map((month, index) => (
                <div
                  key={index}
                  className="month-label"
                  style={{ left: `${month.position}%` }}
                >
                  {month.label}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Body */}
          <div className="timeline-body">
            {/* Today Marker */}
            {timelineBounds && (
              <div
                className="today-marker"
                style={{ left: `${getPositionForDate(new Date())}%` }}
              >
                <div className="today-line"></div>
                <div className="today-label">Today</div>
              </div>
            )}

            {/* Project Rows */}
            <div className="timeline-rows">
              {filteredProjects.map((project, index) => {
                const projectProgress = calculateProjectProgress(project);
                const projectStatus = getProjectStatus(project);
                const startDate = new Date(project.start_date);
                const endDate = new Date(project.end_date);
                const duration = getProjectDuration(project);

                return (
                  <div key={project.id} className="timeline-row">
                    {/* Project Info */}
                    <div className="project-info-panel">
                      <div className="project-header">
                        <div className="project-title-section">
                          <span className="priority-icon">{getPriorityIcon(project.company_priority)}</span>
                          <Link to={`/projects/${project.id}`} className="project-title">
                            {project.title}
                          </Link>
                        </div>
                        <div className="project-badges">
                          <span className={`priority-badge ${getPriorityClass(project.company_priority)}`}>
                            #{project.company_priority}
                          </span>
                          <span 
                            className="status-badge"
                            style={{ 
                              backgroundColor: `${projectStatus.color}20`,
                              color: projectStatus.color,
                              borderColor: projectStatus.color
                            }}
                          >
                            <span className="status-icon">{projectStatus.icon}</span>
                            {projectStatus.label}
                          </span>
                        </div>
                      </div>

                      <div className="project-meta">
                        <div className="meta-item">
                          <span className="meta-icon">📅</span>
                          <span className="meta-text">{duration} days</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-icon">👥</span>
                          <span className="meta-text">{project.developers?.length || 0} members</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-icon">📊</span>
                          <span className="meta-text">{projectProgress}% complete</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-icon">⏰</span>
                          <span className="meta-text">{getDaysRemaining(project)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Bar */}
                    <div className="timeline-track">
                      <div
                        className={`timeline-bar ${getPriorityClass(project.company_priority)}`}
                        style={{
                          left: `${getPositionForDate(startDate)}%`,
                          width: `${getWidth(startDate, endDate)}%`,
                        }}
                      >
                        <div className="bar-content">
                          <div className="bar-header">
                            <span className="bar-title">{project.title}</span>
                            <span className="bar-progress">{projectProgress}%</span>
                          </div>
                          <div className="bar-dates">
                            {format(startDate, 'MMM d')} - {format(endDate, 'MMM d')}
                          </div>
                        </div>
                        
                        {/* Progress Indicator */}
                        <div 
                          className="progress-indicator" 
                          style={{ 
                            width: `${projectProgress}%`,
                            backgroundColor: projectStatus.color
                          }}
                        ></div>

                        {/* Hover Tooltip */}
                        <div className="timeline-tooltip">
                          <div className="tooltip-header">
                            <span className="tooltip-title">{project.title}</span>
                            <span className="tooltip-priority">{getPriorityIcon(project.company_priority)}</span>
                          </div>
                          <div className="tooltip-content">
                            <div className="tooltip-row">
                              <span className="tooltip-label">Duration:</span>
                              <span className="tooltip-value">{duration} days</span>
                            </div>
                            <div className="tooltip-row">
                              <span className="tooltip-label">Progress:</span>
                              <span className="tooltip-value">{projectProgress}%</span>
                            </div>
                            <div className="tooltip-row">
                              <span className="tooltip-label">Status:</span>
                              <span className="tooltip-value" style={{ color: projectStatus.color }}>
                                {projectStatus.label}
                              </span>
                            </div>
                            <div className="tooltip-row">
                              <span className="tooltip-label">Team:</span>
                              <span className="tooltip-value">{project.developers?.length || 0} members</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline Legend */}
          <div className="timeline-legend">
            <div className="legend-section">
              <h4>Priority Levels</h4>
              <div className="legend-items">
                <div className="legend-item">
                  <span>🥇</span>
                  <span className="legend-label">#1 - Critical</span>
                </div>
                <div className="legend-item">
                  <span>🔴</span>
                  <span className="legend-label">#2-3 - Urgent</span>
                </div>
                <div className="legend-item">
                  <span>🟠</span>
                  <span className="legend-label">#4-5 - High</span>
                </div>
                <div className="legend-item">
                  <span>🟡</span>
                  <span className="legend-label">#6-10 - Normal</span>
                </div>
                <div className="legend-item">
                  <span>🟢</span>
                  <span className="legend-label">#11+ - Low</span>
                </div>
              </div>
            </div>
            
            <div className="legend-section">
              <h4>Project Status</h4>
              <div className="legend-items">
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#00d4aa' }}></span>
                  <span className="legend-label">Near Completion (90%+)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#34c759' }}></span>
                  <span className="legend-label">On Track (75%+)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#ff9500' }}></span>
                  <span className="legend-label">At Risk</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#ff3b30' }}></span>
                  <span className="legend-label">Overdue</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#007aff' }}></span>
                  <span className="legend-label">In Progress</span>
                </div>
              </div>
            </div>

            <div className="legend-section">
              <h4>Timeline Elements</h4>
              <div className="legend-items">
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#ff3b30' }}></span>
                  <span className="legend-label">Today Marker</span>
                </div>
                <div className="legend-item">
                  <span>📊</span>
                  <span className="legend-label">Progress Indicator</span>
                </div>
                <div className="legend-item">
                  <span>📅</span>
                  <span className="legend-label">Project Duration</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectsTimeline;