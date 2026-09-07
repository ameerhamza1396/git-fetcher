import { useState, useCallback } from "react";
import { ReferenceResponse } from "../types/reference";
import { aiApiJson } from "@/utils/aiApi";

export function useReferenceSearch() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<ReferenceResponse | null>(null);

    const search = useCallback(async (query: string, topK = 5) => {
        if (!query.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const result = await aiApiJson<ReferenceResponse>('reference', { query, top_k: topK }, {});
            setData(result);
            return result;
        } catch (err: any) {
            console.error("Reference search failed:", err);
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { search, loading, error, data, setData };
}
