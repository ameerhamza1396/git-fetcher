import { useState, useCallback } from "react";
import { ReferenceResponse } from "../types/reference";

export function useReferenceSearch() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<ReferenceResponse | null>(null);

    const search = useCallback(async (query: string, topK = 5) => {
        if (!query.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("https://medmacs.app/api/reference", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, top_k: topK }),
            });

            if (!res.ok) {
                let errorMsg = "Failed to fetch references";
                try {
                    const errText = await res.text();
                    const errData = JSON.parse(errText);
                    errorMsg = errData.error || errorMsg;
                } catch (e) {
                    errorMsg = `Server error: ${res.status}`;
                }
                throw new Error(errorMsg);
            }

            const result: ReferenceResponse = await res.json();
            setData(result);
        } catch (err: any) {
            console.error("Reference search failed:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    return { search, loading, error, data, setData };
}
