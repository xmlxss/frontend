import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectAPI } from '../services/api';

function ProjectForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    priority: 'medium'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const priorities = [
    { value: 'very_high', label: 'Very High', color: '#00693e' },
    { value: 'high', label: 'High', color: '#00875a' },
    { value: 'medium', label: 'Medium', color: '#36b37e' },
    { value: 'low', label: 'Low', color: '#57d9a3' },
    { value: 'very_low', label: 'Very Low', color: '#79f2c0' }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error for this field
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    
    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }
    
    if (formData.start_date && formData.end_date && 
        new Date(formData.start_date) > new Date(formData.end_date)) {
      newErrors.end_date = 'End date must be after start date';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await projectAPI.create(formData);
      navigate(`/projects/${response.data.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="project-form-container">
      <div className="form-card">
        <h1>Create New Project</h1>
        <p className="form-subtitle">Define a new project and set its priority</p>
        
        <form onSubmit={handleSubmit} className="project-form">
          <div className="form-group">
            <label htmlFor="title">Project Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={errors.title ? 'error' : ''}
              placeholder="Enter a descriptive project title"
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              placeholder="Describe the project goals and objectives"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="priority">Priority Level *</label>
            <div className="priority-selector">
              {priorities.map(priority => (
                <div 
                  key={priority.value}
                  className={`priority-option ${formData.priority === priority.value ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, priority: priority.value })}
                  style={{ '--priority-color': priority.color }}
                >
                  <div className="priority-color-bar" style={{ backgroundColor: priority.color }}></div>
                  <span className="priority-label">{priority.label}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_date">Start Date *</label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className={errors.start_date ? 'error' : ''}
              />
              {errors.start_date && <span className="error-message">{errors.start_date}</span>}
            </div>
            
            <div className="form-group">
              <label htmlFor="end_date">End Date *</label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className={errors.end_date ? 'error' : ''}
              />
              {errors.end_date && <span className="error-message">{errors.end_date}</span>}
            </div>
          </div>
          
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="loading-spinner" style={{ width: '16px', height: '16px' }}></span>
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProjectForm;