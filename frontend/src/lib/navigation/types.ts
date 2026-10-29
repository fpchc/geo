export interface NavDefinition {
  id: string;
  labelKey: string;
  path?: string;
  icon?: string;
  permission?: string;
  children?: NavDefinition[];
}

export interface MenuNode {
  id: string;
  label: string;
  path?: string;
  icon?: string;
  children?: MenuNode[];
}
