import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectAPI } from '../services/api';
import { format } from 'date-fns';

function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="loading">Loading projects...</div>;

  return (
    <div className="project-list">
      <h1>Projects</h1>
      {projects.length === 0 ? (
        <div className="empty-state">
          <p>No projects yet. Create your first project!</p>
          <Link to="/new" className="btn btn-primary">Create Project</Link>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(project => (
            <div key={project.id} className="project-card">
              <h3>{project.title}</h3>
              <p className="project-description">{project.description}</p>
              <div className="project-meta">
                <span className="date-range">
                  {format(new Date(project.start_date), 'MMM d, yyyy')} - 
                  {format(new Date(project.end_date), 'MMM d, yyyy')}
                </span>
                <div className="project-stats">
                  <span>{project.jira_ideas?.length || 0} Ideas</span>
                  <span>{project.jira_epics?.length || 0} Epics</span>
                  <span>{project.developers?.length || 0} Developers</span>
                </div>
              </div>
              <div className="project-actions">
                <Link to={`/projects/${project.id}`} className="btn btn-secondary">View</Link>
                <button onClick={() => handleDelete(project.id)} className="btn btn-danger">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProjectList;