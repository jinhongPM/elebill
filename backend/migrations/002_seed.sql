-- 预置管理员账号（密码: admin123）
INSERT OR IGNORE INTO users (username, password_hash, role)
VALUES ('admin', '$2b$10$dummyhash', 'admin');
-- 注意：以上hash占位，首次部署后需通过工具生成真实bcrypt hash后替换
