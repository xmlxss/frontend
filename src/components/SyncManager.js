import React, { useState, useEffect } from 'react';
import { jiraAPI, confluenceAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

function SyncManager({ onSyncComplete, className = '' }) {
  const [jiraSyncStatus, setJiraSyncStatus] = useState(null);
  const [confluenceSyncStatus, setConfluenceSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState({ 
    ideas: false, 
    epics: false, 
    pages: false,
    jiraAll: false,
    all: false 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllSyncStatus();
    // Set up periodic status check every 30 seconds
    const interval = setInterval(fetchAllSyncStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllSyncStatus = async () => {
    try {
      const [jiraResponse, confluenceResponse] = await Promise.all([
        jiraAPI.getSyncStatus(),
        confluenceAPI.getSyncStatus()
      ]);
      
      setJiraSyncStatus(jiraResponse.data);
      setConfluenceSyncStatus(confluenceResponse.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching sync status:', error);
      setError('Failed to fetch sync status');
    } finally {
      setLoading(false);
    }
  };

  const syncIdeas = async () => {
    setSyncing(prev => ({ ...prev, ideas: true }));
    try {
      await jiraAPI.syncIdeas();
      await fetchAllSyncStatus();
      if (onSyncComplete) onSyncComplete('ideas');
    } catch (error) {
      console.error('Error syncing ideas:', error);
      setError('Failed to sync ideas. Please try again.');
    } finally {
      setSyncing(prev => ({ ...prev, ideas: false }));
    }
  };

  const syncEpics = async () => {
    setSyncing(prev => ({ ...prev, epics: true }));
    try {
      await jiraAPI.syncEpics();
      await fetchAllSyncStatus();
      if (onSyncComplete) onSyncComplete('epics');
    } catch (error) {
      console.error('Error syncing epics:', error);
      setError('Failed to sync epics. Please try again.');
    } finally {
      setSyncing(prev => ({ ...prev, epics: false }));
    }
  };

  const syncPages = async () => {
    setSyncing(prev => ({ ...prev, pages: true }));
    try {
      await confluenceAPI.syncPages('FD');
      await fetchAllSyncStatus();
      if (onSyncComplete) onSyncComplete('pages');
    } catch (error) {
      console.error('Error syncing pages:', error);
      setError('Failed to sync Confluence pages. Please try again.');
    } finally {
      setSyncing(prev => ({ ...prev, pages: false }));
    }
  };

  const syncJiraAll = async () => {
    setSyncing(prev => ({ ...prev, ideas: true, epics: true, jiraAll: true }));
    try {
      await jiraAPI.syncAll();
      await fetchAllSyncStatus();
      if (onSyncComplete) onSyncComplete('jira-all');
    } catch (error) {
      console.error('Error syncing all Jira data:', error);
      setError('Failed to sync all Jira data. Please try again.');
    } finally {
      setSyncing(prev => ({ ...prev, ideas: false, epics: false, jiraAll: false }));
    }
  };

  const syncAll = async () => {
    setSyncing({ ideas: true, epics: true, pages: true, jiraAll: true, all: true });
    try {
      // Sync all data sources in parallel
      await Promise.all([
        jiraAPI.syncAll(),
        confluenceAPI.syncPages('FD')
      ]);
      await fetchAllSyncStatus();
      if (onSyncComplete) onSyncComplete('all');
    } catch (error) {
      console.error('Error syncing all data:', error);
      setError('Failed to sync all data. Please try again.');
    } finally {
      setSyncing({ ideas: false, epics: false, pages: false, jiraAll: false, all: false });
    }
  };

  const getLastSyncText = (lastSync) => {
    if (!lastSync) return 'Never synced';
    return formatDistanceToNow(new Date(lastSync), { addSuffix: true });
  };

  const getSyncStatusIcon = (needsSync, inProgress) => {
    if (inProgress) return '🔄';
    if (needsSync) return '⚠️';
    return '✅';
  };

  const getSyncStatusClass = (needsSync, inProgress) => {
    if (inProgress) return 'syncing';
    if (needsSync) return 'needs-sync';
    return 'synced';
  };

  const anySyncing = Object.values(syncing).some(Boolean);
  const anyNeedsSync = (jiraSyncStatus && (jiraSyncStatus.ideas.needs_sync || jiraSyncStatus.epics.needs_sync)) ||
                      (confluenceSyncStatus && confluenceSyncStatus.pages.needs_sync);

  const getTotalItems = () => {
    let total = 0;
    if (jiraSyncStatus) {
      total += jiraSyncStatus.ideas.total_items + jiraSyncStatus.epics.total_items;
    }
    if (confluenceSyncStatus) {
      total += confluenceSyncStatus.pages.total_items;
    }
    return total;
  };

  const getLastFullSync = () => {
    const syncDates = [];
    if (jiraSyncStatus?.ideas.last_sync) syncDates.push(new Date(jiraSyncStatus.ideas.last_sync));
    if (jiraSyncStatus?.epics.last_sync) syncDates.push(new Date(jiraSyncStatus.epics.last_sync));
    if (confluenceSyncStatus?.pages.last_sync) syncDates.push(new Date(confluenceSyncStatus.pages.last_sync));
    
    if (syncDates.length === 0) return 'Never';
    
    const latestSync = Math.max(...syncDates);
    return formatDistanceToNow(latestSync, { addSuffix: true });
  };

  if (loading) {
    return (
      <div className={`sync-manager loading ${className}`}>
        <div className="loading-spinner"></div>
        <span>Loading sync status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`sync-manager error ${className}`}>
        <div className="error-message">
          <span className="error-icon">❌</span>
          <span>{error}</span>
          <button onClick={fetchAllSyncStatus} className="btn btn-sm btn-secondary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`sync-manager glass ${className}`}>
      <div className="sync-header">
        <div className="sync-title-section">
          <h3>
            <span className="sync-icon">🔄</span>
            Data Synchronization
          </h3>
          <p className="sync-subtitle">
            Keep your project data up to date with Jira and Confluence
          </p>
        </div>
        <div className="sync-actions">
          <button 
            className={`btn btn-secondary ${syncing.jiraAll ? 'loading' : ''}`}
            onClick={syncJiraAll}
            disabled={anySyncing}
          >
            {syncing.jiraAll ? (
              <>
                <span className="loading-spinner" style={{ width: '14px', height: '14px' }}></span>
                Syncing Jira...
              </>
            ) : (
              <>
                <span>🎯</span>
                Sync All Jira
              </>
            )}
          </button>
          <button 
            className={`btn btn-primary ${syncing.all ? 'loading' : ''}`}
            onClick={syncAll}
            disabled={anySyncing}
          >
            {syncing.all ? (
              <>
                <span className="loading-spinner" style={{ width: '14px', height: '14px' }}></span>
                Syncing All...
              </>
            ) : (
              <>
                <span>🔄</span>
                Sync Everything
              </>
            )}
          </button>
        </div>
      </div>

      {anyNeedsSync && !anySyncing && (
        <div className="sync-alert">
          <span className="alert-icon">⚠️</span>
          <div className="alert-content">
            <strong>Sync Required</strong>
            <p>Some data sources need to be synchronized to ensure accuracy.</p>
          </div>
        </div>
      )}

      <div className="sync-items">
        {/* Jira Ideas Sync */}
        {jiraSyncStatus && (
          <div className={`sync-item ${getSyncStatusClass(jiraSyncStatus.ideas.needs_sync, syncing.ideas)}`}>
            <div className="sync-item-header">
              <div className="sync-item-title">
                <span className="sync-item-icon">💡</span>
                <div className="sync-item-info">
                  <h4>Jira Ideas</h4>
                  <span className="sync-item-subtitle">DPO Project Ideas</span>
                </div>
              </div>
              <div className="sync-item-badges">
                <span className="sync-badge items-count">
                  {jiraSyncStatus.ideas.total_items} items
                </span>
                <span className={`sync-badge status ${getSyncStatusClass(jiraSyncStatus.ideas.needs_sync, syncing.ideas)}`}>
                  <span className="status-icon">
                    {getSyncStatusIcon(jiraSyncStatus.ideas.needs_sync, syncing.ideas)}
                  </span>
                  {syncing.ideas ? 'Syncing' : jiraSyncStatus.ideas.needs_sync ? 'Needs Sync' : 'Up to Date'}
                </span>
              </div>
            </div>
            
            <div className="sync-item-details">
              <div className="sync-detail">
                <span className="detail-label">Last Sync:</span>
                <span className="detail-value">{getLastSyncText(jiraSyncStatus.ideas.last_sync)}</span>
              </div>
              <div className="sync-detail">
                <span className="detail-label">Source:</span>
                <span className="detail-value">Jira DPO Project</span>
              </div>
            </div>

            <div className="sync-item-actions">
              <button
                className={`btn btn-secondary btn-sm ${syncing.ideas ? 'loading' : ''}`}
                onClick={syncIdeas}
                disabled={syncing.ideas || jiraSyncStatus.ideas.sync_in_progress}
              >
                {syncing.ideas ? (
                  <>
                    <span className="loading-spinner" style={{ width: '12px', height: '12px' }}></span>
                    Syncing...
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    Sync Ideas
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Jira Epics Sync */}
        {jiraSyncStatus && (
          <div className={`sync-item ${getSyncStatusClass(jiraSyncStatus.epics.needs_sync, syncing.epics)}`}>
            <div className="sync-item-header">
              <div className="sync-item-title">
                <span className="sync-item-icon">🎯</span>
                <div className="sync-item-info">
                  <h4>Jira Epics</h4>
                  <span className="sync-item-subtitle">DFS Project Epics</span>
                </div>
              </div>
              <div className="sync-item-badges">
                <span className="sync-badge items-count">
                  {jiraSyncStatus.epics.total_items} items
                </span>
                <span className={`sync-badge status ${getSyncStatusClass(jiraSyncStatus.epics.needs_sync, syncing.epics)}`}>
                  <span className="status-icon">
                    {getSyncStatusIcon(jiraSyncStatus.epics.needs_sync, syncing.epics)}
                  </span>
                  {syncing.epics ? 'Syncing' : jiraSyncStatus.epics.needs_sync ? 'Needs Sync' : 'Up to Date'}
                </span>
              </div>
            </div>
            
            <div className="sync-item-details">
              <div className="sync-detail">
                <span className="detail-label">Last Sync:</span>
                <span className="detail-value">{getLastSyncText(jiraSyncStatus.epics.last_sync)}</span>
              </div>
              <div className="sync-detail">
                <span className="detail-label">Source:</span>
                <span className="detail-value">Jira DFS Project</span>
              </div>
            </div>

            <div className="sync-item-actions">
              <button
                className={`btn btn-secondary btn-sm ${syncing.epics ? 'loading' : ''}`}
                onClick={syncEpics}
                disabled={syncing.epics || jiraSyncStatus.epics.sync_in_progress}
              >
                {syncing.epics ? (
                  <>
                    <span className="loading-spinner" style={{ width: '12px', height: '12px' }}></span>
                    Syncing...
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    Sync Epics
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Confluence Pages Sync */}
        {confluenceSyncStatus && (
          <div className={`sync-item ${getSyncStatusClass(confluenceSyncStatus.pages.needs_sync, syncing.pages)}`}>
            <div className="sync-item-header">
              <div className="sync-item-title">
                <span className="sync-item-icon">📚</span>
                <div className="sync-item-info">
                  <h4>Confluence Pages</h4>
                  <span className="sync-item-subtitle">FD Space Documentation</span>
                </div>
              </div>
              <div className="sync-item-badges">
                <span className="sync-badge items-count">
                  {confluenceSyncStatus.pages.total_items} items
                </span>
                <span className={`sync-badge status ${getSyncStatusClass(confluenceSyncStatus.pages.needs_sync, syncing.pages)}`}>
                  <span className="status-icon">
                    {getSyncStatusIcon(confluenceSyncStatus.pages.needs_sync, syncing.pages)}
                  </span>
                  {syncing.pages ? 'Syncing' : confluenceSyncStatus.pages.needs_sync ? 'Needs Sync' : 'Up to Date'}
                </span>
              </div>
            </div>
            
            <div className="sync-item-details">
              <div className="sync-detail">
                <span className="detail-label">Last Sync:</span>
                <span className="detail-value">{getLastSyncText(confluenceSyncStatus.pages.last_sync)}</span>
              </div>
              <div className="sync-detail">
                <span className="detail-label">Source:</span>
                <span className="detail-value">Confluence FD Space</span>
              </div>
            </div>

            <div className="sync-item-actions">
              <button
                className={`btn btn-secondary btn-sm ${syncing.pages ? 'loading' : ''}`}
                onClick={syncPages}
                disabled={syncing.pages || confluenceSyncStatus.pages.sync_in_progress}
              >
                {syncing.pages ? (
                  <>
                    <span className="loading-spinner" style={{ width: '12px', height: '12px' }}></span>
                    Syncing...
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    Sync Pages
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sync Summary */}
      {(jiraSyncStatus || confluenceSyncStatus) && (
        <div className="sync-summary">
          <div className="summary-stats">
            <div className="summary-stat">
              <span className="stat-number">{getTotalItems()}</span>
              <span className="stat-label">Total Items</span>
            </div>
            <div className="summary-stat">
              <span className="stat-number">
                {anyNeedsSync ? 'Yes' : 'No'}
              </span>
              <span className="stat-label">Needs Sync</span>
            </div>
            <div className="summary-stat">
              <span className="stat-number">
                {getLastFullSync()}
              </span>
              <span className="stat-label">Last Full Sync</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SyncManager;