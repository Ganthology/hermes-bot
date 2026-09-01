import type {
  ConnectionState,
  GatewayEvent,
  GatewayEventName,
  JsonRpcErrorPayload,
  JsonRpcFrame,
} from './types';
import { buildWsUrl, describeCloseCode, tryMintWsTicket, type AuthQuery } from './url';

export class JsonRpcGatewayError extends Error {
  readonly code?: number;
  readonly data?: unknown;

  constructor(message: string, options?: { code?: number; data?: unknown }) {
    super(message);
    this.name = 'JsonRpcGatewayError';
    this.code = options?.code;
    this.data = options?.data;
  }
}

export class GatewayClosedError extends Error {
  readonly closeCode: number;

  constructor(closeCode: number, detail?: string) {
    super(detail ?? `I could not connect — ${describeCloseCode(closeCode)}`);
    this.name = 'GatewayClosedError';
    this.closeCode = closeCode;
  }
}

type PendingCall = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type GatewayClientOptions = {
  requestTimeoutMs?: number;
  connectTimeoutMs?: number;
};

const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;
const DEFAULT_CONNECT_TIMEOUT_MS = 15_000;

/**
 * Thin newline-delimited JSON-RPC client for hermes serve :9119 `/api/ws`.
 * Matches apps/shared JsonRpcGatewayClient framing (method:"event" notifications).
 */
export class HermesGatewayClient {
  private socket: WebSocket | null = null;
  private state: ConnectionState = 'idle';
  private nextId = 0;
  private readonly pending = new Map<string, PendingCall>();
  private readonly eventHandlers = new Map<string, Set<(event: GatewayEvent) => void>>();
  private readonly stateHandlers = new Set<(state: ConnectionState) => void>();
  private buffer = '';
  private readonly requestTimeoutMs: number;
  private readonly connectTimeoutMs: number;
  private readyWaiters: {
    resolve: () => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }[] = [];

  constructor(options: GatewayClientOptions = {}) {
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.connectTimeoutMs = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
  }

  get connectionState(): ConnectionState {
    return this.state;
  }

