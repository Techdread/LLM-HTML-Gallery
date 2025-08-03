import { GenerationItem, GalleryFilters } from '@/components/fast-gallery-mode';

// Type for the existing HTML file structure
interface HtmlFile {
  id: string;
  title: string;
  htmlContent: string;
  metadata: {
    model: string;
    prompt: string;
    timestamp: string;
    tags: string[];
    description: string;
  };
}

// Helper function to safely parse dates
function parseDate(timestamp: string | undefined): Date {
  if (!timestamp) {
    return new Date();
  }
  
  const date = new Date(timestamp);
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.warn(`Invalid timestamp: ${timestamp}, using current date`);
    return new Date();
  }
  
  return date;
}

// Convert existing HTML files to GenerationItem format
export function convertHtmlFilesToGenerationItems(htmlFiles: HtmlFile[]): GenerationItem[] {
  return htmlFiles.map(file => ({
    id: file.id,
    htmlContent: file.htmlContent,
    prompt: file.metadata.prompt || file.title || 'No prompt available',
    model: file.metadata.model || 'Unknown',
    timestamp: parseDate(file.metadata.timestamp),
    tags: file.metadata.tags || [],
    thumbnail: generateThumbnail(file.htmlContent), // Generate thumbnail from HTML
    metrics: {
      fileSize: new Blob([file.htmlContent]).size,
      features: extractFeatures(file.htmlContent)
    }
  }));
}

// Generate a simple thumbnail from HTML content
function generateThumbnail(htmlContent: string): string | undefined {
  // For now, return undefined - in a real implementation, you might:
  // 1. Use a headless browser to capture screenshots
  // 2. Extract images from the HTML
  // 3. Generate a preview based on content
  return undefined;
}

// Extract features from HTML content
function extractFeatures(htmlContent: string): string[] {
  const features: string[] = [];
  
  // Check for common HTML features
  if (htmlContent.includes('<canvas')) features.push('Canvas');
  if (htmlContent.includes('<svg')) features.push('SVG');
  if (htmlContent.includes('animation') || htmlContent.includes('@keyframes')) features.push('Animation');
  if (htmlContent.includes('grid') || htmlContent.includes('flexbox')) features.push('CSS Grid/Flex');
  if (htmlContent.includes('<video') || htmlContent.includes('<audio')) features.push('Media');
  if (htmlContent.includes('javascript:') || htmlContent.includes('<script')) features.push('JavaScript');
  if (htmlContent.includes('transform') || htmlContent.includes('transition')) features.push('CSS Transforms');
  
  return features;
}

// Mock fetch function that works with existing data structure
export async function fetchGenerations(
  htmlFiles: HtmlFile[], 
  page: number, 
  filters: GalleryFilters
): Promise<{
  items: GenerationItem[];
  hasMore: boolean;
  total: number;
}> {
  const allItems = convertHtmlFilesToGenerationItems(htmlFiles);
  
  // Apply filters
  let filteredItems = allItems.filter(item => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        item.prompt.toLowerCase().includes(searchLower) ||
        item.model.toLowerCase().includes(searchLower) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
    }
    
    // Model filter
    if (filters.model && item.model !== filters.model) {
      return false;
    }
    
    // Tags filter
    if (filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(filterTag => 
        item.tags.some(itemTag => itemTag.toLowerCase().includes(filterTag.toLowerCase()))
      );
      if (!hasMatchingTag) return false;
    }
    
    return true;
  });
  
  // Apply sorting
  filteredItems.sort((a, b) => {
    switch (filters.sortBy) {
      case 'newest':
        return b.timestamp.getTime() - a.timestamp.getTime();
      case 'oldest':
        return a.timestamp.getTime() - b.timestamp.getTime();
      case 'model':
        return a.model.localeCompare(b.model);
      case 'size':
        return (b.metrics?.fileSize || 0) - (a.metrics?.fileSize || 0);
      default:
        return 0;
    }
  });
  
  // Pagination
  const itemsPerPage = 20;
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);
  
  return {
    items: paginatedItems,
    hasMore: endIndex < filteredItems.length,
    total: filteredItems.length
  };
}
