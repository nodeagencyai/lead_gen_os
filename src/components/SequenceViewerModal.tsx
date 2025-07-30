import React, { useState, useEffect } from 'react';
import { X, Mail, Clock, TrendingUp, Eye } from 'lucide-react';
import { IntegrationService } from '../services/integrationService';

interface SequenceStep {
  id: string;
  step_number: number;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && campaignId) {
      fetchSequences();
    }
  }, [isOpen, campaignId]);

  const fetchSequences = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const sequenceData = await IntegrationService.getCampaignSequences(campaignId);
      
      // Mock data structure for demonstration - replace with actual API data
      const mockSequences: SequenceStep[] = [
        {
          id: '1',
          step_number: 1,
          subject: 'Quick question about [Company]',
          content: 'Hi [First Name],\n\nI noticed that [Company] is doing amazing work in [Industry]. I was wondering if you might be interested in...',
          delay_days: 0,
          delay_hours: 0,
          opened: 45,
          replied: 8,
          sent: 100,
          type: 'email'
        },
        {
          id: '2',
          step_number: 2,
          subject: 'Following up on my previous email',
          content: 'Hi [First Name],\n\nI wanted to follow up on my previous email about [Topic]. I know you\'re probably busy, but...',
          delay_days: 3,
          delay_hours: 0,
          opened: 32,
          replied: 5,
          sent: 72,
          type: 'follow_up'
        },
        {
          id: '3',
          step_number: 3,
          subject: 'Last attempt - [Company] opportunity',
          content: 'Hi [First Name],\n\nThis will be my last email about this opportunity. I understand if you\'re not interested...',
          delay_days: 7,
          delay_hours: 0,
          opened: 18,
          replied: 2,
          sent: 45,
          type: 'follow_up'
        }
      ];

      setSequences(sequenceData.length > 0 ? sequenceData : mockSequences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sequences');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="w-full max-w-4xl max-h-[90vh] rounded-xl overflow-hidden"
        style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Sequence Viewer</h2>
            <p className="text-sm text-gray-400 mt-1">{campaignName}</p>
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
              <p className="text-gray-400">This campaign doesn't have any sequences configured yet.</p>
            </div>
          )}

          {!loading && !error && sequences.length > 0 && (
            <div className="space-y-6">
              {sequences.map((sequence, index) => (
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
                        <span className="text-sm font-medium" style={{ color: '#cccccc' }}>Email Content</span>
                        <button className="flex items-center space-x-1 text-xs hover:opacity-80" style={{ color: '#888888' }}>
                          <Eye size={12} />
                          <span>Preview</span>
                        </button>
                      </div>
                      <div className="text-sm text-gray-300 whitespace-pre-wrap max-h-32 overflow-hidden">
                        {sequence.content.length > 200 
                          ? sequence.content.substring(0, 200) + '...'
                          : sequence.content
                        }
                      </div>
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