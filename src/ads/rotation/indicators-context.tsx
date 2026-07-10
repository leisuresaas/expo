import { createContext, useContext } from "react";

import type { AdFeedItem } from "../../types";
import type { AdRotationStyles } from "../theme";

export type AdRotationIndicatorState = {
  ads: AdFeedItem[];
  index: number;
  onIndexChange: (index: number) => void;
  styles: AdRotationStyles;
};

const AdRotationIndicatorsContext = createContext<AdRotationIndicatorState | null>(null);

export function AdRotationIndicatorsProvider({
  value,
  children,
}: {
  value: AdRotationIndicatorState | null;
  children: React.ReactNode;
}) {
  return (
    <AdRotationIndicatorsContext.Provider value={value}>
      {children}
    </AdRotationIndicatorsContext.Provider>
  );
}

export function useAdRotationIndicators() {
  return useContext(AdRotationIndicatorsContext);
}
