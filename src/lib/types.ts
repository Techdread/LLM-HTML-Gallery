export interface HtmlFileData {
    id: string
    title: string
    htmlContent: string
    metadata: {
        model?: string
        prompt?: string
        timestamp?: Date
        tags?: string[]
        description?: string
    }
}

export interface GalleryViewMode {
    type: 'grid' | 'side-by-side' | 'minimal'
    showCode: boolean
}
