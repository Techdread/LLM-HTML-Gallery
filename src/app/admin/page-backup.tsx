'use client';

import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/toaster';
import { Settings, Plus, Eye, EyeOff } from 'lucide-react';

type Metadata = {
    model: string;
    prompt: string;
    timestamp: string; // ISO8601
    tags: string[];
    description: string;
};

type FormState = {
    token: string;
    id: string;
    title: string;
    htmlContent: string;
    metadata: Metadata;
    allowOverwrite: boolean;
};

function nowIso() {
    return new Date().toISOString();
}

export default function AdminPage() {
    const initial = useMemo<FormState>(
        () => ({
            token: '',
            id: '',
            title: '',
            htmlContent: '<!DOCTYPE html>\\n<html lang="en">\\n<head>\\n  <meta charset="UTF-8" />\\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\\n  <title>New HTML</title>\\n</head>\\n<body>\\n  <!-- Paste your HTML here -->\\n</body>\\n</html>',
            metadata: {
                model: '',
                prompt: '',
                timestamp: nowIso(),
                tags: [],
                description: '',
            },
            allowOverwrite: false,
        }),
        []
    );

    const [form, setForm] = useState<FormState>(initial);
    const [submitting, setSubmitting] = useState(false);
    const [resultPath, setResultPath] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isAdminMode, setIsAdminMode] = useState(false);

    const canSubmit =
        form.token.trim().length > 0 &&
        form.id.trim().length > 0 &&
        form.title.trim().length > 0 &&
        form.htmlContent.trim().length > 0;

    useEffect(() => {
        // Load admin mode setting from localStorage
        const adminMode = localStorage.getItem('llm-gallery-admin-mode') === 'true';
        setIsAdminMode(adminMode);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setResultPath(null);

        try {
            const res = await fetch('/api/admin/add-html', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${form.token.trim()}`,
                },
                body: JSON.stringify({
                    id: form.id.trim(),
                    title: form.title.trim(),
                    htmlContent: form.htmlContent,
                    metadata: {
                        model: form.metadata.model.trim(),
                        prompt: form.metadata.prompt,
                        timestamp: form.metadata.timestamp || nowIso(),
                        tags: form.metadata.tags,
                        description: form.metadata.description,
                    },
                    allowOverwrite: form.allowOverwrite,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Request failed');
            }
            setResultPath(String(data?.filepath || ''));
        } catch (err: any) {
            setError(String(err?.message || err));
        } finally {
            setSubmitting(false);
        }
    };

    const resetTimestamp = () => {
        setForm((f) => ({ ...f, metadata: { ...f.metadata, timestamp: nowIso() } }));
    };

    const handleModeToggle = () => {
        const newMode = !isAdminMode;
        setIsAdminMode(newMode);
        localStorage.setItem('llm-gallery-admin-mode', newMode.toString());
    };

    return (
        <div className="container mx-auto max-w-4xl p-6">
            <Toaster />
            
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
                <p className="text-muted-foreground">Manage your LLM HTML Gallery</p>
            </div>

            <Tabs defaultValue="add-html" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="add-html" className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add HTML
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Settings
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="add-html">
                    <Card>
                        <CardHeader>
                            <CardTitle>Add HTML Entry</CardTitle>
                            <CardDescription>
                                Paste an HTML generation and metadata. On submit, a JSON file will be written to src/data/html-files.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium">Admin Token</label>
                                        <input
                                            type="password"
                                            className="border rounded px-3 py-2 bg-background"
                                            placeholder="Paste your admin token"
                                            value={form.token}
                                            onChange={(e) => setForm({ ...form, token: e.target.value })}
                                        />
                                        <p className="text-xs text-muted-foreground">Required. Validated server-side.</p>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium">ID</label>
                                        <input
                                            type="text"
                                            className="border rounded px-3 py-2 bg-background"
                                            placeholder="e.g., css-art-sunset"
                                            value={form.id}
                                            onChange={(e) => setForm({ ...form, id: e.target.value })}
                                        />
                                        <p className="text-xs text-muted-foreground">Will be kebab-cased for the filename.</p>
                                    </div>

                                    <div className="md:col-span-2 flex flex-col gap-2">
                                        <label className="text-sm font-medium">Title</label>
                                        <input
                                            type="text"
                                            className="border rounded px-3 py-2 bg-background"
                                            placeholder="Human-friendly title"
                                            value={form.title}
                                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        />
                                    </div>
                                </section>

                                <section className="flex flex-col gap-2">
                                    <label className="text-sm font-medium">HTML Content</label>
                                    <textarea
                                        className="border rounded px-3 py-2 bg-background font-mono"
                                        rows={14}
                                        value={form.htmlContent}
                                        onChange={(e) => setForm({ ...form, htmlContent: e.target.value })}
                                    />
                                </section>

                                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium">Model</label>
                                        <input
                                            type="text"
                                            className="border rounded px-3 py-2 bg-background"
                                            placeholder="e.g., GPT-4, Claude 3"
                                            value={form.metadata.model}
                                            onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, model: e.target.value } })}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium">Timestamp</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="border rounded px-3 py-2 bg-background flex-1"
                                                value={form.metadata.timestamp}
                                                onChange={(e) =>
                                                    setForm({ ...form, metadata: { ...form.metadata, timestamp: e.target.value } })
                                                }
                                            />
                                            <Button type="button" onClick={resetTimestamp} variant="secondary">
                                                Now
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">ISO 8601 format. Click "Now" to set current time.</p>
                                    </div>

                                    <div className="md:col-span-2 flex flex-col gap-2">
                                        <label className="text-sm font-medium">Prompt</label>
                                        <textarea
                                            className="border rounded px-3 py-2 bg-background"
                                            rows={3}
                                            value={form.metadata.prompt}
                                            onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, prompt: e.target.value } })}
                                        />
                                    </div>

                                    <div className="md:col-span-2 flex flex-col gap-2">
                                        <label className="text-sm font-medium">Tags (comma-separated)</label>
                                        <input
                                            type="text"
                                            className="border rounded px-3 py-2 bg-background"
                                            placeholder="e.g., CSS, Animation, Art"
                                            value={form.metadata.tags.join(', ')}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    metadata: {
                                                        ...form.metadata,
                                                        tags: e.target.value
                                                            .split(',')
                                                            .map((t) => t.trim())
                                                            .filter(Boolean),
                                                    },
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="md:col-span-2 flex flex-col gap-2">
                                        <label className="text-sm font-medium">Description</label>
                                        <textarea
                                            className="border rounded px-3 py-2 bg-background"
                                            rows={3}
                                            value={form.metadata.description}
                                            onChange={(e) =>
                                                setForm({ ...form, metadata: { ...form.metadata, description: e.target.value } })
                                            }
                                        />
                                    </div>
                                </section>

                                <section className="flex items-center gap-2">
                                    <input
                                        id="allowOverwrite"
                                        type="checkbox"
                                        checked={form.allowOverwrite}
                                        onChange={(e) => setForm({ ...form, allowOverwrite: e.target.checked })}
                                    />
                                    <label htmlFor="allowOverwrite" className="text-sm">
                                        Allow overwrite if file with same id exists
                                    </label>
                                </section>

                                <div className="flex gap-3">
                                    <Button type="submit" disabled={!canSubmit || submitting}>
                                        {submitting ? 'Submitting…' : 'Create JSON'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => {
                                            setForm(initial);
                                            setResultPath(null);
                                            setError(null);
                                        }}
                                    >
                                        Reset
                                    </Button>
                                </div>

                                {resultPath && (
                                    <div className="rounded border p-3 text-sm">
                                        <div className="font-medium">Success</div>
                                        <div>Written: {resultPath}</div>
                                    </div>
                                )}
                                {error && (
                                    <div className="rounded border p-3 text-sm text-red-600">
                                        <div className="font-medium">Error</div>
                                        <div>{error}</div>
                                    </div>
                                )}
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gallery Settings</CardTitle>
                            <CardDescription>
                                Configure how the gallery appears for admin users.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Display Mode</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Choose which gallery mode you see as an admin. Regular users always see the Fast Gallery Mode.
                                    </p>
                                </div>
                                
                                <div className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {isAdminMode ? (
                                                <Eye className="w-5 h-5 text-blue-600" />
                                            ) : (
                                                <EyeOff className="w-5 h-5 text-gray-400" />
                                            )}
                                            <div>
                                                <div className="font-medium">
                                                    {isAdminMode ? 'Admin Mode' : 'Fast Gallery Mode'}
                                                    {isAdminMode && (
                                                        <Badge variant="secondary" className="ml-2">Active</Badge>
                                                    )}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {isAdminMode 
                                                        ? 'You\'re seeing the original gallery view with detailed file management'
                                                        : 'You\'re seeing the modern, optimized gallery with search and filters'
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                        <Button 
                                            onClick={handleModeToggle}
                                            variant={isAdminMode ? "outline" : "default"}
                                        >
                                            Switch to {isAdminMode ? 'Fast Gallery' : 'Admin Mode'}
                                        </Button>
                                    </div>
                                </div>
                                
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center mt-0.5">
                                            <span className="text-white text-xs font-bold">i</span>
                                        </div>
                                        <div className="text-sm">
                                            <p className="font-medium text-blue-900 mb-1">How it works:</p>
                                            <ul className="text-blue-800 space-y-1">
                                                <li>• <strong>Fast Gallery Mode:</strong> Modern interface with search, filters, and optimized performance</li>
                                                <li>• <strong>Admin Mode:</strong> Original gallery view with direct file access and management</li>
                                                <li>• This setting only affects your admin view - regular users always see Fast Gallery Mode</li>
                                                <li>• Your preference is saved locally in your browser</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
                    <Tabs defaultValue="add-html" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="add-html" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add HTML
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Settings
                </TabsTrigger>
            </TabsList>
            
            <TabsContent value="add-html">
                <Card>
                    <CardHeader>
                        <CardTitle>Add HTML Entry</CardTitle>
                        <CardDescription>
                            Paste an HTML generation and metadata. On submit, a JSON file will be written to src/data/html-files.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Admin Token</label>
                            <input
                                type="password"
                                className="border rounded px-3 py-2 bg-background"
                                placeholder="Paste your admin token"
                                value={form.token}
                                onChange={(e) => setForm({ ...form, token: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">Required. Validated server-side.</p>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">ID</label>
                            <input
                                type="text"
                                className="border rounded px-3 py-2 bg-background"
                                placeholder="e.g., css-art-sunset"
                                value={form.id}
                                onChange={(e) => setForm({ ...form, id: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">Will be kebab-cased for the filename.</p>
                        </div>

                        <div className="md:col-span-2 flex flex-col gap-2">
                            <label className="text-sm font-medium">Title</label>
                            <input
                                type="text"
                                className="border rounded px-3 py-2 bg-background"
                                placeholder="Human-friendly title"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                            />
                        </div>
                    </section>

                    <section className="flex flex-col gap-2">
                        <label className="text-sm font-medium">HTML Content</label>
                        <textarea
                            className="border rounded px-3 py-2 bg-background font-mono"
                            rows={14}
                            value={form.htmlContent}
                            onChange={(e) => setForm({ ...form, htmlContent: e.target.value })}
                        />
                    </section>

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Model</label>
                            <input
                                type="text"
                                className="border rounded px-3 py-2 bg-background"
                                placeholder="e.g., GPT-4, Claude 3"
                                value={form.metadata.model}
                                onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, model: e.target.value } })}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Timestamp</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="border rounded px-3 py-2 bg-background flex-1"
                                    value={form.metadata.timestamp}
                                    onChange={(e) =>
                                        setForm({ ...form, metadata: { ...form.metadata, timestamp: e.target.value } })
                                    }
                                />
                                <Button type="button" onClick={resetTimestamp} variant="secondary">
                                    Now
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">ISO 8601 format. Click "Now" to set current time.</p>
                        </div>

                        <div className="md:col-span-2 flex flex-col gap-2">
                            <label className="text-sm font-medium">Prompt</label>
                            <textarea
                                className="border rounded px-3 py-2 bg-background"
                                rows={3}
                                value={form.metadata.prompt}
                                onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, prompt: e.target.value } })}
                            />
                        </div>

                        <div className="md:col-span-2 flex flex-col gap-2">
                            <label className="text-sm font-medium">Tags (comma-separated)</label>
                            <input
                                type="text"
                                className="border rounded px-3 py-2 bg-background"
                                placeholder="e.g., CSS, Animation, Art"
                                value={form.metadata.tags.join(', ')}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        metadata: {
                                            ...form.metadata,
                                            tags: e.target.value
                                                .split(',')
                                                .map((t) => t.trim())
                                                .filter(Boolean),
                                        },
                                    })
                                }
                            />
                        </div>

                        <div className="md:col-span-2 flex flex-col gap-2">
                            <label className="text-sm font-medium">Description</label>
                            <textarea
                                className="border rounded px-3 py-2 bg-background"
                                rows={3}
                                value={form.metadata.description}
                                onChange={(e) =>
                                    setForm({ ...form, metadata: { ...form.metadata, description: e.target.value } })
                                }
                            />
                        </div>
                    </section>

                    <section className="flex items-center gap-2">
                        <input
                            id="allowOverwrite"
                            type="checkbox"
                            checked={form.allowOverwrite}
                            onChange={(e) => setForm({ ...form, allowOverwrite: e.target.checked })}
                        />
                        <label htmlFor="allowOverwrite" className="text-sm">
                            Allow overwrite if file with same id exists
                        </label>
                    </section>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={!canSubmit || submitting}>
                            {submitting ? 'Submitting…' : 'Create JSON'}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setForm(initial);
                                setResultPath(null);
                                setError(null);
                            }}
                        >
                            Reset
                        </Button>
                    </div>

                    {resultPath && (
                        <div className="rounded border p-3 text-sm">
                            <div className="font-medium">Success</div>
                            <div>Written: {resultPath}</div>
                        </div>
                    )}
                    {error && (
                        <div className="rounded border p-3 text-sm text-red-600">
                            <div className="font-medium">Error</div>
                            <div>{error}</div>
                        </div>
                    )}
                </form>
                    </CardContent>
                </Card>
            </TabsContent>
            
            <TabsContent value="settings">
                <Card>
                    <CardHeader>
                        <CardTitle>Gallery Settings</CardTitle>
                        <CardDescription>
                            Configure how the gallery appears for admin users.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Display Mode</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Choose which gallery mode you see as an admin. Regular users always see the Fast Gallery Mode.
                                </p>
                            </div>
                            
                            <div className="border rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {isAdminMode ? (
                                            <Eye className="w-5 h-5 text-blue-600" />
                                        ) : (
                                            <EyeOff className="w-5 h-5 text-gray-400" />
                                        )}
                                        <div>
                                            <div className="font-medium">
                                                {isAdminMode ? 'Admin Mode' : 'Fast Gallery Mode'}
                                                {isAdminMode && (
                                                    <Badge variant="secondary" className="ml-2">Active</Badge>
                                                )}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {isAdminMode 
                                                    ? 'You\'re seeing the original gallery view with detailed file management'
                                                    : 'You\'re seeing the modern, optimized gallery with search and filters'
                                                }
                                            </div>
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={handleModeToggle}
                                        variant={isAdminMode ? "outline" : "default"}
                                    >
                                        Switch to {isAdminMode ? 'Fast Gallery' : 'Admin Mode'}
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center mt-0.5">
                                        <span className="text-white text-xs font-bold">i</span>
                                    </div>
                                    <div className="text-sm">
                                        <p className="font-medium text-blue-900 mb-1">How it works:</p>
                                        <ul className="text-blue-800 space-y-1">
                                            <li>• <strong>Fast Gallery Mode:</strong> Modern interface with search, filters, and optimized performance</li>
                                            <li>• <strong>Admin Mode:</strong> Original gallery view with direct file access and management</li>
                                            <li>• This setting only affects your admin view - regular users always see Fast Gallery Mode</li>
                                            <li>• Your preference is saved locally in your browser</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
);