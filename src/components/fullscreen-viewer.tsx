'use client';

import React from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LLMHtmlViewer } from '@/components/llm-html-viewer';
import { HtmlFileData } from '@/lib/types';

interface FullscreenViewerProps {
  data: HtmlFileData;
  isOpen: boolean;
  onClose: () => void;
}

export const FullscreenViewer: React.FC<FullscreenViewerProps> = ({
  data,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header with close button */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Gallery</span>
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-lg font-semibold">{data.title}</h1>
            <p className="text-sm text-muted-foreground">
              {data.metadata.model && `${data.metadata.model} • `}
              {data.metadata.timestamp && new Date(data.metadata.timestamp).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content - Use exact same configuration as admin mode */}
      <div className="p-4" style={{ height: 'calc(100vh - 80px)', overflow: 'auto' }}>
        <LLMHtmlViewer
          key={data.id}
          data={data}
          height={500}
          viewMode="side-by-side"
          defaultShowCode={true}
        />
      </div>
    </div>
  );
};
