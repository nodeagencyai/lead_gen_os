import React, { useState, useEffect } from 'react';
import { X, Mail, Clock, Eye, Code } from 'lucide-react';
import { InstantlyCampaignService } from '../services/instantlyCampaignService';
import { logger } from '../utils/logger';

interface SequenceStep {
  id: string;
  step_number: number;
  sequence_index?: number;
  variant_index?: number;
  subject: string;
  content: string;
  delay_days: number;
  delay_hours: number;
  opened: number;
  replied: number;
  sent: number;
  type: 'email' | 'follow_up';
}

interface SequenceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
}

const SequenceViewerModal: React.FC<SequenceViewerModalProps> = ({
  isOpen,
  onClose,
  campaignId,
  campaignName
}) => {
  const [sequences, setSequences] = useState<SequenceStep[]>([]);
  const [campaignInfo, setCampaignInfo] = useState<any>(null);
  const [_analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && campaignId) {
      fetchSequences();
    }
  }, [isOpen, campaignId]);

  useEffect(() => {
    // Prevent body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchSequences = async () => {
    if (!campaignId) {
      console.warn('⚠️ No campaign ID provided to sequence viewer');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      logger.log(`🔍 Sequence viewer fetching data for campaign: ${campaignId} (${campaignName})`);
      
      // Fetch enhanced sequence data with campaign context
      const enhancedData = await InstantlyCampaignService.getEnhancedSequenceData(campaignId);
      
      if (enhancedData.sequences.isEmpty) {
        console.warn(`⚠️ No sequences found for campaign ${campaignId} (${campaignName})`);
        setSequences([]);
        setCampaignInfo(enhancedData.campaignInfo);
        setAnalytics(enhancedData.analytics);
      } else {
        // Combine main and follow-up sequences for display
        const allSequences = [...enhancedData.sequences.main, ...enhancedData.sequences.followUps];
        logger.log(`✅ Sequence viewer loaded ${allSequences.length} sequences for ${campaignName}:`, {
          main: enhancedData.sequences.main.length,
          followUps: enhancedData.sequences.followUps.length,
          total: enhancedData.sequences.total
        });
        setSequences(allSequences);
        setCampaignInfo(enhancedData.campaignInfo);
        setAnalytics(enhancedData.analytics);
      }
      
    } catch (err) {
      console.error(`❌ Failed to fetch sequences for campaign ${campaignId}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sequence data');
      setSequences([]);
      setCampaignInfo(null);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDelay = (days: number, hours: number) => {
    if (days === 0 && hours === 0) return 'Immediate';
    if (days === 0) return `${hours}h delay`;
    if (hours === 0) return `${days}d delay`;
    return `${days}d ${hours}h delay`;
  };

  const calculateOpenRate = (opened: number, sent: number) => {
    return sent > 0 ? Math.round((opened / sent) * 100) : 0;
  };

  const calculateReplyRate = (replied: number, sent: number) => {
    return sent > 0 ? Math.round((replied / sent) * 100) : 0;
  };

  // Helper to clean HTML content for preview
  const cleanHtmlContent = (htmlContent: string): string => {
    if (!htmlContent) return '';
    
    // Remove HTML tags and convert common HTML entities
    return htmlContent
      .replace(/<br\s*\/?>/gi, '\n')  // Convert <br> to newlines
      .replace(/<\/p>/gi, '\n\n')     // Convert </p> to double newlines
      .replace(/<p[^>]*>/gi, '')      // Remove <p> tags
      .replace(/<div[^>]*>/gi, '')    // Remove <div> tags
      .replace(/<\/div>/gi, '\n')     // Convert </div> to newlines
      .replace(/<[^>]*>/g, '')        // Remove all remaining HTML tags
      .replace(/&nbsp;/g, ' ')        // Convert &nbsp; to spaces
      .replace(/&amp;/g, '&')         // Convert &amp; to &
      .replace(/&lt;/g, '<')          // Convert &lt; to <
      .replace(/&gt;/g, '>')          // Convert &gt; to >
      .replace(/&quot;/g, '"')        // Convert &quot; to "
      .replace(/&#39;/g, "'")         // Convert &#39; to '
      .trim();
  };

  // Helper to detect if content is HTML
  const isHtmlContent = (content: string): boolean => {
    return /<[a-z][\s\S]*>/i.test(content);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="w-full max-w-4xl max-h-[90vh] rounded-xl overflow-hidden"
        style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Sequence Viewer</h2>
            <p className="text-sm text-gray-400 mt-1">{campaignName}</p>
            {campaignInfo && (
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span>ID: {campaignId.substring(0, 8)}...</span>
                <span>Status: {campaignInfo.status || 'Draft'}</span>
                {campaignInfo.leads_count && <span>Leads: {campaignInfo.leads_count}</span>}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <X size={20} style={{ color: '#888888' }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                <span style={{ color: '#888888' }}>Loading sequences...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg mb-6" style={{ backgroundColor: '#1a1a1a', border: '1px solid #ef4444', color: '#ef4444' }}>
              Error loading sequences: {error}
            </div>
          )}

          {!loading && !error && sequences.length === 0 && (
            <div className="text-center py-12">
              <Mail size={48} className="mx-auto mb-4" style={{ color: '#888888' }} />
              <h3 className="text-lg font-semibold text-white mb-2">No Sequences Found</h3>
              <p className="text-gray-400 mb-4">
                This campaign doesn't have any sequences or subsequences configured yet.
              </p>
              {campaignInfo && (
                <div className="text-sm text-gray-500 max-w-md mx-auto">
                  <p>Campaign: <span className="text-gray-400">{campaignName}</span></p>
                  <p>Status: <span className="text-gray-400">{campaignInfo.status || 'Draft'}</span></p>
                  <p className="mt-2">Check your Instantly campaign for:</p>
                  <ul className="text-left mt-2 space-y-1">
                    <li>• Primary sequences in the main campaign</li>
                    <li>• Follow-up subsequences attached to this campaign</li>
                    <li>• Email variants with subject and body content</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {!loading && !error && sequences.length > 0 && (
            <div className="space-y-6">
              {sequences.map((sequence) => (
                <div
                  key={sequence.id}
                  className="rounded-xl p-6 transition-all duration-200"
                  style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}
                >
                  {/* Sequence Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center font-semibold"
                        style={{ 
                          backgroundColor: sequence.type === 'email' ? '#3b82f6' : '#f59e0b',
                          color: 'white'
                        }}
                      >
                        {sequence.step_number}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{sequence.subject}</h3>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="flex items-center space-x-1 text-sm text-gray-400">
                            <Clock size={14} />
                            <span>{formatDelay(sequence.delay_days, sequence.delay_hours)}</span>
                          </span>
                          <span 
                            className="text-xs px-2 py-1 rounded-full"
                            style={{
                              backgroundColor: sequence.type === 'email' ? '#3b82f6' + '20' : '#f59e0b' + '20',
                              color: sequence.type === 'email' ? '#3b82f6' : '#f59e0b'
                            }}
                          >
                            {sequence.type === 'email' ? 'Initial Email' : 'Follow-up'}
                          </span>
                          {sequence.sequence_index !== undefined && (
                            <span className="text-xs text-gray-500">
                              Seq {sequence.sequence_index + 1}
                              {sequence.variant_index !== undefined && `.${sequence.variant_index + 1}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-white">{sequence.sent}</div>
                      <div className="text-xs text-gray-400">Sent</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-white">{sequence.opened}</div>
                      <div className="text-xs text-gray-400">Opened</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-white">{sequence.replied}</div>
                      <div className="text-xs text-gray-400">Replied</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold" style={{ color: '#10b981' }}>
                        {calculateReplyRate(sequence.replied, sequence.sent)}%
                      </div>
                      <div className="text-xs text-gray-400">Reply Rate</div>
                    </div>
                  </div>

                  {/* Email Content Preview */}
                  <div className="space-y-3">
                    <div 
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium" style={{ color: '#cccccc' }}>Email Content</span>
                          {isHtmlContent(sequence.content) && (
                            <span 
                              className="text-xs px-2 py-1 rounded-full flex items-center space-x-1"
                              style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}
                            >
                              <Code size={10} />
                              <span>HTML</span>
                            </span>
                          )}
                        </div>
                        <button className="flex items-center space-x-1 text-xs hover:opacity-80" style={{ color: '#888888' }}>
                          <Eye size={12} />
                          <span>Preview</span>
                        </button>
                      </div>
                      <div className="text-sm text-gray-300 whitespace-pre-wrap max-h-32 overflow-hidden">
                        {(() => {
                          const content = isHtmlContent(sequence.content) 
                            ? cleanHtmlContent(sequence.content)
                            : sequence.content;
                          return content.length > 300 
                            ? content.substring(0, 300) + '...'
                            : content;
                        })()}
                      </div>
                      {isHtmlContent(sequence.content) && (
                        <div className="mt-2 pt-2 border-t border-gray-600">
                          <details className="text-xs">
                            <summary 
                              className="cursor-pointer hover:opacity-80 text-gray-400"
                              style={{ color: '#888888' }}
                            >
                              View Raw HTML
                            </summary>
                            <div 
                              className="mt-2 p-2 rounded text-xs font-mono max-h-24 overflow-y-auto"
                              style={{ backgroundColor: '#0f0f0f', color: '#cccccc' }}
                            >
                              {sequence.content}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>

                    {/* Performance Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: '#888888' }}>Open Rate: {calculateOpenRate(sequence.opened, sequence.sent)}%</span>
                        <span style={{ color: '#888888' }}>Reply Rate: {calculateReplyRate(sequence.replied, sequence.sent)}%</span>
                      </div>
                      <div className="flex space-x-2">
                        <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: '#333333' }}>
                          <div 
                            className="h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${calculateOpenRate(sequence.opened, sequence.sent)}%`,
                              backgroundColor: '#3b82f6' 
                            }}
                          />
                        </div>
                        <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: '#333333' }}>
                          <div 
                            className="h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${calculateReplyRate(sequence.replied, sequence.sent)}%`,
                              backgroundColor: '#10b981' 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SequenceViewerModal;