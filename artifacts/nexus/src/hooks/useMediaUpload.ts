import { useState, useCallback } from "react";

const API = (import.meta.env.VITE_API_BASE_URL);

export interface UploadResult {
  objectPath: string;
  serveUrl: string;
  fileName: string;
  contentType: string;
}

interface UseMediaUploadOptions {
  onSuccess?: (result: UploadResult) => void;
  onError?: (err: Error) => void;
}

export function useMediaUpload(options: UseMediaUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const uploadFile = useCallback(async (file: File): Promise<UploadResult | null> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      setProgress(10);
      const urlRes = await fetch(`${API}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
        }),
      });

      if (!urlRes.ok) {
        let errMsg = "Yuklash sozlanmagan";
        try {
          const body = await urlRes.json();
          errMsg = body.error ?? errMsg;
        } catch {}
        throw new Error(errMsg);
      }
      const { uploadURL, objectPath } = await urlRes.json();
      setProgress(30);

      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        // No credentials — upload URL is authenticated via presigned token (R2) or HMAC proxy token.
        // Sending credentials to a cross-origin R2 URL causes a CORS error.
        credentials: "omit",
        body: file,
      });
      if (!putRes.ok) {
        let errMsg = "Fayl yuklanmadi";
        try {
          const body = await putRes.json();
          errMsg = body.error ?? errMsg;
        } catch {}
        throw new Error(errMsg);
      }
      setProgress(100);

      let finalObjectPath = objectPath;
      let serveUrl = objectPath.startsWith("http") ? objectPath : `${API}/api/storage${objectPath}`;
      try {
        const putBody = await putRes.clone().json();
        if (putBody?.url && typeof putBody.url === "string") {
          serveUrl = putBody.url;
        }
        if (putBody?.objectPath && typeof putBody.objectPath === "string") {
          finalObjectPath = putBody.objectPath;
          serveUrl = putBody.url ?? putBody.objectPath;
        }
      } catch {}

      const result: UploadResult = {
        objectPath: finalObjectPath,
        serveUrl,
        fileName: file.name,
        contentType: file.type,
      };
      options.onSuccess?.(result);
      return result;
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Yuklashda xato");
      setError(err);
      options.onError?.(err);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const deleteFile = useCallback(async (objectPath: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API}/api/storage/objects/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ objectPath }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  return { uploadFile, deleteFile, isUploading, progress, error };
}
