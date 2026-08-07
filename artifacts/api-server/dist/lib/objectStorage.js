import { Storage } from "@google-cloud/storage";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import { ObjectPermission, canAccessObject, getObjectAclPolicy, setObjectAclPolicy, } from "./objectAcl";
const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
export const objectStorageClient = new Storage({
    credentials: {
        audience: "replit",
        subject_token_type: "access_token",
        token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
        type: "external_account",
        credential_source: {
            url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
            format: {
                type: "json",
                subject_token_field_name: "access_token",
            },
        },
        universe_domain: "googleapis.com",
    },
    projectId: "",
});
export class ObjectNotFoundError extends Error {
    constructor() {
        super("Object not found");
        this.name = "ObjectNotFoundError";
        Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
    }
}
export class ObjectStorageService {
    constructor() { }
    getPublicObjectSearchPaths() {
        const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
        const paths = Array.from(new Set(pathsStr
            .split(",")
            .map((path) => path.trim())
            .filter((path) => path.length > 0)));
        if (paths.length === 0) {
            throw new Error("PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
                "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths).");
        }
        return paths;
    }
    getPrivateObjectDir() {
        const dir = process.env.PRIVATE_OBJECT_DIR || "";
        if (!dir) {
            throw new Error("PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
                "tool and set PRIVATE_OBJECT_DIR env var.");
        }
        return dir;
    }
    async searchPublicObject(filePath) {
        for (const searchPath of this.getPublicObjectSearchPaths()) {
            const fullPath = `${searchPath}/${filePath}`;
            const { bucketName, objectName } = parseObjectPath(fullPath);
            const bucket = objectStorageClient.bucket(bucketName);
            const file = bucket.file(objectName);
            const [exists] = await file.exists();
            if (exists) {
                return file;
            }
        }
        return null;
    }
    async downloadObject(file, options) {
        /* Backwards-compatible: old callers may pass cacheTtlSec as a plain number */
        const cacheTtlSec = typeof options === "number" ? options : (options?.cacheTtlSec ?? 3600);
        const range = typeof options === "number" ? undefined : options?.range;
        let metadata;
        try {
            const result = await file.getMetadata();
            metadata = result[0];
        }
        catch (err) {
            const code = err?.code;
            if (code === 404)
                throw new ObjectNotFoundError();
            throw err;
        }
        const aclPolicy = await getObjectAclPolicy(file, metadata);
        const isPublic = aclPolicy?.visibility === "public";
        const totalSize = metadata.size ? Number(metadata.size) : undefined;
        const streamOptions = {};
        if (range) {
            streamOptions.start = range.start;
            if (range.end !== undefined)
                streamOptions.end = range.end;
        }
        const nodeStream = file.createReadStream(streamOptions);
        const webStream = Readable.toWeb(nodeStream);
        const headers = {
            "Content-Type": metadata.contentType || "application/octet-stream",
            "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
            "Accept-Ranges": "bytes",
        };
        if (range && totalSize !== undefined) {
            const start = range.start;
            const end = range.end ?? totalSize - 1;
            headers["Content-Range"] = `bytes ${start}-${end}/${totalSize}`;
            headers["Content-Length"] = String(end - start + 1);
            return new Response(webStream, { status: 206, headers });
        }
        if (totalSize !== undefined) {
            headers["Content-Length"] = String(totalSize);
        }
        return new Response(webStream, { headers });
    }
    async getObjectEntityUploadURL() {
        const privateObjectDir = this.getPrivateObjectDir();
        if (!privateObjectDir) {
            throw new Error("PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
                "tool and set PRIVATE_OBJECT_DIR env var.");
        }
        const objectId = randomUUID();
        const fullPath = `${privateObjectDir}/uploads/${objectId}`;
        const { bucketName, objectName } = parseObjectPath(fullPath);
        return signObjectURL({
            bucketName,
            objectName,
            method: "PUT",
            ttlSec: 900,
        });
    }
    async getObjectEntityFile(objectPath) {
        if (!objectPath.startsWith("/objects/")) {
            throw new ObjectNotFoundError();
        }
        const parts = objectPath.slice(1).split("/");
        if (parts.length < 2) {
            throw new ObjectNotFoundError();
        }
        const entityId = parts.slice(1).join("/");
        let entityDir = this.getPrivateObjectDir();
        if (!entityDir.endsWith("/")) {
            entityDir = `${entityDir}/`;
        }
        const objectEntityPath = `${entityDir}${entityId}`;
        const { bucketName, objectName } = parseObjectPath(objectEntityPath);
        const bucket = objectStorageClient.bucket(bucketName);
        /* No existence round-trip here — downloadObject()'s getMetadata() call
           both confirms existence and fetches the data we need in one request. */
        return bucket.file(objectName);
    }
    normalizeObjectEntityPath(rawPath) {
        if (!rawPath.startsWith("https://storage.googleapis.com/")) {
            return rawPath;
        }
        const url = new URL(rawPath);
        const rawObjectPath = url.pathname;
        let objectEntityDir = this.getPrivateObjectDir();
        if (!objectEntityDir.endsWith("/")) {
            objectEntityDir = `${objectEntityDir}/`;
        }
        if (!rawObjectPath.startsWith(objectEntityDir)) {
            return rawObjectPath;
        }
        const entityId = rawObjectPath.slice(objectEntityDir.length);
        return `/objects/${entityId}`;
    }
    async deleteObjectEntity(objectPath) {
        const objectFile = await this.getObjectEntityFile(objectPath);
        await objectFile.delete();
    }
    /**
     * Overwrite an existing object entity's bytes in place (same path).
     * Used by the video optimizer to replace an uploaded file with a
     * compressed transcode without changing its objectPath/URL.
     */
    async overwriteObjectEntity(objectPath, buffer, contentType) {
        const objectFile = await this.getObjectEntityFile(objectPath);
        await objectFile.save(buffer, { contentType, resumable: false });
    }
    async trySetObjectEntityAclPolicy(rawPath, aclPolicy) {
        const normalizedPath = this.normalizeObjectEntityPath(rawPath);
        if (!normalizedPath.startsWith("/")) {
            return normalizedPath;
        }
        const objectFile = await this.getObjectEntityFile(normalizedPath);
        await setObjectAclPolicy(objectFile, aclPolicy);
        return normalizedPath;
    }
    async canAccessObjectEntity({ userId, objectFile, requestedPermission, }) {
        return canAccessObject({
            userId,
            objectFile,
            requestedPermission: requestedPermission ?? ObjectPermission.READ,
        });
    }
}
function parseObjectPath(path) {
    if (!path.startsWith("/")) {
        path = `/${path}`;
    }
    const pathParts = path.split("/");
    if (pathParts.length < 3) {
        throw new Error("Invalid path: must contain at least a bucket name");
    }
    const bucketName = pathParts[1];
    const objectName = pathParts.slice(2).join("/");
    return {
        bucketName,
        objectName,
    };
}
async function signObjectURL({ bucketName, objectName, method, ttlSec, }) {
    const request = {
        bucket_name: bucketName,
        object_name: objectName,
        method,
        expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    };
    const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
        throw new Error(`Failed to sign object URL, errorcode: ${response.status}, ` +
            `make sure you're running on Replit`);
    }
    const body = await response.json();
    const signedURL = body.signed_url;
    return signedURL;
}
