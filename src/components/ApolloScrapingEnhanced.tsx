import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

const ApolloScrapingEnhanced = () => {
  const [url, setUrl] = useState('');
  const [count, setCount] = useState('500');
  const [niche, setNiche] = useState('');
  const [tags, setTags] = useState('');
  const [nicheSuggestions, setNicheSuggestions] = useState<string[]>([]);
  const [showNicheSuggestions, setShowNicheSuggestions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const commonNiches = [
    'marketing-agencies',
    'saas-b2b',
    'ecommerce-shopify',
    'healthcare-tech',
    'fintech-startup',
    'real-estate',
    'education-tech',
    'manufacturing',
    'local-business',
    'enterprise-software'
  ];
  
  const commonTags = [
    'series-a',
    'series-b',
    'enterprise',
    'startup',
    'fortune-500',
    'smb',
    'high-revenue',
    'decision-maker',
    'c-suite'
  ];

  useEffect(() => {
    if (niche.length > 0) {
      const filtered = commonNiches.filter(n => 
        n.toLowerCase().includes(niche.toLowerCase())
      );
      setNicheSuggestions(filtered);
    } else {
      setNicheSuggestions([]);
    }
  }, [niche, commonNiches]);

  const handleScrape = async () => {
    if (!url) {
      alert('Please enter an Apollo search URL');
      return;
    }

    if (parseInt(count) < 500) {
      alert('Apollo requires a minimum of 500 leads per scraping session');
      return;
    }

    setIsProcessing(true);
    
    const tagsArray = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    try {
      const response = await fetch('/api/scrape/apollo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          count: parseInt(count),
          niche: niche || 'uncategorized',
          tags: tagsArray
        })
      });

      if (response.ok) {
        alert(`Successfully scraped leads with niche: ${niche || 'uncategorized'}`);
        setUrl('');
        setNiche('');
        setTags('');
      }
    } catch (error) {
      console.error('Scraping error:', error);
      alert('Error scraping leads');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-8">
      <h2 className="text-xl font-semibold mb-6 text-center text-white">
        Apollo Lead Scraping
      </h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-gray-300">
          Apollo Search URL
        </label>
        <textarea
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste the Apollo search URL to scrape leads from..."
          className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div className="mb-4 relative">
        <label className="block text-sm font-medium mb-2 text-gray-300">
          Industry/Niche
        </label>
        <input
          type="text"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          onFocus={() => setShowNicheSuggestions(true)}
          onBlur={() => setTimeout(() => setShowNicheSuggestions(false), 200)}
          placeholder="e.g., marketing-agencies, saas-b2b, ecommerce-shopify"
          className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        {showNicheSuggestions && nicheSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-gray-700 rounded-lg shadow-lg">
            {nicheSuggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="px-4 py-2 hover:bg-gray-600 cursor-pointer text-white"
                onClick={() => {
                  setNiche(suggestion);
                  setShowNicheSuggestions(false);
                }}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-gray-300">
          Tags (Optional)
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Add tags separated by commas: series-a, bay-area, high-revenue"
          className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {commonTags.map((tag, idx) => (
            <span
              key={idx}
              onClick={() => {
                const currentTags = tags.split(',').map(t => t.trim()).filter(t => t);
                if (!currentTags.includes(tag)) {
                  setTags(tags ? `${tags}, ${tag}` : tag);
                }
              }}
              className="text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded cursor-pointer text-gray-300"
            >
              + {tag}
            </span>
          ))}
        </div>
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-gray-300">
          Number of leads to scrape
        </label>
        <input
          type="number"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          min="500"
          className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Apollo requires a minimum of 500 leads per scraping session
        </p>
      </div>
      
      <button
        onClick={handleScrape}
        disabled={isProcessing}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg flex items-center justify-center transition-colors"
      >
        <Search className="w-5 h-5 mr-2" />
        {isProcessing ? 'Processing...' : 'Start Apollo Scraping'}
      </button>
    </div>
  );
};

export default ApolloScrapingEnhanced;