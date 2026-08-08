/**
 * Zolttran Security — approval gates and input validation.
 */
import * as vscode from 'vscode';
import * as nodePath from 'path';

type ActionType = 'file-write' | 'network' | 'command' | 'build' | 'deploy' | 'chat';

class Security {
  async requestApproval(
    _context: vscode.ExtensionContext,
    action: ActionType,
    detail?: string,
  ): Promise<boolean> {
    const mode = vscode.workspace
      .getConfiguration('zolttran')
      .get<'auto' | 'ask' | 'never'>('autoApprove', 'ask');

    if (mode === 'auto') return true;
    if (mode === 'never') {
      if (action !== 'chat') {
        vscode.window.showWarningMessage(`Zolttran: İşlem engellendi (autoApprove=never): ${action}`);
        return false;
      }
      return true;
    }

    // 'ask' — only ask for high-risk actions
    const highRisk: ActionType[] = ['build', 'deploy', 'command'];
    if (!highRisk.includes(action)) return true;

    const label = this.label(action);
    const truncated = detail ? (detail.length > 80 ? detail.slice(0, 80) + '…' : detail) : '';
    const answer = await vscode.window.showInformationMessage(
      `Zolttran: ${label} izni?${truncated ? `\n${truncated}` : ''}`,
      { modal: false },
      'İzin Ver',
      'Reddet',
    );
    return answer === 'İzin Ver';
  }

  sanitizePath(filePath: string, workspacePath: string): string | null {
    if (!workspacePath) return null;
    const resolved = nodePath.resolve(workspacePath, filePath);
    if (!resolved.startsWith(workspacePath)) return null;
    return resolved;
  }

  validateApiKey(key: string): boolean {
    return key.length >= 8 && !/[<>&;'"\\]/.test(key);
  }

  private label(action: ActionType): string {
    const map: Record<ActionType, string> = {
      'file-write': 'Dosya yazma',
      'network': 'Ağ isteği',
      'command': 'Komut çalıştırma',
      'build': 'Platform build',
      'deploy': 'Deploy',
      'chat': 'Sohbet',
    };
    return map[action];
  }
}

export const security = new Security();
