'use strict';
// No-op stub for @upstash/redis — only used when UPSTASH_REDIS_REST_URL is set.
// Without credentials, the real cache.ts always falls back to in-memory mode,
// so this class is never instantiated.
class Redis {
  constructor() {}
  async get() { return null; }
  async set() { return 'OK'; }
  async del() { return 0; }
  async expire() { return 0; }
  async exists() { return 0; }
  async incr() { return 0; }
  async hget() { return null; }
  async hset() { return 0; }
  async hgetall() { return null; }
  async lrange() { return []; }
  async lpush() { return 0; }
  async sadd() { return 0; }
  async smembers() { return []; }
  pipeline() { return this; }
  exec() { return Promise.resolve([]); }
}
class HttpClient { constructor() {} }
const VERSION = '0.0.1';
module.exports = { Redis, HttpClient, VERSION };
