/**
 * Zolttran VS Code Extension — entry point.
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import type {
  WebviewToExtension,
  ExtensionToWebview,
  Platform,
  HostingService,
  OrchestratorMode,
  ProviderID,
  GameType,
  AppState,
} from './types/index.js';

import { providerManager }   from './providers/provider-manager.js';
import { intelligentRouter } from './providers/intelligent-router.js';
import { orchestrator }      from './agent/orchestrator.js';
import { memoryBank }        from './agent/memory-bank.js';
import { generateGameOffline, detectGameType } from './agent/offline-generator.js';
import { taskScheduler }     from './agent/task-scheduler.js';
import { godotBridge }       from './godot/godot-bridge.js';
import { projectScaffolder } from './godot/project-scaffolder.js';
import { deployManager }     from './build/deploy-manager.js';
import { liveServer }        from './preview/live-server.js';
import { hotReloadWatcher }  from './preview/hot-reload.js';
import { logger }            from './utils/logger.js';
import { security }          from './utils/security.js';

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let panel: vscode.WebviewPanel | undefined;
let outputChannel: vscode.OutputChannel;
// Cached vscode API reference — acquireVsCodeApi() may only be called ONCE
// This is handled in the webview (store.ts), not here. In extension.ts we
// communicate via panel.webview.postMessage directly.

// ---------------------------------------------------------------------------
// Activate
// ---------------------------------------------------------------------------

export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel('Zolttran');
  context.subscriptions.push(outputChannel);

  logger.setChannel(outputChannel);
  logger.info('Zolttran başlatılıyor...');

  // Memory bank storage
  memoryBank.setStorage({
    get: <T>(key: string) => context.globalState.get<T>(key),
    update: (key, value) => context.globalState.update(key, value),
  });

  void loadApiKeys(context);
  applyConfig(context);
  registerCommands(context);

  // Opsiyonel: başlangıçta paneli otomatik aç (varsayılan kapalı)
  if (vscode.workspace.getConfiguration('zolttran').get('autoOpenPanel', false)) {
    setTimeout(() => openOrReveal(context), 400);
  }

  logger.info('Zolttran hazır.');
}

export function deactivate(): void {
  panel?.dispose();
  void liveServer.stop();
  hotReloadWatcher.stop();
  logger.info('Zolttran kapatıldı.');
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function registerCommands(context: vscode.ExtensionContext): void {
  const cmds: Array<[string, () => unknown]> = [
    ['zolttran.openPanel',      () => openOrReveal(context)],
    ['zolttran.newGame',        () => { openOrReveal(context); post({ type: 'notification', payload: { level: 'info', message: '💬 Chat paneline oyununuzu tarif edin!' } }); }],
    ['zolttran.buildAll',       () => void handleBuildAll()],
    ['zolttran.runPreview',     () => void handleRunPreview()],
    ['zolttran.openSettings',   () => { openOrReveal(context); post({ type: 'notification', payload: { level: 'info', message: '⚙️ Config sekmesini açın.' } }); }],
    ['zolttran.toggleFreeMode', () => void toggleFreeMode(context)],
    ['zolttran.openMemoryBank', () => void openMemoryBank()],
    ['zolttran.runGodotBridge', () => void connectGodotBridge()],
    ['zolttran.deployPlatform', () => openOrReveal(context)],
    ['zolttran.showAgentPanel', () => { openOrReveal(context); post({ type: 'state-update', payload: { activeTab: 'agent' } }); }],
  ];
  for (const [id, fn] of cmds) {
    context.subscriptions.push(vscode.commands.registerCommand(id, fn));
  }
}

// ---------------------------------------------------------------------------
// Webview panel
// ---------------------------------------------------------------------------

function openOrReveal(context: vscode.ExtensionContext): void {
  if (panel) { panel.reveal(vscode.ViewColumn.Two); return; }

  panel = vscode.window.createWebviewPanel(
    'zolttran.mainPanel',
    'Zolttran',
    vscode.ViewColumn.Two,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'dist'),
        vscode.Uri.joinPath(context.extensionUri, 'resources'),
      ],
    },
  );

  panel.iconPath = {
    light: vscode.Uri.joinPath(context.extensionUri, 'resources', 'icons', 'zolttran-tab.png'),
    dark:  vscode.Uri.joinPath(context.extensionUri, 'resources', 'icons', 'zolttran-tab.png'),
  };
  panel.webview.html = buildHtml(panel.webview, context.extensionUri);

  // Message routing
  panel.webview.onDidReceiveMessage(
    (msg: WebviewToExtension) => void handleMsg(msg, context),
    undefined,
    context.subscriptions,
  );

  panel.onDidDispose(() => {
    panel = undefined;
    hotReloadWatcher.stop();
    void liveServer.stop();
    void vscode.commands.executeCommand('setContext', 'zolttran.active', false);
  }, null, context.subscriptions);

  // Wire up event forwarding
  liveServer.onStateChange((state) => post({ type: 'preview-update', payload: { state } }));

  orchestrator.on((event) => {
    switch (event.type) {
      case 'stream-chunk': post({ type: 'chat-stream-chunk', payload: { chunk: event.content, done: false } }); break;
      case 'stream-done':  post({ type: 'chat-stream-chunk', payload: { chunk: '', done: true } }); break;
      case 'task-update':  post({ type: 'agent-update', payload: { task: event.task } }); break;
      case 'error':        post({ type: 'error', payload: { message: event.message } }); break;
    }
  });

  deployManager.onBuildUpdate((result) => post({ type: 'build-update', payload: { result } }));
  taskScheduler.onUpdate((task) => post({ type: 'agent-update', payload: { task } }));

  void vscode.commands.executeCommand('setContext', 'zolttran.active', true);
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

async function handleMsg(msg: WebviewToExtension, context: vscode.ExtensionContext): Promise<void> {
  logger.debug(`Webview → Extension: ${msg.type}`);

  switch (msg.type) {
    case 'ready':
      post({ type: 'state-update', payload: buildSnapshot() });
      break;

    case 'get-state':
      post({ type: 'state-update', payload: buildSnapshot() });
      break;

    case 'chat-message': {
      const { content, attachments } = msg.payload;
      // Kullanıcı mesajı webview'de optimistik eklenir; burada sadece işleriz.
      const suffix = attachments && attachments.length ? `\n\n[Ekler: ${attachments.join(', ')}]` : '';
      void orchestrator.handleMessage(content + suffix).catch((err) => {
        post({ type: 'error', payload: { message: String(err) } });
      });
      break;
    }

    case 'set-provider': {
      const { providerId, model } = msg.payload;
      intelligentRouter.setFreeMode(false);
      post({ type: 'notification', payload: { level: 'info', message: `✅ ${providerId} / ${model} seçildi` } });
      break;
    }

    case 'set-api-key': {
      const { providerId, key } = msg.payload;
      if (!security.validateApiKey(key)) {
        post({ type: 'notification', payload: { level: 'error', message: 'Geçersiz API anahtarı formatı.' } });
        break;
      }
      await context.secrets.store(`zolttran.apiKey.${providerId}`, key);
      providerManager.setApiKey(providerId as ProviderID, key);
      intelligentRouter.setApiKey(providerId as ProviderID, key);
      post({ type: 'provider-status', payload: { providerId: providerId as ProviderID, status: 'ok' } });
      post({ type: 'toast', payload: { message: `${providerId} API anahtarı kaydedildi`, type: 'success', duration: 3000 } });
      break;
    }

    case 'test-provider': {
      const { providerId } = msg.payload;
      post({ type: 'notification', payload: { level: 'info', message: `${providerId} test ediliyor...` } });
      const result = await providerManager.testProvider(providerId as ProviderID);
      post({ type: 'provider-status', payload: { providerId: providerId as ProviderID, status: result.ok ? 'ok' : 'error', error: result.error } });
      post({ type: 'toast', payload: { message: result.ok ? `✅ ${providerId} bağlantısı başarılı` : `❌ ${providerId}: ${result.error ?? 'Hata'}`, type: result.ok ? 'success' : 'error', duration: 4000 } });
      break;
    }

    case 'toggle-free-mode': {
      const { enabled } = msg.payload;
      await context.globalState.update('zolttran.freeMode', enabled);
      providerManager.setFreeMode(enabled);
      intelligentRouter.setFreeMode(enabled);
      post({ type: 'toast', payload: { message: `FREE MODE ${enabled ? 'AKTİF 🆓' : 'KAPALI'}`, type: enabled ? 'success' : 'info', duration: 2500 } });
      break;
    }

    case 'new-game': {
      const { prompt } = msg.payload;
      if (!await security.requestApproval(context, 'file-write', `Godot projesi oluştur: ${prompt}`)) break;
      const workspacePath = getWorkspacePath();
      if (!workspacePath) { post({ type: 'error', payload: { message: 'Workspace klasörü açık değil.' } }); break; }

      void (async () => {
        const step = (agentType: string, title: string, progress: number, status: 'executing' | 'completed') =>
          post({ type: 'agent-update', payload: { task: { id: `gen-${agentType}`, agentType: agentType as never, title, description: '', input: {}, status: status as never, progress, logs: [] } } });
        try {
          // Anahtar/LLM gerekmeden çalışan üretim: prompt → tür → şablon → oynanabilir proje
          step('architect', 'Oyun türü sezildi, GDD hazırlanıyor', 40, 'executing');
          const gameType = detectGameType(prompt);
          step('architect', `GDD hazır — ${gameType}`, 100, 'completed');
          step('coder', 'Godot projesi ve scriptler yazılıyor', 55, 'executing');
          const result = await generateGameOffline(prompt, workspacePath);
          step('coder', `${result.filesCreated.length} dosya yazıldı`, 100, 'completed');
          step('artist', 'Sahne ve varlık iskeleti yerleştirildi', 100, 'completed');
          step('devops', 'Export ayarları ve proje yapısı tamamlandı', 100, 'completed');

          deployManager.setProjectPath(result.projectPath);
          memoryBank.setGdd(result.gdd);
          const project = await godotBridge.readProject(result.projectPath).catch(() => null);
          post({ type: 'state-update', payload: { currentProject: project ?? { name: path.basename(result.projectPath), path: result.projectPath, godotVersion: '4.3', scenes: [], scripts: [], assets: [], exportPresets: [] }, currentGdd: result.gdd } });
          post({ type: 'toast', payload: { message: `🎮 Oynanabilir proje üretildi: ${path.basename(result.projectPath)} (${result.filesCreated.length} dosya)`, type: 'success', duration: 6000 } });

          // Ana sahne dosyasını aç
          const mainScene = path.join(result.projectPath, 'project.godot');
          if (fs.existsSync(mainScene)) {
            const doc = await vscode.workspace.openTextDocument(mainScene);
            await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
          }
        } catch (err) {
          post({ type: 'error', payload: { message: String(err) } });
        }
      })();
      break;
    }

    case 'run-preview':    await handleRunPreview();  break;
    case 'stop-preview':   await liveServer.stop(); hotReloadWatcher.stop(); break;
    case 'reload-preview': liveServer.triggerReload(); break;

    case 'build-platform': {
      const { platform } = msg.payload;
      if (!await security.requestApproval(context, 'build', `${platform} build`)) break;
      post({ type: 'toast', payload: { message: `🔨 ${platform} build başladı...`, type: 'info', duration: 3000 } });
      void deployManager.buildPlatform(platform as Platform);
      break;
    }

    case 'build-all':
      await handleBuildAll();
      break;

    case 'deploy': {
      const { platform, hosting } = msg.payload;
      if (!await security.requestApproval(context, 'deploy', `${platform} → ${hosting}`)) break;
      const creds = await loadHostingCreds(context, hosting as HostingService);
      const result = await deployManager.deploy({ platform: platform as Platform, hosting: hosting as HostingService }, creds);
      post({ type: 'toast', payload: { message: result.success ? `🚀 Deploy başarılı: ${result.url ?? hosting}` : `❌ Deploy hatası: ${result.error}`, type: result.success ? 'success' : 'error', duration: 5000 } });
      break;
    }

    case 'set-orchestrator-mode':
      orchestrator.setMode(msg.payload.mode as OrchestratorMode);
      break;

    case 'set-godot-path': {
      const { path: godotPath } = msg.payload;
      await vscode.workspace.getConfiguration('zolttran').update('godotPath', godotPath, vscode.ConfigurationTarget.Global);
      godotBridge.setGodotPath(godotPath);
      break;
    }

    case 'open-file': {
      const filePath = msg.payload.path;
      const safe = security.sanitizePath(filePath, getWorkspacePath() ?? '');
      if (safe && fs.existsSync(safe)) {
        const doc = await vscode.workspace.openTextDocument(safe);
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
      }
      break;
    }

    case 'cancel-agent':
      taskScheduler.cancel(msg.payload.taskId);
      break;

    case 'run-godot-bridge':
      await connectGodotBridge();
      break;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function post(msg: ExtensionToWebview): void {
  panel?.webview.postMessage(msg);
}

function buildSnapshot(): Partial<AppState> {
  const cfg = vscode.workspace.getConfiguration('zolttran');
  return {
    ready: true,
    freeMode: cfg.get('freeMode', true),
    orchestratorMode: orchestrator.getMode(),
    agentStatuses: taskScheduler.getAllAgentStatuses(),
    activeTasks: taskScheduler.getRunning(),
    completedTasks: taskScheduler.getCompleted().slice(0, 30),
    preview: liveServer.getState(),
    buildResults: Object.fromEntries(deployManager.getAllBuildResults().map((r) => [r.platform, r])),
    godotConnected: godotBridge.isConnected(),
    godotBridgeMethod: godotBridge.getConfig().method,
    currentGdd: memoryBank.getGdd() ?? undefined,
    costToday: providerManager.getCostToday(),
    costTotal: providerManager.getCostTotal(),
    isBuildingAll: false,
    toasts: [],
  };
}

async function handleRunPreview(): Promise<void> {
  const projectPath = deployManager.projectPath || getWorkspacePath() || '';
  if (!projectPath) { post({ type: 'error', payload: { message: 'Godot projesi yapılandırılmamış.' } }); return; }

  const buildDir = path.join(projectPath, 'build', 'web');
  if (!fs.existsSync(path.join(buildDir, 'index.html'))) {
    post({ type: 'notification', payload: { level: 'info', message: 'Web export oluşturuluyor...' } });
    const result = await deployManager.buildPlatform('web');
    if (result.status !== 'success') {
      post({ type: 'error', payload: { message: `Web build hatası: ${result.error ?? ''}` } });
      return;
    }
  }

  const port = vscode.workspace.getConfiguration('zolttran').get('livePreviewPort', 8080);
  liveServer.setPort(port);
  const url = await liveServer.start(buildDir);
  hotReloadWatcher.start(projectPath);
  post({ type: 'toast', payload: { message: `▶ Oyun başladı: ${url}`, type: 'success', duration: 3000 } });
}

async function handleBuildAll(): Promise<void> {
  post({ type: 'state-update', payload: { isBuildingAll: true } });
  await deployManager.buildAll(['web', 'windows', 'linux']);
  post({ type: 'state-update', payload: { isBuildingAll: false } });
  post({ type: 'toast', payload: { message: '📦 Tüm build\'ler tamamlandı', type: 'success', duration: 4000 } });
}

async function connectGodotBridge(): Promise<void> {
  const cfg = vscode.workspace.getConfiguration('zolttran');
  godotBridge.setGodotPath(cfg.get('godotPath', 'godot4'));
  const method = await godotBridge.connect(getWorkspacePath() ?? '', cfg.get('godotBridgePort', 9876));
  post({ type: 'godot-status', payload: { connected: Boolean(method), method: method ?? undefined } });
  if (method) {
    vscode.window.showInformationMessage(`Zolttran: Godot ${method.toUpperCase()} ile bağlandı`);
  } else {
    vscode.window.showWarningMessage('Zolttran: Godot bağlanamadı. godotPath ayarını kontrol edin.');
  }
}

async function toggleFreeMode(context: vscode.ExtensionContext): Promise<void> {
  const current = vscode.workspace.getConfiguration('zolttran').get('freeMode', true);
  await vscode.workspace.getConfiguration('zolttran').update('freeMode', !current, vscode.ConfigurationTarget.Global);
  providerManager.setFreeMode(!current);
  intelligentRouter.setFreeMode(!current);
}

async function openMemoryBank(): Promise<void> {
  const content = memoryBank.buildAgentContext();
  if (!content) { vscode.window.showInformationMessage('Zolttran Memory Bank boş — önce bir oyun oluşturun!'); return; }
  const doc = await vscode.workspace.openTextDocument({ content, language: 'markdown' });
  await vscode.window.showTextDocument(doc);
}

async function loadApiKeys(context: vscode.ExtensionContext): Promise<void> {
  const ids: ProviderID[] = ['openrouter','nvidia','anthropic','openai','google','deepseek','groq',
    'mistral','xai','cohere','cerebras','poolside','qwen','huggingface','sambanova','siliconflow',
    'cloudflare','github','modelscope','nebius','zai','kilo','custom'];
  for (const id of ids) {
    const key = await context.secrets.get(`zolttran.apiKey.${id}`);
    if (key) { providerManager.setApiKey(id, key); intelligentRouter.setApiKey(id, key); }
  }
}

async function loadHostingCreds(context: vscode.ExtensionContext, hosting: HostingService): Promise<Record<string, string>> {
  const fieldMap: Partial<Record<HostingService, string[]>> = {
    'itch-io':      ['apiKey', 'user', 'game'],
    'github-pages': ['token', 'repo', 'branch'],
    'steam':        ['username', 'password', 'appId', 'depotId'],
  };
  const creds: Record<string, string> = {};
  for (const key of fieldMap[hosting] ?? []) {
    const val = await context.secrets.get(`zolttran.hosting.${hosting}.${key}`);
    if (val) creds[key] = val;
  }
  return creds;
}

function applyConfig(context: vscode.ExtensionContext): void {
  const cfg = vscode.workspace.getConfiguration('zolttran');
  providerManager.setFreeMode(cfg.get('freeMode', true));
  intelligentRouter.setFreeMode(cfg.get('freeMode', true));
  orchestrator.setMode(cfg.get('orchestratorMode', 'orchestrator') as OrchestratorMode);
  taskScheduler.maxParallel = cfg.get('maxParallelAgents', 3);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('zolttran')) applyConfig(context);
    }),
  );
}

function getWorkspacePath(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

// ---------------------------------------------------------------------------
// Webview HTML
// ---------------------------------------------------------------------------

function buildHtml(webview: vscode.Webview, extUri: vscode.Uri): string {
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extUri, 'dist', 'webview', 'main.js'));
  const styleUri  = webview.asWebviewUri(vscode.Uri.joinPath(extUri, 'dist', 'webview', 'main.css'));
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(20))).map((b) => b.toString(16).padStart(2, '0')).join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
      script-src 'nonce-${nonce}';
      style-src ${webview.cspSource} 'unsafe-inline';
      img-src ${webview.cspSource} data: https:;
      font-src ${webview.cspSource} data:;
      connect-src ws://localhost:* http://localhost:* https:;"/>
  <title>Zolttran</title>
  <link rel="stylesheet" href="${styleUri}"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body,#root{height:100%;overflow:hidden}
    body{background:var(--vscode-editor-background);color:var(--vscode-editor-foreground);font-family:var(--vscode-font-family,system-ui,sans-serif)}
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
