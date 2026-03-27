"use client";

import { use, useState, useMemo, useCallback } from "react";
import { Shield, Plus, Trash2, Pencil, Search, Copy, Check } from "lucide-react";
import { Button, Badge, EmptyState, Skeleton, cn } from "@apifold/ui";
import { useProfiles, useCreateProfile, useUpdateProfile, useDeleteProfile } from "@/lib/hooks/use-profiles";
import { useTools } from "@/lib/hooks";
import { useServer } from "@/lib/hooks";

interface ProfileFormState {
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly selectedToolIds: Set<string>;
}

const INITIAL_FORM: ProfileFormState = {
  name: "",
  slug: "",
  description: "",
  selectedToolIds: new Set(),
};

type StringFormField = Exclude<keyof ProfileFormState, "selectedToolIds">;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export default function ProfilesPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const { data: profiles, isLoading } = useProfiles(id);
  const { data: tools } = useTools(id);
  const { data: server } = useServer(id);
  const createProfile = useCreateProfile();
  const updateProfile = useUpdateProfile();
  const deleteProfile = useDeleteProfile();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormState>(INITIAL_FORM);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [availableFilter, setAvailableFilter] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const activeTools = useMemo(
    () => (tools ?? []).filter((t) => t.isActive),
    [tools],
  );

  const availableTools = useMemo(() => {
    const filtered = activeTools.filter(
      (t) => !form.selectedToolIds.has(t.id),
    );
    if (!availableFilter) return filtered;
    const q = availableFilter.toLowerCase();
    return filtered.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q),
    );
  }, [activeTools, form.selectedToolIds, availableFilter]);

  const selectedTools = useMemo(() => {
    const filtered = activeTools.filter((t) => form.selectedToolIds.has(t.id));
    if (!selectedFilter) return filtered;
    const q = selectedFilter.toLowerCase();
    return filtered.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q),
    );
  }, [activeTools, form.selectedToolIds, selectedFilter]);

  const openCreate = useCallback(() => {
    setForm(INITIAL_FORM);
    setSlugManuallyEdited(false);
    setEditingId(null);
    setAvailableFilter("");
    setSelectedFilter("");
    setShowForm(true);
  }, []);

  const openEdit = useCallback(
    (profile: { readonly id: string; readonly name: string; readonly slug: string; readonly description: string | null; readonly toolIds: readonly string[] }) => {
      setForm({
        name: profile.name,
        slug: profile.slug,
        description: profile.description ?? "",
        selectedToolIds: new Set(profile.toolIds),
      });
      setSlugManuallyEdited(true);
      setEditingId(profile.id);
      setAvailableFilter("");
      setSelectedFilter("");
      setShowForm(true);
    },
    [],
  );

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
  }, []);

  const updateFormField = useCallback(
    (field: StringFormField, value: string) => {
      setForm((prev) => {
        if (field === "name" && !slugManuallyEdited) {
          return { ...prev, name: value, slug: slugify(value) };
        }
        return { ...prev, [field]: value };
      });
    },
    [slugManuallyEdited],
  );

  const toggleTool = useCallback((toolId: string) => {
    setForm((prev) => {
      const next = new Set(prev.selectedToolIds);
      if (next.has(toolId)) {
        next.delete(toolId);
      } else {
        next.add(toolId);
      }
      return { ...prev, selectedToolIds: next };
    });
  }, []);

  const addAllVisible = useCallback(() => {
    setForm((prev) => {
      const next = new Set(prev.selectedToolIds);
      for (const t of availableTools) {
        next.add(t.id);
      }
      return { ...prev, selectedToolIds: next };
    });
  }, [availableTools]);

  const removeAllVisible = useCallback(() => {
    setForm((prev) => {
      const next = new Set(prev.selectedToolIds);
      for (const t of selectedTools) {
        next.delete(t.id);
      }
      return { ...prev, selectedToolIds: next };
    });
  }, [selectedTools]);

  const handleSubmit = useCallback(async () => {
    try {
      const toolIds = [...form.selectedToolIds];
      if (editingId) {
        await updateProfile.mutateAsync({
          serverId: id,
          profileId: editingId,
          input: {
            name: form.name,
            description: form.description || null,
            toolIds,
          },
        });
      } else {
        await createProfile.mutateAsync({
          serverId: id,
          input: {
            name: form.name,
            slug: form.slug,
            description: form.description || undefined,
            toolIds,
          },
        });
      }
      closeForm();
    } catch {
      // Errors surfaced by React Query — mutation stays in error state
    }
  }, [form, editingId, id, createProfile, updateProfile, closeForm]);

  const handleDelete = useCallback(
    async (profileId: string) => {
      try {
        await deleteProfile.mutateAsync({ serverId: id, profileId });
      } catch {
        // Errors surfaced by React Query — mutation stays in error state
      }
    },
    [id, deleteProfile],
  );

  const copyEndpoint = useCallback(
    (profileSlug: string) => {
      const endpoint = `/mcp/${server?.slug ?? "..."}/profiles/${profileSlug}/sse`;
      navigator.clipboard.writeText(endpoint);
      setCopiedSlug(profileSlug);
      setTimeout(() => setCopiedSlug(null), 2000);
    },
    [server?.slug],
  );

  const isSubmitting = createProfile.isPending || updateProfile.isPending;
  const canSubmit =
    form.name.trim().length > 0 &&
    form.slug.trim().length > 0 &&
    form.selectedToolIds.size > 0 &&
    !isSubmitting;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Profiles</h1>
          {profiles && profiles.length > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {profiles.length}
            </Badge>
          )}
        </div>
        {!showForm && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create Profile
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="rounded-lg border border-border p-5 space-y-5">
          <h2 className="text-sm font-semibold">
            {editingId ? "Edit Profile" : "Create Profile"}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateFormField("name", e.target.value)}
                placeholder="Read Only"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors duration-150 focus:border-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Slug
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setForm((prev) => ({
                    ...prev,
                    slug: slugify(e.target.value),
                  }));
                }}
                placeholder="read-only"
                disabled={!!editingId}
                className={cn(
                  "w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none transition-colors duration-150 focus:border-foreground",
                  editingId && "opacity-50 cursor-not-allowed",
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateFormField("description", e.target.value)}
              placeholder="Optional description for this profile..."
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors duration-150 focus:border-foreground resize-none"
            />
          </div>

          {/* Tool Assignment */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Tool Assignment
            </label>
            <div className="grid gap-3 lg:grid-cols-2">
              {/* Available Tools */}
              <div className="rounded-md border border-border">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Available ({availableTools.length})
                  </span>
                  <button
                    type="button"
                    onClick={addAllVisible}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
                  >
                    Add all
                  </button>
                </div>
                <div className="px-3 py-2 border-b border-border/50">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={availableFilter}
                      onChange={(e) => setAvailableFilter(e.target.value)}
                      placeholder="Filter..."
                      className="w-full rounded border border-border/50 bg-transparent pl-7 pr-2 py-1 text-xs outline-none focus:border-foreground"
                    />
                  </div>
                </div>
                <div className="max-h-52 overflow-y-auto scrollbar-thin">
                  {availableTools.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                      {availableFilter ? "No matching tools" : "All tools selected"}
                    </div>
                  ) : (
                    availableTools.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => toggleTool(tool.id)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted/50 transition-colors duration-150"
                      >
                        <Plus className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate font-mono">{tool.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Selected Tools */}
              <div className="rounded-md border border-border">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Selected ({form.selectedToolIds.size})
                  </span>
                  <button
                    type="button"
                    onClick={removeAllVisible}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
                  >
                    Remove all
                  </button>
                </div>
                <div className="px-3 py-2 border-b border-border/50">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={selectedFilter}
                      onChange={(e) => setSelectedFilter(e.target.value)}
                      placeholder="Filter..."
                      className="w-full rounded border border-border/50 bg-transparent pl-7 pr-2 py-1 text-xs outline-none focus:border-foreground"
                    />
                  </div>
                </div>
                <div className="max-h-52 overflow-y-auto scrollbar-thin">
                  {selectedTools.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                      {selectedFilter ? "No matching tools" : "No tools selected"}
                    </div>
                  ) : (
                    selectedTools.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => toggleTool(tool.id)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted/50 transition-colors duration-150"
                      >
                        <Trash2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate font-mono">{tool.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={closeForm}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {isSubmitting
                ? editingId
                  ? "Saving..."
                  : "Creating..."
                : editingId
                  ? "Save Changes"
                  : "Create Profile"}
            </Button>
          </div>
        </div>
      )}

      {/* Profile List */}
      {!profiles || profiles.length === 0 ? (
        !showForm && (
          <div className="rounded-lg border border-border p-12">
            <EmptyState
              icon={Shield}
              title="No access profiles"
              description="Create profiles to expose subsets of tools through scoped endpoints."
            />
          </div>
        )
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="rounded-lg border border-border px-5 py-4 transition-colors duration-150 hover:bg-muted/20"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {profile.name}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {profile.slug}
                    </span>
                    {profile.isDefault && (
                      <Badge variant="secondary" className="text-[10px]">
                        Default
                      </Badge>
                    )}
                    <Badge variant="secondary" className="tabular-nums text-[10px]">
                      {profile.toolIds.length} tools
                    </Badge>
                  </div>

                  {profile.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {profile.description}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5">
                    <code className="text-[11px] text-muted-foreground font-mono">
                      /mcp/{server?.slug ?? "..."}/profiles/{profile.slug}/sse
                    </code>
                    <button
                      type="button"
                      onClick={() => copyEndpoint(profile.slug)}
                      className="text-muted-foreground hover:text-foreground transition-colors duration-150"
                    >
                      {copiedSlug === profile.slug ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => openEdit(profile)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                    onClick={() => handleDelete(profile.id)}
                    disabled={profile.isDefault || deleteProfile.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
