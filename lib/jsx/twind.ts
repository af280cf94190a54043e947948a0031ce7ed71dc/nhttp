import {
  inline,
  type InlineOptions,
  install as installOri,
  type TwindConfig,
  TwindUserConfig,
} from "https://esm.sh/@twind/core@1.1.3";
import presetAutoprefix from "https://esm.sh/@twind/preset-autoprefix@1.0.7";
import presetTailwind from "https://esm.sh/@twind/preset-tailwind@1.1.4";
import { options } from "./render.ts";

export const install = (
  config: TwindConfig | TwindUserConfig = {},
  isProduction?: boolean,
) => {
  return installOri({
    presets: [presetAutoprefix(), presetTailwind()],
    ...config,
  } as TwindUserConfig, isProduction);
};
install();
export const useTwind = (
  opts?: InlineOptions,
) => {
  const hook = options.onRenderHtml;
  options.onRenderHtml = (html) => {
    return hook(inline(html, opts));
  };
};

export default useTwind;
