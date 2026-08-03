"use client";

import { useCallback, useEffect, useState } from "react";
import { normalizeCustomization } from "@/constants/customization";

export default function useProjectCustomization() {
  const [customization, setCustomization] = useState(() => normalizeCustomization());
  const [workspaceType, setWorkspaceType] = useState(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try {
      const response = await fetch("/api/workspace/customization");
      const result = await response.json();
      if (response.ok) {
        setCustomization(normalizeCustomization(result.data.customization));
        setWorkspaceType(result.data.workspaceType);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(reload, 0);
    return () => clearTimeout(timer);
  }, [reload]);
  return { customization, setCustomization, workspaceType, loading, reload };
}
