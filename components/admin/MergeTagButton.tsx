'use client';

import { MERGE_TAGS } from '@/types/admin';

interface MergeTagButtonProps {
  onInsert: (tag: string) => void;
}

export function MergeTagButton({ onInsert }: MergeTagButtonProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MERGE_TAGS.map((tag) => (
        <button
          key={tag.tag}
          type="button"
          onClick={() => onInsert(tag.tag)}
          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors font-mono"
          title={tag.description}
        >
          {tag.label}
        </button>
      ))}
    </div>
  );
}
