declare module 'ping' {
  interface PingResponse {
    alive: boolean;
    time: number | string;
    packetLoss: string;
    host: string;
    output: string;
    min: string;
    max: string;
    avg: string;
  }

  interface PingConfig {
    timeout?: number;
    min_reply?: number;
    extra?: string[];
  }

  export const promise: {
    probe: (host: string, config?: PingConfig) => Promise<PingResponse>;
  };
}

declare module 'oui' {
  function oui(mac: string): string | undefined;
  export default oui;
}

declare module 'net-snmp' {
  interface Varbind {
    oid: string | number[];
    type: number;
    value: any;
  }

  interface SessionOptions {
    timeout?: number;
    retries?: number;
    version?: number;
    port?: number;
  }

  interface Session {
    get(oids: string[], callback: (error: Error | null, varbinds: Varbind[]) => void): void;
    subtree(
      oid: string,
      feedCallback: (varbinds: Varbind[]) => void,
      doneCallback: (error: Error | null) => void
    ): void;
    close(): void;
  }

  export function createSession(target: string, community: string, options?: SessionOptions): Session;
  export function isVarbindError(varbind: Varbind): boolean;
  export const Version1: number;
  export const Version2c: number;
  export const Version3: number;
}
