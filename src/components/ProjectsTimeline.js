import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Gantt, Task, EventOption, StylingOption, ViewMode, DisplayOption } from 'gantt-task-react';
import { projectAPI } from '../services/api';
import { format, differenceInDays } from 'date-fns';
import "gantt-task-react/dist/index.css";
import '../styles/ProjectsTimeline.css';

function ProjectsTimeline() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(ViewMode.Month);
  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState('start_date');
  const [showProgress, setShowProgress] = useState(true);
  const ganttRef = useRef(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  // Auto-scroll to current month when Gantt is loaded
  useEffect(() => {
    if (projects.length > 0) {
      const timer = setTimeout(() => {
        try {
          const ganttElement = document.querySelector('.gantt-horizontal-scroll');
          if (!ganttElement) {
            console.log('Gantt scroll container not found, trying alternative selectors...');
            const altElement = document.querySelector('.gantt-task-gantt-content-scroll') || 
                              document.querySelector('.gantt-grid-body') ||
                              document.querySelector('[class*="gantt"][class*="scroll"]');
            if (altElement) {
              scrollToToday(altElement);
            }
            return;
          }
          
          scrollToToday(ganttElement);
        } catch (error) {
          console.error('Error auto-scrolling to today:', error);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [projects, viewMode]);

  const scrollToToday = (scrollElement) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const daysSinceStart = differenceInDays(today, startOfYear);
    
    let scrollPosition = 0;
    
    switch (viewMode) {
      case ViewMode.Month:
        scrollPosition = today.getMonth() * 350;
        break;
      case ViewMode.Week:
        const weeksSinceStart = Math.floor(daysSinceStart / 7);
        scrollPosition = weeksSinceStart * 300;
        break;
      case ViewMode.Day:
        scrollPosition = daysSinceStart * 80;
        break;
      case ViewMode.Year:
        scrollPosition = 0;
        break;
      default:
        scrollPosition = 0;
    }
    
    const containerWidth = scrollElement.clientWidth;
    const centeredPosition = Math.max(0, scrollPosition - (containerWidth / 2));
    
    console.log(`Auto-scrolling to position: ${centeredPosition} (today: ${today.toDateString()})`);
    scrollElement.scrollLeft = centeredPosition;
  };

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

  // MOVED: All helper functions before useMemo
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

  const isDeveloperAvailable = (developerId, newProjectStart, newProjectEnd) => {
    const today = new Date();
    
    for (const project of projects) {
      if (!project.developers) continue;
      
      const isAssigned = project.developers.some(dev => dev.id === developerId);
      if (!isAssigned) continue;
      
      const projectStart = new Date(project.start_date);
      const projectEnd = new Date(project.end_date);
      const projectProgress = calculateProjectProgress(project);
      
      if (projectProgress >= 90) continue;
      if (projectEnd < today) continue;
      
      const newStart = new Date(newProjectStart);
      const newEnd = new Date(newProjectEnd);
      
      const hasOverlap = (newStart <= projectEnd && newEnd >= projectStart);
      
      if (hasOverlap) {
        return {
          available: false,
          conflictProject: project,
          conflictDates: {
            start: format(projectStart, 'MMM d, yyyy'),
            end: format(projectEnd, 'MMM d, yyyy')
          },
          projectProgress: projectProgress
        };
      }
    }
    
    return { available: true };
  };

  const getDeveloperAvailabilitySummary = () => {
    const today = new Date();
    const allDevelopers = new Map();
    const busyDevelopers = new Set();
    
    projects.forEach(project => {
      if (!project.developers) return;
      
      project.developers.forEach(dev => {
        allDevelopers.set(dev.id, dev);
        
        const projectEnd = new Date(project.end_date);
        const projectProgress = calculateProjectProgress(project);
        
        if (projectProgress < 90 && projectEnd >= today) {
          busyDevelopers.add(dev.id);
        }
      });
    });
    
    return {
      total: allDevelopers.size,
      busy: busyDevelopers.size,
      available: allDevelopers.size - busyDevelopers.size
    };
  };

  // Filter and sort projects
  const getFilteredAndSortedProjects = () => {
    let filtered = [...projects];

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
      case 'at-risk':
        filtered = filtered.filter(p => {
          const progress = calculateProjectProgress(p);
          const today = new Date();
          const endDate = new Date(p.end_date);
          const daysRemaining = differenceInDays(endDate, today);
          return (daysRemaining < 7 && progress < 75) || daysRemaining < 0;
        });
        break;
      default:
        break;
    }

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
      case 'duration':
        filtered.sort((a, b) => {
          const durationA = differenceInDays(new Date(a.end_date), new Date(a.start_date));
          const durationB = differenceInDays(new Date(b.end_date), new Date(b.start_date));
          return durationB - durationA;
        });
        break;
      default:
        break;
    }

    return filtered;
  };

  const filteredProjects = getFilteredAndSortedProjects();

  // NOW: Convert projects to Gantt tasks (after all helper functions are defined)
  const ganttTasks = useMemo(() => {
    return filteredProjects.map((project, index) => {
      const progress = calculateProjectProgress(project);
      const status = getProjectStatus(project);
      const startDate = new Date(project.start_date);
      const endDate = new Date(project.end_date);
      
      const adjustedEndDate = endDate <= startDate ? new Date(startDate.getTime() + 24 * 60 * 60 * 1000) : endDate;

      return {
        start: startDate,
        end: adjustedEndDate,
        name: project.title,
        id: `project-${project.id}`,
        type: 'task',
        progress: showProgress ? progress : 0,
        isDisabled: false,
        styles: {
          progressColor: status.color,
          progressSelectedColor: status.color,
          backgroundColor: getPriorityColor(project.company_priority),
          backgroundSelectedColor: getPriorityColor(project.company_priority),
          borderRadius: 8,
        },
        project: project,
      };
    });
  }, [filteredProjects, showProgress]);

  // Calculate dashboard stats
  const urgentProjects = filteredProjects.filter(p => p.company_priority <= 5).length;
  const completedProjects = filteredProjects.filter(p => calculateProjectProgress(p) >= 90).length;
  const atRiskProjects = filteredProjects.filter(p => {
    const progress = calculateProjectProgress(p);
    const today = new Date();
    const endDate = new Date(p.end_date);
    const daysRemaining = differenceInDays(endDate, today);
    return (daysRemaining < 7 && progress < 75) || daysRemaining < 0;
  }).length;
  const averageProgress = filteredProjects.length > 0 
    ? Math.round(filteredProjects.reduce((sum, p) => sum + calculateProjectProgress(p), 0) / filteredProjects.length)
    : 0;

  const developerStats = getDeveloperAvailabilitySummary();

  const handleTaskClick = (task) => {
    if (task.project) {
      window.open(`/projects/${task.project.id}`, '_blank');
    }
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
      {/* Hero Section with Focused KPIs */}
      <div className="timeline-hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="timeline-title">
              <span className="title-icon">📊</span>
              Projects Timeline Dashboard
            </h1>
            <p className="timeline-subtitle">
              Interactive Gantt chart with real-time progress tracking, priority visualization, and developer availability management
            </p>
          </div>
          
          <div className="hero-actions">
            <Link to="/new" className="btn btn-primary btn-large hero-btn">
              <span>✨</span>
              New Project
            </Link>
          </div>
        </div>

        {/* Focused KPI Dashboard */}
        <div className="timeline-stats">
          <div className="stat-card glass">
            <div className="stat-icon-container urgent">
              <span className="stat-icon">🚀</span>
            </div>
            <div className="stat-content">
              <div className="stat-number">{urgentProjects}</div>
              <div className="stat-label">High Priority</div>
              <div className="stat-trend">
                <span className="trend-icon">⚡</span>
                <span className="trend-text">Top 5 priorities</span>
              </div>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="stat-icon-container info">
              <span className="stat-icon">🎯</span>
            </div>
            <div className="stat-content">
              <div className="stat-number">{completedProjects}</div>
              <div className="stat-label">Near Completion</div>
              <div className="stat-trend">
                <span className="trend-icon">✅</span>
                <span className="trend-text">90%+ progress</span>
              </div>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="stat-icon-container warning">
              <span className="stat-icon">⚠️</span>
            </div>
            <div className="stat-content">
              <div className="stat-number">{atRiskProjects}</div>
              <div className="stat-label">At Risk</div>
              <div className="stat-trend">
                <span className="trend-icon">🚨</span>
                <span className="trend-text">Need attention</span>
              </div>
            </div>
          </div>

          <div className="stat-card glass highlight">
            <div className="stat-icon-container success">
              <span className="stat-icon">👥</span>
            </div>
            <div className="stat-content">
              <div className="stat-number">{developerStats.available}/{developerStats.total}</div>
              <div className="stat-label">Available Devs</div>
              <div className="stat-trend">
                <span className="trend-icon">🟢</span>
                <span className="trend-text">{developerStats.busy} busy</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Controls Bar */}
      <div className="timeline-controls-bar glass">
        <div className="controls-left">
          <div className="view-controls">
            <button 
              className={`view-btn ${viewMode === ViewMode.Day ? 'active' : ''}`}
              onClick={() => setViewMode(ViewMode.Day)}
              title="Day View - Detailed daily breakdown"
            >
              <span>📅</span>
              Day
            </button>
            <button 
              className={`view-btn ${viewMode === ViewMode.Week ? 'active' : ''}`}
              onClick={() => setViewMode(ViewMode.Week)}
              title="Week View - Weekly overview"
            >
              <span>📆</span>
              Week
            </button>
            <button 
              className={`view-btn ${viewMode === ViewMode.Month ? 'active' : ''}`}
              onClick={() => setViewMode(ViewMode.Month)}
              title="Month View - Monthly planning"
            >
              <span>📊</span>
              Month
            </button>
            <button 
              className={`view-btn ${viewMode === ViewMode.Year ? 'active' : ''}`}
              onClick={() => setViewMode(ViewMode.Year)}
              title="Year View - Annual overview"
            >
              <span>📈</span>
              Year
            </button>
          </div>

          <div className="gantt-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showProgress}
                onChange={(e) => setShowProgress(e.target.checked)}
              />
              <span className="checkbox-text">Show Progress Bars</span>
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
              <option value="active">Active Projects</option>
              <option value="completed">Near Completion</option>
              <option value="urgent">High Priority (Top 5)</option>
              <option value="at-risk">At Risk Projects</option>
            </select>

            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="start_date">Sort by Start Date</option>
              <option value="priority">Sort by Priority</option>
              <option value="progress">Sort by Progress</option>
              <option value="duration">Sort by Duration</option>
            </select>
          </div>
        </div>
      </div>

      {/* PURE GANTT CHART */}
      {filteredProjects.length === 0 ? (
        <div className="empty-state glass">
          <div className="empty-state-content">
            <div className="empty-state-icon">
              <span>📊</span>
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
        <div className="gantt-container glass" ref={ganttRef}>
          <div className="gantt-header">
            <h2>
              <span className="gantt-icon">📊</span>
              Pure Gantt Chart Visualization
            </h2>
            <div className="gantt-info">
              <div className="info-badges">
                <span className="info-badge">
                  <span className="badge-icon">🖱️</span>
                  Double-click to view project
                </span>
                <span className="info-badge">
                  <span className="badge-icon">📅</span>
                  Auto-scrolled to current month
                </span>
                <span className="info-badge">
                  <span className="badge-icon">📊</span>
                  Progress bars show completion
                </span>
                <span className="info-badge">
                  <span className="badge-icon">🎯</span>
                  Colors indicate priority levels
                </span>
                <span className="info-badge">
                  <span className="badge-icon">👥</span>
                  Developer availability tracked
                </span>
              </div>
            </div>
          </div>
          
          <div className="gantt-wrapper">
            <Gantt
              tasks={ganttTasks}
              viewMode={viewMode}
              onDoubleClick={handleTaskClick}
              listCellWidth=""
              columnWidth={
                viewMode === ViewMode.Month ? 350 : 
                viewMode === ViewMode.Week ? 300 : 
                viewMode === ViewMode.Year ? 400 : 
                80
              }
              ganttHeight={Math.max(600, ganttTasks.length * 70 + 200)}
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
              todayColor="rgba(255, 59, 48, 0.4)"
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
                      <span className="tooltip-value">{calculateProjectProgress(task.project)}%</span>
                    </div>
                    {task.project && (
                      <>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Priority:</span>
                          <span className="tooltip-value">#{task.project.company_priority}</span>
                        </div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Team:</span>
                          <span className="tooltip-value">{task.project.developers?.length || 0}/{task.project.max_team_members} members</span>
                        </div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Duration:</span>
                          <span className="tooltip-value">{differenceInDays(task.end, task.start) + 1} days</span>
                        </div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Status:</span>
                          <span className="tooltip-value">{getProjectStatus(task.project).label}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="tooltip-footer">
                    <span className="tooltip-hint">💡 Double-click to view full project details</span>
                  </div>
                </div>
              )}
            />
          </div>
        </div>
      )}

      {/* Enhanced Legend */}
      <div className="timeline-legend glass">
        <div className="legend-section">
          <h4>🎯 Priority Levels</h4>
          <div className="legend-items">
            <div className="legend-item">
              <span>🥇</span>
              <span className="legend-label">#1 - Critical Priority</span>
              <span className="legend-color" style={{ backgroundColor: '#ff3b30' }}></span>
            </div>
            <div className="legend-item">
              <span>🔴</span>
              <span className="legend-label">#2-3 - Urgent Priority</span>
              <span className="legend-color" style={{ backgroundColor: '#ff3b30' }}></span>
            </div>
            <div className="legend-item">
              <span>🟠</span>
              <span className="legend-label">#4-5 - High Priority</span>
              <span className="legend-color" style={{ backgroundColor: '#ff9500' }}></span>
            </div>
            <div className="legend-item">
              <span>🟡</span>
              <span className="legend-label">#6-10 - Normal Priority</span>
              <span className="legend-color" style={{ backgroundColor: '#007aff' }}></span>
            </div>
            <div className="legend-item">
              <span>🟢</span>
              <span className="legend-label">#11+ - Low Priority</span>
              <span className="legend-color" style={{ backgroundColor: '#34c759' }}></span>
            </div>
          </div>
        </div>
        
        <div className="legend-section">
          <h4>📊 Progress Status</h4>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#00d4aa' }}></span>
              <span className="legend-label">Near Completion (90%+)</span>
              <span>🎯</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#34c759' }}></span>
              <span className="legend-label">On Track (75%+)</span>
              <span>✅</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#ff9500' }}></span>
              <span className="legend-label">At Risk</span>
              <span>⚠️</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#ff3b30' }}></span>
              <span className="legend-label">Overdue</span>
              <span>🚨</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#007aff' }}></span>
              <span className="legend-label">In Progress</span>
              <span>⏳</span>
            </div>
          </div>
        </div>

        <div className="legend-section">
          <h4>👥 Developer Availability</h4>
          <div className="legend-items">
            <div className="legend-item">
              <span>🟢</span>
              <span className="legend-label">Available developers can be assigned to new projects</span>
            </div>
            <div className="legend-item">
              <span>🔴</span>
              <span className="legend-label">Busy developers are assigned to active projects</span>
            </div>
            <div className="legend-item">
              <span>✅</span>
              <span className="legend-label">Developers become available when projects reach 90%</span>
            </div>
            <div className="legend-item">
              <span>📅</span>
              <span className="legend-label">Availability checked against project date ranges</span>
            </div>
          </div>
        </div>

        <div className="legend-section">
          <h4>🎮 Interactive Features</h4>
          <div className="legend-items">
            <div className="legend-item">
              <span>🖱️</span>
              <span className="legend-label">Double-click any bar to view project details</span>
            </div>
            <div className="legend-item">
              <span>📊</span>
              <span className="legend-label">Progress bars show real completion status</span>
            </div>
            <div className="legend-item">
              <span>📅</span>
              <span className="legend-label">Auto-scrolls to current month on page load</span>
            </div>
            <div className="legend-item">
              <span>🔍</span>
              <span className="legend-label">Hover over bars for detailed tooltips</span>
            </div>
            <div className="legend-item">
              <span>📈</span>
              <span className="legend-label">Switch views: Day/Week/Month/Year</span>
            </div>
            <div className="legend-item">
              <span>🎯</span>
              <span className="legend-label">Bar colors indicate company priority</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectsTimeline;