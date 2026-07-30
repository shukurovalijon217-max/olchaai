// Stub
function sharp() {
  const ops = { resize: () => ops, jpeg: () => ops, png: () => ops, webp: () => ops, toBuffer: async () => Buffer.alloc(0), toFile: async () => {} };
  return ops;
}
sharp.cache = () => {};
module.exports = sharp;
