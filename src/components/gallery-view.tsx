'use client'

import { useState, useMemo } from 'react'
import { Grid, List, Layers, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LLMHtmlViewer } from './llm-html-viewer'
import { HtmlFileData } from '@/lib/types'

interface GalleryViewProps {
    htmlFiles: HtmlFileData[]
}

type ViewMode = 'grid' | 'side-by-side' | 'minimal'

export function GalleryView({ htmlFiles }: GalleryViewProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('side-by-side')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedTag, setSelectedTag] = useState<string | null>(null)

    // Get all unique tags from all files
    const allTags = useMemo(() => {
        const tags = new Set<string>()
        htmlFiles.forEach(file => {
            file.metadata.tags?.forEach(tag => tags.add(tag))
        })
        return Array.from(tags).sort()
    }, [htmlFiles])

    // Filter files based on search and tag
    const filteredFiles = useMemo(() => {
        return htmlFiles.filter(file => {
            const matchesSearch = !searchTerm ||
                file.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                file.metadata.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                file.metadata.prompt?.toLowerCase().includes(searchTerm.toLowerCase())

            const matchesTag = !selectedTag ||
                file.metadata.tags?.includes(selectedTag)

            return matchesSearch && matchesTag
        })
    }, [htmlFiles, searchTerm, selectedTag])

    const renderGridView = () => (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredFiles.map((file) => (
                <LLMHtmlViewer
                    key={file.id}
                    data={file}
                    height={300}
                    viewMode="preview-only"
                    className="h-fit"
                />
            ))}
        </div>
    )

    const renderSideBySideView = () => (
        <div className="space-y-8">
            {filteredFiles.map((file) => (
                <LLMHtmlViewer
                    key={file.id}
                    data={file}
                    height={500}
                    viewMode="side-by-side"
                    defaultShowCode={true}
                />
            ))}
        </div>
    )

    const renderMinimalView = () => (
        <div className="space-y-6">
            {filteredFiles.map((file) => (
                <LLMHtmlViewer
                    key={file.id}
                    data={file}
                    height={400}
                    viewMode="preview-only"
                />
            ))}
        </div>
    )

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Search examples..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* View Mode Toggle */}
                <div className="flex gap-2">
                    <Button
                        variant={viewMode === 'grid' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="gap-2"
                    >
                        <Grid className="h-4 w-4" />
                        Grid
                    </Button>
                    <Button
                        variant={viewMode === 'side-by-side' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('side-by-side')}
                        className="gap-2"
                    >
                        <List className="h-4 w-4" />
                        Documentation
                    </Button>
                    <Button
                        variant={viewMode === 'minimal' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('minimal')}
                        className="gap-2"
                    >
                        <Layers className="h-4 w-4" />
                        Showcase
                    </Button>
                </div>
            </div>

            {/* Tag Filter */}
            {allTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant={selectedTag === null ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTag(null)}
                    >
                        All
                    </Button>
                    {allTags.map(tag => (
                        <Button
                            key={tag}
                            variant={selectedTag === tag ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                        >
                            {tag}
                        </Button>
                    ))}
                </div>
            )}

            {/* Results Count */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredFiles.length} of {htmlFiles.length} examples
            </div>

            {/* Gallery Content */}
            {filteredFiles.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">
                        No examples found matching your criteria.
                    </p>
                </div>
            ) : (
                <>
                    {viewMode === 'grid' && renderGridView()}
                    {viewMode === 'side-by-side' && renderSideBySideView()}
                    {viewMode === 'minimal' && renderMinimalView()}
                </>
            )}
        </div>
    )
}
