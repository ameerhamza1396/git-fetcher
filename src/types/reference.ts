export interface ReferenceChunk {
    book: string;
    page: number;
    content: string;
    score: number;
}

export interface ReferenceResponse {
    results: ReferenceChunk[];
    total_vectors: number;
}

export interface ReferenceRequest {
    query: string;
    top_k?: number;
}
