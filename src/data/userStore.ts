import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

const USERS_FILE = path.join(__dirname, 'users.json');

interface User {
  username: string;
  password: string;
  role: 'admin' | 'viewer';
  tenants: string[];
}

function loadUsers(): User[] {
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}

export function findUser(username: string): User | undefined {
  return loadUsers().find(user => user.username === username);
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
     const valid =  await bcrypt.compare(password, user.password);
     return valid;
}

export type { User };
