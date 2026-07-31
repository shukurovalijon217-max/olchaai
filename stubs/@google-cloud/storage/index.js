'use strict';
class GCSFile {
  save() { return Promise.resolve(); }
  exists() { return Promise.resolve([false]); }
  getMetadata() { return Promise.resolve([{}]); }
  delete() { return Promise.resolve(); }
  createReadStream() {
    const { Readable } = require('stream');
    return new Readable({ read() { this.push(null); } });
  }
  createWriteStream() {
    const { Writable } = require('stream');
    return new Writable({ write(_c, _e, cb) { cb(); } });
  }
}
class GCSBucket {
  file() { return new GCSFile(); }
  getFiles() { return Promise.resolve([[]]); }
}
class Storage {
  bucket() { return new GCSBucket(); }
}
module.exports = { Storage };
