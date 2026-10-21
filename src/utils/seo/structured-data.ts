/**
 * @fileoverview JSON-LD structured data helpers.
 *
 * Structured data lets search engines understand the site as entities
 * (Organization, WebSite) rather than just text — improving rich results.
 * Render the output inside a `<script type="application/ld+json">` tag.
 */

import { siteConfig } from "@/lib/site";

/**
 * Organization + WebSite schema for the site root. Emit once, in the root
 * layout. The two nodes are linked by `@id` so crawlers treat them as related.
 */
export function getSiteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        url: siteConfig.url,
        logo: `${siteConfig.url}/android-icon-512x512.png`,
        email: siteConfig.email,
        description: siteConfig.description,
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        name: siteConfig.name,
        description: siteConfig.description,
        url: siteConfig.url,
        publisher: { "@id": `${siteConfig.url}/#organization` },
      },
    ],
  };
}

export interface ProductStructuredDataInput {
  name: string;
  description: string;
  /** Price as a plain number string, e.g. "549". */
  price: string;
  currency: string;
  colours: string[];
}

/**
 * Product schema for a product page — a pre-order offer from the site's
 * organization. Emit it on the page that sells the product.
 */
export function getProductStructuredData(product: ProductStructuredDataInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${siteConfig.url}/#product`,
    name: product.name,
    description: product.description,
    image: `${siteConfig.url}${siteConfig.ogImage}`,
    color: product.colours.join(", "),
    brand: { "@type": "Brand", name: siteConfig.name },
    offers: {
      "@type": "Offer",
      url: `${siteConfig.url}/#buy`,
      price: product.price,
      priceCurrency: product.currency,
      availability: "https://schema.org/PreOrder",
      seller: { "@id": `${siteConfig.url}/#organization` },
    },
  };
}
