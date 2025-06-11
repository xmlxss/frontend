import React, { useState, useEffect, useCallback } from 'react';
import { confluenceAPI, debounce } from '../services/api';
import { format } from 'date-fns';
import '../styles/ConfluencePicker.css';

function ConfluencePicker({ selectedPages, onUpdate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(selectedPages);
  const [hasMore, setHasMore] = useState(false);
  const [start, setStart] = useState(0);
  const [activeTab, setActiveTab] = useState('all');

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
      // Handle different response formats
      let pagesData = [];
      if (Array.isArray(response.data)) {
        pagesData = response.data;
      } else if (response.data && Array.isArray(response.data.results)) {
        pagesData = response.data.results;
      } else if (response.data && Array.isArray(response.data.data)) {
        pagesData = response.data.data;
      }
      
      setPages(pagesData);
      setHasMore(pagesData.length === 50);
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
      // Handle different response formats
      let pagesData = [];
      if (Array.isArray(response.data)) {
        pagesData = response.data;
      } else if (response.data && Array.isArray(response.data.results)) {
        pagesData = response.data.results;
      } else if (response.data && Array.isArray(response.data.data)) {
        pagesData = response.data.data;
      }
      
      setPages(pagesData);
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
      
      // Handle different response formats
      let newPagesData = [];
      if (Array.isArray(response.data)) {
        newPagesData = response.data;
      } else if (response.data && Array.isArray(response.data.results)) {
        newPagesData = response.data.results;
      } else if (response.data && Array.isArray(response.data.data)) {
        newPagesData = response.data.data;
      }
      
      setPages(prev => [...prev, ...newPagesData]);
      setStart(prev => prev + 50);
      setHasMore(newPagesData.length === 50);
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
      // Handle different response formats
      let pagesData = [];
      if (Array.isArray(response.data)) {
        pagesData = response.data;
      } else if (response.data && Array.isArray(response.data.results)) {
        pagesData = response.data.results;
      } else if (response.data && Array.isArray(response.data.data)) {
        pagesData = response.data.data;
      }
      
      setPages(pagesData);
      setHasMore(pagesData.length === 50);
      setStart(50);
    } catch (error) {
      console.error('Error searching pages:', error);
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

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

  const getPageTypeLabel = (page) => {
    if (page.type === 'blogpost') return 'Blog Post';
    if (page.children && page.children.page > 0) return 'Parent Page';
    return 'Page';
  };

  // Ensure pages is always an array
  const safePages = Array.isArray(pages) ? pages : [];

  return (
    <div className="confluence-picker fade-in">
      <div className="picker-header">
        <div className="picker-title-section">
          <h2>Confluence Documentation</h2>
          <span className="picker-subtitle">
            Space: FD • {safePages.length} pages loaded
          </span>
        </div>
        <div className="picker-actions">
          <button 
            onClick={loadAllPages} 
            className="btn btn-secondary"
            disabled={loading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>
      
      <div className="search-section">
        <div className="search-input-container">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <input
            type="text"
            placeholder="Search pages by title or content..."
            value={searchQuery}
            onChange={handleSearch}
            className="search-input"
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => {
                setSearchQuery('');
                setActiveTab('all');
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2"/>
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          )}
        </div>
        
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span className="filter-icon">📚</span>
            All Pages
          </button>
          <button 
            className={`filter-tab ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            <span className="filter-icon">🕒</span>
            Recently Updated
          </button>
          {searchQuery && (
            <button 
              className={`filter-tab ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <span className="filter-icon">🔍</span>
              Search Results
            </button>
          )}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="selected-items glass">
          <div className="selected-header">
            <h3>
              <span className="icon">📚</span>
              Selected Pages
              <span className="count-badge">{selected.length}</span>
            </h3>
            <button 
              className="clear-all-btn"
              onClick={() => {
                setSelected([]);
                onUpdate([]);
              }}
            >
              Clear All
            </button>
          </div>
          <div className="selected-grid">
            {selected.map(page => (
              <div key={page.id} className="confluence-page-card selected glass">
                <div className="page-card-header">
                  <div className="page-icon-title">
                    <span className="page-icon">{getPageIcon(page)}</span>
                    <a href={page.url} target="_blank" rel="noopener noreferrer" className="page-title">
                      {page.title}
                    </a>
                  </div>
                  <button onClick={() => togglePage(page)} className="remove-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2"/>
                      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                </div>
                <div className="page-meta">
                  <span className="page-type-badge">
                    {getPageTypeLabel(page)}
                  </span>
                  {page.version && (
                    <span className="version-badge">v{page.version.number}</span>
                  )}
                </div>
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
          <div className="items-actions">
            <span className="items-count">{safePages.filter(page => !isPageSelected(page)).length} available</span>
          </div>
        </div>
        
        {loading && safePages.length === 0 ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h4>Loading pages...</h4>
            <p>Fetching page data from Confluence</p>
          </div>
        ) : (
          <>
            <div className="items-grid">
              {safePages.filter(page => !isPageSelected(page)).length === 0 ? (
                <div className="empty-state-inline">
                  <div className="empty-icon">
                    <svg width="48\" height="48\" viewBox="0 0 24 24\" fill="none">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z\" stroke="currentColor\" strokeWidth="2"/>
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8\" stroke="currentColor\" strokeWidth="2"/>
                    </svg>
                  </div>
                  <h4>No pages found</h4>
                  <p>
                    {searchQuery 
                      ? `No pages match your search for "${searchQuery}"`
                      : 'No pages available with the current filters'
                    }
                  </p>
                </div>
              ) : (
                safePages.filter(page => !isPageSelected(page)).map(page => (
                  <div key={page.id} className="confluence-page-card glass">
                    <div className="page-card-header">
                      <div className="page-icon-title">
                        <span className="page-icon">{getPageIcon(page)}</span>
                        <h4 className="page-title">
                          <a href={page.url} target="_blank" rel="noopener noreferrer">
                            {page.title}
                          </a>
                        </h4>
                      </div>
                      <div className="page-actions">
                        <button onClick={() => togglePage(page)} className="btn btn-primary btn-sm">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2"/>
                            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          Add Page
                        </button>
                      </div>
                    </div>
                    
                    {page.excerpt && (
                      <p className="page-description">
                        {page.excerpt.replace(/<[^>]*>?/gm, '').substring(0, 150)}
                        {page.excerpt.length > 150 && '...'}
                      </p>
                    )}
                    
                    <div className="page-meta-grid">
                      <div className="meta-item">
                        <span className="meta-icon">📄</span>
                        <div className="meta-content">
                          <span className="meta-label">Type</span>
                          <span className="meta-value">{getPageTypeLabel(page)}</span>
                        </div>
                      </div>
                      {page.version?.when && (
                        <div className="meta-item">
                          <span className="meta-icon">📅</span>
                          <div className="meta-content">
                            <span className="meta-label">Updated</span>
                            <span className="meta-value">{formatPageDate(page.version.when)}</span>
                          </div>
                        </div>
                      )}
                      {page.version?.by?.displayName && (
                        <div className="meta-item">
                          <span className="meta-icon">👤</span>
                          <div className="meta-content">
                            <span className="meta-label">Author</span>
                            <span className="meta-value">{page.version.by.displayName}</span>
                          </div>
                        </div>
                      )}
                      {page.children && page.children.page > 0 && (
                        <div className="meta-item">
                          <span className="meta-icon">📄</span>
                          <div className="meta-content">
                            <span className="meta-label">Subpages</span>
                            <span className="meta-value">{page.children.page}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {page.ancestors && page.ancestors.length > 0 && (
                      <div className="page-breadcrumb">
                        <span className="breadcrumb-icon">📍</span>
                        <div className="breadcrumb-path">
                          {page.ancestors.map((ancestor, index) => (
                            <React.Fragment key={ancestor.id}>
                              {index > 0 && <span className="breadcrumb-separator">/</span>}
                              <span className="breadcrumb-item">{ancestor.title}</span>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {page.version && (
                      <div className="page-version-info">
                        <span className="version-badge">v{page.version.number}</span>
                        <span className="version-date">
                          Last updated {formatPageDate(page.version.when)}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {hasMore && !loading && (
              <div className="load-more-section">
                <button onClick={loadMorePages} className="btn btn-secondary btn-large">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Load More Pages
                </button>
              </div>
            )}
            
            {loading && safePages.length > 0 && (
              <div className="loading-more">
                <div className="loading-spinner"></div>
                <span>Loading more pages...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ConfluencePicker;