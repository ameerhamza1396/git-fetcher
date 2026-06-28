export const aiApiOrigin = (import.meta.env.VITE_AI_API_ORIGIN || 'https://ai.medmacs.app').replace(/\/$/, '');

export const aiApiUrl = (path: string) => `${aiApiOrigin}/api/${path.replace(/^\/+/, '')}`;
