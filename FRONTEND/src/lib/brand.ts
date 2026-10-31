/**
 * Which visual theme this deployment shows. A school's own identity (name, motto, address)
 * always comes from its database record; the brand only decides colours and the wordmark.
 *
 *   oakland  - Oakland's own deployment, with "Powered by Eductive" in the footer (default)
 *   eductive - the Eductive demo deployment, which carries no Oakland branding
 *
 * Set NEXT_PUBLIC_BRAND at build time. The matching colours live in app/globals.css.
 */

export type BrandId = 'oakland' | 'eductive';

export const PRODUCT_NAME = 'Eductive';

export function getBrandId(): BrandId {
  return process.env.NEXT_PUBLIC_BRAND === 'eductive' ? 'eductive' : 'oakland';
}

export function isEductiveBrand(): boolean {
  return getBrandId() === 'eductive';
}
