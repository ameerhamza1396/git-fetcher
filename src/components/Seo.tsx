import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SeoProps {
  /** The title of the page */
  title?: string;
  /** The meta description for the page */
  description?: string;
  /** Canonical URL for the page (optional) */
  canonical?: string;
  /** Open Graph title for social sharing (defaults to title) */
  ogTitle?: string;
  /** Open Graph description for social sharing (defaults to description) */
  ogDescription?: string;
  /** Open Graph image URL for social sharing (optional) */
  ogImage?: string;
  /** Type of content for Open Graph (e.g., 'website', 'article') */
  ogType?: string;
  /** Twitter Card type (e.g., 'summary', 'summary_large_image') */
  twitterCard?: string;
  /** Twitter handle (e.g., '@medistics_app') */
  twitterCreator?: string;
}

const Seo: React.FC<SeoProps> = ({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = 'website', // Default to 'website'
  twitterCard = 'summary_large_image', // Default to 'summary_large_image'
  twitterCreator,
}) => {
  const defaultTitle = 'Medmacs - Your Ultimate Medical Education Platform'; // Default title for your application
  const defaultDescription = 'Medmacs is created by Dr Ameer Hamza.'; // Default description

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title ? `${title} | Medmacs` : defaultTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph / Facebook / LinkedIn Meta Tags */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={ogTitle || title || defaultTitle} />
      <meta property="og:description" content={ogDescription || description || defaultDescription} />
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* Twitter Meta Tags */}
      <meta name="twitter:card" content={twitterCard} />
      {twitterCreator && <meta name="twitter:creator" content={twitterCreator} />}
      <meta name="twitter:title" content={ogTitle || title || defaultTitle} />
      <meta name="twitter:description" content={ogDescription || description || defaultDescription} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </Helmet>
  );
};

export default Seo;