'use client';

import { ChevronDown, Check } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Version {
  readonly id: string;
  readonly version: string;
  readonly toolCount: number;
  readonly changelog: string | null;
  readonly createdAt: string;
}

interface VersionSelectorProps {
  readonly slug: string;
  readonly currentVersion: string;
  readonly onVersionChange?: (version: Version) => void;
}

export function VersionSelector({ slug, currentVersion, onVersionChange }: VersionSelectorProps) {
  const [versions, setVersions] = useState<readonly Version[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(currentVersion);

  useEffect(() => {
    fetch(`/api/marketplace/${slug}/versions`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setVersions(data.data);
      })
      .catch(() => {});
  }, [slug]);

  const handleSelect = (v: Version) => {
    setSelected(v.version);
    setOpen(false);
    onVersionChange?.(v);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:border-foreground"
      >
        <span className="text-muted-foreground">Version</span>
        <span className="font-mono text-foreground">{selected}</span>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && versions.length > 0 && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-background shadow-lg">
            <div className="max-h-64 overflow-y-auto py-1">
              {versions.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleSelect(v)}
                  className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${
                    v.version === selected ? 'bg-muted/30' : ''
                  }`}
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                    {v.version === selected && (
                      <Check className="h-3.5 w-3.5 text-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm text-foreground">{v.version}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {v.toolCount} tools
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>
                        {new Date(v.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {v.version === versions[0]?.version && (
                        <span className="rounded-full border border-border px-1.5 py-0.5 font-semibold uppercase tracking-wider">
                          latest
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
