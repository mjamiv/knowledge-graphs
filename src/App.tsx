import { useState } from 'react';
import { useGraphStore } from './stores/graphStore';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import GraphVisualization from './components/GraphVisualization';
import UploadPanel from './components/UploadPanel';
import AnalysisPanel from './components/AnalysisPanel';
import SettingsModal from './components/SettingsModal';
import NodeDetails from './components/NodeDetails';
import WelcomeScreen from './components/WelcomeScreen';
import ExtractionInsights from './components/ExtractionInsights';

type PanelType = 'upload' | 'analysis' | 'saved' | 'insights' | null;

function App() {
  const {
    currentGraph,
    settings,
    showExtractionInsights,
    setShowExtractionInsights,
    currentExtractionLog,
  } = useGraphStore();
  const [activePanel, setActivePanel] = useState<PanelType>('upload');
  const [showSettings, setShowSettings] = useState(false);

  const togglePanel = (panel: PanelType) => {
    // If toggling insights, also update the store
    if (panel === 'insights') {
      setShowExtractionInsights(!showExtractionInsights);
    }
    setActivePanel(activePanel === panel ? null : panel);
  };

  // Sync insights panel state with store
  const handleCloseInsights = () => {
    setShowExtractionInsights(false);
    if (activePanel === 'insights') {
      setActivePanel(null);
    }
  };

  // Determine if insights panel should show
  const showInsightsPanel = showExtractionInsights || activePanel === 'insights';

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-slate-100">
      <Header
        onToggleUpload={() => togglePanel('upload')}
        onToggleAnalysis={() => togglePanel('analysis')}
        onToggleSaved={() => togglePanel('saved')}
        onToggleInsights={() => togglePanel('insights')}
        onOpenSettings={() => setShowSettings(true)}
        activePanel={activePanel}
        hasExtractionLog={!!currentExtractionLog}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar with saved graphs */}
        {activePanel === 'saved' && (
          <Sidebar onClose={() => setActivePanel(null)} />
        )}

        {/* Main content area */}
        <div className="flex-1 relative">
          {currentGraph ? (
            <GraphVisualization />
          ) : (
            <WelcomeScreen onOpenUpload={() => setActivePanel('upload')} />
          )}

          {/* Node details panel */}
          <NodeDetails />
        </div>

        {/* Right panels */}
        {activePanel === 'upload' && !showInsightsPanel && (
          <UploadPanel onClose={() => setActivePanel(null)} />
        )}

        {activePanel === 'analysis' && currentGraph && !showInsightsPanel && (
          <AnalysisPanel onClose={() => setActivePanel(null)} />
        )}

        {/* Extraction Insights panel */}
        {showInsightsPanel && (
          <ExtractionInsights onClose={handleCloseInsights} />
        )}
      </div>

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {/* API key warning */}
      {!settings.openaiApiKey && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-amber-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <span>OpenAI API key not set.</span>
          <button
            onClick={() => setShowSettings(true)}
            className="underline font-medium hover:text-amber-100"
          >
            Configure now
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
