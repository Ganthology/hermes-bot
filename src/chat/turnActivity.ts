/**
 * Ephemeral in-flight turn UI state derived from verified TUI gateway events
 * (ui-tui gatewayTypes + tui_gateway/server.py callbacks).
 *
 * thinking.delta = status-bar caption only (not model reasoning).
 * reasoning.delta = real model thought stream.
 * tool.* = tool lifecycle.
 */

export type ToolCallStatus = 'running' | 'done' | 'error';

export type ToolCallRow = {
  toolId: string;
  name: string;
  status: ToolCallStatus;
  preview?: string;
  summary?: string;
  error?: string;
};

export type TurnActivityState = {
  /** True from prompt submit / message.start until message.complete or error. */
  active: boolean;
  /** Caption from thinking.delta (kaomoji + verb); empty clears. */
  thinkingLabel: string | null;
  /** status.update kind / text when the host emits them. */
  statusKind: string | null;
  statusText: string | null;
  /** Accumulated reasoning.delta text for this turn. */
  reasoning: string;
  tools: ToolCallRow[];
};

export function emptyTurnActivity(): TurnActivityState {
  return {
    active: false,
    thinkingLabel: null,
    statusKind: null,
    statusText: null,
    reasoning: '',
    tools: [],
  };
}

export function beginTurn(_prev?: TurnActivityState): TurnActivityState {
  return {
    ...emptyTurnActivity(),
    active: true,
  };
}

export function endTurn(): TurnActivityState {
  return emptyTurnActivity();
}

export function applyThinkingDelta(
  state: TurnActivityState,
  text: string,
): TurnActivityState {
  const trimmed = text.trim();
  return {
    ...state,
    active: true,
    thinkingLabel: trimmed.length > 0 ? trimmed : null,
  };
}

export function applyStatusUpdate(
  state: TurnActivityState,
  kind: string | null,
  text: string | null,
): TurnActivityState {
  return {
    ...state,
    active: true,
    statusKind: kind,
    statusText: text && text.trim() ? text.trim() : null,
  };
}

export function applyReasoningDelta(
  state: TurnActivityState,
  chunk: string,
): TurnActivityState {
  if (!chunk) {
    return { ...state, active: true };
  }
  return {
    ...state,
    active: true,
    reasoning: state.reasoning + chunk,
  };
}

export function applyToolStart(
  state: TurnActivityState,
  toolId: string,
  name: string,
  preview?: string,
): TurnActivityState {
  const id = toolId || name || `tool-${state.tools.length}`;
  const existing = state.tools.findIndex((t) => t.toolId === id);
  const row: ToolCallRow = {
    toolId: id,
    name: name || 'tool',
    status: 'running',
    preview,
  };
  if (existing >= 0) {
    const tools = state.tools.slice();
    tools[existing] = { ...tools[existing], ...row };
    return { ...state, active: true, tools };
  }
  return { ...state, active: true, tools: [...state.tools, row] };
}

export function applyToolProgress(
  state: TurnActivityState,
  name: string | null,
  preview: string | null,
): TurnActivityState {
  if (!name && !preview) {
    return { ...state, active: true };
  }
  const tools = state.tools.slice();
  let idx = name ? tools.findIndex((t) => t.name === name && t.status === 'running') : -1;
  if (idx < 0) {
    idx = tools.findIndex((t) => t.status === 'running');
  }
  if (idx >= 0) {
    tools[idx] = {
      ...tools[idx],
      ...(name ? { name } : {}),
      ...(preview != null ? { preview } : {}),
    };
    return { ...state, active: true, tools };
  }
  if (name) {
    tools.push({
      toolId: `progress-${name}-${tools.length}`,
      name,
      status: 'running',
      preview: preview ?? undefined,
    });
  }
  return { ...state, active: true, tools };
}

export function applyToolGenerating(
  state: TurnActivityState,
  name: string,
): TurnActivityState {
  return applyToolProgress(state, name, 'Preparing…');
}

export function applyToolComplete(
  state: TurnActivityState,
  toolId: string,
  name: string,
  summary?: string,
  error?: string,
): TurnActivityState {
  const id = toolId || name;
  const tools = state.tools.slice();
  let idx = id ? tools.findIndex((t) => t.toolId === id) : -1;
  if (idx < 0 && name) {
    idx = tools.findIndex((t) => t.name === name && t.status === 'running');
  }
  const row: ToolCallRow = {
    toolId: id || `done-${tools.length}`,
    name: name || tools[idx]?.name || 'tool',
    status: error ? 'error' : 'done',
    summary,
    error,
  };
  if (idx >= 0) {
    tools[idx] = { ...tools[idx], ...row };
  } else {
    tools.push(row);
  }
  return { ...state, active: true, tools };
}

/** Honest working caption — never invents reasoning when the socket is idle. */
export function workingCaption(state: TurnActivityState): string | null {
  if (!state.active) {
    return null;
  }
  if (state.thinkingLabel) {
    return state.thinkingLabel;
  }
  if (state.statusText) {
    return state.statusText;
  }
  if (state.statusKind) {
    return state.statusKind;
  }
  const running = state.tools.find((t) => t.status === 'running');
  if (running) {
    return `Using ${running.name}…`;
  }
  if (state.reasoning) {
    return 'Thinking…';
  }
  return 'Working…';
}
