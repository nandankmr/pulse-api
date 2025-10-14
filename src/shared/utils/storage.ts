import { mkdir } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';

export async function ensureDirectoryExists(path: string): Promise<void> {
  if (!existsSync(path)) {
    await mkdir(path, { recursive: true });
  }
}

export function ensureDirectoryExistsSync(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}
