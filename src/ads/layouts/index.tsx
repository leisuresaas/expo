import type { ReactElement } from "react";

import { isImageLayout, isTextLayout } from "../constants";
import type { AdCreativeStyles, AdLayoutRenderContext } from "../theme";
import { renderImageLayout, type AdLayoutRendererProps } from "./image";
import { renderTextLayout } from "./text";

export type { AdLayoutRendererProps };

export function renderLayoutByKey(props: AdLayoutRendererProps): ReactElement {
  const { ctx } = props;
  const layout = ctx.layout;

  if (ctx.adType === "image" && isImageLayout(layout)) {
    return renderImageLayout(layout, props);
  }
  if (ctx.adType === "text" && isTextLayout(layout)) {
    return renderTextLayout(layout, props);
  }

  if (ctx.adType === "image") {
    return renderImageLayout("image_hero", props);
  }
  return renderTextLayout("text_inline", props);
}

export { renderTextLayout } from "./text";
export { renderImageLayout } from "./image";
