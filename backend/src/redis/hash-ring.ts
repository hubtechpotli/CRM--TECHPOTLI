import * as crypto from 'crypto';

export class ConsistentHashRing {
  private readonly ring: { hash: number; node: string }[] = [];
  private readonly replicas: number;

  constructor(nodes: string[], replicas = 128) {
    this.replicas = replicas;
    for (const node of nodes) {
      for (let i = 0; i < replicas; i++) {
        const hash = this.hash(`${node}:${i}`);
        this.ring.push({ hash, node });
      }
    }
    this.ring.sort((a, b) => a.hash - b.hash);
  }

  private hash(key: string): number {
    const digest = crypto.createHash('md5').update(key).digest();
    return digest.readUInt32BE(0);
  }

  getNode(key: string): string {
    if (!this.ring.length) return 'default';
    const h = this.hash(key);
    for (const entry of this.ring) {
      if (entry.hash >= h) return entry.node;
    }
    return this.ring[0].node;
  }

  shardKey(key: string): string {
    return `${this.getNode(key)}:${key}`;
  }
}
