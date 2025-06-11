import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { projectAPI } from '../services/api';
import '../styles/ProjectPriorityManager.css';

function ProjectPriorityManager({ projects, onUpdate, onClose }) {
  const [sortedProjects, setSortedProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Sort projects by company_priority
    const sorted = [...projects].sort((a, b) => (a.company_priority || 999) - (b.company_priority || 999));
    setSortedProjects(sorted);
  }, [projects]);

  const handleDragEnd = (result) => {
    // Check if dropped outside the list
    if (!result.destination) {
      return;
    }

    // Check if the position actually changed
    if (result.destination.index === result.source.index) {
      return;
    }

    const items = Array.from(sortedProjects);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update company_priority for all projects based on new order
    const updatedItems = items.map((item, index) => ({
      ...item,
      company_priority: index + 1
    }));

    setSortedProjects(updatedItems);
    setHasChanges(true);
  };

  const savePriorityChanges = async () => {
    setLoading(true);
    try {
      // Send batch update to backend
      await projectAPI.updatePriorities(sortedProjects.map(p => ({
        id: p.id,
        company_priority: p.company_priority
      })));
      
      onUpdate(sortedProjects);
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('Error updating priorities:', error);
      alert('Failed to update priorities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetChanges = () => {
    const sorted = [...projects].sort((a, b) => (a.company_priority || 999) - (b.company_priority || 999));
    setSortedProjects(sorted);
    setHasChanges(false);
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

  return (
    <div className="priority-manager-overlay">
      <div className="priority-manager glass">
        <div className="priority-manager-header">
          <div className="header-content">
            <h2>
              <span className="header-icon">🎯</span>
              Manage Company Priorities
            </h2>
            <p className="header-subtitle">
              Drag and drop projects to reorder their company priority. Lower numbers = higher priority.
            </p>
          </div>
          <button onClick={onClose} className="close-btn">
            <span>✕</span>
          </button>
        </div>

        <div className="priority-manager-content">
          <div className="priority-instructions">
            <div className="instruction-item">
              <span className="instruction-icon">🖱️</span>
              <span>Drag projects up or down to change their priority order</span>
            </div>
            <div className="instruction-item">
              <span className="instruction-icon">🔢</span>
              <span>Priority #1 is the highest priority (most important)</span>
            </div>
            <div className="instruction-item">
              <span className="instruction-icon">⚡</span>
              <span>Changes are automatically numbered when you reorder</span>
            </div>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="priority-projects-list">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`priority-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                >
                  {sortedProjects.map((project, index) => (
                    <Draggable 
                      key={`project-${project.id}`} 
                      draggableId={`project-${project.id}`} 
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`priority-item ${snapshot.isDragging ? 'dragging' : ''} ${getPriorityClass(project.company_priority)}`}
                        >
                          <div className="priority-item-content">
                            <div className="priority-number">
                              <span className="priority-icon">{getPriorityIcon(project.company_priority)}</span>
                              <span className="priority-text">#{project.company_priority}</span>
                            </div>
                            
                            <div className="project-info">
                              <h4 className="project-title">{project.title}</h4>
                              <div className="project-meta">
                                <span className="project-dates">
                                  📅 {new Date(project.start_date).toLocaleDateString()} - {new Date(project.end_date).toLocaleDateString()}
                                </span>
                                <span className="project-team">
                                  👥 {project.developers?.length || 0}/{project.max_team_members} members
                                </span>
                              </div>
                            </div>

                            <div className="drag-handle">
                              <span>⋮⋮</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        <div className="priority-manager-footer">
          <div className="footer-info">
            {hasChanges && (
              <span className="changes-indicator">
                <span className="changes-icon">⚠️</span>
                You have unsaved changes
              </span>
            )}
          </div>
          <div className="footer-actions">
            <button 
              onClick={resetChanges} 
              className="btn btn-secondary"
              disabled={!hasChanges || loading}
            >
              <span>🔄</span>
              Reset
            </button>
            <button 
              onClick={onClose} 
              className="btn btn-secondary"
            >
              <span>❌</span>
              Cancel
            </button>
            <button 
              onClick={savePriorityChanges} 
              className={`btn btn-primary ${loading ? 'loading' : ''}`}
              disabled={!hasChanges || loading}
            >
              {!loading && <span>✅</span>}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectPriorityManager;