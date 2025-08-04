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
import { FullscreenViewer } from '@/components/fullscreen-viewer';
import { GalleryView } from '@/components/gallery-view';
import { HtmlFileData } from '@/lib/types';

// Types
export interface GenerationItem {
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

export interface GalleryFilters {
  search: string;
  model: string | null;
  tags: string[];
  dateRange: { from: Date | null; to: Date | null };
  sortBy: 'newest' | 'oldest' | 'model' | 'size';
}

// Virtualized Gallery Card Component
const GalleryCard: React.FC<{
  item: GenerationItem;
  onClick: (item: GenerationItem) => void;
  isSelected?: boolean;
}> = ({ item, onClick, isSelected = false }) => {
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);

  const handleThumbnailLoad = useCallback(() => {
    setThumbnailLoaded(true);
  }, []);

  const handleThumbnailError = useCallback(() => {
    setThumbnailError(true);
    setThumbnailLoaded(true);
  }, []);

  return (
    <Card 
      className={`group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
      }`}
      onClick={() => onClick(item)}
    >
      <div className="aspect-video relative overflow-hidden rounded-t-lg bg-gray-100">
        {/* Render HTML preview in iframe */}
        <iframe
          srcDoc={item.htmlContent}
          className="w-full h-full border-0 pointer-events-none"
          style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%', height: '200%' }}
          sandbox="allow-scripts"
        />
        
        {/* Fallback for loading */}
        {!item.htmlContent && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
            <Sparkles className="w-8 h-8 text-gray-400" />
          </div>
        )}
        
        {/* Overlay with quick actions */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Button size="sm" variant="secondary" className="backdrop-blur-sm">
            View Details
          </Button>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-sm line-clamp-2 flex-1 mr-2">
            {item.prompt.slice(0, 80)}...
          </h3>
          <Badge variant="outline" className="text-xs shrink-0">
            {item.model}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {item.timestamp.toLocaleDateString()}
          </span>
          {item.metrics?.fileSize && (
            <span>{(item.metrics.fileSize / 1024).toFixed(1)}KB</span>
          )}
        </div>
        
        {Array.isArray(item.tags) && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {item.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{item.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

// Main Fast Gallery Component
export const FastGalleryMode: React.FC<{
  fetchGenerations: (page: number, filters: GalleryFilters) => Promise<{
    items: GenerationItem[];
    hasMore: boolean;
    total: number;
  }>;
  onItemClick: (item: GenerationItem) => void;
  htmlFiles: HtmlFileData[]; // For GalleryView component
}> = ({ fetchGenerations, onItemClick, htmlFiles }) => {
  const [items, setItems] = useState<GenerationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Pagination constants
  const ITEMS_PER_PAGE = 9;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  
  // Fullscreen viewer state
  const [fullscreenData, setFullscreenData] = useState<HtmlFileData | null>(null);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  
  // Gallery mode toggle (fast vs full)
  const [galleryMode, setGalleryMode] = useState<'fast' | 'full'>('fast');
  
  const [filters, setFilters] = useState<GalleryFilters>({
    search: '',
    model: null,
    tags: [],
    dateRange: { from: null, to: null },
    sortBy: 'newest'
  });

  // Fullscreen viewer handlers
  const handleCloseFullscreen = useCallback(() => {
    setIsFullscreenOpen(false);
    setFullscreenData(null);
  }, []);

  // Remove infinite scroll functionality

  // Load items for current page
  const loadItems = useCallback(async (pageNum: number, currentFilters: GalleryFilters) => {
    setLoading(true);
    try {
      const result = await fetchGenerations(pageNum, currentFilters);
      setItems(result.items.slice(0, ITEMS_PER_PAGE));
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchGenerations]);

  // Initial load and filter changes
  useEffect(() => {
    setCurrentPage(1);
    loadItems(1, filters);
  }, [filters, loadItems]);

  // Load items when page changes
  useEffect(() => {
    loadItems(currentPage, filters);
  }, [currentPage, loadItems, filters]);

  // Handle search with debouncing
  const handleSearchChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  }, []);

  const handleItemClick = useCallback((item: GenerationItem) => {
    // Find the original HtmlFileData by ID
    const originalData = htmlFiles.find(file => file.id === item.id);
    if (originalData) {
      setFullscreenData(originalData);
      setIsFullscreenOpen(true);
    }
    onItemClick(item);
  }, [onItemClick, htmlFiles]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Only show for Fast Gallery mode */}
      {galleryMode === 'fast' && (
        <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search prompts, models, or tags..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <Select
                value={filters.model || 'all'}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  model: value === 'all' ? null : value 
                }))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Models" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="claude">Claude</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={filters.sortBy}
                onValueChange={(value: any) => setFilters(prev => ({ 
                  ...prev, 
                  sortBy: value 
                }))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="model">Model</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                </SelectContent>
              </Select>
              
              {/* View Mode Toggle */}
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Gallery Mode Toggle */}
              <div className="flex border rounded-md ml-2">
                <Button
                  variant={galleryMode === 'fast' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setGalleryMode('fast')}
                  className="rounded-r-none"
                >
                  Fast Gallery
                </Button>
                <Button
                  variant={galleryMode === 'full' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setGalleryMode('full')}
                  className="rounded-l-none"
                >
                  Full Gallery
                </Button>
              </div>
            </div>
          </div>
          
          {/* Results summary */}
          <div className="mt-3 text-sm text-gray-600">
            {loading && currentPage === 1 ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <span>
                Showing {items.length} of {total} generations (Page {currentPage} of {totalPages})
                {filters.search && ` matching "${filters.search}"`}
              </span>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Gallery Content - Conditional Rendering */}
      {galleryMode === 'full' ? (
        /* Full Gallery Mode - Reuse existing GalleryView component */
        <div className="max-w-7xl mx-auto px-4 py-8">
          <GalleryView htmlFiles={htmlFiles} />
        </div>
      ) : (
        /* Fast Gallery Mode - Custom grid/list view */
        <div className="max-w-7xl mx-auto px-4 py-8">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
              {items.map((item) => (
                <div key={item.id}>
                  <GalleryCard
                    item={item}
                    onClick={handleItemClick}
                    isSelected={selectedItems.has(item.id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className="p-6 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex gap-6">
                    <div className="w-32 h-20 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                      {item.htmlContent ? (
                        <iframe
                          srcDoc={item.htmlContent}
                          className="w-full h-full border-0 pointer-events-none rounded"
                          style={{ transform: 'scale(0.3)', transformOrigin: 'top left', width: '333%', height: '333%' }}
                          sandbox="allow-scripts"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-1 truncate">
                        {item.prompt}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                        <span>{item.model}</span>
                        <span>{item.timestamp.toLocaleDateString()}</span>
                        {item.metrics?.fileSize && (
                          <span>{(item.metrics.fileSize / 1024).toFixed(1)}KB</span>
                        )}
                      </div>
                      {Array.isArray(item.tags) && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 5).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 py-8">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <span className="text-xs text-gray-500">({total} total)</span>
              </div>
              
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-center py-8">
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </div>
            </div>
          )}
          
          {/* No results */}
          {!loading && items.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                No generations found
              </h3>
              <p className="text-gray-500">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Viewer */}
      {fullscreenData && (
        <FullscreenViewer
          data={fullscreenData}
          isOpen={isFullscreenOpen}
          onClose={handleCloseFullscreen}
        />
      )}
    </div>
  );
};
