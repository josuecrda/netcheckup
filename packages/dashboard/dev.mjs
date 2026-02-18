import { createServer } from 'vite';

const server = await createServer({
  configFile: './vite.config.ts',
  server: { host: true },
});
await server.listen();
server.printUrls();
