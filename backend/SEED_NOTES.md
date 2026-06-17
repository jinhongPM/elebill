// 首次部署后，执行以下命令生成admin密码哈希并更新种子文件：
// wrangler d1 execute elevator_cost_db --command="INSERT OR REPLACE INTO users (username, password_hash, role) VALUES ('admin', '\$2b\$10\$...', 'admin');"
