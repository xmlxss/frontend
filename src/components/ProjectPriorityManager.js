import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { projectAPI } from '../services/api';
import '../styles/ProjectPriorityManager.css';

function ProjectPriorityManager({ projects, onUpdate, onClose }) {
  const [sortedProjects, setSortedProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const mountedRef = useRef(false);
  const initTimeoutRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    console.log('🚀 ProjectPriorityManager mounted');
    console.log('📊 Initial projects:', projects);
    
    // Clear any existing timeout
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
    }
    
    // Enhanced project validation and sorting
    const validProjects = projects.filter(project => {
      const isValid = project && 
                     project.id !== null && 
                     project.id !== undefined && 
                     typeof project.id !== 'undefined' &&
                     project.title;
      
      if (!isValid) {
        console.warn('❌ Invalid project filtered out:', project);
      }
      return isValid;
    });

    console.log('✅ Valid projects after filtering:', validProjects);

    const sorted = [...validProjects]
      .sort((a, b) => (a.company_priority || 999) - (b.company_priority || 999))
      .map((project, index) => {
        const updatedProject = {
          ...project,
          company_priority: project.company_priority || (index + 1)
        };
        console.log(`📋 Project ${index + 1}:`, {
          id: updatedProject.id,
          title: updatedProject.title,
          company_priority: updatedProject.company_priority
        });
        return updatedProject;
      });
    
    setSortedProjects(sorted);
    setDebugInfo(`Processed ${sorted.length} projects`);
    
    // Multiple initialization attempts with increasing delays
    const initializeDragDrop = () => {
      console.log('🔄 Attempting to initialize drag & drop...');
      
      // First attempt - immediate
      setTimeout(() => {
        if (mountedRef.current) {
          console.log('✅ First initialization attempt');
          setIsReady(true);
          setDebugInfo(`Ready! ${sorted.length} projects loaded (attempt 1)`);
        }
      }, 100);
      
      // Second attempt - longer delay
      initTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current && !isReady) {
          console.log('✅ Second initialization attempt');
          setIsReady(true);
          setDebugInfo(`Ready! ${sorted.length} projects loaded (attempt 2)`);
        }
      }, 500);
      
      // Third attempt - even longer delay
      setTimeout(() => {
        if (mountedRef.current && !isReady) {
          console.log('✅ Third initialization attempt');
          setIsReady(true);
          setDebugInfo(`Ready! ${sorted.length} projects loaded (attempt 3)`);
        }
      }, 1000);
    };

    // Start initialization process
    initializeDragDrop();

    return () => {
      mountedRef.current = false;
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [projects]);

  // Force re-render when isReady changes
  useEffect(() => {
    if (isReady) {
      console.log('🎯 Drag & Drop is now ready!');
      // Force a small re-render to ensure DOM is stable
      setTimeout(() => {
        if (mountedRef.current) {
          setDebugInfo(`Fully initialized with ${sortedProjects.length} projects`);
        }
      }, 100);
    }
  }, [isReady, sortedProjects.length]);

  const handleDragStart = (start) => {
    console.log('🎯 Drag started:', {
      draggableId: start.draggableId,
      source: start.source,
      type: start.type
    });
    setDebugInfo(`Dragging: ${start.draggableId}`);
  };

  const handleDragUpdate = (update) => {
    console.log('🔄 Drag update:', {
      draggableId: update.draggableId,
      source: update.source,
      destination: update.destination
    });
    if (update.destination) {
      setDebugInfo(`Moving from ${update.source.index} to ${update.destination.index}`);
    }
  };

  const handleDragEnd = (result) => {
    console.log('🏁 Drag end result:', result);
    
    setDebugInfo('Processing drag result...');
    
    // Check if dropped outside the list
    if (!result.destination) {
      console.log('❌ Dropped outside list');
      setDebugInfo('Dropped outside - no changes');
      return;
    }

    // Check if the position actually changed
    if (result.destination.index === result.source.index) {
      console.log('❌ Position unchanged');
      setDebugInfo('Position unchanged');
      return;
    }

    console.log('✅ Valid drag operation, updating order...');

    const items = Array.from(sortedProjects);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update company_priority for all projects based on new order
    const updatedItems = items.map((item, index) => ({
      ...item,
      company_priority: index + 1
    }));

    console.log('📊 Updated items order:', updatedItems.map(p => ({
      id: p.id,
      title: p.title,
      company_priority: p.company_priority
    })));

    setSortedProjects(updatedItems);
    setHasChanges(true);
    setDebugInfo(`Reordered! ${updatedItems.length} projects updated`);
  };

  const savePriorityChanges = async () => {
    setLoading(true);
    setDebugInfo('Saving changes...');
    
    try {
      // Send batch update to backend
      const updateData = sortedProjects.map(p => ({
        id: p.id,
        company_priority: p.company_priority
      }));
      
      console.log('💾 Sending update data:', updateData);
      await projectAPI.updatePriorities(updateData);
      
      onUpdate(sortedProjects);
      setHasChanges(false);
      setDebugInfo('Changes saved successfully!');
      
      // Close after a brief delay to show success message
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('❌ Error updating priorities:', error);
      setDebugInfo('Error saving changes!');
      alert('Failed to update priorities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetChanges = () => {
    console.log('🔄 Resetting changes');
    const sorted = [...projects]
      .filter(project => project && project.id && typeof project.id !== 'undefined')
      .sort((a, b) => (a.company_priority || 999) - (b.company_priority || 999));
    setSortedProjects(sorted);
    setHasChanges(false);
    setDebugInfo('Changes reset');
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

  // Enhanced loading/error states
  if (!isReady || !sortedProjects || sortedProjects.length === 0) {
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
                {!isReady ? 'Preparing drag and drop interface...' : 'No projects available to prioritize.'}
              </p>
            </div>
            <button onClick={onClose} className="close-btn">
              <span>✕</span>
            </button>
          </div>
          
          <div className="priority-manager-content">
            {!isReady ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading projects and initializing drag & drop...</p>
                <div className="debug-info">
                  <strong>Debug:</strong> {debugInfo}
                </div>
                <div className="debug-details">
                  <p>Total projects received: {projects?.length || 0}</p>
                  <p>Valid projects: {sortedProjects?.length || 0}</p>
                  <p>Ready state: {isReady ? 'Yes' : 'No'}</p>
                  <p>Mounted: {mountedRef.current ? 'Yes' : 'No'}</p>
                </div>
                <div className="retry-section">
                  <button 
                    onClick={() => {
                      console.log('🔄 Manual retry triggered');
                      setIsReady(true);
                      setDebugInfo('Manual initialization triggered');
                    }}
                    className="btn btn-secondary"
                  >
                    <span>🔄</span>
                    Force Initialize
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No Projects Available</h3>
                <p>There are no projects to prioritize at the moment.</p>
              </div>
            )}
          </div>
          
          <div className="priority-manager-footer">
            <div className="footer-info">
              <span className="debug-status">Status: {debugInfo}</span>
            </div>
            <div className="footer-actions">
              <button onClick={onClose} className="btn btn-secondary">
                <span>❌</span>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

          {/* Debug Panel */}
          <div className="debug-panel">
            <div className="debug-header">
              <span className="debug-icon">🔍</span>
              <span>Debug Info: {debugInfo}</span>
            </div>
            <div className="debug-details">
              <span>Projects loaded: {sortedProjects.length}</span>
              <span>Has changes: {hasChanges ? 'Yes' : 'No'}</span>
              <span>Ready: {isReady ? 'Yes' : 'No'}</span>
              <span>Mounted: {mountedRef.current ? 'Yes' : 'No'}</span>
            </div>
          </div>

          {/* Strict mode wrapper to prevent React.StrictMode issues */}
          <div key={`dnd-context-${isReady}-${sortedProjects.length}`}>
            <DragDropContext 
              onDragEnd={handleDragEnd}
              onDragStart={handleDragStart}
              onDragUpdate={handleDragUpdate}
            >
              <Droppable 
                droppableId="priority-projects-list" 
                type="PRIORITY_PROJECT"
                isDropDisabled={loading}
              >
                {(provided, snapshot) => {
                  console.log('🎨 Droppable render:', {
                    isDraggingOver: snapshot.isDraggingOver,
                    draggingOverWith: snapshot.draggingOverWith,
                    draggingFromThisWith: snapshot.draggingFromThisWith
                  });
                  
                  return (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`priority-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                    >
                      {sortedProjects.map((project, index) => {
                        // Create a stable, unique ID for each draggable
                        const draggableId = `priority-project-${project.id}`;
                        
                        console.log(`🎯 Rendering draggable ${index}:`, {
                          draggableId,
                          projectId: project.id,
                          title: project.title,
                          index
                        });
                        
                        return (
                          <Draggable 
                            key={`${draggableId}-${index}`} // More stable key
                            draggableId={draggableId}
                            index={index}
                            isDragDisabled={loading}
                          >
                            {(provided, snapshot) => {
                              console.log(`🎨 Draggable ${draggableId} render:`, {
                                isDragging: snapshot.isDragging,
                                isDropAnimating: snapshot.isDropAnimating,
                                draggingOver: snapshot.draggingOver
                              });
                              
                              return (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`priority-item ${snapshot.isDragging ? 'dragging' : ''} ${getPriorityClass(project.company_priority)}`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    opacity: snapshot.isDragging ? 0.8 : 1,
                                    transform: snapshot.isDragging 
                                      ? `${provided.draggableProps.style?.transform} rotate(2deg)` 
                                      : provided.draggableProps.style?.transform,
                                  }}
                                  data-testid={`priority-item-${project.id}`}
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
                                      <div className="project-debug">
                                        <small>ID: {project.id} | DraggableId: {draggableId} | Index: {index}</small>
                                      </div>
                                    </div>

                                    <div className="drag-handle">
                                      <span>⋮⋮</span>
                                      <div className="handle-tooltip">Drag to reorder</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  );
                }}
              </Droppable>
            </DragDropContext>
          </div>
        </div>

        <div className="priority-manager-footer">
          <div className="footer-info">
            <div className="status-info">
              <span className="status-text">Status: {debugInfo}</span>
              {hasChanges && (
                <span className="changes-indicator">
                  <span className="changes-icon">⚠️</span>
                  You have unsaved changes
                </span>
              )}
            </div>
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