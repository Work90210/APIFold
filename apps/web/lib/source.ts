import { map } from "@/.map";
import { createMDXSource } from "fumadocs-mdx";
import { loader } from "fumadocs-core/source";

export const docs = loader({
  baseUrl: "/docs",
  rootDir: "docs",
  source: createMDXSource(map),
});

export const getPage = docs.getPage;
export const getPages = docs.getPages;
export const pageTree = docs.pageTree;