  onState(handler: (state: ConnectionState) => void): () => void {
    this.stateHandlers.add(handler);
    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  on(event: GatewayEventName | '*', handler: (event: GatewayEvent) => void): () => void {
    const key = event;
    const set = this.eventHandlers.get(key) ?? new Set();
    set.add(handler);
    this.eventHandlers.set(key, set);
    return () => {
      set.delete(handler);
      if (set.size === 0) {
        this.eventHandlers.delete(key);
      }
    };
  }

  async connect(baseUrl: string, token: string): Promise<void> {
    if (this.state === 'open' || this.state === 'connecting') {
      return;
    }

    this.setState('connecting');

    const ticket = await tryMintWsTicket(baseUrl, token);
    const auth: AuthQuery = ticket ? (['ticket', ticket] as const) : (['token', token] as const);
    const wsUrl = buildWsUrl(baseUrl, auth);

    await this.openSocket(wsUrl);
  }

  disconnect(): void {
    const socket = this.socket;
    this.socket = null;
    this.rejectAllPending(new Error('Disconnected'));
    this.rejectReadyWaiters(new Error('Disconnected'));
    if (socket) {
      try {
        socket.close();
      } catch {
        // ignore
      }
    }
    this.setState('closed');
  }

  async waitUntilReady(timeoutMs = this.connectTimeoutMs): Promise<void> {
    if (this.state === 'open') {
      // gateway.ready may already have fired; still ok to proceed.
      return;
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.readyWaiters = this.readyWaiters.filter((w) => w.resolve !== resolve);
        reject(new Error('Timed out waiting for gateway.ready'));
      }, timeoutMs);
      this.readyWaiters.push({ resolve, reject, timer });
    });
  }

  async request<T = unknown>(
    method: string,
    params: Record<string, unknown> = {},
    timeoutMs = this.requestTimeoutMs,
  ): Promise<T> {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to Hermes gateway');
    }

    const id = `hb${++this.nextId}`;
    const frame = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC timeout: ${method}`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timer,
      });

      try {
        // Server accepts NDJSON; one JSON object per WS message is fine (Desktop does this).
        socket.send(`${JSON.stringify(frame)}\n`);
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private openSocket(wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      let sawReady = false;

      const socket = new WebSocket(wsUrl);
      this.socket = socket;

      const connectTimer = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        try {
          socket.close();
        } catch {
          // ignore
        }
        this.setState('error');
        reject(new Error('I could not connect — connection timed out'));
      }, this.connectTimeoutMs);

      const finishOk = () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(connectTimer);
        this.setState('open');
        resolve();
      };

      const finishErr = (error: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(connectTimer);
        this.setState('error');
        reject(error);
      };

      socket.onopen = () => {
        // Prefer waiting briefly for gateway.ready, but do not hang forever if
        // an older host skips it.
        const readyTimer = setTimeout(() => {
          if (!sawReady) {
            finishOk();
          }
        }, 2_000);

        const off = this.on('gateway.ready', () => {
          sawReady = true;
          clearTimeout(readyTimer);
          off();
          this.resolveReadyWaiters();
          finishOk();
        });
      };

      socket.onmessage = (event) => {
        this.handleRaw(typeof event.data === 'string' ? event.data : String(event.data));
      };

      socket.onerror = () => {
        // onclose carries the useful code; keep this as a soft signal.
      };

      socket.onclose = (event) => {
        this.socket = null;
        this.rejectAllPending(new GatewayClosedError(event.code));
        this.rejectReadyWaiters(new GatewayClosedError(event.code));
        if (!settled) {
          finishErr(new GatewayClosedError(event.code));
          return;
        }
        this.setState(event.code === 1000 ? 'closed' : 'error');
      };
    });
  }

  private handleRaw(raw: string): void {
    this.buffer += raw;
    const parts = this.buffer.split('\n');
    this.buffer = parts.pop() ?? '';

    for (const part of parts) {
      const line = part.trim();
      if (!line) {
        continue;
      }
      this.handleLine(line);
    }

    // Some stacks deliver one JSON object per WS frame without a trailing newline.
    if (this.buffer.trim().startsWith('{') && this.buffer.trim().endsWith('}')) {
      const maybe = this.buffer.trim();
      this.buffer = '';
      this.handleLine(maybe);
    }
  }

  private handleLine(line: string): void {
    let frame: JsonRpcFrame;
    try {
      frame = JSON.parse(line) as JsonRpcFrame;
    } catch {
      return;
    }

    if (frame.id !== undefined && frame.id !== null) {
      const pending = this.pending.get(String(frame.id));
      if (!pending) {
        return;
      }
      clearTimeout(pending.timer);
      this.pending.delete(String(frame.id));
      if (frame.error) {
        pending.reject(this.toRpcError(frame.error));
      } else {
        pending.resolve(frame.result);
      }
      return;
    }

    if (frame.method === 'event' && frame.params && typeof frame.params === 'object') {
      const event = frame.params as GatewayEvent;
      if (event.type) {
        this.dispatchEvent(event);
      }
    }
  }

  private dispatchEvent(event: GatewayEvent): void {
    const exact = this.eventHandlers.get(event.type);
    exact?.forEach((handler) => {
      try {
        handler(event);
      } catch {
        // swallow listener errors
      }
    });
    const any = this.eventHandlers.get('*');
    any?.forEach((handler) => {
      try {
        handler(event);
      } catch {
        // swallow
      }
    });
  }

  private toRpcError(error: JsonRpcErrorPayload): JsonRpcGatewayError {
    return new JsonRpcGatewayError(error.message || 'Hermes RPC failed', {
      code: typeof error.code === 'number' ? error.code : undefined,
      data: error.data,
    });
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.stateHandlers.forEach((handler) => {
      try {
        handler(state);
      } catch {
        // ignore
      }
    });
  }

  private rejectAllPending(error: Error): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
      this.pending.delete(id);
    }
  }

  private resolveReadyWaiters(): void {
    for (const waiter of this.readyWaiters) {
      clearTimeout(waiter.timer);
      waiter.resolve();
    }
    this.readyWaiters = [];
  }

  private rejectReadyWaiters(error: Error): void {
    for (const waiter of this.readyWaiters) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    this.readyWaiters = [];
  }
}
