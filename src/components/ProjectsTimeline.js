import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Gantt, Task, EventOption, StylingOption, ViewMode, DisplayOption } from 'gantt-task-react';
import { projectAPI } from '../services/api';
import { format, differenceInDays, addDays } from 'date-fns';
import "gantt-task-react/dist/index.css";
import '../styles/ProjectsTimeline.css';

function ProjectsTimeline() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(ViewMode.Month);
  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState('start_date');
  const [isChecked, setIsChecked] = useState(true);

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

  const getPriorityColor = (priority) => {
    if (priority <= 3) return '#ff3b30';
    if (priority <= 5) return '#ff9500';
    if (priority <= 10) return '#007aff';
    if (priority <= 20) return '#34c759';
    return '#5ac8fa';
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

  // Convert projects to Gantt tasks
  const ganttTasks = useMemo(() => {
    return filteredProjects.map((project, index) => {
      const progress = calculateProjectProgress(project);
      const status = getProjectStatus(project);
      const startDate = new Date(project.start_date);
      const endDate = new Date(project.end_date);
      
      // Ensure end date is at least one day after start date
      const adjustedEndDate = endDate <= startDate ? addDays(startDate, 1) : endDate;

      return {
        start: startDate,
        end: adjustedEndDate,
        name: project.title,
        id: `project-${project.id}`,
        type: 'task',
        progress: progress,
        isDisabled: false,
        styles: {
          progressColor: status.color,
          progressSelectedColor: status.color,
          backgroundColor: getPriorityColor(project.company_priority),
          backgroundSelectedColor: getPriorityColor(project.company_priority),
        },
        project: project, // Store the full project data for reference
      };
    });
  }, [filteredProjects]);

  // Calculate dashboard stats
  const totalProjects = filteredProjects.length;
  const activeProjects = filteredProjects.filter(p => {
    const progress = calculateProjectProgress(p);
    return progress > 0 && progress < 90;
  }).length;
  const completedProjects = filteredProjects.filter(p => calculateProjectProgress(p) >= 90).length;
  const urgentProjects = filteredProjects.filter(p => p.company_priority <= 5).length;

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

  // Gantt event handlers
  const handleTaskClick = (task) => {
    if (task.project) {
      window.open(`/projects/${task.project.id}`, '_blank');
    }
  };

  const handleTaskDelete = (task) => {
    console.log('Task delete requested:', task);
    // Implement delete functionality if needed
  };

  const handleProgressChange = async (task) => {
    console.log('Progress change:', task);
    // Implement progress update functionality if needed
  };

  const handleDateChange = async (task) => {
    console.log('Date change:', task);
    // Implement date update functionality if needed
  };

  const handleExpanderClick = (task) => {
    console.log('Expander click:', task);
  };

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
              Interactive Gantt chart view of all your projects with real-time progress tracking
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
              className={`view-btn ${viewMode === ViewMode.Day ? 'active' : ''}`}
              onClick={() => setViewMode(ViewMode.Day)}
              title="Day View"
            >
              <span>📅</span>
              Day
            </button>
            <button 
              className={`view-btn ${viewMode === ViewMode.Week ? 'active' : ''}`}
              onClick={() => setViewMode(ViewMode.Week)}
              title="Week View"
            >
              <span>📆</span>
              Week
            </button>
            <button 
              className={`view-btn ${viewMode === ViewMode.Month ? 'active' : ''}`}
              onClick={() => setViewMode(ViewMode.Month)}
              title="Month View"
            >
              <span>📊</span>
              Month
            </button>
            <button 
              className={`view-btn ${viewMode === ViewMode.Year ? 'active' : ''}`}
              onClick={() => setViewMode(ViewMode.Year)}
              title="Year View"
            >
              <span>📈</span>
              Year
            </button>
          </div>

          <div className="gantt-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
              />
              <span className="checkbox-text">Show Progress</span>
            </label>
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

      {/* Project Details Panel */}
      {filteredProjects.length > 0 && (
        <div className="projects-details-panel glass">
          <div className="panel-header">
            <h3>
              <span className="panel-icon">📋</span>
              Project Details
            </h3>
            <span className="project-count">{filteredProjects.length} projects</span>
          </div>
          
          <div className="projects-grid">
            {filteredProjects.map((project) => {
              const progress = calculateProjectProgress(project);
              const status = getProjectStatus(project);
              const duration = getProjectDuration(project);

              return (
                <div key={project.id} className="project-detail-card">
                  <div className="card-header">
                    <div className="project-title-section">
                      <span className="priority-icon">{getPriorityIcon(project.company_priority)}</span>
                      <Link to={`/projects/${project.id}`} className="project-title">
                        {project.title}
                      </Link>
                    </div>
                    <div className="project-badges">
                      <span className="priority-badge" style={{ backgroundColor: `${getPriorityColor(project.company_priority)}20`, color: getPriorityColor(project.company_priority) }}>
                        #{project.company_priority}
                      </span>
                      <span 
                        className="status-badge"
                        style={{ 
                          backgroundColor: `${status.color}20`,
                          color: status.color,
                          borderColor: status.color
                        }}
                      >
                        <span className="status-icon">{status.icon}</span>
                        {status.label}
                      </span>
                    </div>
                  </div>

                  <div className="project-meta-grid">
                    <div className="meta-item">
                      <span className="meta-icon">📅</span>
                      <div className="meta-content">
                        <span className="meta-label">Duration</span>
                        <span className="meta-value">{duration} days</span>
                      </div>
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon">👥</span>
                      <div className="meta-content">
                        <span className="meta-label">Team</span>
                        <span className="meta-value">{project.developers?.length || 0} members</span>
                      </div>
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon">📊</span>
                      <div className="meta-content">
                        <span className="meta-label">Progress</span>
                        <span className="meta-value">{progress}%</span>
                      </div>
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon">⏰</span>
                      <div className="meta-content">
                        <span className="meta-label">Remaining</span>
                        <span className="meta-value">{getDaysRemaining(project)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="project-dates">
                    <div className="date-item">
                      <span className="date-label">Start:</span>
                      <span className="date-value">{format(new Date(project.start_date), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="date-item">
                      <span className="date-label">End:</span>
                      <span className="date-value">{format(new Date(project.end_date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>

                  <div className="progress-section">
                    <div className="progress-header">
                      <span className="progress-label">Progress</span>
                      <span className="progress-value">{progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${progress}%`,
                          backgroundColor: status.color
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gantt Chart Container */}
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
        <div className="gantt-container glass">
          <div className="gantt-header">
            <h3>
              <span className="gantt-icon">📊</span>
              Interactive Gantt Chart
            </h3>
            <div className="gantt-info">
              <span className="info-text">Click on any project bar to view details</span>
            </div>
          </div>
          
          <div className="gantt-wrapper">
            <Gantt
              tasks={ganttTasks}
              viewMode={viewMode}
              onDateChange={handleDateChange}
              onDelete={handleTaskDelete}
              onProgressChange={handleProgressChange}
              onDoubleClick={handleTaskClick}
              onExpanderClick={handleExpanderClick}
              listCellWidth={isChecked ? "155px" : ""}
              columnWidth={viewMode === ViewMode.Month ? 300 : viewMode === ViewMode.Week ? 250 : 65}
              ganttHeight={Math.max(400, ganttTasks.length * 50 + 100)}
              barBackgroundColor="#007aff"
              barBackgroundSelectedColor="#5ac8fa"
              barProgressColor="#34c759"
              barProgressSelectedColor="#30d158"
              projectProgressColor="#ff9500"
              projectProgressSelectedColor="#ffb340"
              milestoneBackgroundColor="#ff3b30"
              milestoneBackgroundSelectedColor="#ff6b5a"
              rtl={false}
              locale="en-US"
              fontSize="14"
              fontFamily="var(--font-family-sans)"
              arrowColor="#8e8e93"
              arrowIndent={20}
              todayColor="rgba(255, 59, 48, 0.3)"
              TooltipContent={({ task, fontSize, fontFamily }) => (
                <div className="gantt-tooltip">
                  <div className="tooltip-header">
                    <span className="tooltip-title">{task.name}</span>
                    {task.project && (
                      <span className="tooltip-priority">
                        {getPriorityIcon(task.project.company_priority)}
                      </span>
                    )}
                  </div>
                  <div className="tooltip-content">
                    <div className="tooltip-row">
                      <span className="tooltip-label">Start:</span>
                      <span className="tooltip-value">{format(task.start, 'MMM d, yyyy')}</span>
                    </div>
                    <div className="tooltip-row">
                      <span className="tooltip-label">End:</span>
                      <span className="tooltip-value">{format(task.end, 'MMM d, yyyy')}</span>
                    </div>
                    <div className="tooltip-row">
                      <span className="tooltip-label">Progress:</span>
                      <span className="tooltip-value">{task.progress}%</span>
                    </div>
                    {task.project && (
                      <>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Priority:</span>
                          <span className="tooltip-value">#{task.project.company_priority}</span>
                        </div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Team:</span>
                          <span className="tooltip-value">{task.project.developers?.length || 0} members</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="tooltip-footer">
                    <span className="tooltip-hint">Double-click to view project details</span>
                  </div>
                </div>
              )}
            />
          </div>
        </div>
      )}

      {/* Timeline Legend */}
      <div className="timeline-legend glass">
        <div className="legend-section">
          <h4>Priority Levels</h4>
          <div className="legend-items">
            <div className="legend-item">
              <span>🥇</span>
              <span className="legend-label">#1 - Critical</span>
              <span className="legend-color" style={{ backgroundColor: '#ff3b30' }}></span>
            </div>
            <div className="legend-item">
              <span>🔴</span>
              <span className="legend-label">#2-3 - Urgent</span>
              <span className="legend-color" style={{ backgroundColor: '#ff3b30' }}></span>
            </div>
            <div className="legend-item">
              <span>🟠</span>
              <span className="legend-label">#4-5 - High</span>
              <span className="legend-color" style={{ backgroundColor: '#ff9500' }}></span>
            </div>
            <div className="legend-item">
              <span>🟡</span>
              <span className="legend-label">#6-10 - Normal</span>
              <span className="legend-color" style={{ backgroundColor: '#007aff' }}></span>
            </div>
            <div className="legend-item">
              <span>🟢</span>
              <span className="legend-label">#11+ - Low</span>
              <span className="legend-color" style={{ backgroundColor: '#34c759' }}></span>
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
          <h4>Gantt Chart Features</h4>
          <div className="legend-items">
            <div className="legend-item">
              <span>📊</span>
              <span className="legend-label">Progress bars show completion</span>
            </div>
            <div className="legend-item">
              <span>📅</span>
              <span className="legend-label">Today line shows current date</span>
            </div>
            <div className="legend-item">
              <span>🖱️</span>
              <span className="legend-label">Double-click to view project</span>
            </div>
            <div className="legend-item">
              <span>🔍</span>
              <span className="legend-label">Hover for detailed tooltip</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectsTimeline;