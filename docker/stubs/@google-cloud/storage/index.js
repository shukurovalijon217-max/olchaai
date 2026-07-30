// Stub — real GCS client o'rniga (Railway container da runtime stub)
class Storage {
  constructor() {}
  bucket() { return { file: () => ({ save: async () => {}, createWriteStream: () => { const s = require('stream').PassThrough(); setTimeout(()=>s.destroy(new Error('GCS stub')),0); return s; }, getSignedUrl: async () => [''], exists: async () => [false], delete: async () => {} }) }; }
}
exports.Storage = Storage;
