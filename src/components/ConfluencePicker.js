import React, { useState, useEffect, useCallback } from 'react';
import { confluenceAPI, debounce } from '../services/api';
import { format } from 'date-fns';

function ConfluencePicker({ selectedPages, onUpdate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(selectedPages);
  const [showAll, setShowAll] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [start, setStart] = useState(0);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'recent', 'search'

  useEffect(() => {
    if (activeTab === 'all') {
      loadAllPages();
    } else if (activeTab === 'recent') {
      loadRecentPages();
    } else if (searchQuery) {
      searchPages(searchQuery);
    }
  }, [activeTab]);

  const loadAllPages = async () => {
    setLoading(true);
    try {
      const response = await confluenceAPI.getAllPages({ start: 0, maxResults: 50 });
      const pages = response.data || [];
      setPages(pages);
      setHasMore(pages.length === 50);
      setStart(50);
    } catch (error) {
      console.error('Error loading pages:', error);
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentPages = async () => {
    setLoading(true);
    try {
      const response = await confluenceAPI.getRecentPages({ maxResults: 30 });
      const pages = response.data || [];
      setPages(pages);
      setHasMore(false);
    } catch (error) {
      console.error('Error loading recent pages:', error);
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePages = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const response = activeTab === 'all'
        ? await confluenceAPI.getAllPages({ start, maxResults: 50 })
        : await confluenceAPI.searchPages(searchQuery, { start, maxResults: 50 });
      
      const newPages = response.data || [];
      setPages(prev => [...prev, ...newPages]);
      setStart(prev => prev + 50);
      setHasMore(newPages.length === 50);
    } catch (error) {
      console.error('Error loading more pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchPages = async (query) => {
    setLoading(true);
    setStart(0);
    try {
      const response = await confluenceAPI.searchPages(query, { maxResults: 50 });
      const pages = response.data || [];
      setPages(pages);
      setHasMore(pages.length === 50);
      setStart(50);
    } catch (error) {
      console.error('Error searching pages:', error);
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query) => {
      if (query.length > 0) {
        setActiveTab('search');
        searchPages(query);
      } else {
        setActiveTab('all');
      }
    }, 500),
    []
  );

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const togglePage = (page) => {
    const isSelected = selected.some(s => s.id === page.id);
    let newSelected;
    
    if (isSelected) {
      newSelected = selected.filter(s => s.id !== page.id);
    } else {
      newSelected = [...selected, page];
    }
    
    setSelected(newSelected);
    onUpdate(newSelected);
  };

  const isPageSelected = (page) => {
    return selected.some(s => s.id === page.id);
  };

  const formatPageDate = (dateString) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const getPageIcon = (page) => {
    if (page.type === 'blogpost') return '📝';
    if (page.children && page.children.page > 0) return '📁';
    return '📄';
  };

  return (
    <div className="confluence-picker fade-in">
      <div className="picker-header">
        <h2>Confluence Documentation</h2>
        <span className="picker-subtitle">Space: FD</span>
      </div>
      
      <div className="search-section">
        <input
          type="text"
          placeholder="Search pages by title or content..."
          value={searchQuery}
          onChange={handleSearch}
          className="search-input"
        />
        
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Pages
          </button>
          <button 
            className={`filter-tab ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            Recently Updated
          </button>
          {searchQuery && (
            <button 
              className={`filter-tab ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              Search Results
            </button>
          )}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="selected-items glass">
          <h3>
            <span className="icon">📚</span>
            Selected Pages ({selected.length})
          </h3>
          <div className="selected-list">
            {selected.map(page => (
              <div key={page.id} className="selected-item">
                <div className="item-info">
                  <span className="page-icon">{getPageIcon(page)}</span>
                  <a href={page.url} target="_blank" rel="noopener noreferrer" className="item-title">
                    {page.title}
                  </a>
                  {page.version && (
                    <span className="version-badge">v{page.version.number}</span>
                  )}
                </div>
                <button onClick={() => togglePage(page)} className="remove-btn">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="available-items">
        <div className="items-header">
          <h3>
            {activeTab === 'all' && 'All Pages'}
            {activeTab === 'recent' && 'Recently Updated'}
            {activeTab === 'search' && `Search Results for "${searchQuery}"`}
          </h3>
          <span className="items-count">{pages.length} pages</span>
        </div>
        
        {loading && pages.length === 0 ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <span>Loading pages...</span>
          </div>
        ) : (
          <>
            <div className="items-list">
              {pages.filter(page => !isPageSelected(page)).map(page => (
                <div key={page.id} className="item-card glass">
                  <div className="item-header">
                    <div className="page-title-row">
                      <span className="page-icon">{getPageIcon(page)}</span>
                      <h4>
                        <a href={page.url} target="_blank" rel="noopener noreferrer">
                          {page.title}
                        </a>
                      </h4>
                    </div>
                    {page.version && (
                      <span className="version-badge">v{page.version.number}</span>
                    )}
                  </div>
                  
                  {page.excerpt && (
                    <p className="item-description">
                      {page.excerpt.replace(/<[^>]*>?/gm, '').substring(0, 150)}...
                    </p>
                  )}
                  
                  <div className="page-meta">
                    {page.version?.when && (
                      <span className="meta-item">
                        <span className="icon">📅</span>
                        Updated: {formatPageDate(page.version.when)}
                      </span>
                    )}
                    {page.version?.by?.displayName && (
                      <span className="meta-item">
                        <span className="icon">👤</span>
                        {page.version.by.displayName}
                      </span>
                    )}
                    {page.children && page.children.page > 0 && (
                      <span className="meta-item">
                        <span className="icon">📄</span>
                        {page.children.page} subpages
                      </span>
                    )}
                  </div>
                  
                  {page.ancestors && page.ancestors.length > 0 && (
                    <div className="page-breadcrumb">
                      <span className="icon">📍</span>
                      {page.ancestors.map((ancestor, index) => (
                        <React.Fragment key={ancestor.id}>
                          {index > 0 && <span className="separator">/</span>}
                          <span className="ancestor">{ancestor.title}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                  
                  <button onClick={() => togglePage(page)} className="btn btn-primary">
                    Add to Project
                  </button>
                </div>
              ))}
            </div>
            
            {hasMore && !loading && (
              <div className="load-more-section">
                <button onClick={loadMorePages} className="btn btn-secondary">
                  Load More Pages
                </button>
              </div>
            )}
            
            {loading && pages.length > 0 && (
              <div className="loading-more">
                <div className="loading-spinner"></div>
                <span>Loading more...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ConfluencePicker;