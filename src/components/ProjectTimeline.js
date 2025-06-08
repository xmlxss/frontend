import React, { useMemo } from 'react';
import { format, differenceInDays, addDays } from 'date-fns';

function ProjectTimeline({ project }) {
  const timelineData = useMemo(() => {
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);
    const totalDays = differenceInDays(endDate, startDate) + 1;
    
    // Prepare timeline items
    const items = [];
    
    // Main project bar
    items.push({
      id: 'project',
      type: 'project',
      name: project.title,
      start: startDate,
      end: endDate,
      color: '#2563eb'
    });
    
    // Add epics with their dates
    project.jira_epics?.forEach((epic, index) => {
      if (epic.created && epic.duedate) {
        items.push({
          id: `epic-${epic.key}`,
          type: 'epic',
          name: `${epic.key}: ${epic.title}`,
          start: new Date(epic.created),
          end: new Date(epic.duedate),
          progress: epic.progress,
          color: '#10b981',
          url: epic.url
        });
      }
    });
    
    // Add milestones for ideas marked as important
    project.jira_ideas?.forEach((idea, index) => {
      if (idea.status === 'Done' || index < 3) { // Show first 3 ideas as milestones
        const milestoneDate = addDays(startDate, Math.floor((totalDays / (project.jira_ideas.length + 1)) * (index + 1)));
        items.push({
          id: `idea-${idea.key}`,
          type: 'milestone',
          name: `${idea.key}: ${idea.summary}`,
          date: milestoneDate,
          color: '#f59e0b',
          url: idea.url
        });
      }
    });
    
    return { items, startDate, endDate, totalDays };
  }, [project]);

  const getPositionForDate = (date) => {
    const daysDiff = differenceInDays(date, timelineData.startDate);
    return (daysDiff / timelineData.totalDays) * 100;
  };

  const getWidth = (start, end) => {
    const startPos = getPositionForDate(start);
    const endPos = getPositionForDate(end);
    return endPos - startPos;
  };

  // Generate month labels
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

  return (
    <div className="project-timeline">
      <h2>Project Timeline</h2>
      
      <div className="timeline-container">
        <div className="timeline-header">
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
        
        <div className="timeline-body">
          {timelineData.items.map((item) => {
            if (item.type === 'milestone') {
              return (
                <div key={item.id} className="timeline-row">
                  <div className="timeline-label">Milestone</div>
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
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          {item.name}
                        </a>
                        <span className="milestone-date">
                          {format(item.date, 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            } else {
              return (
                <div key={item.id} className="timeline-row">
                  <div className="timeline-label">
                    {item.type === 'project' ? 'Project' : 'Epic'}
                  </div>
                  <div className="timeline-bar-container">
                    <div
                      className="timeline-bar"
                      style={{
                        left: `${getPositionForDate(item.start)}%`,
                        width: `${getWidth(item.start, item.end)}%`,
                        backgroundColor: item.color
                      }}
                    >
                      <div className="bar-content">
                        {item.url ? (
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            {item.name}
                          </a>
                        ) : (
                          <span>{item.name}</span>
                        )}
                        {item.progress !== undefined && (
                          <div className="progress-indicator" style={{ width: `${item.progress}%` }}></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
          })}
        </div>
        
        <div className="timeline-legend">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#2563eb' }}></span>
            <span>Project Duration</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
            <span>Epics</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
            <span>Milestones</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectTimeline;