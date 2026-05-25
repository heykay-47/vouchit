
import { useState, useEffect, useRef } from 'react';
import { useVouchers } from '@/contexts/VoucherContext';
import { Voucher, VoucherCategory } from '@/lib/types';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, X, Clock, TrendingUp, Tag } from 'lucide-react';

interface SearchSuggestionsProps {
  query: string;
  setQuery: (query: string) => void;
  popularVouchers?: Voucher[];
  onSearch?: (query: string) => void;
  className?: string;
}

export default function SearchSuggestions({
  query,
  setQuery,
  popularVouchers,
  onSearch,
  className = ''
}: SearchSuggestionsProps) {
  const { vouchers, searchVouchers } = useVouchers();
  const [results, setResults] = useState<Voucher[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularCategories, setPopularCategories] = useState<VoucherCategory[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load recent searches from localStorage
  useEffect(() => {
    const savedSearches = localStorage.getItem('recentSearches');
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches));
    }

    // Calculate popular categories
    if (vouchers.length > 0) {
      const categoryCounts: Record<string, number> = {};
      vouchers.forEach(voucher => {
        if (voucher.category) {
          categoryCounts[voucher.category] = (categoryCounts[voucher.category] || 0) + 1;
        }
      });
      
      // Sort categories by count and take top 5
      const sortedCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category]) => category as VoucherCategory);
      
      setPopularCategories(sortedCategories);
    }
  }, [vouchers]);

  // Updates voucher search results as user types in search box
  useEffect(() => {
    if (query.trim() === '') {
      setResults([]);
      setSuggestions([]);
      return;
    }

    // Search vouchers based on query
    if (searchVouchers) {
      const searchResults = searchVouchers(query);
      setResults(searchResults.slice(0, 5));
    }

    // Generate search suggestions
    const lowercaseQuery = query.toLowerCase();
    const suggestedQueries = [
      ...new Set([
        ...vouchers
          .filter(v => 
            v.title.toLowerCase().includes(lowercaseQuery) || 
            (v.category && v.category.toLowerCase().includes(lowercaseQuery)) ||
            v.platform.toLowerCase().includes(lowercaseQuery)
          )
          .map(v => v.title),
        ...vouchers
          .filter(v => v.category)
          .map(v => v.category as string)
          .filter(c => c.toLowerCase().includes(lowercaseQuery))
      ])
    ].slice(0, 5);

    setSuggestions(suggestedQueries);
    setIsOpen(true);
  }, [query, vouchers, searchVouchers]);

  // Closes search suggestions when clicking away from search area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Executes voucher search when user selects suggestion or presses enter
  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      // Save to recent searches
      const updatedRecentSearches = [
        searchQuery, 
        ...recentSearches.filter(s => s !== searchQuery)
      ].slice(0, 5);
      
      setRecentSearches(updatedRecentSearches);
      localStorage.setItem('recentSearches', JSON.stringify(updatedRecentSearches));
      
      // Close dropdown
      setIsOpen(false);
      
      // Execute search
      if (onSearch) {
        onSearch(searchQuery);
      } else {
        // Navigate to browse page with search query
        navigate(`/browse?q=${encodeURIComponent(searchQuery)}`);
      }
    }
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search vouchers..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch(query);
            }
          }}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground hover:text-foreground"
            onClick={() => setQuery('')}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-10 w-full mt-1 bg-background shadow-lg rounded-md border border-border overflow-hidden"
          >
            <div className="max-h-96 overflow-y-auto">
              {/* Search Suggestions */}
              {suggestions.length > 0 && (
                <div className="p-2">
                  <h3 className="text-xs font-medium text-muted-foreground mb-1 px-2">
                    Suggestions
                  </h3>
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="flex items-center px-2 py-1.5 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => {
                        setQuery(suggestion);
                        handleSearch(suggestion);
                      }}
                    >
                      <Search className="h-4 w-4 text-muted-foreground mr-2" />
                      <span>{suggestion}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="p-2 border-t border-border">
                  <div className="flex items-center justify-between mb-1 px-2">
                    <h3 className="text-xs font-medium text-muted-foreground">
                      Recent Searches
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2"
                      onClick={clearRecentSearches}
                    >
                      Clear
                    </Button>
                  </div>
                  {recentSearches.map((search, index) => (
                    <div
                      key={index}
                      className="flex items-center px-2 py-1.5 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => {
                        setQuery(search);
                        handleSearch(search);
                      }}
                    >
                      <Clock className="h-4 w-4 text-muted-foreground mr-2" />
                      <span>{search}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Popular Categories */}
              {popularCategories.length > 0 && (
                <div className="p-2 border-t border-border">
                  <h3 className="text-xs font-medium text-muted-foreground mb-1 px-2">
                    Popular Categories
                  </h3>
                  <div className="flex flex-wrap gap-2 px-2 py-1">
                    {popularCategories.map((category, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80"
                        onClick={() => {
                          setQuery(category);
                          handleSearch(category);
                        }}
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Vouchers */}
              {(!query || query.length < 2) && popularVouchers && popularVouchers.length > 0 && (
                <div className="p-2 border-t border-border">
                  <h3 className="text-xs font-medium text-muted-foreground mb-1 px-2">
                    Popular Vouchers
                  </h3>
                  {popularVouchers.slice(0, 3).map((voucher) => (
                    <div
                      key={voucher.id}
                      className="flex items-center px-2 py-1.5 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => navigate(`/browse?id=${voucher.id}`)}
                    >
                      <TrendingUp className="h-4 w-4 text-primary mr-2" />
                      <div className="flex flex-col">
                        <span className="text-sm">{voucher.title}</span>
                        <span className="text-xs text-muted-foreground">{voucher.platform}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
