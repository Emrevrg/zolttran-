/**
 * Typed configuration accessors.
 */
import * as vscode from 'vscode';
import type { OrchestratorMode, ProviderID } from '../types/index.js';

export function getConfig() {
  const cfg = vscode.workspace.getConfiguration('omniforge');
  return {
    freeMode:          cfg.get<boolean>('freeMode', true),
    defaultProvider:   cfg.get<ProviderID>('defaultProvider', 'openrouter'),
    defaultModel:      cfg.get<string>('defaultModel', 'auto'),
    godotPath:         cfg.get<string>('godotPath', 'godot4'),
    godotBridgePort:   cfg.get<number>('godotBridgePort', 9876),
    orchestratorMode:  cfg.get<OrchestratorMode>('orchestratorMode', 'orchestrator'),
    maxParallelAgents: cfg.get<number>('maxParallelAgents', 3),
    autoApprove:       cfg.get<'auto' | 'ask' | 'never'>('autoApprove', 'ask'),
    livePreviewPort:   cfg.get<number>('livePreviewPort', 8080),
    locale:            cfg.get<'en' | 'tr'>('locale', 'en'),
    telemetry:         cfg.get<boolean>('telemetry', false),
  };
}
