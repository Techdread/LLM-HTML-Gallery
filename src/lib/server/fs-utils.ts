/* eslint-disable no-console */
// Server-side filesystem utilities for safe JSON writes
// Node APIs only. Do not import into client components.

import fs from 'fs';
import path from 'path';

export type HtmlFileMetadata = {
    model: string;
    prompt: string;
    timestamp: string; // ISO 8601
    tags: string[];
    description: string;
};

export type HtmlFileEntry = {
    id: string;
    title: string;
    htmlContent: string;
    metadata: HtmlFileMetadata;
};

const ROOT_DIR = process.cwd();

// Directory where JSON files are stored relative to project root
export const HTML_FILES_DIR = path.join(ROOT_DIR, 'src', 'data', 'html-files');

export function ensureHtmlFilesDir() {
    if (!fs.existsSync(HTML_FILES_DIR)) {
        fs.mkdirSync(HTML_FILES_DIR, { recursive: true });
    }
}

// Very defensive kebab-case id sanitizer for filenames
export function toKebabId(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // non-alnum to dashes
        .replace(/^-+|-+$/g, '') // trim leading/trailing dashes
        .slice(0, 100); // limit filename length
}

// Prevent directory traversal by ensuring resolved path stays under HTML_FILES_DIR
function safeJoinHtmlDir(filename: string): string {
    const target = path.resolve(HTML_FILES_DIR, filename);
    const base = path.resolve(HTML_FILES_DIR);
    if (!target.startsWith(base + path.sep) && target !== base) {
        throw new Error('Invalid path resolution');
    }
    return target;
}

// Basic schema validation
export function validateEntry(entry: HtmlFileEntry): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!entry || typeof entry !== 'object') errors.push('Entry must be an object');
    if (!entry.id || typeof entry.id !== 'string') errors.push('id is required (string)');
    if (!entry.title || typeof entry.title !== 'string') errors.push('title is required (string)');
    if (!entry.htmlContent || typeof entry.htmlContent !== 'string') errors.push('htmlContent is required (string)');
    const m = entry.metadata as HtmlFileMetadata;
    if (!m || typeof m !== 'object') {
        errors.push('metadata is required (object)');
    } else {
        if (!m.model || typeof m.model !== 'string') errors.push('metadata.model is required (string)');
        if (!m.prompt || typeof m.prompt !== 'string') errors.push('metadata.prompt is required (string)');
        if (!m.timestamp || typeof m.timestamp !== 'string') errors.push('metadata.timestamp is required (ISO string)');
        if (!Array.isArray(m.tags)) errors.push('metadata.tags is required (string[])');
        if (!m.description || typeof m.description !== 'string') errors.push('metadata.description is required (string)');
    }
    return { valid: errors.length === 0, errors };
}

// Write entry as JSON to src/data/html-files/<id>.json
export function writeHtmlEntry(entry: HtmlFileEntry): { filepath: string } {
    ensureHtmlFilesDir();

    const { valid, errors } = validateEntry(entry);
    if (!valid) {
        throw new Error('Invalid entry: ' + errors.join('; '));
    }

    const kebab = toKebabId(entry.id);
    if (!kebab) {
        throw new Error('Sanitized id is empty');
    }

    const filename = `${kebab}.json`;
    const filepath = safeJoinHtmlDir(filename);

    const payload = JSON.stringify(entry, null, 2) + '\n';
    fs.writeFileSync(filepath, payload, { encoding: 'utf8' });

    return { filepath };
}

// Optional helper to check if an id already exists
export function entryExists(id: string): boolean {
    ensureHtmlFilesDir();
    const filename = `${toKebabId(id)}.json`;
    const filepath = safeJoinHtmlDir(filename);
    return fs.existsSync(filepath);
}