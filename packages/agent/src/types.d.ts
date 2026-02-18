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
