import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ProjectList from './components/ProjectList';
import ProjectForm from './components/ProjectForm';
import ProjectDetail from './components/ProjectDetail';
import ProjectsTimeline from './components/ProjectsTimeline';
import './styles/App.css';

function App() {
  console.log('App component rendering');
  
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">Project Manager</Link>
            <ul className="nav-menu">
              <li className="nav-item">
                <Link to="/" className="nav-link">Projects</Link>
              </li>
              <li className="nav-item">
                <Link to="/timeline" className="nav-link">Timeline</Link>
              </li>
              <li className="nav-item">
                <Link to="/new" className="nav-link">New Project</Link>
              </li>
            </ul>
          </div>
        </nav>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<ProjectList />} />
            <Route path="/timeline" element={<ProjectsTimeline />} />
            <Route path="/new" element={<ProjectForm />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;