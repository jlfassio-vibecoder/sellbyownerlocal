import type { APIRoute } from 'astro';
import { createElement, type ReactElement } from 'react';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import StorefrontCatalogPDF from '../../../../components/pdf/StorefrontCatalogPDF';
import { resolveSellerByStorefrontParam } from '../../../../lib/buyer-profile';
import { getActiveApparelForSeller } from '../../../../lib/clothing-api';
import { toAllowedCatalogImageUrl } from '../../../../lib/storage-url';
import { sortFeaturedFirst } from '../../../../lib/apparel';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug?.trim();
  if (!slug) {
    return new Response(JSON.stringify({ error: 'Missing storefront slug' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const seller = await resolveSellerByStorefrontParam(slug);
    if (!seller) {
      return new Response(JSON.stringify({ error: 'Storefront not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const listings = await getActiveApparelForSeller(seller.id);

    const storefrontName =
      seller.storefrontName?.trim() || seller.displayName?.trim() || 'Storefront';
    const tagline = seller.storefrontTagline?.trim() || undefined;
    const heroImageUrl = toAllowedCatalogImageUrl(seller.storefrontHeroUrl);

    const items = sortFeaturedFirst(listings).map((listing) => {
      return {
        id: listing.id,
        title: listing.title,
        brand: listing.brand,
        price: listing.price,
        salePrice: listing.salePrice,
        isSale: listing.isSale,
        isFeatured: listing.isFeatured,
        primaryImageUrl: toAllowedCatalogImageUrl(listing.galleryPhotos[0]),
        sizes: listing.sizes.length > 0 ? listing.sizes : undefined,
      };
    });

    const document = createElement(StorefrontCatalogPDF, {
      storefrontName,
      tagline,
      heroImageUrl,
      items,
    }) as unknown as ReactElement<DocumentProps>;

    const buffer = await renderToBuffer(document);

    // Pass Buffer without copying; cast satisfies BodyInit typing under DOM lib.
    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="catalog.pdf"',
      },
    });
  } catch (error) {
    console.error(`GET /api/storefront/${slug}/catalog.pdf failed`, error);
    return new Response(JSON.stringify({ error: 'Failed to generate catalog PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
