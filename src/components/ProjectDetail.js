import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { projectAPI } from '../services/api';
import JiraIdeasPicker from './JiraIdeasPicker';
import JiraEpicsPicker from './JiraEpicsPicker';
import ConfluencePicker from './ConfluencePicker';
import DeveloperPicker from './DeveloperPicker';
import ProjectTimeline from './ProjectTimeline';
import { format } from 'date-fns';

function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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

  if (loading) return <div className="loading">Loading project...</div>;
  if (!project) return <div className="error">Project not found</div>;

  return (
    <div className="project-detail">
      <div className="project-header">
        <h1>{project.title}</h1>
        <p className="project-dates">
          {format(new Date(project.start_date), 'MMM d, yyyy')} - 
          {format(new Date(project.end_date), 'MMM d, yyyy')}
        </p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'ideas' ? 'active' : ''}`}
          onClick={() => setActiveTab('ideas')}
        >
          Jira Ideas ({project.jira_ideas?.length || 0})
        </button>
        <button
          className={`tab ${activeTab === 'epics' ? 'active' : ''}`}
          onClick={() => setActiveTab('epics')}
        >
          Jira Epics ({project.jira_epics?.length || 0})
        </button>
        <button
          className={`tab ${activeTab === 'docs' ? 'active' : ''}`}
          onClick={() => setActiveTab('docs')}
        >
          Documentation ({project.confluence_pages?.length || 0})
        </button>
        <button
          className={`tab ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          Team ({project.developers?.length || 0})
        </button>
        <button
          className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <h2>Project Description</h2>
            <p>{project.description || 'No description provided.'}</p>
            
            <div className="project-summary">
              <div className="summary-card">
                <h3>Jira Ideas</h3>
                <p className="summary-count">{project.jira_ideas?.length || 0}</p>
              </div>
              <div className="summary-card">
                <h3>Jira Epics</h3>
                <p className="summary-count">{project.jira_epics?.length || 0}</p>
              </div>
              <div className="summary-card">
                <h3>Documents</h3>
                <p className="summary-count">{project.confluence_pages?.length || 0}</p>
              </div>
              <div className="summary-card">
                <h3>Team Members</h3>
                <p className="summary-count">{project.developers?.length || 0}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ideas' && (
          <JiraIdeasPicker
            selectedIdeas={project.jira_ideas || []}
            onUpdate={(ideas) => updateProject({ jira_ideas: ideas })}
          />
        )}

        {activeTab === 'epics' && (
          <JiraEpicsPicker
            selectedEpics={project.jira_epics || []}
            onUpdate={(epics) => updateProject({ jira_epics: epics })}
          />
        )}

        {activeTab === 'docs' && (
          <ConfluencePicker
            selectedPages={project.confluence_pages || []}
            onUpdate={(pages) => updateProject({ confluence_pages: pages })}
          />
        )}

        {activeTab === 'team' && (
          <DeveloperPicker
            selectedDevelopers={project.developers || []}
            onUpdate={(developers) => updateProject({ developers: developers })}
          />
        )}

        {activeTab === 'timeline' && (
          <ProjectTimeline project={project} />
        )}
      </div>
    </div>
  );
}

export default ProjectDetail;