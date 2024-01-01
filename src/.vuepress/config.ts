import { defineUserConfig } from "vuepress";
import theme from "./theme.js";
export default defineUserConfig({
  base: "/",
  locales: {
    "/": {
      lang: "en-US",
      title: "Blog",
      description: "A blog",
    }
  },

  theme

  // Enable it with pwa
  // shouldPrefetch: false,
});
