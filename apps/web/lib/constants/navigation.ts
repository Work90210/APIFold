export interface NavItem {
  readonly title: string;
  readonly href: string;
  readonly exact: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { title: "Overview", href: "/dashboard", exact: true },
  { title: "Composites", href: "/dashboard/composites", exact: false },
  { title: "Marketplace", href: "/dashboard/marketplace", exact: false },
] as const;
