import { useState, useCallback } from "react";

const API = (import.meta.env.VITE_API_BASE_URL || "");

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
      setProgress(90);

      // After the presigned PUT, ask the server to copy-in-place with
      // Cache-Control headers so Cloudflare edge-caches the object.
      // This is fire-and-forget: a failure here is non-fatal.
      if (uploadURL && objectPath && objectPath.startsWith("http")) {
        fetch(`${API}/api/storage/uploads/finalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ publicUrl: objectPath }),
        }).catch(() => {/* non-fatal — CDN header will be missing for this upload only */});
      }

      setProgress(100);

      // objectPath is a full CDN URL when R2 is active — never double-prefix it
      let serveUrl = objectPath.startsWith("http") ? objectPath : `${API}/api/storage${objectPath}`;
      try {
        const putBody = await putRes.clone().json();
        if (putBody?.url && typeof putBody.url === "string") {
          serveUrl = putBody.url;
        }
      } catch {}

      const result: UploadResult = {
        objectPath,
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
