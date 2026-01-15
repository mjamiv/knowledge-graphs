import { Upload, FileText, Share2, Sparkles } from 'lucide-react';

interface WelcomeScreenProps {
  onOpenUpload: () => void;
}

export default function WelcomeScreen({ onOpenUpload }: WelcomeScreenProps) {
  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-2xl mx-auto text-center px-4">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-primary-500/20">
            <Share2 size={40} className="text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-white mb-4">
          Knowledge Graph Studio
        </h1>
        <p className="text-xl text-slate-400 mb-8">
          Transform documents into interactive knowledge graphs using AI
        </p>

        {/* CTA Button */}
        <button
          onClick={onOpenUpload}
          className="btn-primary text-lg px-8 py-3 inline-flex items-center gap-2 shadow-lg shadow-primary-500/20"
        >
          <Upload size={20} />
          Upload a Document
        </button>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4 mx-auto">
              <FileText className="text-blue-400" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Multiple Formats
            </h3>
            <p className="text-slate-400 text-sm">
              Support for PDF, Word documents, plain text, and Markdown files
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 mx-auto">
              <Sparkles className="text-purple-400" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              AI-Powered Extraction
            </h3>
            <p className="text-slate-400 text-sm">
              Uses OpenAI GPT-4 to extract entities and relationships automatically
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-4 mx-auto">
              <Share2 className="text-cyan-400" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Interactive Visualization
            </h3>
            <p className="text-slate-400 text-sm">
              Explore your knowledge graph in 3D with powerful analysis tools
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-12 text-slate-500 text-sm">
          Your documents are processed locally. Only text is sent to OpenAI for analysis.
        </p>
      </div>
    </div>
  );
}
