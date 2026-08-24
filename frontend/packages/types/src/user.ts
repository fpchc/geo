import type { BasicUserInfo } from '@frontend-core/typings';

/** 用户信息（对接 /api/v1/auth/me） */
interface UserInfo extends BasicUserInfo {
  /**
   * 用户ID
   */
  user_id: number;
  /**
   * 用户名
   */
  username: string;
  /**
   * 权限码列表
   */
  permissions: string[];
  /**
   * 角色列表（由前端 store 补充）
   */
  roles?: string[];
  /**
   * 首页地址
   */
  homePath?: string;
}

export type { UserInfo };
