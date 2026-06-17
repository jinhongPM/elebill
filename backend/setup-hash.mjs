// 首次部署初始化脚本：生成 admin 密码哈希并写入 D1
// 使用方式: npx wrangler d1 execute elevator_cost_db --command="$(node setup-hash.js admin123)"

import crypto from "crypto";

const password = process.argv[2] || "admin123";
const salt = crypto.randomBytes(16);
const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
const stored = `${salt.toString("hex")}:${hash.toString("hex")}`;

const sql = `INSERT OR REPLACE INTO users (username, password_hash, role) VALUES ('admin', '${stored}', 'admin');`;
console.log(sql);
