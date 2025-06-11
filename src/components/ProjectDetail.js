import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectAPI } from '../services/api';
import JiraIdeasPicker from './JiraIdeasPicker';
import JiraEpicsPicker from './JiraEpicsPicker';
import ConfluencePicker from './ConfluencePicker';
import DeveloperPicker from './DeveloperPicker';
import ProjectTimeline from './ProjectTimeline';
import { format, differenceInDays } from 'date-fns';
import { calculateProjectCost, getBusinessDaysDescription, formatProjectDuration, getCommonHolidays } from '../utils/dateUtils';
import '../styles/ProjectDetail.css';

function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await projectAPI.get(id);
        setProject(response.data);
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProject();
  }, [id]);

  const updateProject = async (updates) => {
    try {
      const response = await projectAPI.update(id, updates);
      setProject(response.data);
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const syncProgress = async () => {
    setSyncing(true);
    try {
      await projectAPI.syncProgress(id);
      const response = await projectAPI.get(id);
      setProject(response.data);
    } catch (error) {
      console.error('Error syncing progress:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Calculate project progress based on linked epics
  const calculateProjectProgress = () => {
    if (!project.jira_epics || project.jira_epics.length === 0) {
      return 0;
    }

    const totalProgress = project.jira_epics.reduce((sum, epic) => {
      return sum + (epic.progress || 0);
    }, 0);

    return Math.round(totalProgress / project.jira_epics.length);
  };

  // Calculate project costs using business days
  const calculateProjectCostBusinessDays = () => {
    if (!project.start_date || !project.end_date) {
      return { estimated: 0, current: 0, businessDaysInfo: null };
    }

    // Get current year's holidays
    const currentYear = new Date().getFullYear();
    const holidays = getCommonHolidays(currentYear);
    
    // Estimated cost based on max team members
    const estimatedCost = calculateProjectCost(
      project.start_date, 
      project.end_date, 
      project.max_team_members || 0, 
      100, 
      4, 
      holidays
    );
    
    // Current cost based on actual team members
    const currentTeamSize = project.developers?.length || 0;
    const currentCost = calculateProjectCost(
      project.start_date, 
      project.end_date, 
      currentTeamSize, 
      100, 
      4, 
      holidays
    );

    // Get business days information
    const businessDaysInfo = getBusinessDaysDescription(
      project.start_date, 
      project.end_date, 
      holidays
    );

    return { estimated: estimatedCost, current: currentCost, businessDaysInfo };
  };

  // Calculate team capacity
  const getTeamCapacity = () => {
    const currentTeam = project.developers?.length || 0;
    const maxTeam = project.max_team_members || 0;
    const percentage = maxTeam > 0 ? (currentTeam / maxTeam) * 100 : 0;
    
    return {
      current: currentTeam,
      max: maxTeam,
      percentage: Math.round(percentage),
      status: percentage >= 100 ? 'full' : percentage >= 80 ? 'nearly-full' : 'available'
    };
  };

  // Calculate detailed progress from epic issues
  const calculateDetailedProgress = () => {
    if (!project.jira_epics || project.jira_epics.length === 0) {
      return { total: 0, completed: 0, inProgress: 0, todo: 0 };
    }

    let total = 0;
    let completed = 0;
    let inProgress = 0;
    let todo = 0;

    project.jira_epics.forEach(epic => {
      if (epic.total_issues) {
        total += epic.total_issues;
        completed += epic.done_issues || 0;
        inProgress += epic.in_progress_issues || 0;
        todo += epic.todo_issues || 0;
      }
    });

    return { total, completed, inProgress, todo };
  };

  // Get epic progress breakdown
  const getEpicProgressBreakdown = () => {
    if (!project.jira_epics || project.jira_epics.length === 0) {
      return [];
    }

    return project.jira_epics.map(epic => ({
      key: epic.key,
      title: epic.title,
      progress: epic.progress || 0,
      status: epic.status,
      totalIssues: epic.total_issues || 0,
      doneIssues: epic.done_issues || 0,
      inProgressIssues: epic.in_progress_issues || 0,
      todoIssues: epic.todo_issues || 0
    }));
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

  const getPriorityClass = (priority) => {
    return `priority-${priority?.replace('_', '-')}`;
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return '#34c759';
    if (progress >= 60) return '#007aff';
    if (progress >= 40) return '#ff9500';
    return '#ff3b30';
  };

  const getCapacityColor = (status) => {
    switch (status) {
      case 'full': return '#ff3b30';
      case 'nearly-full': return '#ff9500';
      default: return '#34c759';
    }
  };

  const getDaysRemaining = () => {
    if (!project) return 0;
    const today = new Date();
    const endDate = new Date(project.end_date);
    return Math.max(0, differenceInDays(endDate, today));
  };

  const getProjectDuration = () => {
    if (!project) return 0;
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);
    return differenceInDays(endDate, startDate) + 1;
  };

  // Generate project description from linked ideas
  const getProjectDescription = () => {
    if (project.description && project.description.trim()) {
      return project.description;
    }
    
    if (project.jira_ideas && project.jira_ideas.length > 0) {
      const ideaSummaries = project.jira_ideas
        .slice(0, 3)
        .map(idea => idea.summary || idea.title)
        .join(', ');
      
      return `This project encompasses the following key ideas: ${ideaSummaries}${project.jira_ideas.length > 3 ? ` and ${project.jira_ideas.length - 3} more ideas` : ''}.`;
    }
    
    return 'No description provided for this project.';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-card glass">
          <div className="loading-spinner large"></div>
          <h3>Loading project details...</h3>
          <p>Please wait while we fetch your project data</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="error-container">
        <div className="error-card glass">
          <div className="error-icon">
            <span style={{ fontSize: '64px' }}>❌</span>
          </div>
          <h3>Project Not Found</h3>
          <p>The project you're looking for doesn't exist or has been deleted.</p>
          <Link to="/" className="btn btn-primary">
            <span>←</span>
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const projectProgress = calculateProjectProgress();
  const progressDetails = calculateDetailedProgress();
  const epicBreakdown = getEpicProgressBreakdown();
  const teamCapacity = getTeamCapacity();
  const projectCosts = calculateProjectCostBusinessDays();

  return (
    <div className="project-detail-page">
      {/* Project Header */}
      <div className="project-detail-header">
        <div className="header-navigation">
          <Link to="/" className="back-button">
            <span>←</span>
            Back to Projects
          </Link>
        </div>

        <div className="project-hero glass" data-priority={project.priority}>
          <div className="project-hero-content">
            <div className="project-title-section">
              <h1 className="project-title">{project.title}</h1>
              <div className="project-meta-badges">
                <span className={`priority-badge ${getPriorityClass(project.priority)}`}>
                  {getPriorityLabel(project.priority)}
                </span>
                <span className="date-badge">
                  {format(new Date(project.start_date), 'MMM d')} - {format(new Date(project.end_date), 'MMM d, yyyy')}
                </span>
              </div>
            </div>

            <div className="project-actions">
              <button 
                onClick={syncProgress} 
                className={`btn btn-secondary ${syncing ? 'loading' : ''}`}
                disabled={syncing}
              >
                {!syncing && <span>🔄</span>}
                
                {syncing ? 'Syncing...' : 'Sync Progress'}
              </button>
            </div>
          </div>

          {/* Project Stats Cards */}
          <div className="project-stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <span style={{ fontSize: '24px' }}>⏰</span>
              </div>
              <div className="stat-content">
                <div className="stat-number">{getDaysRemaining()}</div>
                <div className="stat-label">Days Remaining</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <span style={{ fontSize: '24px' }}>✅</span>
              </div>
              <div className="stat-content">
                <div className="stat-number">{projectProgress}%</div>
                <div className="stat-label">Progress</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <span style={{ fontSize: '24px' }}>👥</span>
              </div>
              <div className="stat-content">
                <div className="stat-number">{teamCapacity.current}/{teamCapacity.max}</div>
                <div className="stat-label">Team Capacity</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <span style={{ fontSize: '24px' }}>💰</span>
              </div>
              <div className="stat-content">
                <div className="stat-number">€{Math.round(projectCosts.estimated / 1000)}K</div>
                <div className="stat-label">Est. Cost</div>
              </div>
            </div>
          </div>

          {/* Team Capacity Hero */}
          <div className="team-capacity-hero">
            <div className="capacity-header">
              <h3>Team Capacity</h3>
              <div className="capacity-stats">
                <span className="capacity-current">{teamCapacity.current}</span>
                <span className="capacity-separator">/</span>
                <span className="capacity-max">{teamCapacity.max}</span>
                <span className="capacity-percentage">({teamCapacity.percentage}%)</span>
              </div>
            </div>
            <div className="capacity-bar large">
              <div 
                className="capacity-fill"
                style={{ 
                  width: `${Math.min(teamCapacity.percentage, 100)}%`,
                  backgroundColor: getCapacityColor(teamCapacity.status)
                }}
              ></div>
            </div>
            <div className="capacity-status">
              {teamCapacity.status === 'full' && 'Team is at full capacity'}
              {teamCapacity.status === 'nearly-full' && 'Team is nearly at capacity'}
              {teamCapacity.status === 'available' && 'Team has available capacity'}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="hero-progress-section">
            <div className="progress-header">
              <span className="progress-label">Overall Progress</span>
              <span className="progress-value">{projectProgress}%</span>
            </div>
            <div className="progress-bar large">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${projectProgress}%`,
                  backgroundColor: getProgressColor(projectProgress)
                }}
              ></div>
            </div>
            <div className="progress-breakdown">
              <div className="breakdown-item">
                <span className="breakdown-dot" style={{ backgroundColor: '#34c759' }}></span>
                <span className="breakdown-label">Completed: {progressDetails.completed}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-dot" style={{ backgroundColor: '#007aff' }}></span>
                <span className="breakdown-label">In Progress: {progressDetails.inProgress}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-dot" style={{ backgroundColor: '#8e8e93' }}></span>
                <span className="breakdown-label">To Do: {progressDetails.todo}</span>
              </div>
            </div>
          </div>

          {/* Cost Overview */}
          <div className="cost-overview-hero">
            <div className="cost-header">
              <h3>Project Costs (Business Days)</h3>
            </div>
            {projectCosts.businessDaysInfo && (
              <div className="business-days-summary">
                <div className="business-days-info">
                  <span className="business-days-icon">📅</span>
                  <div className="business-days-content">
                    <div className="business-days-main">
                      <strong>{projectCosts.businessDaysInfo.businessDays} business days</strong>
                      <span className="duration-text">
                        ({formatProjectDuration(project.start_date, project.end_date)})
                      </span>
                    </div>
                    <div className="business-days-breakdown">
                      <span>📊 {projectCosts.businessDaysInfo.totalDays} total days</span>
                      <span>🚫 {projectCosts.businessDaysInfo.weekendDays} weekends excluded</span>
                      {projectCosts.businessDaysInfo.holidays > 0 && (
                        <span>🎉 {projectCosts.businessDaysInfo.holidays} holidays excluded</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="cost-breakdown">
              <div className="cost-item">
                <div className="cost-label">Estimated Budget</div>
                <div className="cost-amount">€{projectCosts.estimated.toLocaleString()}</div>
                <div className="cost-details">{project.max_team_members} max × {projectCosts.businessDaysInfo?.businessDays || 0} business days</div>
              </div>
              <div className="cost-item">
                <div className="cost-label">Current Projection</div>
                <div className="cost-amount">€{projectCosts.current.toLocaleString()}</div>
                <div className="cost-details">{teamCapacity.current} members × {projectCosts.businessDaysInfo?.businessDays || 0} business days</div>
              </div>
            </div>
            <div className="cost-savings">
              {projectCosts.current < projectCosts.estimated && (
                <div className="savings-indicator">
                  <span className="savings-icon">💰</span>
                  <span>Potential savings: €{(projectCosts.estimated - projectCosts.current).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Epic Progress Breakdown */}
          {epicBreakdown.length > 0 && (
            <div className="epic-progress-breakdown">
              <h4>Epic Progress Breakdown</h4>
              <div className="epic-progress-grid">
                {epicBreakdown.map(epic => (
                  <div key={epic.key} className="epic-progress-item">
                    <div className="epic-progress-header">
                      <span className="epic-key">{epic.key}</span>
                      <span className="epic-progress-value">{epic.progress}%</span>
                    </div>
                    <div className="epic-progress-bar">
                      <div 
                        className="epic-progress-fill"
                        style={{ 
                          width: `${epic.progress}%`,
                          backgroundColor: getProgressColor(epic.progress)
                        }}
                      ></div>
                    </div>
                    <div className="epic-progress-details">
                      <span className="epic-title">{epic.title}</span>
                      <span className="epic-issues">{epic.doneIssues}/{epic.totalIssues} issues</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Team Capacity Warning */}
      {teamCapacity.status !== 'available' && (
        <div className="team-capacity-warning">
          <div className={`capacity-alert ${teamCapacity.status === 'full' ? 'warning' : 'info'}`}>
            <span className="alert-icon">
              {teamCapacity.status === 'full' ? '⚠️' : 'ℹ️'}
            </span>
            <div className="alert-content">
              <strong>
                {teamCapacity.status === 'full' ? 'Team at Full Capacity' : 'Team Nearly Full'}
              </strong>
              <p>
                {teamCapacity.status === 'full' 
                  ? 'This project has reached its maximum team size. Remove a member before adding new ones.'
                  : 'This project is approaching its maximum team size. Consider the capacity when adding new members.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="project-tabs-container">
        <div className="project-tabs glass">
          <button
            className={`project-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span>🏠</span>
            Overview
          </button>
          <button
            className={`project-tab ${activeTab === 'ideas' ? 'active' : ''}`}
            onClick={() => setActiveTab('ideas')}
          >
            <span>💡</span>
            Ideas
            <span className="tab-count">{project.jira_ideas?.length || 0}</span>
          </button>
          <button
            className={`project-tab ${activeTab === 'epics' ? 'active' : ''}`}
            onClick={() => setActiveTab('epics')}
          >
            <span>🎯</span>
            Epics
            <span className="tab-count">{project.jira_epics?.length || 0}</span>
          </button>
          <button
            className={`project-tab ${activeTab === 'docs' ? 'active' : ''}`}
            onClick={() => setActiveTab('docs')}
          >
            <span>📚</span>
            Documentation
            <span className="tab-count">{project.confluence_pages?.length || 0}</span>
          </button>
          <button
            className={`project-tab ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
          >
            <span>👥</span>
            Team
            <span className="tab-count">{project.developers?.length || 0}</span>
          </button>
          <button
            className={`project-tab ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            <span>📅</span>
            Timeline
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="project-tab-content">
        {activeTab === 'overview' && (
          <div className="overview-content">
            <div className="overview-grid">
              {/* Description Card */}
              <div className="overview-card glass">
                <div className="card-header">
                  <h3>Project Description</h3>
                  <span style={{ fontSize: '20px' }}>📄</span>
                </div>
                <div className="card-content">
                  <p>{getProjectDescription()}</p>
                  {project.jira_ideas && project.jira_ideas.length > 0 && (
                    <div className="linked-ideas">
                      <h4>Linked Ideas:</h4>
                      <div className="idea-tags">
                        {project.jira_ideas.slice(0, 5).map((idea, index) => (
                          <span key={index} className="idea-tag">
                            <a href={idea.url} target="_blank" rel="noopener noreferrer">
                              {idea.key}
                            </a>
                          </span>
                        ))}
                        {project.jira_ideas.length > 5 && (
                          <span className="idea-tag more">+{project.jira_ideas.length - 5} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Team Capacity Overview */}
              <div className="overview-card glass">
                <div className="card-header">
                  <h3>Team Capacity</h3>
                  <span style={{ fontSize: '20px' }}>👥</span>
                </div>
                <div className="card-content">
                  <div className="team-capacity-overview">
                    <div className="capacity-visual">
                      <div 
                        className="capacity-circle"
                        style={{ '--percentage': teamCapacity.percentage }}
                      >
                        <span className="capacity-percentage-text">{teamCapacity.percentage}%</span>
                        <span className="capacity-label-text">Capacity</span>
                      </div>
                      <div className="capacity-details">
                        <div className="capacity-stat">
                          <span className="stat-number">{teamCapacity.current}</span>
                          <span className="stat-label">Current Team</span>
                        </div>
                        <div className="capacity-stat">
                          <span className="stat-number">{teamCapacity.max}</span>
                          <span className="stat-label">Max Capacity</span>
                        </div>
                        <div className="capacity-stat">
                          <span className="stat-number">{teamCapacity.max - teamCapacity.current}</span>
                          <span className="stat-label">Available</span>
                        </div>
                      </div>
                    </div>
                    <div className="capacity-status-text" style={{ color: getCapacityColor(teamCapacity.status) }}>
                      {teamCapacity.status === 'full' && '🔴 Team is at full capacity'}
                      {teamCapacity.status === 'nearly-full' && '🟡 Team is nearly at capacity'}
                      {teamCapacity.status === 'available' && '🟢 Team has available capacity'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="overview-card glass">
                <div className="card-header">
                  <h3>Cost Analysis (Business Days)</h3>
                  <span style={{ fontSize: '20px' }}>💰</span>
                </div>
                <div className="card-content">
                  <div className="cost-analysis">
                    <div className="cost-comparison">
                      <div className="cost-bar-container">
                        <div className="cost-bar-label">Budget vs Current</div>
                        <div className="cost-bar">
                          <div 
                            className="cost-bar-fill estimated"
                            style={{ width: '100%' }}
                          >
                            <span className="cost-bar-text">€{projectCosts.estimated.toLocaleString()}</span>
                          </div>
                          <div 
                            className="cost-bar-fill current"
                            style={{ width: `${(projectCosts.current / projectCosts.estimated) * 100}%` }}
                          >
                            <span className="cost-bar-text">€{projectCosts.current.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="cost-details-grid">
                      <div className="cost-detail">
                        <span className="cost-detail-label">Estimated Budget:</span>
                        <span className="cost-detail-value">€{projectCosts.estimated.toLocaleString()}</span>
                      </div>
                      <div className="cost-detail">
                        <span className="cost-detail-label">Current Projection:</span>
                        <span className="cost-detail-value">€{projectCosts.current.toLocaleString()}</span>
                      </div>
                      <div className="cost-detail">
                        <span className="cost-detail-label">Difference:</span>
                        <span className={`cost-detail-value ${projectCosts.current <= projectCosts.estimated ? 'positive' : 'negative'}`}>
                          {projectCosts.current <= projectCosts.estimated ? '-' : '+'}€{Math.abs(projectCosts.estimated - projectCosts.current).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {projectCosts.businessDaysInfo && (
                      <div className="business-days-note">
                        <span className="note-icon">📅</span>
                        <span>Based on {projectCosts.businessDaysInfo.businessDays} business days (excludes weekends and holidays)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Breakdown */}
              <div className="overview-card glass">
                <div className="card-header">
                  <h3>Progress Breakdown</h3>
                  <span style={{ fontSize: '20px' }}>📊</span>
                </div>
                <div className="card-content">
                  <div className="progress-stats">
                    <div className="progress-stat">
                      <div className="progress-stat-circle completed">
                        <span>{progressDetails.completed}</span>
                      </div>
                      <div className="progress-stat-label">Completed</div>
                    </div>
                    <div className="progress-stat">
                      <div className="progress-stat-circle in-progress">
                        <span>{progressDetails.inProgress}</span>
                      </div>
                      <div className="progress-stat-label">In Progress</div>
                    </div>
                    <div className="progress-stat">
                      <div className="progress-stat-circle todo">
                        <span>{progressDetails.todo}</span>
                      </div>
                      <div className="progress-stat-label">To Do</div>
                    </div>
                  </div>
                  {progressDetails.total > 0 && (
                    <div className="progress-chart">
                      <div className="chart-bar">
                        <div 
                          className="chart-segment completed" 
                          style={{ width: `${(progressDetails.completed / progressDetails.total) * 100}%` }}
                        ></div>
                        <div 
                          className="chart-segment in-progress" 
                          style={{ width: `${(progressDetails.inProgress / progressDetails.total) * 100}%` }}
                        ></div>
                        <div 
                          className="chart-segment todo" 
                          style={{ width: `${(progressDetails.todo / progressDetails.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Epic Progress Details */}
              {epicBreakdown.length > 0 && (
                <div className="overview-card glass full-width">
                  <div className="card-header">
                    <h3>Epic Progress Details</h3>
                    <span style={{ fontSize: '20px' }}>🎯</span>
                  </div>
                  <div className="card-content">
                    <div className="epic-details-grid">
                      {epicBreakdown.map(epic => (
                        <div key={epic.key} className="epic-detail-card">
                          <div className="epic-detail-header">
                            <div className="epic-detail-title">
                              <span className="epic-key">{epic.key}</span>
                              <span className="epic-status" style={{ color: getProgressColor(epic.progress) }}>
                                {epic.status}
                              </span>
                            </div>
                            <span className="epic-progress-percent">{epic.progress}%</span>
                          </div>
                          <h5 className="epic-detail-name">{epic.title}</h5>
                          <div className="epic-detail-progress">
                            <div className="progress-bar">
                              <div 
                                className="progress-fill"
                                style={{ 
                                  width: `${epic.progress}%`,
                                  backgroundColor: getProgressColor(epic.progress)
                                }}
                              ></div>
                            </div>
                          </div>
                          <div className="epic-detail-stats">
                            <span className="epic-stat">
                              <span className="stat-value">{epic.doneIssues}</span>
                              <span className="stat-label">Done</span>
                            </span>
                            <span className="epic-stat">
                              <span className="stat-value">{epic.inProgressIssues}</span>
                              <span className="stat-label">In Progress</span>
                            </span>
                            <span className="epic-stat">
                              <span className="stat-value">{epic.todoIssues}</span>
                              <span className="stat-label">To Do</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="overview-card glass">
                <div className="card-header">
                  <h3>Project Summary</h3>
                  <span style={{ fontSize: '20px' }}>📈</span>
                </div>
                <div className="card-content">
                  <div className="summary-stats">
                    <div className="summary-stat">
                      <div className="summary-stat-number">{project.jira_ideas?.length || 0}</div>
                      <div className="summary-stat-label">Jira Ideas</div>
                    </div>
                    <div className="summary-stat">
                      <div className="summary-stat-number">{project.jira_epics?.length || 0}</div>
                      <div className="summary-stat-label">Jira Epics</div>
                    </div>
                    <div className="summary-stat">
                      <div className="summary-stat-number">{project.confluence_pages?.length || 0}</div>
                      <div className="summary-stat-label">Documents</div>
                    </div>
                    <div className="summary-stat">
                      <div className="summary-stat-number">{project.developers?.length || 0}</div>
                      <div className="summary-stat-label">Team Members</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="overview-card glass full-width">
                <div className="card-header">
                  <h3>Recent Activity</h3>
                  <span style={{ fontSize: '20px' }}>🕒</span>
                </div>
                <div className="card-content">
                  <div className="activity-list">
                    <div className="activity-item">
                      <div className="activity-icon">
                        <span style={{ fontSize: '16px' }}>✅</span>
                      </div>
                      <div className="activity-content">
                        <div className="activity-title">Project created</div>
                        <div className="activity-time">{format(new Date(project.created_at), 'MMM d, yyyy')}</div>
                      </div>
                    </div>
                    {project.last_sync && (
                      <div className="activity-item">
                        <div className="activity-icon">
                          <span style={{ fontSize: '16px' }}>🔄</span>
                        </div>
                        <div className="activity-content">
                          <div className="activity-title">Progress synced</div>
                          <div className="activity-time">{format(new Date(project.last_sync), 'MMM d, yyyy')}</div>
                        </div>
                      </div>
                    )}
                    {project.jira_ideas && project.jira_ideas.length > 0 && (
                      <div className="activity-item">
                        <div className="activity-icon">
                          <span style={{ fontSize: '16px' }}>💡</span>
                        </div>
                        <div className="activity-content">
                          <div className="activity-title">{project.jira_ideas.length} ideas linked</div>
                          <div className="activity-time">Project planning</div>
                        </div>
                      </div>
                    )}
                    {project.jira_epics && project.jira_epics.length > 0 && (
                      <div className="activity-item">
                        <div className="activity-icon">
                          <span style={{ fontSize: '16px' }}>🎯</span>
                        </div>
                        <div className="activity-content">
                          <div className="activity-title">{project.jira_epics.length} epics linked</div>
                          <div className="activity-time">Development planning</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ideas' && (
          <div className="tab-content-wrapper">
            <JiraIdeasPicker
              selectedIdeas={project.jira_ideas || []}
              onUpdate={(ideas) => updateProject({ jira_ideas: ideas })}
            />
          </div>
        )}

        {activeTab === 'epics' && (
          <div className="tab-content-wrapper">
            <JiraEpicsPicker
              selectedEpics={project.jira_epics || []}
              onUpdate={(epics) => updateProject({ jira_epics: epics })}
            />
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="tab-content-wrapper">
            <ConfluencePicker
              selectedPages={project.confluence_pages || []}
              onUpdate={(pages) => updateProject({ confluence_pages: pages })}
            />
          </div>
        )}

        {activeTab === 'team' && (
          <div className="tab-content-wrapper">
            <DeveloperPicker
              selectedDevelopers={project.developers || []}
              onUpdate={(developers) => updateProject({ developers: developers })}
              maxTeamMembers={project.max_team_members}
            />
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="tab-content-wrapper">
            <ProjectTimeline project={{ ...project, total_progress: projectProgress }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectDetail;