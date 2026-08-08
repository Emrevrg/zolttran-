/**
 * OmniForge Logger — wraps VS Code OutputChannel with leveled logging.
 */
import type * as vscode from 'vscode';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

class Logger {
  private channel: vscode.OutputChannel | null = null;
  private minLevel: LogLevel = 'info';

  setChannel(ch: vscode.OutputChannel): void { this.channel = ch; }
  setLevel(level: LogLevel): void { this.minLevel = level; }

  debug(msg: string, ...args: unknown[]): void  { this.log('debug', msg, args); }
  info(msg: string, ...args: unknown[]): void   { this.log('info',  msg, args); }
  warn(msg: string, ...args: unknown[]): void   { this.log('warn',  msg, args); }
  error(msg: string, ...args: unknown[]): void  { this.log('error', msg, args); }

  private log(level: LogLevel, msg: string, args: unknown[]): void {
    if (LEVELS[level] < LEVELS[this.minLevel]) return;
    const ts = new Date().toISOString().slice(11, 23);
    const extra = args.length ? ' ' + args.map(String).join(' ') : '';
    const line = `[${ts}] [${level.toUpperCase()}] ${msg}${extra}`;
    this.channel?.appendLine(line);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
  }
}

export const logger = new Logger();
