import defaultComponents from "fumadocs-ui/mdx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMDXComponents(components: any): any {
  return {
    ...defaultComponents,
    ...components,
  };
}
