// Stub
class S3Client { constructor() {} async send() { throw new Error('S3 stub'); } }
class PutObjectCommand { constructor(i){this.input=i;} }
class GetObjectCommand { constructor(i){this.input=i;} }
class DeleteObjectCommand { constructor(i){this.input=i;} }
class HeadObjectCommand { constructor(i){this.input=i;} }
exports.S3Client = S3Client;
exports.PutObjectCommand = PutObjectCommand;
exports.GetObjectCommand = GetObjectCommand;
exports.DeleteObjectCommand = DeleteObjectCommand;
exports.HeadObjectCommand = HeadObjectCommand;
