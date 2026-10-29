-- 本文件由 scripts/gen_user_sql.py 自动生成，请勿手动修改。
-- 数据源：scripts/user_seed.py（菜单绑定派生自 scripts/menu_seed.py）
-- 幂等导入：先删除同 ID 记录及其关联再插入。
-- 注意：密码为 bcrypt 哈希，每次生成值不同；admin 明文密码为 admin123456。

SET NAMES utf8mb4;

-- 先清理关联，避免外键悬挂
DELETE FROM `user_role` WHERE `user_id` IN (1, 2, 3, 4, 5, 6, 7, 8);
DELETE FROM `role_menu` WHERE `role_id` IN (1, 2, 3, 4);
DELETE FROM `users` WHERE `id` IN (1, 2, 3, 4, 5, 6, 7, 8);
DELETE FROM `roles` WHERE `id` IN (1, 2, 3, 4);

INSERT INTO `roles` (`id`, `code`, `name`, `description`) VALUES
  (1, 'super_admin', '超级管理员', '系统最高权限，拥有全部菜单与操作。'),
  (2, 'system_admin', '系统管理员', '负责用户、角色、菜单等系统管理。'),
  (3, 'content_ops', '内容运营', '负责内容创作、评分优化、关键词命中等内容生产。'),
  (4, 'content_viewer', '内容访客', '仅可查看内容库与关键词命中记录（只读）。');

INSERT INTO `users` (`id`, `username`, `hashed_password`, `nickname`, `email`, `phone`, `is_active`, `is_superuser`) VALUES
  (1, 'admin', '$2b$12$qqlvwO7YEM0yI2ph5zy4Qe00SmBm40qpPjcisFHla6WP910bfYcXq', '超级管理员', 'admin@example.com', '13800000000', 1, 1),
  (2, 'sysadmin', '$2b$12$Pz7B9kD9Brs44eYTCgjUDuB6DjgU0wKaxPlVoP0.aPjoiPF5T.T.u', '系统管理员', 'sysadmin@example.com', '13800000001', 1, 0),
  (3, 'content_lead', '$2b$12$haoXSs7cS0.Gr.TgV2lGWOMRbBBxEPqf9byxP9WZFCE0Eq.9GsG66', '内容负责人', 'content.lead@example.com', '13800000002', 1, 0),
  (4, 'editor01', '$2b$12$6.agsm8zFwgqpH7uJHynn.9KnHOiLVokTHTlEzLo7Yy0Ipkd2n8ti', '内容编辑一', 'editor01@example.com', '13800000003', 1, 0),
  (5, 'editor02', '$2b$12$Gt.xaaM4Ub17sJJ4jbLU1.gUqaBV0BowwjWJYZacMJuhJNse2vkFu', '内容编辑二', 'editor02@example.com', '13800000004', 1, 0),
  (6, 'viewer01', '$2b$12$YNgekmCHjjh0jocBku8tmuf90SQhrXDvDb2t3n43/R8b4xAG/b0DK', '内容访客一', 'viewer01@example.com', '13800000005', 1, 0),
  (7, 'viewer02', '$2b$12$WTtC8JshboAS1ebUULTkvOdq131DDE9M2.nK/SGrRb59iL34DW2ze', '内容访客二', 'viewer02@example.com', '13800000006', 1, 0),
  (8, 'disabled_user', '$2b$12$LeZI71p26m7.mwWV0jwYgOn6xoXOKkQbK82frTG/IC3v4eL1I75sq', '停用示例账户', 'disabled@example.com', '13800000007', 0, 0);

INSERT INTO `role_menu` (`role_id`, `menu_id`) VALUES
  (1, 1),
  (1, 2),
  (1, 5),
  (1, 6),
  (1, 7),
  (1, 8),
  (1, 11),
  (1, 12),
  (1, 13),
  (1, 100),
  (1, 101),
  (1, 102),
  (1, 103),
  (1, 104),
  (1, 105),
  (1, 110),
  (1, 111),
  (1, 112),
  (1, 113),
  (1, 114),
  (1, 120),
  (1, 121),
  (1, 122),
  (1, 123),
  (1, 200),
  (1, 201),
  (1, 202),
  (1, 203),
  (1, 204),
  (1, 210),
  (1, 211),
  (1, 212),
  (1, 220),
  (1, 221),
  (1, 800),
  (2, 1),
  (2, 5),
  (2, 6),
  (2, 7),
  (2, 8),
  (2, 100),
  (2, 101),
  (2, 102),
  (2, 103),
  (2, 104),
  (2, 105),
  (2, 110),
  (2, 111),
  (2, 112),
  (2, 113),
  (2, 114),
  (2, 120),
  (2, 121),
  (2, 122),
  (2, 123),
  (2, 800),
  (3, 2),
  (3, 8),
  (3, 11),
  (3, 12),
  (3, 13),
  (3, 200),
  (3, 201),
  (3, 202),
  (3, 203),
  (3, 204),
  (3, 210),
  (3, 211),
  (3, 212),
  (3, 220),
  (3, 221),
  (3, 800),
  (4, 2),
  (4, 8),
  (4, 12),
  (4, 210),
  (4, 212),
  (4, 800);

INSERT INTO `user_role` (`user_id`, `role_id`) VALUES
  (1, 1),
  (2, 2),
  (3, 3),
  (4, 3),
  (5, 3),
  (6, 4),
  (7, 4),
  (8, 4);
