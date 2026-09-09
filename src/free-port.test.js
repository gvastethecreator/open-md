import { describe, expect, it } from 'vitest';
import net from 'node:net';
import { canBindPort, freePort, killPids } from '../scripts/free-port.mjs';

describe('free-port utility', () => {
  it('detects when a port is bound and in use', async () => {
    const server = net.createServer();

    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const testPort = server.address().port;

    try {
      const isFree = await canBindPort(testPort);
      expect(isFree).toBe(false);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }

    const isFreeAfterClose = await canBindPort(testPort);
    expect(isFreeAfterClose).toBe(true);
    const result = await freePort(testPort, { verbose: false });
    expect(result.freed).toBe(false);
    expect(result.pids).toEqual([]);
  });

  it('ignores current process PID and invalid PIDs during kill', () => {
    expect(() => {
      killPids([0, process.pid, -1]);
    }).not.toThrow();
  });

});
