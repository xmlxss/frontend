import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { projectAPI } from '../services/api';
import '../styles/ProjectPriorityManager.css';

// Sortable Item Component
function SortableProjectItem({ project, index }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 1,
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
    <div
      ref={setNodeRef}
      style={style}
      className={`priority-item ${isDragging ? 'dragging' : ''} ${getPriorityClass(project.company_priority)}`}
      {...attributes}
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
            <small>ID: {project.id} | Index: {index}</small>
          </div>
        </div>

        <div className="drag-handle" {...listeners}>
          <span>⋮⋮</span>
          <div className="handle-tooltip">Drag to reorder</div>
        </div>
      </div>
    </div>
  );
}

function ProjectPriorityManager({ projects, onUpdate, onClose }) {
  const [sortedProjects, setSortedProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [debugInfo, setDebugInfo] = useState('Initializing...');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    console.log('🚀 ProjectPriorityManager mounted with @dnd-kit');
    console.log('📊 Initial projects:', projects);
    
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
    setDebugInfo(`Ready! ${sorted.length} projects loaded with @dnd-kit`);
  }, [projects]);

  const handleDragStart = (event) => {
    console.log('🎯 Drag started:', event);
    const draggedProject = sortedProjects.find(p => p.id === event.active.id);
    setDebugInfo(`Dragging: ${draggedProject?.title || event.active.id}`);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeIndex = sortedProjects.findIndex(p => p.id === active.id);
      const overIndex = sortedProjects.findIndex(p => p.id === over.id);
      setDebugInfo(`Moving from position ${activeIndex + 1} to ${overIndex + 1}`);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    console.log('🏁 Drag end:', { active: active.id, over: over?.id });
    
    if (!over) {
      console.log('❌ Dropped outside list');
      setDebugInfo('Dropped outside - no changes');
      return;
    }

    if (active.id !== over.id) {
      console.log('✅ Valid drag operation, updating order...');
      
      setSortedProjects((items) => {
        const oldIndex = items.findIndex(p => p.id === active.id);
        const newIndex = items.findIndex(p => p.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update company_priority for all projects based on new order
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          company_priority: index + 1
        }));

        console.log('📊 Updated items order:', updatedItems.map(p => ({
          id: p.id,
          title: p.title,
          company_priority: p.company_priority
        })));

        setHasChanges(true);
        setDebugInfo(`Reordered! ${updatedItems.length} projects updated`);
        
        return updatedItems;
      });
    } else {
      setDebugInfo('Position unchanged');
    }
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

  if (!sortedProjects || sortedProjects.length === 0) {
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
                No projects available to prioritize.
              </p>
            </div>
            <button onClick={onClose} className="close-btn">
              <span>✕</span>
            </button>
          </div>
          
          <div className="priority-manager-content">
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No Projects Available</h3>
              <p>There are no projects to prioritize at the moment.</p>
            </div>
          </div>
          
          <div className="priority-manager-footer">
            <div className="footer-info">
              <span className="debug-status">Status: No projects found</span>
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
              <span>Library: @dnd-kit (modern & reliable)</span>
              <span>Projects loaded: {sortedProjects.length}</span>
              <span>Has changes: {hasChanges ? 'Yes' : 'No'}</span>
              <span>Status: Ready for drag & drop</span>
            </div>
          </div>

          {/* @dnd-kit Implementation */}
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={sortedProjects.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="priority-list">
                {sortedProjects.map((project, index) => (
                  <SortableProjectItem
                    key={project.id}
                    project={project}
                    index={index}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
              }
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectPriorityManager;