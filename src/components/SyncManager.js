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

  // Inline styles for the SyncManager component
  const styles = {
    syncManager: {
      background: 'linear-gradient(135deg, var(--bg-primary) 0%, rgba(0, 122, 255, 0.02) 100%)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--spacing-xl)',
      boxShadow: 'var(--shadow-lg)',
      position: 'relative',
      overflow: 'hidden',
      animation: 'fadeIn 0.4s ease-out',
    },
    syncManagerBefore: {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'radial-gradient(circle at 20% 80%, rgba(0, 122, 255, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(52, 199, 89, 0.05) 0%, transparent 50%)',
      pointerEvents: 'none',
    },
    syncHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 'var(--spacing-xl)',
      position: 'relative',
      zIndex: 1,
    },
    syncTitleSection: {
      flex: 1,
      marginRight: 'var(--spacing-lg)',
    },
    syncTitle: {
      fontSize: 'var(--font-size-2xl)',
      fontWeight: 700,
      margin: '0 0 var(--spacing-sm) 0',
      color: 'var(--text-primary)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--spacing-sm)',
    },
    syncIcon: {
      fontSize: 'var(--font-size-xl)',
      background: 'linear-gradient(135deg, #007aff, #34c759)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    syncSubtitle: {
      fontSize: 'var(--font-size-md)',
      color: 'var(--text-secondary)',
      fontWeight: 500,
      margin: 0,
      lineHeight: 'var(--line-height-relaxed)',
    },
    syncActions: {
      display: 'flex',
      gap: 'var(--spacing-sm)',
      flexShrink: 0,
      position: 'relative',
      zIndex: 1,
    },
    syncAlert: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--spacing-md)',
      padding: 'var(--spacing-md)',
      background: 'rgba(255, 149, 0, 0.1)',
      border: '2px solid rgba(255, 149, 0, 0.3)',
      borderRadius: 'var(--radius-lg)',
      color: '#ff9500',
      marginBottom: 'var(--spacing-lg)',
      boxShadow: 'var(--shadow-sm)',
      position: 'relative',
      zIndex: 1,
    },
    alertIcon: {
      fontSize: 'var(--font-size-lg)',
      flexShrink: 0,
    },
    alertContent: {
      flex: 1,
    },
    alertContentStrong: {
      display: 'block',
      marginBottom: 'var(--spacing-xs)',
      fontWeight: 600,
    },
    alertContentP: {
      margin: 0,
      fontSize: 'var(--font-size-sm)',
      opacity: 0.9,
    },
    syncItems: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-lg)',
      position: 'relative',
      zIndex: 1,
    },
    syncItem: {
      background: 'var(--bg-primary)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--spacing-lg)',
      transition: 'all var(--transition-normal)',
      boxShadow: 'var(--shadow-md)',
      position: 'relative',
      overflow: 'hidden',
    },
    syncItemSyncing: {
      borderColor: '#007aff',
      background: 'linear-gradient(135deg, var(--bg-primary) 0%, rgba(0, 122, 255, 0.05) 100%)',
      boxShadow: '0 0 20px rgba(0, 122, 255, 0.2)',
    },
    syncItemNeedsSync: {
      borderColor: '#ff9500',
      background: 'linear-gradient(135deg, var(--bg-primary) 0%, rgba(255, 149, 0, 0.03) 100%)',
    },
    syncItemSynced: {
      borderColor: '#34c759',
      background: 'linear-gradient(135deg, var(--bg-primary) 0%, rgba(52, 199, 89, 0.03) 100%)',
    },
    syncItemHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 'var(--spacing-md)',
    },
    syncItemTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--spacing-md)',
      flex: 1,
    },
    syncItemIcon: {
      fontSize: 'var(--font-size-2xl)',
      flexShrink: 0,
    },
    syncItemInfo: {
      flex: 1,
    },
    syncItemInfoH4: {
      fontSize: 'var(--font-size-lg)',
      fontWeight: 700,
      margin: '0 0 var(--spacing-xs) 0',
      color: 'var(--text-primary)',
    },
    syncItemSubtitle: {
      fontSize: 'var(--font-size-sm)',
      color: 'var(--text-secondary)',
      fontWeight: 500,
    },
    syncItemBadges: {
      display: 'flex',
      gap: 'var(--spacing-sm)',
      flexWrap: 'wrap',
    },
    syncBadge: {
      padding: 'var(--spacing-xs) var(--spacing-sm)',
      borderRadius: 'var(--radius-sm)',
      fontSize: 'var(--font-size-xs)',
      fontWeight: 600,
      border: '1px solid',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--spacing-xs)',
    },
    syncBadgeItemsCount: {
      background: 'var(--bg-tertiary)',
      color: 'var(--text-primary)',
      borderColor: 'var(--glass-border)',
    },
    syncBadgeStatusSyncing: {
      background: 'rgba(0, 122, 255, 0.1)',
      color: '#007aff',
      borderColor: 'rgba(0, 122, 255, 0.3)',
    },
    syncBadgeStatusNeedsSync: {
      background: 'rgba(255, 149, 0, 0.1)',
      color: '#ff9500',
      borderColor: 'rgba(255, 149, 0, 0.3)',
    },
    syncBadgeStatusSynced: {
      background: 'rgba(52, 199, 89, 0.1)',
      color: '#34c759',
      borderColor: 'rgba(52, 199, 89, 0.3)',
    },
    statusIcon: {
      fontSize: 'var(--font-size-sm)',
    },
    syncItemDetails: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 'var(--spacing-md)',
      marginBottom: 'var(--spacing-md)',
    },
    syncDetail: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 'var(--spacing-sm) var(--spacing-md)',
      background: 'var(--bg-tertiary)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
    },
    detailLabel: {
      fontSize: 'var(--font-size-sm)',
      color: 'var(--text-secondary)',
      fontWeight: 500,
    },
    detailValue: {
      fontSize: 'var(--font-size-sm)',
      fontWeight: 600,
      color: 'var(--text-primary)',
    },
    syncItemActions: {
      display: 'flex',
      gap: 'var(--spacing-sm)',
    },
    btn: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--spacing-sm)',
      padding: 'var(--spacing-sm) var(--spacing-md)',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      fontSize: 'var(--font-size-sm)',
      fontWeight: 600,
      textDecoration: 'none',
      cursor: 'pointer',
      transition: 'all var(--transition-fast)',
      whiteSpace: 'nowrap',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
    },
    btnPrimary: {
      background: 'linear-gradient(135deg, #007aff, #5ac8fa)',
      color: 'var(--text-inverse)',
    },
    btnSecondary: {
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      border: '1px solid var(--glass-border)',
    },
    btnSm: {
      padding: 'var(--spacing-xs) var(--spacing-sm)',
      fontSize: 'var(--font-size-xs)',
    },
    btnLoading: {
      opacity: 0.8,
      cursor: 'wait',
    },
    loadingSpinner: {
      width: '12px',
      height: '12px',
      border: '2px solid transparent',
      borderTop: '2px solid currentColor',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
    syncSummary: {
      background: 'linear-gradient(135deg, var(--bg-tertiary) 0%, rgba(52, 199, 89, 0.05) 100%)',
      border: '1px solid rgba(52, 199, 89, 0.2)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--spacing-lg)',
      marginTop: 'var(--spacing-lg)',
      position: 'relative',
      zIndex: 1,
    },
    summaryStats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: 'var(--spacing-lg)',
    },
    summaryStat: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--spacing-sm)',
      textAlign: 'center',
      background: 'var(--bg-primary)',
      padding: 'var(--spacing-md)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--glass-border)',
      boxShadow: 'var(--shadow-sm)',
    },
    statNumber: {
      fontSize: 'var(--font-size-xl)',
      fontWeight: 700,
      color: 'var(--text-primary)',
    },
    statLabel: {
      fontSize: 'var(--font-size-sm)',
      color: 'var(--text-secondary)',
      fontWeight: 500,
    },
    loadingState: {
      textAlign: 'center',
      padding: 'var(--spacing-2xl)',
      background: 'var(--bg-primary)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--glass-border)',
      boxShadow: 'var(--shadow-sm)',
    },
    loadingStateSpinner: {
      width: '32px',
      height: '32px',
      border: '3px solid var(--bg-quaternary)',
      borderTop: '3px solid var(--primary-color)',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      margin: '0 auto var(--spacing-lg)',
    },
    errorState: {
      background: 'rgba(255, 59, 48, 0.1)',
      border: '1px solid rgba(255, 59, 48, 0.3)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--spacing-lg)',
      color: '#ff3b30',
    },
    errorMessage: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--spacing-md)',
    },
    errorIcon: {
      fontSize: 'var(--font-size-lg)',
      flexShrink: 0,
    },
  };

  if (loading) {
    return (
      <div style={{...styles.syncManager, ...styles.loadingState}} className={className}>
        <div style={styles.loadingStateSpinner}></div>
        <span>Loading sync status...</span>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}
        </style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{...styles.syncManager, ...styles.errorState}} className={className}>
        <div style={styles.errorMessage}>
          <span style={styles.errorIcon}>❌</span>
          <span>{error}</span>
          <button onClick={fetchAllSyncStatus} style={{...styles.btn, ...styles.btnSecondary}}>
            Retry
          </button>
        </div>
        <style>
          {`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div style={styles.syncManager} className={className}>
      <div style={styles.syncManagerBefore}></div>
      
      <div style={styles.syncHeader}>
        <div style={styles.syncTitleSection}>
          <h3 style={styles.syncTitle}>
            <span style={styles.syncIcon}>🔄</span>
            Data Synchronization
          </h3>
          <p style={styles.syncSubtitle}>
            Keep your project data up to date with Jira and Confluence
          </p>
        </div>
        <div style={styles.syncActions}>
          <button 
            style={{
              ...styles.btn,
              ...styles.btnSecondary,
              ...(syncing.jiraAll ? styles.btnLoading : {})
            }}
            onClick={syncJiraAll}
            disabled={anySyncing}
          >
            {syncing.jiraAll ? (
              <>
                <span style={styles.loadingSpinner}></span>
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
            style={{
              ...styles.btn,
              ...styles.btnPrimary,
              ...(syncing.all ? styles.btnLoading : {})
            }}
            onClick={syncAll}
            disabled={anySyncing}
          >
            {syncing.all ? (
              <>
                <span style={styles.loadingSpinner}></span>
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
        <div style={styles.syncAlert}>
          <span style={styles.alertIcon}>⚠️</span>
          <div style={styles.alertContent}>
            <strong style={styles.alertContentStrong}>Sync Required</strong>
            <p style={styles.alertContentP}>Some data sources need to be synchronized to ensure accuracy.</p>
          </div>
        </div>
      )}

      <div style={styles.syncItems}>
        {/* Jira Ideas Sync */}
        {jiraSyncStatus && (
          <div style={{
            ...styles.syncItem,
            ...(syncing.ideas ? styles.syncItemSyncing : 
                jiraSyncStatus.ideas.needs_sync ? styles.syncItemNeedsSync : 
                styles.syncItemSynced)
          }}>
            <div style={styles.syncItemHeader}>
              <div style={styles.syncItemTitle}>
                <span style={styles.syncItemIcon}>💡</span>
                <div style={styles.syncItemInfo}>
                  <h4 style={styles.syncItemInfoH4}>Jira Ideas</h4>
                  <span style={styles.syncItemSubtitle}>DPO Project Ideas</span>
                </div>
              </div>
              <div style={styles.syncItemBadges}>
                <span style={{...styles.syncBadge, ...styles.syncBadgeItemsCount}}>
                  {jiraSyncStatus.ideas.total_items} items
                </span>
                <span style={{
                  ...styles.syncBadge,
                  ...(syncing.ideas ? styles.syncBadgeStatusSyncing :
                      jiraSyncStatus.ideas.needs_sync ? styles.syncBadgeStatusNeedsSync :
                      styles.syncBadgeStatusSynced)
                }}>
                  <span style={styles.statusIcon}>
                    {getSyncStatusIcon(jiraSyncStatus.ideas.needs_sync, syncing.ideas)}
                  </span>
                  {syncing.ideas ? 'Syncing' : jiraSyncStatus.ideas.needs_sync ? 'Needs Sync' : 'Up to Date'}
                </span>
              </div>
            </div>
            
            <div style={styles.syncItemDetails}>
              <div style={styles.syncDetail}>
                <span style={styles.detailLabel}>Last Sync:</span>
                <span style={styles.detailValue}>{getLastSyncText(jiraSyncStatus.ideas.last_sync)}</span>
              </div>
              <div style={styles.syncDetail}>
                <span style={styles.detailLabel}>Source:</span>
                <span style={styles.detailValue}>Jira DPO Project</span>
              </div>
            </div>

            <div style={styles.syncItemActions}>
              <button
                style={{
                  ...styles.btn,
                  ...styles.btnSecondary,
                  ...styles.btnSm,
                  ...(syncing.ideas ? styles.btnLoading : {})
                }}
                onClick={syncIdeas}
                disabled={syncing.ideas || jiraSyncStatus.ideas.sync_in_progress}
              >
                {syncing.ideas ? (
                  <>
                    <span style={styles.loadingSpinner}></span>
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
          <div style={{
            ...styles.syncItem,
            ...(syncing.epics ? styles.syncItemSyncing : 
                jiraSyncStatus.epics.needs_sync ? styles.syncItemNeedsSync : 
                styles.syncItemSynced)
          }}>
            <div style={styles.syncItemHeader}>
              <div style={styles.syncItemTitle}>
                <span style={styles.syncItemIcon}>🎯</span>
                <div style={styles.syncItemInfo}>
                  <h4 style={styles.syncItemInfoH4}>Jira Epics</h4>
                  <span style={styles.syncItemSubtitle}>DFS Project Epics</span>
                </div>
              </div>
              <div style={styles.syncItemBadges}>
                <span style={{...styles.syncBadge, ...styles.syncBadgeItemsCount}}>
                  {jiraSyncStatus.epics.total_items} items
                </span>
                <span style={{
                  ...styles.syncBadge,
                  ...(syncing.epics ? styles.syncBadgeStatusSyncing :
                      jiraSyncStatus.epics.needs_sync ? styles.syncBadgeStatusNeedsSync :
                      styles.syncBadgeStatusSynced)
                }}>
                  <span style={styles.statusIcon}>
                    {getSyncStatusIcon(jiraSyncStatus.epics.needs_sync, syncing.epics)}
                  </span>
                  {syncing.epics ? 'Syncing' : jiraSyncStatus.epics.needs_sync ? 'Needs Sync' : 'Up to Date'}
                </span>
              </div>
            </div>
            
            <div style={styles.syncItemDetails}>
              <div style={styles.syncDetail}>
                <span style={styles.detailLabel}>Last Sync:</span>
                <span style={styles.detailValue}>{getLastSyncText(jiraSyncStatus.epics.last_sync)}</span>
              </div>
              <div style={styles.syncDetail}>
                <span style={styles.detailLabel}>Source:</span>
                <span style={styles.detailValue}>Jira DFS Project</span>
              </div>
            </div>

            <div style={styles.syncItemActions}>
              <button
                style={{
                  ...styles.btn,
                  ...styles.btnSecondary,
                  ...styles.btnSm,
                  ...(syncing.epics ? styles.btnLoading : {})
                }}
                onClick={syncEpics}
                disabled={syncing.epics || jiraSyncStatus.epics.sync_in_progress}
              >
                {syncing.epics ? (
                  <>
                    <span style={styles.loadingSpinner}></span>
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
          <div style={{
            ...styles.syncItem,
            ...(syncing.pages ? styles.syncItemSyncing : 
                confluenceSyncStatus.pages.needs_sync ? styles.syncItemNeedsSync : 
                styles.syncItemSynced)
          }}>
            <div style={styles.syncItemHeader}>
              <div style={styles.syncItemTitle}>
                <span style={styles.syncItemIcon}>📚</span>
                <div style={styles.syncItemInfo}>
                  <h4 style={styles.syncItemInfoH4}>Confluence Pages</h4>
                  <span style={styles.syncItemSubtitle}>FD Space Documentation</span>
                </div>
              </div>
              <div style={styles.syncItemBadges}>
                <span style={{...styles.syncBadge, ...styles.syncBadgeItemsCount}}>
                  {confluenceSyncStatus.pages.total_items} items
                </span>
                <span style={{
                  ...styles.syncBadge,
                  ...(syncing.pages ? styles.syncBadgeStatusSyncing :
                      confluenceSyncStatus.pages.needs_sync ? styles.syncBadgeStatusNeedsSync :
                      styles.syncBadgeStatusSynced)
                }}>
                  <span style={styles.statusIcon}>
                    {getSyncStatusIcon(confluenceSyncStatus.pages.needs_sync, syncing.pages)}
                  </span>
                  {syncing.pages ? 'Syncing' : confluenceSyncStatus.pages.needs_sync ? 'Needs Sync' : 'Up to Date'}
                </span>
              </div>
            </div>
            
            <div style={styles.syncItemDetails}>
              <div style={styles.syncDetail}>
                <span style={styles.detailLabel}>Last Sync:</span>
                <span style={styles.detailValue}>{getLastSyncText(confluenceSyncStatus.pages.last_sync)}</span>
              </div>
              <div style={styles.syncDetail}>
                <span style={styles.detailLabel}>Source:</span>
                <span style={styles.detailValue}>Confluence FD Space</span>
              </div>
            </div>

            <div style={styles.syncItemActions}>
              <button
                style={{
                  ...styles.btn,
                  ...styles.btnSecondary,
                  ...styles.btnSm,
                  ...(syncing.pages ? styles.btnLoading : {})
                }}
                onClick={syncPages}
                disabled={syncing.pages || confluenceSyncStatus.pages.sync_in_progress}
              >
                {syncing.pages ? (
                  <>
                    <span style={styles.loadingSpinner}></span>
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
        <div style={styles.syncSummary}>
          <div style={styles.summaryStats}>
            <div style={styles.summaryStat}>
              <span style={styles.statNumber}>{getTotalItems()}</span>
              <span style={styles.statLabel}>Total Items</span>
            </div>
            <div style={styles.summaryStat}>
              <span style={styles.statNumber}>
                {anyNeedsSync ? 'Yes' : 'No'}
              </span>
              <span style={styles.statLabel}>Needs Sync</span>
            </div>
            <div style={styles.summaryStat}>
              <span style={styles.statNumber}>
                {getLastFullSync()}
              </span>
              <span style={styles.statLabel}>Last Full Sync</span>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          /* Hover effects */
          .sync-manager button:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
          }
          
          .sync-manager .sync-item:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-xl);
          }
          
          .sync-manager .summary-stat:hover {
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
          }
          
          /* Responsive design */
          @media (max-width: 768px) {
            .sync-manager .sync-header {
              flex-direction: column;
              gap: var(--spacing-md);
              align-items: stretch;
            }
            
            .sync-manager .sync-actions {
              justify-content: center;
            }
            
            .sync-manager .sync-item-header {
              flex-direction: column;
              gap: var(--spacing-md);
              align-items: stretch;
            }
            
            .sync-manager .sync-item-badges {
              justify-content: center;
            }
            
            .sync-manager .summary-stats {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>
    </div>
  );
}

export default SyncManager;