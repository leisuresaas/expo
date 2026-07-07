/**
 * @deprecated Use click_url from GET /ads/feed; the platform returns signed tracking URLs.
 */
export function buildAdClickUrl(clickBaseUrl: string, adId: string, productId?: string): string {
  const base = clickBaseUrl.replace(/\/$/, "");
  const id = adId.trim();
  if (!base || !id) {
    return "";
  }
  let url = `${base}/api/v1/integration/ads/click/${encodeURIComponent(id)}`;
  const product = productId?.trim();
  if (product) {
    url += `?product_id=${encodeURIComponent(product)}`;
  }
  return url;
}
