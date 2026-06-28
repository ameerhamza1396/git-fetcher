export interface ReferenceChunk {
    book: string;
    page: number;
    content?: string;
    score: number;
    show_extracted_text?: boolean;
    showExtractedText?: boolean;
}

export interface ReferenceResponse {
    results: ReferenceChunk[];
    total_vectors: number;
}

export interface ReferenceRequest {
    query: string;
    top_k?: number;
}
