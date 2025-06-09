import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectAPI } from '../services/api';
import { format, differenceInDays } from 'date-fns';
import SyncManager from './SyncManager';

function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showSyncManager, setShowSyncManager] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('priority'); // 'priority', 'progress', 'date', 'name'
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'active', 'completed', 'urgent'

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

  const syncAllProgress = async () => {
    setSyncing(true);
    try {
      await projectAPI.syncAllProgress();
      await fetchProjects();
    } catch (error) {
      console.error('Error syncing progress:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncComplete = (syncType) => {
    console.log(`Sync completed for: ${syncType}`);
    fetchProjects();
  };

  const handleDelete = async (id, event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await projectAPI.delete(id);
        setProjects(projects.filter(p => p.id !== id));
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const getPriorityClass = (priority) => {
    return `priority-${priority.replace('_', '-')}`;
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      'very_high': 'Urgent',
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low',
      'very_low': 'Very Low'
    };
    return labels[priority] || 'Medium';
  };

  const getPriorityIcon = (priority) => {
    const icons = {
      'very_high': '🔴',
      'high': '🟠',
      'medium': '🟡',
      'low': '🟢',
      'very_low': '🔵'
    };
    return icons[priority] || '🟡';
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

  const getProgressColor = (progress) => {
    if (progress >= 90) return '#00d4aa';
    if (progress >= 75) return '#34c759';
    if (progress >= 50) return '#007aff';
    if (progress >= 25) return '#ff9500';
    return '#ff3b30';
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

  const getDaysRemaining = (project) => {
    const today = new Date();
    const endDate = new Date(project.end_date);
    const days = differenceInDays(endDate, today);
    
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
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
        filtered = filtered.filter(p => p.priority === 'very_high' || p.priority === 'high');
        break;
      default:
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'priority':
        const priorityOrder = ['very_high', 'high', 'medium', 'low', 'very_low'];
        filtered.sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority));
        break;
      case 'progress':
        filtered.sort((a, b) => calculateProjectProgress(b) - calculateProjectProgress(a));
        break;
      case 'date':
        filtered.sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
        break;
      case 'name':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        break;
    }

    return filtered;
  };

  const filteredProjects = getFilteredAndSortedProjects();

  // Calculate dashboard stats
  const totalProjects = projects.length;
  const urgentProjects = projects.filter(p => p.priority === 'very_high' || p.priority === 'high').length;
  const completedProjects = projects.filter(p => calculateProjectProgress(p) >= 90).length;
  const averageProgress = projects.length > 0 
    ? Math.round(projects.reduce((sum, p) => sum + calculateProjectProgress(p), 0) / projects.length)
    : 0;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-card glass">
          <div className="loading-spinner large"></div>
          <h3>Loading your projects...</h3>
          <p>Please wait while we fetch your project data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="project-list-page">
      {/* Hero Dashboard Section */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="dashboard-title">
              <span className="title-icon">📊</span>
              Project Dashboard
            </h1>
            <p className="dashboard-subtitle">
              Track progress, manage priorities, and deliver exceptional results
            </p>
          </div>
          
          <div className="hero-actions">
            <Link to="/new" className="btn btn-primary btn-large hero-btn">
              <span>✨</span>
              New Project
            </Link>
            <button 
              onClick={() => setShowSyncManager(!showSyncManager)}
              className="btn btn-secondary btn-large hero-btn"
            >
              <span>🔄</span>
              Data Sync
            </button>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="dashboard-stats">
          <div className="stat-card glass highlight">
            <div className="stat-icon-container primary">
              <span className="stat-icon">📈</span>
            </div>
            <div className="stat-content">
              <div className="stat-number">{totalProjects}</div>
              <div className="stat-label">Total Projects</div>
              <div className="stat-trend">
                <span className="trend-icon">📊</span>
                <span className="trend-text">Active portfolio</span>
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
                <span className="trend-text">Needs attention</span>
              </div>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="stat-icon-container success">
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

          <div className="stat-card glass">
            <div className="stat-icon-container info">
              <span className="stat-icon">📊</span>
            </div>
            <div className="stat-content">
              <div className="stat-number">{averageProgress}%</div>
              <div className="stat-label">Avg Progress</div>
              <div className="stat-trend">
                <span className="trend-icon">📈</span>
                <span className="trend-text">Overall health</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="quick-actions-bar glass">
        <div className="actions-left">
          <button 
            onClick={syncAllProgress}
            className={`quick-action-btn ${syncing ? 'loading' : ''}`}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <div className="loading-spinner small"></div>
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <span className="action-icon">🔄</span>
                <span>Sync Progress</span>
              </>
            )}
          </button>
          
          <div className="view-controls">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <span>⊞</span>
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <span>☰</span>
            </button>
          </div>
        </div>

        <div className="actions-right">
          <div className="filter-controls">
            <select 
              value={filterBy} 
              onChange={(e) => setFilterBy(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Projects</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="urgent">Urgent</option>
            </select>

            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="priority">Sort by Priority</option>
              <option value="progress">Sort by Progress</option>
              <option value="date">Sort by Due Date</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sync Manager */}
      {showSyncManager && (
        <div className="sync-manager-section">
          <SyncManager onSyncComplete={handleSyncComplete} />
        </div>
      )}

      {/* Projects Section */}
      <div className="projects-section">
        <div className="section-header">
          <div className="section-title">
            <h2>
              <span className="section-icon">📋</span>
              Your Projects
            </h2>
            <div className="project-count-badge">
              {filteredProjects.length} of {totalProjects} projects
            </div>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state glass">
            <div className="empty-state-content">
              <div className="empty-state-icon">
                <span>🚀</span>
              </div>
              <h3>Ready to start your first project?</h3>
              <p>Create your first project to begin organizing your work with integrated Jira and Confluence tracking</p>
              <Link to="/new" className="btn btn-primary btn-large">
                <span>✨</span>
                Create Your First Project
              </Link>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="empty-state glass">
            <div className="empty-state-content">
              <div className="empty-state-icon">
                <span>🔍</span>
              </div>
              <h3>No projects match your filters</h3>
              <p>Try adjusting your filters to see more projects</p>
              <button 
                onClick={() => {
                  setFilterBy('all');
                  setSortBy('priority');
                }}
                className="btn btn-secondary"
              >
                <span>🔄</span>
                Reset Filters
              </button>
            </div>
          </div>
        ) : (
          <div className={`projects-container ${viewMode}`}>
            {filteredProjects.map(project => {
              const projectProgress = calculateProjectProgress(project);
              const projectStatus = getProjectStatus(project);
              
              return (
                <Link 
                  key={project.id} 
                  to={`/projects/${project.id}`}
                  className="project-card glass enhanced"
                  data-priority={project.priority}
                >
                  {/* Project Card Header */}
                  <div className="project-card-header">
                    <div className="project-title-section">
                      <div className="project-title-row">
                        <span className="priority-icon">{getPriorityIcon(project.priority)}</span>
                        <h3 className="project-title">{project.title}</h3>
                      </div>
                      <div className="project-badges">
                        <span className={`priority-badge ${getPriorityClass(project.priority)}`}>
                          {getPriorityLabel(project.priority)}
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
                    <button 
                      onClick={(e) => handleDelete(project.id, e)} 
                      className="delete-btn"
                      title="Delete project"
                    >
                      <span>🗑️</span>
                    </button>
                  </div>

                  {/* Project Description */}
                  <p className="project-description">
                    {project.description || 'No description provided'}
                  </p>

                  {/* Project Timeline */}
                  <div className="project-timeline-info">
                    <div className="timeline-item">
                      <span className="timeline-icon">📅</span>
                      <div className="timeline-content">
                        <span className="timeline-label">Timeline</span>
                        <span className="timeline-value">
                          {format(new Date(project.start_date), 'MMM d')} - 
                          {format(new Date(project.end_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="timeline-item">
                      <span className="timeline-icon">⏰</span>
                      <div className="timeline-content">
                        <span className="timeline-label">Due</span>
                        <span className="timeline-value">{getDaysRemaining(project)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Section */}
                  <div className="progress-section enhanced">
                    <div className="progress-header">
                      <span className="progress-label">
                        <span className="progress-icon">📊</span>
                        Progress
                      </span>
                      <span className="progress-value">{projectProgress}%</span>
                    </div>
                    <div className="progress-bar enhanced">
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${projectProgress}%`,
                          background: `linear-gradient(90deg, ${getProgressColor(projectProgress)}, ${getProgressColor(projectProgress)}dd)`
                        }}
                      >
                        <div className="progress-shine"></div>
                      </div>
                    </div>
                    {project.jira_epics && project.jira_epics.length > 0 && (
                      <div className="progress-source">
                        <span className="source-icon">🎯</span>
                        <span>Based on {project.jira_epics.length} epic{project.jira_epics.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Project Stats */}
                  <div className="project-stats enhanced">
                    <div className="stat-item">
                      <div className="stat-icon-wrapper epics">
                        <span className="stat-icon">🎯</span>
                      </div>
                      <div className="stat-content">
                        <span className="stat-count">{project.jira_epics?.length || 0}</span>
                        <span className="stat-label">Epics</span>
                      </div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-icon-wrapper ideas">
                        <span className="stat-icon">💡</span>
                      </div>
                      <div className="stat-content">
                        <span className="stat-count">{project.jira_ideas?.length || 0}</span>
                        <span className="stat-label">Ideas</span>
                      </div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-icon-wrapper docs">
                        <span className="stat-icon">📚</span>
                      </div>
                      <div className="stat-content">
                        <span className="stat-count">{project.confluence_pages?.length || 0}</span>
                        <span className="stat-label">Docs</span>
                      </div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-icon-wrapper team">
                        <span className="stat-icon">👥</span>
                      </div>
                      <div className="stat-content">
                        <span className="stat-count">{project.developers?.length || 0}</span>
                        <span className="stat-label">Team</span>
                      </div>
                    </div>
                  </div>

                  {/* Project Footer */}
                  <div className="project-footer">
                    <div className="footer-left">
                      <span className="last-updated">
                        <span className="update-icon">🔄</span>
                        Updated {format(new Date(project.updated_at || project.created_at), 'MMM d')}
                      </span>
                    </div>
                    <div className="footer-right">
                      <span className="view-project">
                        <span>View Details</span>
                        <span className="arrow">→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectList;