import { useState } from 'react';
import { X, Key, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useGraphStore } from '../stores/graphStore';
import { testApiConnection } from '../services/openaiExtractor';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useGraphStore();
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(settings.openaiApiKey);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleSave = () => {
    updateSettings({ openaiApiKey: apiKeyInput });
    onClose();
  };

  const handleTestConnection = async () => {
    if (!apiKeyInput) return;

    setTesting(true);
    setTestResult(null);

    const success = await testApiConnection(apiKeyInput);
    setTestResult(success ? 'success' : 'error');
    setTesting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="btn-ghost p-1">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* OpenAI API Key */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Key size={16} className="text-primary-400" />
              OpenAI API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setTestResult(null);
                }}
                placeholder="sk-..."
                className="input w-full pr-20"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 btn-ghost p-1"
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Your API key is stored locally in your browser.
            </p>

            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={handleTestConnection}
                disabled={!apiKeyInput || testing}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                {testing ? (
                  <>
                    <Loader2 size={14} className="spinner" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </button>

              {testResult === 'success' && (
                <span className="flex items-center gap-1 text-green-400 text-sm">
                  <CheckCircle size={16} />
                  Connected
                </span>
              )}

              {testResult === 'error' && (
                <span className="flex items-center gap-1 text-red-400 text-sm">
                  <AlertCircle size={16} />
                  Invalid key
                </span>
              )}
            </div>
          </div>

          {/* Model selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Extraction Model</label>
            <select
              value={settings.extractionModel}
              onChange={(e) => updateSettings({ extractionModel: e.target.value as any })}
              className="select w-full"
            >
              <option value="gpt-4o">GPT-4o (Recommended)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster, Less Accurate)</option>
            </select>
          </div>

          {/* Max entities */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Max Entities: {settings.maxEntities}
            </label>
            <input
              type="range"
              min="20"
              max="500"
              step="10"
              value={settings.maxEntities}
              onChange={(e) => updateSettings({ maxEntities: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>20</span>
              <span>500</span>
            </div>
          </div>

          {/* Visualization settings */}
          <div>
            <label className="block text-sm font-medium mb-3">Visualization</label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Mode</span>
                <div className="flex rounded-lg overflow-hidden border border-slate-600">
                  <button
                    onClick={() => updateSettings({ visualizationMode: '3d' })}
                    className={`px-3 py-1 text-sm ${
                      settings.visualizationMode === '3d'
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    3D
                  </button>
                  <button
                    onClick={() => updateSettings({ visualizationMode: '2d' })}
                    className={`px-3 py-1 text-sm ${
                      settings.visualizationMode === '2d'
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    2D
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Node Size</span>
                <div className="flex rounded-lg overflow-hidden border border-slate-600">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => updateSettings({ nodeSize: size })}
                      className={`px-3 py-1 text-sm capitalize ${
                        settings.nodeSize === size
                          ? 'bg-primary-600 text-white'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Show Node Labels</span>
                <input
                  type="checkbox"
                  checked={settings.showLabels}
                  onChange={(e) => updateSettings({ showLabels: e.target.checked })}
                  className="rounded border-slate-500"
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Show Relationship Labels</span>
                <input
                  type="checkbox"
                  checked={settings.showRelationshipLabels}
                  onChange={(e) => updateSettings({ showRelationshipLabels: e.target.checked })}
                  className="rounded border-slate-500"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
