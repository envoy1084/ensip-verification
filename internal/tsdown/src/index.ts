import { defineConfig, mergeConfig, type UserConfig } from "tsdown";

const defaultConfig = defineConfig({
  clean: true,
  dts: {
    enabled: true,
    sourcemap: true,
  },
  failOnWarn: true,
  fixedExtension: true,
  format: ["esm"],
  hash: false,
  nodeProtocol: true,
  outDir: "dist",
  platform: "node",
  sourcemap: true,
  target: ["es2022"],
  unbundle: true,
  treeshake: true,
});

export type TsdownConfigOverrides = Omit<UserConfig, "format"> & {
  format?: never;
};

export const createTsdownConfig = (overrides: TsdownConfigOverrides = {}) => {
  return mergeConfig(defaultConfig, overrides);
};

export { defaultConfig as baseTsdownConfig };
