'use strict';
function sharp() {
  const chain = {
    resize() { return chain; },
    webp()   { return chain; },
    jpeg()   { return chain; },
    png()    { return chain; },
    toBuffer() { return Promise.resolve(Buffer.alloc(0)); },
    toFile()   { return Promise.resolve({ size: 0 }); },
  };
  return chain;
}
sharp.default = sharp;
module.exports = sharp;
