import { useState, useRef, useEffect } from 'react';
import { getMetricExplanation, MetricExplanation } from '../data/metricExplanations';

interface MetricTooltipProps {
  metricKey: string;
  children: React.ReactNode;
  className?: string;
}

export function MetricTooltip({ metricKey, children, className = '' }: MetricTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom');
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const explanation = getMetricExplanation(metricKey);

  useEffect(() => {
    if (isOpen && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipHeight = tooltipRef.current.offsetHeight;
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;

      if (spaceBelow < tooltipHeight + 20 && spaceAbove > spaceBelow) {
        setPosition('top');
      } else {
        setPosition('bottom');
      }
    }
  }, [isOpen]);

  if (!explanation) {
    return <>{children}</>;
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        ref={triggerRef}
        className="cursor-help inline-flex items-center gap-1"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {children}
        <InfoIcon className="w-3.5 h-3.5 text-slate-400 hover:text-primary-400 transition-colors" />
      </div>

      {isOpen && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 w-80 p-4 bg-slate-800 border border-slate-600 rounded-lg shadow-xl ${
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } left-0`}
        >
          <TooltipContent explanation={explanation} />
        </div>
      )}
    </div>
  );
}

interface TooltipContentProps {
  explanation: MetricExplanation;
}

function TooltipContent({ explanation }: TooltipContentProps) {
  return (
    <div className="text-sm">
      <h4 className="font-semibold text-white mb-1">{explanation.metricName}</h4>
      <p className="text-slate-300 mb-3">{explanation.shortDescription}</p>

      <div className="space-y-3">
        <div>
          <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
            Interpretation
          </h5>
          <div className="space-y-1 text-xs">
            <div className="flex gap-2">
              <span className="text-green-400 font-medium shrink-0">High:</span>
              <span className="text-slate-300">{explanation.interpretation.high}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-amber-400 font-medium shrink-0">Low:</span>
              <span className="text-slate-300">{explanation.interpretation.low}</span>
            </div>
          </div>
        </div>

        <div>
          <h5 className="text-xs font-medium text-primary-400 uppercase tracking-wide mb-1">
            Why Agents Use This
          </h5>
          <p className="text-xs text-slate-300">{explanation.agentUseCase}</p>
        </div>

        {explanation.formula && (
          <div>
            <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
              Formula
            </h5>
            <code className="text-xs text-cyan-300 bg-slate-900 px-2 py-1 rounded block">
              {explanation.formula}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

// Expanded tooltip for detailed view (modal-style)
interface MetricDetailModalProps {
  metricKey: string;
  isOpen: boolean;
  onClose: () => void;
}

export function MetricDetailModal({ metricKey, isOpen, onClose }: MetricDetailModalProps) {
  const explanation = getMetricExplanation(metricKey);

  if (!isOpen || !explanation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-white">{explanation.metricName}</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-slate-300 mb-6">{explanation.fullDescription}</p>

          <div className="space-y-5">
            <Section title="Interpretation">
              <div className="space-y-2">
                <InterpretationRow label="High Value" color="green" text={explanation.interpretation.high} />
                <InterpretationRow label="Low Value" color="amber" text={explanation.interpretation.low} />
              </div>
            </Section>

            <Section title="Why Agents Use This" titleColor="primary">
              <p className="text-slate-300">{explanation.agentUseCase}</p>
            </Section>

            <Section title="Example">
              <p className="text-slate-300 italic">{explanation.example}</p>
            </Section>

            {explanation.formula && (
              <Section title="Formula">
                <code className="text-cyan-300 bg-slate-900 px-3 py-2 rounded block font-mono">
                  {explanation.formula}
                </code>
              </Section>
            )}

            {explanation.relatedMetrics.length > 0 && (
              <Section title="Related Metrics">
                <div className="flex flex-wrap gap-2">
                  {explanation.relatedMetrics.map((metric) => (
                    <span
                      key={metric}
                      className="px-2 py-1 bg-slate-700 rounded text-sm text-slate-300"
                    >
                      {metric}
                    </span>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  titleColor = 'slate',
  children,
}: {
  title: string;
  titleColor?: 'slate' | 'primary';
  children: React.ReactNode;
}) {
  const colorClass = titleColor === 'primary' ? 'text-primary-400' : 'text-slate-400';
  return (
    <div>
      <h4 className={`text-sm font-medium ${colorClass} uppercase tracking-wide mb-2`}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function InterpretationRow({
  label,
  color,
  text,
}: {
  label: string;
  color: 'green' | 'amber';
  text: string;
}) {
  const colorClass = color === 'green' ? 'text-green-400' : 'text-amber-400';
  return (
    <div className="flex gap-3">
      <span className={`${colorClass} font-medium shrink-0 w-20`}>{label}:</span>
      <span className="text-slate-300">{text}</span>
    </div>
  );
}
