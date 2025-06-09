import React, { useMemo } from 'react';
import { format, differenceInDays, addDays, isAfter, isBefore } from 'date-fns';

function ProjectTimeline({ project }) {
  const timelineData = useMemo(() => {
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);
    const totalDays = differenceInDays(endDate, startDate) + 1;
    const today = new Date();
    
    const items = [];
    
    // Main project bar
    items.push({
      id: 'project',
      type: 'project',
      name: project.title,
      start: startDate,
      end: endDate,
      progress: project.total_progress || 0,
      color: '#2563eb',
      priority: project.priority
    });
    
    // Add epics with their dates
    project.jira_epics?.forEach((epic, index) => {
      let epicStart = startDate;
      let epicEnd = endDate;
      
      // Use epic dates if available, otherwise distribute across project timeline
      if (epic.created) {
        epicStart = new Date(epic.created);
      } else {
        // Distribute epics across timeline
        const epicDuration = Math.floor(totalDays / (project.jira_epics.length + 1));
        epicStart = addDays(startDate, epicDuration * index);
      }
      
      if (epic.duedate) {
        epicEnd = new Date(epic.duedate);
      } else {
        // Default epic duration
        epicEnd = addDays(epicStart, Math.max(14, Math.floor(totalDays / project.jira_epics.length)));
      }
      
      items.push({
        id: `epic-${epic.key}`,
        type: 'epic',
        name: `${epic.key}: ${epic.title}`,
        start: epicStart,
        end: epicEnd,
        progress: epic.progress || 0,
        color: '#10b981',
        url: epic.url,
        status: epic.status,
        priority: epic.priority
      });
    });
    
    // Add milestones for important ideas
    project.jira_ideas?.forEach((idea, index) => {
      if (idea.status === 'Done' || index < 3) {
        const milestoneDate = addDays(startDate, Math.floor((totalDays / (project.jira_ideas.length + 1)) * (index + 1)));
        items.push({
          id: `idea-${idea.key}`,
          type: 'milestone',
          name: `${idea.key}: ${idea.summary}`,
          date: milestoneDate,
          color: '#f59e0b',
          url: idea.url,
          status: idea.status,
          priority: idea.priority
        });
      }
    });
    
    // Add current date marker
    if (isAfter(today, startDate) && isBefore(today, endDate)) {
      items.push({
        id: 'today',
        type: 'today',
        name: 'Today',
        date: today,
        color: '#ef4444'
      });
    }
    
    return { items, startDate, endDate, totalDays, today };
  }, [project]);

  const getPositionForDate = (date) => {
    const daysDiff = differenceInDays(date, timelineData.startDate);
    return Math.max(0, Math.min(100, (daysDiff / timelineData.totalDays) * 100));
  };

  const getWidth = (start, end) => {
    const startPos = getPositionForDate(start);
    const endPos = getPositionForDate(end);
    return Math.max(2, endPos - startPos);
  };

  const monthLabels = useMemo(() => {
    const labels = [];
    let currentDate = new Date(timelineData.startDate);
    
    while (currentDate <= timelineData.endDate) {
      labels.push({
        label: format(currentDate, 'MMM yyyy'),
        position: getPositionForDate(currentDate)
      });
      currentDate = addDays(currentDate, 30);
    }
    
    return labels;
  }, [timelineData, getPositionForDate]);

  const getStatusColor = (status) => {
    const colors = {
      'Done': '#10b981',
      'In Progress': '#3b82f6',
      'To Do': '#6b7280',
      'Blocked': '#ef4444',
      'Review': '#8b5cf6'
    };
    return colors[status] || '#6b7280';
  };

  const getPriorityIcon = (priority) => {
    const icons = {
      'very_high': '🔴',
      'high': '🟠',
      'medium': '🟡',
      'low': '🟢',
      'very_low': '🔵'
    };
    return icons[priority] || '⚪';
  };

  return (
    <div className="project-timeline">
      <div className="timeline-header-section">
        <h2>Project Timeline</h2>
        <div className="timeline-stats">
          <div className="timeline-stat">
            <span className="stat-label">Duration</span>
            <span className="stat-value">{timelineData.totalDays} days</span>
          </div>
          <div className="timeline-stat">
            <span className="stat-label">Progress</span>
            <span className="stat-value">{Math.round(project.total_progress || 0)}%</span>
          </div>
          <div className="timeline-stat">
            <span className="stat-label">Epics</span>
            <span className="stat-value">{project.jira_epics?.length || 0}</span>
          </div>
        </div>
      </div>
      
      <div className="timeline-container glass">
        <div className="timeline-header">
          <div className="timeline-dates">
            <span className="start-date">{format(timelineData.startDate, 'MMM d, yyyy')}</span>
            <span className="end-date">{format(timelineData.endDate, 'MMM d, yyyy')}</span>
          </div>
          <div className="month-labels">
            {monthLabels.map((month, index) => (
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
        
        <div className="timeline-body">
          {timelineData.items.map((item) => {
            if (item.type === 'milestone') {
              return (
                <div key={item.id} className="timeline-row milestone-row">
                  <div className="timeline-label">
                    <span className="label-icon">🎯</span>
                    <span className="label-text">Milestone</span>
                  </div>
                  <div className="timeline-bar-container">
                    <div
                      className="timeline-milestone"
                      style={{
                        left: `${getPositionForDate(item.date)}%`,
                        backgroundColor: item.color
                      }}
                      title={item.name}
                    >
                      <div className="milestone-tooltip">
                        <div className="tooltip-header">
                          {item.url ? (
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="tooltip-title">
                              {item.name}
                            </a>
                          ) : (
                            <span className="tooltip-title">{item.name}</span>
                          )}
                          {item.priority && (
                            <span className="tooltip-priority">{getPriorityIcon(item.priority)}</span>
                          )}
                        </div>
                        <div className="tooltip-meta">
                          <span className="tooltip-date">{format(item.date, 'MMM d, yyyy')}</span>
                          {item.status && (
                            <span 
                              className="tooltip-status"
                              style={{ color: getStatusColor(item.status) }}
                            >
                              {item.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            } else if (item.type === 'today') {
              return (
                <div key={item.id} className="timeline-row today-row">
                  <div className="timeline-label">
                    <span className="label-icon">📅</span>
                    <span className="label-text">Today</span>
                  </div>
                  <div className="timeline-bar-container">
                    <div
                      className="timeline-today-marker"
                      style={{
                        left: `${getPositionForDate(item.date)}%`
                      }}
                    >
                      <div className="today-line"></div>
                      <div className="today-label">Today</div>
                    </div>
                  </div>
                </div>
              );
            } else {
              return (
                <div key={item.id} className="timeline-row bar-row">
                  <div className="timeline-label">
                    <span className="label-icon">
                      {item.type === 'project' ? '📋' : '🎯'}
                    </span>
                    <span className="label-text">
                      {item.type === 'project' ? 'Project' : 'Epic'}
                    </span>
                  </div>
                  <div className="timeline-bar-container">
                    <div
                      className={`timeline-bar ${item.type}`}
                      style={{
                        left: `${getPositionForDate(item.start)}%`,
                        width: `${getWidth(item.start, item.end)}%`,
                        backgroundColor: item.color
                      }}
                    >
                      <div className="bar-content">
                        <div className="bar-header">
                          {item.url ? (
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="bar-title">
                              {item.name}
                            </a>
                          ) : (
                            <span className="bar-title">{item.name}</span>
                          )}
                          {item.priority && (
                            <span className="bar-priority">{getPriorityIcon(item.priority)}</span>
                          )}
                        </div>
                        <div className="bar-meta">
                          <span className="bar-dates">
                            {format(item.start, 'MMM d')} - {format(item.end, 'MMM d')}
                          </span>
                          {item.status && (
                            <span 
                              className="bar-status"
                              style={{ color: getStatusColor(item.status) }}
                            >
                              {item.status}
                            </span>
                          )}
                        </div>
                      </div>
                      {item.progress !== undefined && (
                        <div 
                          className="progress-indicator" 
                          style={{ 
                            width: `${item.progress}%`,
                            backgroundColor: 'rgba(255, 255, 255, 0.3)'
                          }}
                        ></div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
          })}
        </div>
        
        <div className="timeline-legend">
          <div className="legend-section">
            <h4>Legend</h4>
            <div className="legend-items">
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#2563eb' }}></span>
                <span className="legend-label">Project Duration</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
                <span className="legend-label">Epics</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
                <span className="legend-label">Milestones</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
                <span className="legend-label">Current Date</span>
              </div>
            </div>
          </div>
          <div className="legend-section">
            <h4>Priority</h4>
            <div className="legend-items">
              <div className="legend-item">
                <span>🔴</span>
                <span className="legend-label">Very High</span>
              </div>
              <div className="legend-item">
                <span>🟠</span>
                <span className="legend-label">High</span>
              </div>
              <div className="legend-item">
                <span>🟡</span>
                <span className="legend-label">Medium</span>
              </div>
              <div className="legend-item">
                <span>🟢</span>
                <span className="legend-label">Low</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectTimeline;