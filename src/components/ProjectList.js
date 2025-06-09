import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectAPI } from '../services/api';
import { format } from 'date-fns';

function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

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

  const handleDelete = async (id) => {
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
    return priority.replace('_', ' ').toUpperCase();
  };

  const sortedProjects = [...projects].sort((a, b) => {
    // Sort by priority (very_high first)
    const priorityOrder = ['very_high', 'high', 'medium', 'low', 'very_low'];
    return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
  });

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <span>Loading projects...</span>
      </div>
    );
  }

  return (
    <div className="project-list">
      <div className="page-header">
        <h1>Projects</h1>
        <div className="header-actions">
          <button 
            onClick={syncAllProgress} 
            className="btn btn-secondary"
            disabled={syncing}
          >
            {syncing ? (
              <>
                <span className="loading-spinner" style={{ width: '16px', height: '16px' }}></span>
                Syncing...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
                  <path fillRule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
                </svg>
                Sync Progress
              </>
            )}
          </button>
          <Link to="/new" className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
            </svg>
            New Project
          </Link>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="currentColor">
              <path d="M36 6H16c-1.1 0-2 .9-2 2v40c0 1.1.9 2 2 2h32c1.1 0 2-.9 2-2V20L36 6z"/>
              <path d="M36 6v14h14"/>
            </svg>
          </div>
          <h3>No projects yet</h3>
          <p>Create your first project to get started</p>
          <Link to="/new" className="btn btn-primary">Create Project</Link>
        </div>
      ) : (
        <div className="projects-grid">
          {sortedProjects.map(project => (
            <div key={project.id} className="project-card">
              <div className={`project-priority-bar ${getPriorityClass(project.priority)}`}></div>
              
              <div className="project-card-content">
                <div className="project-header">
                  <h3 className="project-title">{project.title}</h3>
                  <span className={`project-priority-badge ${getPriorityClass(project.priority)}`}>
                    {getPriorityLabel(project.priority)}
                  </span>
                </div>

                <p className="project-description">
                  {project.description || 'No description provided'}
                </p>

                <div className="project-dates">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                  </svg>
                  <span>
                    {format(new Date(project.start_date), 'MMM d')} - 
                    {format(new Date(project.end_date), 'MMM d, yyyy')}
                  </span>
                </div>

                {project.total_progress !== undefined && (
                  <div className="project-progress">
                    <div className="progress-header">
                      <span className="progress-label">Progress</span>
                      <span className="progress-value">{project.total_progress}%</span>
                    </div>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar-fill" 
                        style={{ width: `${project.total_progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="project-stats">
                  <div className="stat-item">
                    <div className="stat-icon">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5l2.404.961L10.404 2l-2.218-.887zm3.564 1.426L5.596 5 8 5.961 14.154 3.5l-2.404-.961zm3.25 1.7-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923l6.5 2.6zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464L7.443.184z"/>
                      </svg>
                    </div>
                    <span>
                      <span className="stat-value">{project.jira_epics?.length || 0}</span> Epics
                    </span>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M9.669.864 8 0 6.331.864l-1.858.282-.842 1.68-1.337 1.32L2.6 6l-.306 1.854 1.337 1.32.842 1.68 1.858.282L8 12l1.669-.864 1.858-.282.842-1.68 1.337-1.32L13.4 6l.306-1.854-1.337-1.32-.842-1.68L9.669.864zm1.196 1.193.684 1.365 1.086 1.072L12.387 6l.248 1.506-1.086 1.072-.684 1.365-1.51.229L8 10.874l-1.355-.702-1.51-.229-.684-1.365-1.086-1.072L3.614 6l-.25-1.506 1.087-1.072.684-1.365 1.51-.229L8 1.126l1.356.702 1.509.229z"/>
                      </svg>
                    </div>
                    <span>
                      <span className="stat-value">{project.jira_ideas?.length || 0}</span> Ideas
                    </span>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
                      </svg>
                    </div>
                    <span>
                      <span className="stat-value">{project.confluence_pages?.length || 0}</span> Docs
                    </span>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                      </svg>
                    </div>
                    <span>
                      <span className="stat-value">{project.developers?.length || 0}</span> Team
                    </span>
                  </div>
                </div>

                <div className="project-actions">
                  <Link to={`/projects/${project.id}`} className="btn btn-secondary" style={{ flex: 1 }}>
                    View Details
                  </Link>
                  <button onClick={() => handleDelete(project.id)} className="btn btn-danger btn-sm">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                      <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProjectList;