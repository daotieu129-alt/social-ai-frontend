// src/hooks/useMediaAssets.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mediaApi } from "../api/media";

export function useMediaAssets(topicId) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const pollRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!topicId) {
      setAssets([]);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const data = await mediaApi.listAssets(topicId);
      setAssets(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || "Failed to load assets");
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    refresh();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [refresh]);

  const startShortPolling = useCallback((seconds = 25, intervalMs = 2500) => {
    if (pollRef.current) clearInterval(pollRef.current);
    const startedAt = Date.now();
    pollRef.current = setInterval(async () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      await refresh();
      if (elapsed >= seconds) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, intervalMs);
  }, [refresh]);

  const upload = useCallback(
    async (file) => {
      if (!topicId) throw new Error("Select a topic first");
      const created = await mediaApi.uploadAsset(topicId, file);
      // cutout tạo async -> poll để thấy asset mới
      startShortPolling(30, 2500);
      return created;
    },
    [topicId, startShortPolling]
  );

  const updateAsset = useCallback(
    async (assetId, payload) => {
      const updated = await mediaApi.updateAsset(assetId, payload);
      await refresh();
      return updated;
    },
    [refresh]
  );

  const deleteAsset = useCallback(
    async (assetId) => {
      const deleted = await mediaApi.deleteAsset(assetId);
      await refresh();
      return deleted;
    },
    [refresh]
  );

  return useMemo(
    () => ({
      assets,
      loading,
      err,
      refresh,
      upload,
      updateAsset,
      deleteAsset,
      startShortPolling,
    }),
    [assets, loading, err, refresh, upload, updateAsset, deleteAsset, startShortPolling]
  );
}
