import { NextResponse } from 'next/server';
import { HTML_FILES_DIR, writeHtmlEntry, entryExists } from '@/lib/server/fs-utils';

export const runtime = 'nodejs'; // ensure Node runtime for fs access

function unauthorized(msg = 'Unauthorized') {
    return new NextResponse(JSON.stringify({ error: msg }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
    });
}

function badRequest(msg: string) {
    return new NextResponse(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function POST(request: Request) {
    try {
        const auth = request.headers.get('authorization') || request.headers.get('Authorization');
        if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
            return unauthorized('Missing Authorization: Bearer token');
        }
        const token = auth.split(' ')[1];
        const expected = process.env.GALLERY_ADMIN_TOKEN;
        if (!expected || token !== expected) {
            return unauthorized('Invalid token');
        }

        const body = await request.json();

        // Optional: prevent accidental overwrite unless explicitly allowed
        const allowOverwrite = Boolean(body?.allowOverwrite);
        if (!allowOverwrite && body?.id && entryExists(String(body.id))) {
            return badRequest('An entry with this id already exists. Set allowOverwrite=true to overwrite.');
        }

        const result = writeHtmlEntry({
            id: String(body.id || ''),
            title: String(body.title || ''),
            htmlContent: String(body.htmlContent || ''),
            metadata: {
                model: String(body?.metadata?.model || ''),
                prompt: String(body?.metadata?.prompt || ''),
                timestamp: String(body?.metadata?.timestamp || ''),
                tags: Array.isArray(body?.metadata?.tags) ? body.metadata.tags.map(String) : [],
                description: String(body?.metadata?.description || ''),
            },
        });

        return NextResponse.json({
            ok: true,
            filepath: result.filepath.replace(process.cwd(), '').replace(/^[\\/]/, ''),
            dir: HTML_FILES_DIR.replace(process.cwd(), '').replace(/^[\\/]/, ''),
        });
    } catch (err: any) {
        console.error('add-html error:', err);
        return new NextResponse(JSON.stringify({ error: 'Internal Server Error', detail: String(err?.message || err) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}