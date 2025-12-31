// src/hooks/useMediaTopics.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { mediaApi } from "../api/media";

export function useMediaTopics(shopId) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const refresh = useCallback(async () => {
    if (!shopId) {
      setTopics([]);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const data = await mediaApi.listTopics(shopId);
      setTopics(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || "Failed to load topics");
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createTopic = useCallback(
    async (name) => {
      if (!shopId) throw new Error("Missing shopId");
      const payload = { shop_id: shopId, name };
      const created = await mediaApi.createTopic(payload);
      await refresh();
      return created;
    },
    [shopId, refresh]
  );

  const renameTopic = useCallback(
    async (id, name) => {
      const updated = await mediaApi.updateTopic(id, { name });
      await refresh();
      return updated;
    },
    [refresh]
  );

  const deleteTopic = useCallback(
    async (id) => {
      const deleted = await mediaApi.deleteTopic(id);
      await refresh();
      return deleted;
    },
    [refresh]
  );

  return useMemo(
    () => ({
      topics,
      loading,
      err,
      refresh,
      createTopic,
      renameTopic,
      deleteTopic,
    }),
    [topics, loading, err, refresh, createTopic, renameTopic, deleteTopic]
  );
}
