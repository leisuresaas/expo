/**
 * @deprecated Use click_url from GET /ads/feed; the platform returns signed tracking URLs.
 */
export function buildAdClickUrl(clickBaseUrl: string, adId: string, productId?: string): string {
  const base = clickBaseUrl.replace(/\/$/, "");
  const id = adId.trim();
  if (!base || !id) {
    return "";
  }
  let url = `${base}/v1/ads/click/${encodeURIComponent(id)}`;
  const product = productId?.trim();
  if (product) {
    url += `?product_id=${encodeURIComponent(product)}`;
  }
  return url;
}
