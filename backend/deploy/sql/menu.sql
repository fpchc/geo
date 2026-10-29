-- 本文件由 scripts/gen_menu_sql.py 自动生成，请勿手动修改。
-- 数据源：scripts/menu_seed.py
-- 幂等导入：先删除同 ID 记录再插入。

SET NAMES utf8mb4;

DELETE FROM `menus` WHERE `id` IN (8, 800, 1, 5, 100, 101, 102, 103, 104, 105, 6, 110, 111, 112, 113, 114, 7, 120, 121, 122, 123, 2, 11, 200, 204, 201, 202, 203, 12, 210, 211, 212, 13, 220, 221);

INSERT INTO `menus` (`id`, `name`, `type`, `parent_id`, `ancestors`, `path`, `icon`, `perm_code`, `order_no`, `visible`) VALUES
  (8, '工作台', 1, 0, '0', '/dashboard', 'layout-dashboard', NULL, 0, 1),
  (800, '工作台查询', 2, 8, '0,8', '', NULL, 'content:dashboard:read', 1, 1),
  (1, '系统管理', 0, 0, '0', '/system', 'setting', NULL, 1, 1),
  (5, '用户管理', 1, 1, '0,1', '/system/users', NULL, 'system:user:list', 1, 1),
  (100, '用户查询', 2, 5, '0,1,5', '', NULL, 'system:user:query', 1, 1),
  (101, '用户新增', 2, 5, '0,1,5', '', NULL, 'system:user:create', 2, 1),
  (102, '用户修改', 2, 5, '0,1,5', '', NULL, 'system:user:update', 3, 1),
  (103, '用户删除', 2, 5, '0,1,5', '', NULL, 'system:user:delete', 4, 1),
  (104, '重置密码', 2, 5, '0,1,5', '', NULL, 'system:user:resetpwd', 5, 1),
  (105, '分配角色', 2, 5, '0,1,5', '', NULL, 'system:user:assign', 6, 1),
  (6, '角色管理', 1, 1, '0,1', '/system/roles', NULL, 'system:role:list', 2, 1),
  (110, '角色查询', 2, 6, '0,1,6', '', NULL, 'system:role:query', 1, 1),
  (111, '角色新增', 2, 6, '0,1,6', '', NULL, 'system:role:create', 2, 1),
  (112, '角色修改', 2, 6, '0,1,6', '', NULL, 'system:role:update', 3, 1),
  (113, '角色删除', 2, 6, '0,1,6', '', NULL, 'system:role:delete', 4, 1),
  (114, '分配权限', 2, 6, '0,1,6', '', NULL, 'system:role:assign', 5, 1),
  (7, '菜单管理', 1, 1, '0,1', '/system/menus', NULL, 'system:menu:list', 3, 1),
  (120, '菜单查询', 2, 7, '0,1,7', '', NULL, 'system:menu:query', 1, 1),
  (121, '菜单新增', 2, 7, '0,1,7', '', NULL, 'system:menu:create', 2, 1),
  (122, '菜单修改', 2, 7, '0,1,7', '', NULL, 'system:menu:update', 3, 1),
  (123, '菜单删除', 2, 7, '0,1,7', '', NULL, 'system:menu:delete', 4, 1),
  (2, '内容生产', 0, 0, '0', '/content', 'file-text', NULL, 2, 1),
  (11, '内容创作', 1, 2, '0,2', '/content/studio', NULL, 'content:content:list', 1, 1),
  (200, '智能体列表', 2, 11, '0,2,11', '', NULL, 'content:agent:list', 1, 1),
  (204, '智能体查询', 2, 11, '0,2,11', '', NULL, 'content:agent:query', 2, 1),
  (201, '上传资料', 2, 11, '0,2,11', '', NULL, 'content:material:create', 3, 1),
  (202, 'AI生成', 2, 11, '0,2,11', '', NULL, 'content:content:generate', 4, 1),
  (203, '关键词评审', 2, 11, '0,2,11', '', NULL, 'content:review:score', 5, 1),
  (12, '内容库', 1, 2, '0,2', '/content/library', NULL, 'content:content:list', 2, 1),
  (210, '内容查询', 2, 12, '0,2,12', '', NULL, 'content:content:query', 1, 1),
  (211, '确认留存', 2, 12, '0,2,12', '', NULL, 'content:content:create', 2, 1),
  (212, '评分查询', 2, 12, '0,2,12', '', NULL, 'content:review:query', 3, 1),
  (13, '内容配置', 1, 2, '0,2', '/content/settings', NULL, 'content:setting:query', 3, 1),
  (220, '配置查询', 2, 13, '0,2,13', '', NULL, 'content:setting:query', 1, 1),
  (221, '配置修改', 2, 13, '0,2,13', '', NULL, 'content:setting:update', 2, 1);
