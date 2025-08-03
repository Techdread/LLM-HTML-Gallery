import { NextResponse } from 'next/server';
import { loadHtmlFiles } from '@/lib/load-html-files';

export async function GET() {
    try {
        const htmlFiles = await loadHtmlFiles();
        return NextResponse.json(htmlFiles);
    } catch (error) {
        console.error('Failed to load HTML files:', error);
        return NextResponse.json(
            { error: 'Failed to load HTML files' },
            { status: 500 }
        );
    }
}
