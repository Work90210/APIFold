export interface FieldChange {
  readonly field: string;
  readonly from: unknown;
  readonly to: unknown;
}

export interface ToolChange {
  readonly name: string;
  readonly type: 'added' | 'removed' | 'modified';
  readonly breaking: boolean;
  readonly changes?: readonly FieldChange[];
}

export interface SpecDiff {
  readonly tools: readonly ToolChange[];
  readonly addedCount: number;
  readonly removedCount: number;
  readonly modifiedCount: number;
  readonly isBreaking: boolean;
  readonly summary: string;
}

interface ToolRecord {
  readonly name?: string;
  readonly description?: string;
  readonly inputSchema?: InputSchema;
  readonly [key: string]: unknown;
}

interface InputSchema {
  readonly type?: string;
  readonly properties?: Readonly<Record<string, PropertySchema>>;
  readonly required?: readonly string[];
  readonly [key: string]: unknown;
}

interface PropertySchema {
  readonly type?: string;
  readonly [key: string]: unknown;
}

function getToolName(tool: unknown): string {
  if (typeof tool === 'object' && tool !== null && 'name' in tool) {
    return String((tool as ToolRecord).name ?? '');
  }
  return '';
}

function getInputSchema(tool: unknown): InputSchema | undefined {
  if (typeof tool === 'object' && tool !== null && 'inputSchema' in tool) {
    return (tool as ToolRecord).inputSchema;
  }
  return undefined;
}

function buildToolMap(tools: readonly unknown[]): ReadonlyMap<string, ToolRecord> {
  const map = new Map<string, ToolRecord>();
  for (const tool of tools) {
    const name = getToolName(tool);
    if (name) {
      map.set(name, tool as ToolRecord);
    }
  }
  return map;
}

function detectBreakingParamChanges(
  oldSchema: InputSchema | undefined,
  newSchema: InputSchema | undefined,
): { readonly breaking: boolean; readonly changes: readonly FieldChange[] } {
  const changes: FieldChange[] = [];
  let breaking = false;

  const oldProps = oldSchema?.properties ?? {};
  const newProps = newSchema?.properties ?? {};
  const oldRequired = new Set(oldSchema?.required ?? []);
  const newRequired = new Set(newSchema?.required ?? []);

  // Check for removed parameters
  for (const paramName of Object.keys(oldProps)) {
    if (!(paramName in newProps)) {
      breaking = true;
      changes.push({ field: `parameters.${paramName}`, from: oldProps[paramName], to: undefined });
    }
  }

  // Check for added parameters
  for (const paramName of Object.keys(newProps)) {
    if (!(paramName in oldProps)) {
      const isNewRequired = newRequired.has(paramName);
      if (isNewRequired) {
        breaking = true;
      }
      changes.push({ field: `parameters.${paramName}`, from: undefined, to: newProps[paramName] });
    }
  }

  // Check for modified parameters
  for (const paramName of Object.keys(oldProps)) {
    if (paramName in newProps) {
      const oldType = oldProps[paramName]?.type;
      const newType = newProps[paramName]?.type;

      if (oldType !== newType) {
        breaking = true;
        changes.push({
          field: `parameters.${paramName}.type`,
          from: oldType,
          to: newType,
        });
      }

      // Newly required parameter is breaking
      if (!oldRequired.has(paramName) && newRequired.has(paramName)) {
        breaking = true;
        changes.push({
          field: `parameters.${paramName}.required`,
          from: false,
          to: true,
        });
      }
    }
  }

  return { breaking, changes };
}

function compareTools(oldTool: ToolRecord, newTool: ToolRecord): ToolChange | null {
  const oldSchema = getInputSchema(oldTool);
  const newSchema = getInputSchema(newTool);

  const { breaking, changes } = detectBreakingParamChanges(oldSchema, newSchema);

  // Also check description changes (non-breaking)
  const allChanges: FieldChange[] = [...changes];
  if (oldTool.description !== newTool.description) {
    allChanges.push({
      field: 'description',
      from: oldTool.description,
      to: newTool.description,
    });
  }

  if (allChanges.length === 0) {
    return null;
  }

  return {
    name: String(oldTool.name ?? ''),
    type: 'modified',
    breaking,
    changes: allChanges,
  };
}

function buildSummary(added: number, removed: number, modified: number, isBreaking: boolean): string {
  const parts: string[] = [];
  if (added > 0) parts.push(`${added} tool${added === 1 ? '' : 's'} added`);
  if (removed > 0) parts.push(`${removed} tool${removed === 1 ? '' : 's'} removed`);
  if (modified > 0) parts.push(`${modified} tool${modified === 1 ? '' : 's'} modified`);

  if (parts.length === 0) {
    return 'No changes detected';
  }

  const prefix = isBreaking ? 'BREAKING: ' : '';
  return `${prefix}${parts.join(', ')}`;
}

export function diffTools(oldTools: readonly unknown[], newTools: readonly unknown[]): SpecDiff {
  const oldMap = buildToolMap(oldTools);
  const newMap = buildToolMap(newTools);

  const toolChanges: ToolChange[] = [];

  // Removed tools (in old but not in new)
  for (const [name] of oldMap) {
    if (!newMap.has(name)) {
      toolChanges.push({ name, type: 'removed', breaking: true });
    }
  }

  // Added tools (in new but not in old)
  for (const [name] of newMap) {
    if (!oldMap.has(name)) {
      toolChanges.push({ name, type: 'added', breaking: false });
    }
  }

  // Modified tools (in both)
  for (const [name, oldTool] of oldMap) {
    const newTool = newMap.get(name);
    if (newTool) {
      const change = compareTools(oldTool, newTool);
      if (change) {
        toolChanges.push(change);
      }
    }
  }

  const addedCount = toolChanges.filter((c) => c.type === 'added').length;
  const removedCount = toolChanges.filter((c) => c.type === 'removed').length;
  const modifiedCount = toolChanges.filter((c) => c.type === 'modified').length;
  const isBreaking = toolChanges.some((c) => c.breaking);

  return {
    tools: toolChanges,
    addedCount,
    removedCount,
    modifiedCount,
    isBreaking,
    summary: buildSummary(addedCount, removedCount, modifiedCount, isBreaking),
  };
}
