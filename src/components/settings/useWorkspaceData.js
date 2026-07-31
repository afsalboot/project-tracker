"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function useWorkspaceData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const response = await fetch("/api/workspace", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.message);
      setLoading(false);
      return null;
    }
    setData(result.data);
    setLoading(false);
    return result.data;
  }, []);

  useEffect(() => {
    const timer = setTimeout(reload, 0);
    return () => clearTimeout(timer);
  }, [reload]);

  return { data, loading, reload };
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-20" />
      <div className="skeleton h-72" />
    </div>
  );
}
