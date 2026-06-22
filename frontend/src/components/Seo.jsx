import { Helmet } from 'react-helmet-async';

const SITE = 'Cloud Fashion';
const DEFAULT_DESC = 'Premium fashion, curated for the modern wardrobe. Shop menswear, womenswear, kids, footwear & accessories.';

/**
 * Per-page SEO: title, description, and Open Graph / Twitter tags.
 */
export default function Seo({ title, description = DEFAULT_DESC, image, type = 'website' }) {
  const fullTitle = title ? `${title} — ${SITE}` : `${SITE} — Premium Fashion Store`;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={SITE} />
      {image && <meta property="og:image" content={image} />}

      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  );
}
