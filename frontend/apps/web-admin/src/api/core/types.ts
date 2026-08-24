// ========== 通用响应 ==========
export interface BizResponse<T> {
  code: number;
  message: string;
  data: null | T;
}

// ========== 分页 ==========
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  sort_by?: null | string;
  sort_order?: 'asc' | 'desc';
}

// ========== Auth ==========
export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface CurrentUserInfo {
  user_id: number;
  username: string;
  permissions: string[];
}

// ========== User ==========
export interface UserOut {
  id: number;
  username: string;
  nickname: null | string;
  email: null | string;
  phone: null | string;
  is_active: boolean;
  is_superuser: boolean;
  role_ids: number[];
}

export interface UserCreate {
  username: string;
  password: string;
  nickname?: null | string;
  email?: null | string;
  phone?: null | string;
  is_active?: boolean;
  is_superuser?: boolean;
  role_ids?: number[];
}

export interface UserUpdate {
  nickname?: null | string;
  email?: null | string;
  phone?: null | string;
  is_active?: boolean | null;
  is_superuser?: boolean | null;
}

export interface UserListParams extends PaginationParams {
  username?: string;
  is_active?: boolean;
}

export interface ResetPasswordRequest {
  new_password: string;
}

export interface AssignRolesRequest {
  role_ids: number[];
}

// ========== Role ==========
export interface RoleOut {
  id: number;
  code: string;
  name: string;
  description: null | string;
  menu_ids: number[];
}

export interface RoleCreate {
  code: string;
  name: string;
  description?: null | string;
  menu_ids?: number[];
}

export interface RoleUpdate {
  name?: null | string;
  description?: null | string;
}

export interface RoleListParams extends PaginationParams {
  code?: string;
  name?: string;
}

export interface AssignMenusRequest {
  menu_ids: number[];
}

// ========== Menu ==========
export interface MenuOut {
  id: number;
  name: string;
  type: number; // 0=目录 1=菜单 2=按钮
  parent_id: number;
  ancestors: string;
  path: string;
  icon: null | string;
  perm_code: null | string;
  order_no: number;
  visible: boolean;
}

export interface MenuCreate {
  name: string;
  type?: number;
  parent_id?: number;
  path?: string;
  icon?: null | string;
  perm_code?: null | string;
  order_no?: number;
  visible?: boolean;
}

export interface MenuUpdate {
  name?: null | string;
  type?: null | number;
  parent_id?: null | number;
  path?: null | string;
  icon?: null | string;
  perm_code?: null | string;
  order_no?: null | number;
  visible?: boolean | null;
}
