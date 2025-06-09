import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectAPI } from '../services/api';
import { format } from 'date-fns';
import SyncManager from './SyncManager';

function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showSyncManager, setShowSyncManager] = useState(false);

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
      await fetchProjects(); // Refresh the list
    } catch (error) {
      console.error('Error syncing progress:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncComplete = (syncType) => {
    console.log(`Sync completed for: ${syncType}`);
    // Optionally refresh projects or show a notification
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
    if (progress >= 80) return '#34c759';
    if (progress >= 60) return '#007aff';
    if (progress >= 40) return '#ff9500';
    if (progress >= 20) return '#ff9500';
    return '#ff3b30';
  };

  const sortedProjects = [...projects].sort((a, b) => {
    // Sort by priority (very_high first)
    const priorityOrder = ['very_high', 'high', 'medium', 'low', 'very_low'];
    return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
  });

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
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Project Dashboard</h1>
          <p className="hero-subtitle">
            Manage and track your projects with integrated Jira and Confluence data
          </p>
        </div>
        
        {/* Stats Overview */}
        <div className="stats-overview">
          <div className="stat-card glass">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-number">{projects.length}</div>
              <div className="stat-label">Total Projects</div>
            </div>
          </div>
          <div className="stat-card glass">
            <div className="stat-icon">🚀</div>
            <div className="stat-content">
              <div className="stat-number">
                {projects.filter(p => p.priority === 'very_high' || p.priority === 'high').length}
              </div>
              <div className="stat-label">High Priority</div>
            </div>
          </div>
          <div className="stat-card glass">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-number">
                {projects.filter(p => calculateProjectProgress(p) >= 80).length}
              </div>
              <div className="stat-label">Near Completion</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Cards Section */}
      <div className="action-section">
        <div className="action-cards">
          {/* Sync Card */}
          <div className="sync-card glass" onClick={syncAllProgress}>
            <div className="sync-card-content">
              <div className="sync-icon-container">
                {syncing ? (
                  <div className="loading-spinner"></div>
                ) : (
                  <span style={{ fontSize: '32px' }}>🔄</span>
                )}
              </div>
              <div className="sync-text">
                <h3>{syncing ? 'Syncing Progress...' : 'Sync All Projects'}</h3>
                <p>
                  {syncing 
                    ? 'Updating progress from Jira epics and issues'
                    : 'Update progress data from Jira for all projects'
                  }
                </p>
              </div>
              <div className="sync-arrow">
                <span style={{ fontSize: '24px' }}>→</span>
              </div>
            </div>
          </div>

          {/* Data Sync Manager Card */}
          <div className="sync-card glass" onClick={() => setShowSyncManager(!showSyncManager)}>
            <div className="sync-card-content">
              <div className="sync-icon-container">
                <span style={{ fontSize: '32px' }}>🔄</span>
              </div>
              <div className="sync-text">
                <h3>Data Sync Manager</h3>
                <p>Manage Jira ideas and epics synchronization</p>
              </div>
              <div className="sync-arrow">
                <span style={{ fontSize: '24px' }}>{showSyncManager ? '↑' : '↓'}</span>
              </div>
            </div>
          </div>

          {/* Create Project Card */}
          <Link to="/new" className="create-card glass">
            <div className="create-card-content">
              <div className="create-icon-container">
                <span style={{ fontSize: '32px' }}>➕</span>
              </div>
              <div className="create-text">
                <h3>Create New Project</h3>
                <p>Start a new project with integrated tracking</p>
              </div>
              <div className="create-arrow">
                <span style={{ fontSize: '24px' }}>→</span>
              </div>
            </div>
          </Link>
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
          <h2>Your Projects</h2>
          <div className="project-count">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state glass">
            <div className="empty-state-content">
              <div className="empty-state-icon">
                <span style={{ fontSize: '80px' }}>📋</span>
              </div>
              <h3>No projects yet</h3>
              <p>Create your first project to start organizing your work with integrated Jira and Confluence tracking</p>
              <Link to="/new" className="btn btn-primary btn-large">
                <span>➕</span>
                Create Your First Project
              </Link>
            </div>
          </div>
        ) : (
          <div className="projects-grid">
            {sortedProjects.map(project => {
              const projectProgress = calculateProjectProgress(project);
              
              return (
                <Link 
                  key={project.id} 
                  to={`/projects/${project.id}`}
                  className="project-card glass"
                  data-priority={project.priority}
                >
                  <div className="project-card-header">
                    <div className="project-title-section">
                      <h3 className="project-title">{project.title}</h3>
                      <span className={`priority-badge ${getPriorityClass(project.priority)}`}>
                        {getPriorityLabel(project.priority)}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => handleDelete(project.id, e)} 
                      className="delete-btn"
                      title="Delete project"
                    >
                      <span>❌</span>
                    </button>
                  </div>

                  <p className="project-description">
                    {project.description || 'No description provided'}
                  </p>

                  <div className="project-meta">
                    <div className="project-dates">
                      <span style={{ fontSize: '16px' }}>📅</span>
                      <span>
                        {format(new Date(project.start_date), 'MMM d')} - 
                        {format(new Date(project.end_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>

                  <div className="progress-section">
                    <div className="progress-header">
                      <span className="progress-label">Progress</span>
                      <span className="progress-value">{projectProgress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${projectProgress}%`,
                          backgroundColor: getProgressColor(projectProgress)
                        }}
                      ></div>
                    </div>
                    {project.jira_epics && project.jira_epics.length > 0 && (
                      <div className="progress-source">
                        Based on {project.jira_epics.length} linked epic{project.jira_epics.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  <div className="project-stats">
                    <div className="stat-item">
                      <div className="stat-icon">
                        <span style={{ fontSize: '16px' }}>🎯</span>
                      </div>
                      <span className="stat-count">{project.jira_epics?.length || 0}</span>
                      <span className="stat-label">Epics</span>
                    </div>
                    <div className="stat-item">
                      <div className="stat-icon">
                        <span style={{ fontSize: '16px' }}>💡</span>
                      </div>
                      <span className="stat-count">{project.jira_ideas?.length || 0}</span>
                      <span className="stat-label">Ideas</span>
                    </div>
                    <div className="stat-item">
                      <div className="stat-icon">
                        <span style={{ fontSize: '16px' }}>📚</span>
                      </div>
                      <span className="stat-count">{project.confluence_pages?.length || 0}</span>
                      <span className="stat-label">Docs</span>
                    </div>
                    <div className="stat-item">
                      <div className="stat-icon">
                        <span style={{ fontSize: '16px' }}>👥</span>
                      </div>
                      <span className="stat-count">{project.developers?.length || 0}</span>
                      <span className="stat-label">Team</span>
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