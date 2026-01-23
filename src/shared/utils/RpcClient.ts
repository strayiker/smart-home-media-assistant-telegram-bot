export interface RpcRequest<T> {
  method: string;
  arguments?: T;
  tag?: number;
}

export interface RpcResponse<R> {
  result: string;
  arguments: R;
  tag?: number;
}

export class RpcClient {
  private sessionId?: string | undefined;

  constructor(
    private url: string,
    private username?: string,
    private password?: string,
  ) {
    this.username = username ?? undefined;
    this.password = password ?? undefined;
  }

  async sendRequest<T, R>(request: RpcRequest<T>): Promise<RpcResponse<R>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.sessionId) {
      headers['X-Transmission-Session-Id'] = this.sessionId;
    }

    if (this.username && this.password) {
      const auth = btoa(`${this.username}:${this.password}`);
      headers['Authorization'] = `Basic ${auth}`;
    }

    const response = await fetch(this.url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(request),
    });

    if (response.status === 409) {
      this.sessionId =
        response.headers.get('X-Transmission-Session-Id') ?? undefined;
      return this.sendRequest(request);
    }

    if (!response.ok) {
      throw new Error(`RPC request failed with status ${response.status}`);
    }

    return response.json();
  }
}
