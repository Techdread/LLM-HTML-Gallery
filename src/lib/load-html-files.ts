import { promises as fs } from 'fs'
import { join } from 'path'
import { HtmlFileData } from './types'

export async function loadHtmlFiles(): Promise<HtmlFileData[]> {
    try {
        const dataDir = join(process.cwd(), 'src', 'data', 'html-files')
        const files = await fs.readdir(dataDir)

        const htmlFiles: HtmlFileData[] = []

        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = join(dataDir, file)
                const content = await fs.readFile(filePath, 'utf-8')
                const data = JSON.parse(content) as HtmlFileData

                // Convert timestamp string to Date if it exists
                if (data.metadata.timestamp && typeof data.metadata.timestamp === 'string') {
                    data.metadata.timestamp = new Date(data.metadata.timestamp)
                }

                htmlFiles.push(data)
            }
        }

        // Sort by timestamp (newest first)
        return htmlFiles.sort((a, b) => {
            const timeA = a.metadata.timestamp?.getTime() || 0
            const timeB = b.metadata.timestamp?.getTime() || 0
            return timeB - timeA
        })
    } catch (error) {
        console.error('Error loading HTML files:', error)
        return []
    }
}
