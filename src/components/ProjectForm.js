import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectAPI } from '../services/api';
import { calculateProjectCost, getBusinessDaysDescription, formatProjectDuration, getCommonHolidays } from '../utils/dateUtils';
import '../styles/ProjectForm.css';

function ProjectForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    priority: 'medium',
    max_team_members: 5
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const priorities = [
    { value: 'very_high', label: 'Urgent', color: '#ff3b30', description: 'Critical priority' },
    { value: 'high', label: 'High', color: '#ff9500', description: 'Important work' },
    { value: 'medium', label: 'Medium', color: '#007aff', description: 'Standard priority' },
    { value: 'low', label: 'Low', color: '#34c759', description: 'Nice to have' },
    { value: 'very_low', label: 'Very Low', color: '#5ac8fa', description: 'Future consideration' }
  ];

  const teamSizePresets = [
    { value: 1, label: 'Solo', description: 'Individual contributor' },
    { value: 2, label: 'Pair', description: 'Two-person team' },
    { value: 3, label: 'Small', description: 'Small agile team' },
    { value: 5, label: 'Standard', description: 'Typical team size' },
    { value: 8, label: 'Large', description: 'Extended team' },
    { value: 12, label: 'Department', description: 'Department-wide' },
    { value: 20, label: 'Division', description: 'Large initiative' }
  ];

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    });
    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const handleTeamSizePreset = (size) => {
    setFormData({
      ...formData,
      max_team_members: size
    });
    if (errors.max_team_members) {
      setErrors({
        ...errors,
        max_team_members: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Project title is required';
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

    if (!formData.max_team_members || formData.max_team_members < 1) {
      newErrors.max_team_members = 'Team size must be at least 1';
    }

    if (formData.max_team_members > 100) {
      newErrors.max_team_members = 'Team size cannot exceed 100 members';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateEstimatedCost = () => {
    if (!formData.start_date || !formData.end_date || !formData.max_team_members) {
      return { cost: 0, businessDays: 0, description: '' };
    }

    // Get current year's holidays
    const currentYear = new Date().getFullYear();
    const holidays = getCommonHolidays(currentYear);
    
    const cost = calculateProjectCost(
      formData.start_date, 
      formData.end_date, 
      formData.max_team_members, 
      100, 
      4, 
      holidays
    );
    
    const businessDaysInfo = getBusinessDaysDescription(
      formData.start_date, 
      formData.end_date, 
      holidays
    );

    return {
      cost,
      businessDays: businessDaysInfo.businessDays,
      description: businessDaysInfo.description,
      totalDays: businessDaysInfo.totalDays,
      weekendDays: businessDaysInfo.weekendDays,
      holidays: businessDaysInfo.holidays
    };
  };

  const getTeamSizeRecommendation = () => {
    const teamSize = formData.max_team_members;
    if (teamSize === 1) return { icon: '👤', text: 'Perfect for focused individual work', color: '#34c759' };
    if (teamSize <= 2) return { icon: '👥', text: 'Great for pair programming and collaboration', color: '#34c759' };
    if (teamSize <= 3) return { icon: '🔥', text: 'Ideal for agile development teams', color: '#34c759' };
    if (teamSize <= 5) return { icon: '⚡', text: 'Balanced team size for most projects', color: '#007aff' };
    if (teamSize <= 8) return { icon: '🚀', text: 'Large team - ensure good coordination', color: '#ff9500' };
    if (teamSize <= 12) return { icon: '🏢', text: 'Department-level project', color: '#ff9500' };
    return { icon: '🌟', text: 'Enterprise-scale initiative', color: '#ff3b30' };
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

  const costEstimation = calculateEstimatedCost();
  const recommendation = getTeamSizeRecommendation();

  return (
    <div className="project-form-container">
      <div className="form-card">
        <div className="form-header">
          <h1>Create New Project</h1>
          <p className="form-subtitle">Define a new project with team size and cost estimation based on business days</p>
        </div>
        
        <form onSubmit={handleSubmit} className="project-form">
          <div className="form-group">
            <label htmlFor="title">
              <span className="label-icon">📝</span>
              Project Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={errors.title ? 'error' : ''}
              placeholder="Enter a descriptive project title"
            />
            {errors.title && (
              <span className="error-message">
                <span className="error-icon">⚠️</span>
                {errors.title}
              </span>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="description">
              <span className="label-icon">📄</span>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              placeholder="Describe the project goals, objectives, and key deliverables"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="priority">
              <span className="label-icon">🎯</span>
              Priority Level *
            </label>
            <div className="priority-selector">
              {priorities.map(priority => (
                <div 
                  key={priority.value}
                  className={`priority-option ${formData.priority === priority.value ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, priority: priority.value })}
                  style={{ 
                    '--priority-color': priority.color,
                    '--priority-color-rgb': priority.color.replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16)).join(', ')
                  }}
                >
                  <div className="priority-color-bar" style={{ backgroundColor: priority.color }}></div>
                  <div className="priority-content">
                    <div className="priority-label">{priority.label}</div>
                    <div className="priority-description">{priority.description}</div>
                  </div>
                  <div className="priority-check">
                    {formData.priority === priority.value && <span>✅</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="max_team_members">
              <span className="label-icon">👥</span>
              Maximum Team Size *
            </label>
            <div className="team-size-section">
              <div className="team-size-input-container">
                <input
                  type="number"
                  id="max_team_members"
                  name="max_team_members"
                  value={formData.max_team_members}
                  onChange={handleChange}
                  min="1"
                  max="100"
                  className={errors.max_team_members ? 'error' : ''}
                />
                <span className="input-suffix">members</span>
              </div>
              
              {errors.max_team_members && (
                <span className="error-message">
                  <span className="error-icon">⚠️</span>
                  {errors.max_team_members}
                </span>
              )}

              <div className="team-size-recommendation">
                <span className="recommendation-icon" style={{ color: recommendation.color }}>
                  {recommendation.icon}
                </span>
                <span className="recommendation-text" style={{ color: recommendation.color }}>
                  {recommendation.text}
                </span>
              </div>

              <div className="team-size-presets">
                <span className="presets-label">Quick Select:</span>
                <div className="preset-buttons">
                  {teamSizePresets.map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      className={`preset-btn ${formData.max_team_members === preset.value ? 'active' : ''}`}
                      onClick={() => handleTeamSizePreset(preset.value)}
                      title={preset.description}
                    >
                      {preset.value} - {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_date">
                <span className="label-icon">📅</span>
                Start Date *
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className={errors.start_date ? 'error' : ''}
              />
              {errors.start_date && (
                <span className="error-message">
                  <span className="error-icon">⚠️</span>
                  {errors.start_date}
                </span>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="end_date">
                <span className="label-icon">🏁</span>
                End Date *
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className={errors.end_date ? 'error' : ''}
              />
              {errors.end_date && (
                <span className="error-message">
                  <span className="error-icon">⚠️</span>
                  {errors.end_date}
                </span>
              )}
            </div>
          </div>

          {costEstimation.cost > 0 && (
            <div className="cost-estimation-card">
              <div className="cost-header">
                <span className="cost-icon">💰</span>
                <h3>Estimated Project Cost</h3>
              </div>
              <div className="cost-breakdown">
                <div className="business-days-info">
                  <div className="business-days-summary">
                    <span className="business-days-icon">📅</span>
                    <div className="business-days-content">
                      <div className="business-days-main">
                        <strong>{costEstimation.businessDays} business days</strong>
                        <span className="duration-text">
                          ({formatProjectDuration(formData.start_date, formData.end_date)})
                        </span>
                      </div>
                      <div className="business-days-breakdown">
                        <span className="breakdown-item">
                          📊 {costEstimation.totalDays} total days
                        </span>
                        <span className="breakdown-item">
                          🚫 {costEstimation.weekendDays} weekend days excluded
                        </span>
                        {costEstimation.holidays > 0 && (
                          <span className="breakdown-item">
                            🎉 {costEstimation.holidays} holidays excluded
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="cost-calculation">
                  <span className="cost-formula">
                    {formData.max_team_members} members × 4 hours/day × {costEstimation.businessDays} business days × €100/hour
                  </span>
                </div>
                
                <div className="cost-total">
                  <span className="cost-amount">€{costEstimation.cost.toLocaleString()}</span>
                  <span className="cost-label">Total Estimated Cost</span>
                </div>
              </div>
              <div className="cost-note">
                <span className="note-icon">ℹ️</span>
                <span>Based on 4 hours per developer per business day at €100/hour (excludes weekends and holidays)</span>
              </div>
            </div>
          )}
          
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => navigate('/')}
            >
              <span>❌</span>
              Cancel
            </button>
            <button 
              type="submit" 
              className={`btn btn-primary ${loading ? 'loading' : ''}`} 
              disabled={loading}
            >
              {!loading && <span>✅</span>}
              {loading ? 'Creating Project...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProjectForm;