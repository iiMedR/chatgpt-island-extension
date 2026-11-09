import { spawn } from 'node:child_process';
import { join } from 'node:path';
import type { CredentialEncryption } from '@siwc/local';

// Secrets travel only over private stdin/stdout pipes, never argv or logs.
function protect(value: Uint8Array, decrypt: boolean): Promise<Buffer> {
  if (process.platform !== 'win32')
    return Promise.reject(new Error('Windows DPAPI required'));
  const operation = decrypt ? 'Unprotect' : 'Protect';
  const script = `Add-Type -AssemblyName System.Security; try { $bytes=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $result=[Security.Cryptography.ProtectedData]::${operation}($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($result)) } catch { exit 1 }`;
  return new Promise((resolve, reject) => {
    const child = spawn(
      join(
        process.env.SystemRoot ?? 'C:\\Windows',
        'System32',
        'WindowsPowerShell',
        'v1.0',
        'powershell.exe',
      ),
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] },
    );
    let output = '';
    const timer = setTimeout(() => child.kill(), 10000);
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8');
      if (output.length > 2_000_000) child.kill();
    });
    child.on('error', () => {
      clearTimeout(timer);
      reject(new Error('Credential protection unavailable'));
    });
    child.stdin.on('error', () => {});
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 || !output)
        reject(new Error('Credential protection failed'));
      else resolve(Buffer.from(output, 'base64'));
    });
    child.stdin.end(Buffer.from(value).toString('base64'));
  });
}
export const windowsCredentials: CredentialEncryption = {
  id: 'windows-dpapi-current-user-v1',
  isAvailable: () => process.platform === 'win32',
  encrypt: (text) => protect(Buffer.from(text, 'utf8'), false),
  decrypt: async (bytes) => (await protect(bytes, true)).toString('utf8'),
};
