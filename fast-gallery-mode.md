import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Grid3x3, 
  List,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Tag,
  Sparkles
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Types
interface GenerationItem {
  id: string;
  htmlContent: string;
  prompt: string;
  model: string;
  timestamp: Date;
  tags: string[];
  thumbnail?: string; // Base64 or URL
  metrics?: {
    fileSize: number;
    performanceFPS?: number;
    features?: string[];
  };
}

interface GalleryFilters {
  search: string;
  model: string | null;
  tags: string[];
  dateRange: { from: Date | null; to: Date | null };
  sortBy: 'newest' | 'oldest' | 'model' | 'size';
}

// Virtualized Gallery Card Component
const GalleryCard: React.FC<{
  item: GenerationItem;
  onClick: () => void;
  isLoading?: boolean;
}> = ({ item, onClick, isLoading }) => {
  const [imageError, setImageError] = useState(false);
  
  return (
    <Card 
      className="overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-100 relative overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : item.thumbnail && !imageError ? (
          <img 
            src={item.thumbnail} 
            alt={item.prompt}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
            <Sparkles className="h-12 w-12 text-gray-400" />
          </div>
        )}
        
        {/* Model Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-black/50 text-white backdrop-blur">
            {item.model}
          </Badge>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
          {item.prompt}
        </p>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {item.tags.slice(0, 3).map((tag, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {item.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{item.tags.length - 3}
            </Badge>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>{new Date(item.timestamp).toLocaleDateString()}</span>
          {item.metrics?.fileSize && (
            <span>{(item.metrics.fileSize / 1024).toFixed(1)} KB</span>
          )}
        </div>
      </div>
    </Card>
  );
};

// Main Gallery Component with Virtual Scrolling
export const LLMGalleryScalable: React.FC<{
  // In a real app, this would be an API endpoint
  fetchGenerations: (params: {
    page: number;
    limit: number;
    filters: GalleryFilters;
  }) => Promise<{
    items: GenerationItem[];
    total: number;
    hasMore: boolean;
  }>;
  onItemClick: (item: GenerationItem) => void;
}> = ({ fetchGenerations, onItemClick }) => {
  const [items, setItems] = useState<GenerationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<GalleryFilters>({
    search: '',
    model: null,
    tags: [],
    dateRange: { from: null, to: null },
    sortBy: 'newest'
  });
  
  const observerTarget = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  // Fetch data
  const loadGenerations = useCallback(async (resetItems = false) => {
    setLoading(true);
    try {
      const result = await fetchGenerations({
        page: resetItems ? 1 : page,
        limit: 20,
        filters
      });
      
      if (resetItems) {
        setItems(result.items);
        setPage(1);
      } else {
        setItems(prev => [...prev, ...result.items]);
      }
      
      setHasMore(result.hasMore);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load generations:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filters, fetchGenerations]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    const target = observerTarget.current;
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [hasMore, loading]);

  // Load more when page changes
  useEffect(() => {
    if (page > 1) {
      loadGenerations();
    }
  }, [page]);

  // Reload when filters change
  useEffect(() => {
    loadGenerations(true);
  }, [filters]);

  // Debounced search
  const handleSearch = (value: string) => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: value }));
    }, 300);
  };

  // Get unique models and tags for filters
  const uniqueModels = Array.from(new Set(items.map(item => item.model)));
  const uniqueTags = Array.from(new Set(items.flatMap(item => item.tags)));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search prompts, tags, or models..."
                className="pl-10"
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            
            {/* Filters */}
            <div className="flex gap-2">
              <Select
                value={filters.model || 'all'}
                onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, model: value === 'all' ? null : value }))
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Models" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  {uniqueModels.map(model => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.sortBy}
                onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, sortBy: value as GalleryFilters['sortBy'] }))
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="model">By Model</SelectItem>
                  <SelectItem value="size">By Size</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Active Filters */}
          {(filters.search || filters.model || filters.tags.length > 0) && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {filters.search && (
                <Badge variant="secondary" className="gap-1">
                  Search: {filters.search}
                  <button onClick={() => setFilters(prev => ({ ...prev, search: '' }))}>×</button>
                </Badge>
              )}
              {filters.model && (
                <Badge variant="secondary" className="gap-1">
                  Model: {filters.model}
                  <button onClick={() => setFilters(prev => ({ ...prev, model: null }))}>×</button>
                </Badge>
              )}
            </div>
          )}

          {/* Results count */}
          <p className="text-sm text-gray-600 mt-2">
            Showing {items.length} of {total} generations
          </p>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <GalleryCard
                key={item.id}
                item={item}
                onClick={() => onItemClick(item)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <Card 
                key={item.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onItemClick(item)}
              >
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="w-32 h-32 bg-gray-100 rounded flex-shrink-0">
                    {item.thumbnail ? (
                      <img 
                        src={item.thumbnail} 
                        alt={item.prompt}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{item.prompt}</h3>
                      <Badge>{item.model}</Badge>
                    </div>
                    <div className="flex gap-2 mb-2">
                      {item.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(item.timestamp).toLocaleString()} • 
                      {item.metrics?.fileSize && ` ${(item.metrics.fileSize / 1024).toFixed(1)} KB`}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={observerTarget} className="h-20" />

        {/* No more results */}
        {!hasMore && items.length > 0 && (
          <p className="text-center text-gray-500 py-8">
            No more generations to load
          </p>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No generations found</h3>
            <p className="text-gray-500">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Example implementation
export const GalleryImplementationExample: React.FC = () => {
  // Mock data generator
  const generateMockData = (page: number, limit: number, filters: GalleryFilters) => {
    const items: GenerationItem[] = [];
    const start = (page - 1) * limit;
    
    for (let i = 0; i < limit; i++) {
      items.push({
        id: `item-${start + i}`,
        htmlContent: '<html>...</html>',
        prompt: `Create a ${['rotating', 'animated', 'interactive'][i % 3]} ${['cube', 'sphere', 'particle system'][i % 3]} with Three.js`,
        model: ['GPT-4', 'Claude 3', 'GPT-3.5'][i % 3],
        timestamp: new Date(Date.now() - (start + i) * 86400000),
        tags: ['Three.js', 'WebGL', ['Animation', 'Physics', 'Shaders'][i % 3]],
        thumbnail: undefined, // In real app, generate thumbnails
        metrics: {
          fileSize: 10000 + Math.random() * 50000,
          performanceFPS: 60
        }
      });
    }
    
    return {
      items,
      total: 500, // Mock total
      hasMore: start + limit < 500
    };
  };

  // Mock API call
  const fetchGenerations = async (params: any) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return generateMockData(params.page, params.limit, params.filters);
  };

  return (
    <LLMGalleryScalable
      fetchGenerations={fetchGenerations}
      onItemClick={(item) => {
        // In real app, navigate to detail view or open modal
        console.log('Clicked:', item);
      }}
    />
  );
};