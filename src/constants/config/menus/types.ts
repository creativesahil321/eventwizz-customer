export interface MenuItemProps {
  id: number | string;
  title: string;
  icon: string;
  href?: string;
  url: string;
  model?: string;
  menu?: MenuItemProps[];
  permissions?: string;
  type?: string;
  isChild?: boolean;
  className?: string;
}
