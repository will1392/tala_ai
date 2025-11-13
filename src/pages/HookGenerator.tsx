import { FormEvent, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Clipboard, ClipboardCheck, Loader2, RotateCcw, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import {
  type GeneratedHook,
  type HookRequest,
  verifyHookSet
} from '../utils/hookGenerator';
import { cn } from '../utils/cn';
import { buildApiUrl } from '../utils/api';

type FormMode = 'basic' | 'advanced';
type StageState = 'idle' | 'active' | 'complete' | 'retrying' | 'error';

interface PipelineStatus {
  hookAgent: StageState;
  verification: StageState;
}

interface BasicFormData {
  destination: string;
  travelType: string;
}

interface AdvancedFormData extends BasicFormData {
  targetAudience: string;
  painPoints: string;
  desiredOutcome: string;
  offering: string;
  tone: string;
  additionalNotes: string;
}

const TRAVEL_TYPES = [
  'River Cruise',
  'Ocean Cruise',
  'Expedition Cruise',
  'Land Tour',
  'Safari',
  'Honeymoon',
  'Luxury Villa',
  'Heritage Travel',
  'Multi-Country Tour',
  'Custom Itinerary'
];

const TONE_OPTIONS = [
  'Bold and direct',
  'Conversational and empathetic',
  'High-energy hype',
  'Calm authority',
  'Data-driven confidence'
];

const MAX_REVIEW_ATTEMPTS = 3;

const buildBasicRequest = (data: BasicFormData): HookRequest => {
  const destination = data.destination.trim() || 'Europe';
  const travelType = data.travelType || 'Land Tour';
  
  return {
    targetAudience: `${travelType} travelers interested in ${destination}`,
    offering: `${travelType} experience in ${destination}`,
    painPoints: ['Overwhelmed by planning', 'Too many options', 'Limited time to research'],
    desiredOutcome: 'Stress-free, perfectly planned trip',
    marketingChannels: [],
    tone: 'Conversational and empathetic',
    campaignGoal: 'Generate interest',
    additionalNotes: `Destination: ${destination}, Travel Type: ${travelType}`,
    destination: destination,
    travelType: travelType
  };
};

const buildAdvancedRequest = (data: AdvancedFormData): HookRequest => {
  const destination = data.destination.trim() || '';
  const travelType = data.travelType || '';
  
  return {
    targetAudience: data.targetAudience.trim() || 'Luxury travelers',
    offering: data.offering.trim() || 'Full-service travel planning',
    painPoints: data.painPoints.split(',').map(p => p.trim()).filter(Boolean),
    desiredOutcome: data.desiredOutcome.trim() || 'Effortless travel experience',
    marketingChannels: [],
    tone: data.tone || 'Conversational and empathetic',
    campaignGoal: 'Generate high-quality leads',
    additionalNotes: data.additionalNotes.trim(),
    destination: destination,
    travelType: travelType
  };
};

const HookGenerator = () => {
  const [mode, setMode] = useState<FormMode>('basic');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [basicForm, setBasicForm] = useState<BasicFormData>({
    destination: '',
    travelType: ''
  });
  
  const [advancedForm, setAdvancedForm] = useState<AdvancedFormData>({
    destination: '',
    travelType: '',
    targetAudience: '',
    painPoints: '',
    desiredOutcome: '',
    offering: '',
    tone: 'Conversational and empathetic',
    additionalNotes: ''
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedHook[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>({
    hookAgent: 'idle',
    verification: 'idle'
  });
  const [reviewNotes, setReviewNotes] = useState<string[]>([]);
  const [lastRequest, setLastRequest] = useState<HookRequest | null>(null);

  const summaryItems = useMemo(() => {
    if (!lastRequest) return [];
    return [
      { label: 'Audience', value: lastRequest.targetAudience },
      { label: 'Primary pain', value: lastRequest.painPoints[0] },
      { label: 'Desired outcome', value: lastRequest.desiredOutcome },
      { label: 'Offer', value: lastRequest.offering },
      { label: 'Notes', value: lastRequest.additionalNotes }
    ].filter((item) => item.value);
  }, [lastRequest]);

  const resetForm = () => {
    setBasicForm({ destination: '', travelType: '' });
    setAdvancedForm({
      destination: '',
      travelType: '',
      targetAudience: '',
      painPoints: '',
      desiredOutcome: '',
      offering: '',
      tone: 'Conversational and empathetic',
      additionalNotes: ''
    });
    setIsGenerating(false);
    setResults([]);
    setCopiedId(null);
    setPipelineStatus({ hookAgent: 'idle', verification: 'idle' });
    setReviewNotes([]);
    setLastRequest(null);
  };

  const handleCopy = async (hook: GeneratedHook) => {
    try {
      await navigator.clipboard.writeText(hook.text);
      setCopiedId(hook.id);
      toast.success('Hook copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Copy failed', error);
      toast.error('Unable to copy right now.');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    let request: HookRequest;
    
    if (mode === 'basic') {
      if (!basicForm.destination.trim()) {
        toast.error('Please enter a destination');
        return;
      }
      if (!basicForm.travelType) {
        toast.error('Please select a travel type');
        return;
      }
      request = buildBasicRequest(basicForm);
    } else {
      if (!advancedForm.targetAudience.trim()) {
        toast.error('Please enter your target audience');
        return;
      }
      if (!advancedForm.offering.trim()) {
        toast.error('Please enter your offering');
        return;
      }
      request = buildAdvancedRequest(advancedForm);
    }

    await runHookPipeline(request);
  };

  const runHookPipeline = async (request: HookRequest) => {
    setIsGenerating(true);
    setResults([]);
    setReviewNotes([]);
    setCopiedId(null);
    setLastRequest(request);

    let hooks: GeneratedHook[] = [];
    let verificationPassed = false;
    let lastIssues: string[] = [];

    for (let attempt = 1; attempt <= MAX_REVIEW_ATTEMPTS; attempt += 1) {
      setPipelineStatus({
        hookAgent: 'active',
        verification: attempt === 1 ? 'idle' : 'retrying'
      });

      try {
        // Generate a valid UUID for testing (in production, this should come from auth)
        const testUserId = crypto.randomUUID();
        
        const response = await fetch(buildApiUrl('hooks/generate'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': testUserId
          },
          body: JSON.stringify(request)
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.details || error.error || 'Hook Agent failed to respond.');
        }

        const data = await response.json();

        if (!data.success || !Array.isArray(data.hooks)) {
          throw new Error('Invalid response from Hook Agent.');
        }

        hooks = data.hooks as GeneratedHook[];
        setPipelineStatus((prev) => ({ ...prev, hookAgent: 'complete', verification: 'active' }));

        const review = verifyHookSet(hooks, request);
        if (review.passed) {
          verificationPassed = true;
          setPipelineStatus((prev) => ({ ...prev, verification: 'complete' }));
          break;
        }

        lastIssues = review.issues;
        setReviewNotes((prev) => [...prev, `Attempt ${attempt}: ${review.issues.join(' ')}`]);

        if (attempt < MAX_REVIEW_ATTEMPTS) {
          setPipelineStatus({ hookAgent: 'retrying', verification: 'retrying' });
        }
      } catch (error) {
        console.error('Hook Agent error', error);
        setPipelineStatus({ hookAgent: 'error', verification: 'idle' });
        
        // Show proper error message - NO FALLBACK
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        toast.error(`Hook generation failed: ${errorMessage}. Please try again or contact support.`);
        
        setIsGenerating(false);
        return; // Stop execution - no fallback
      }
    }

    // If verification failed after max attempts, show error - NO FALLBACK
    if (!verificationPassed) {
      setPipelineStatus({ hookAgent: 'error', verification: 'error' });
      toast.error('Hook generation did not meet quality standards after multiple attempts. Please try again or contact support.');
      setReviewNotes((prev) => [...prev, 'Generation failed: Quality verification did not pass. No hooks generated.']);
      setIsGenerating(false);
      return; // Stop execution - no fallback
    }

    // Only set results if verification passed
    setResults(hooks);
    setIsGenerating(false);
  };

  const stageLabel = (stage: StageState) => {
    switch (stage) {
      case 'active':
        return 'In progress';
      case 'complete':
        return 'Complete';
      case 'retrying':
        return 'Reviewing again';
      case 'error':
        return 'Issue detected';
      default:
        return 'Waiting';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="text-cyan-300" /> Tala Hook Generator
          </h1>
          <p className="text-white/70 max-w-2xl">
            Generate 20 proven hooks for your travel offering. Choose Basic for quick results or Advanced for custom targeting.
          </p>
        </header>

        <section className="glass rounded-2xl border border-white/10 p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Hook Generator</h2>
              <p className="text-sm text-white/70">
                Trained on 400+ proven hooks from luxury travel campaigns
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:border-cyan-400 hover:text-white"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mode Toggle */}
            <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
              <button
                type="button"
                onClick={() => setMode('basic')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition',
                  mode === 'basic' 
                    ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 text-white' 
                    : 'text-white/60 hover:text-white'
                )}
              >
                Basic
              </button>
              <button
                type="button"
                onClick={() => setMode('advanced')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition',
                  mode === 'advanced' 
                    ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 text-white' 
                    : 'text-white/60 hover:text-white'
                )}
              >
                Advanced
              </button>
            </div>

            {/* Basic Form */}
            {mode === 'basic' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="destination" className="text-sm font-medium text-white">
                    Destination
                  </label>
                  <input
                    id="destination"
                    type="text"
                    value={basicForm.destination}
                    onChange={(e) => setBasicForm({ ...basicForm, destination: e.target.value })}
                    placeholder="e.g., Italy, Scotland, Caribbean"
                    className="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="travelType" className="text-sm font-medium text-white">
                    Travel Type
                  </label>
                  <select
                    id="travelType"
                    value={basicForm.travelType}
                    onChange={(e) => setBasicForm({ ...basicForm, travelType: e.target.value })}
                    className="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    <option value="">Select travel type...</option>
                    {TRAVEL_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Advanced Form */}
            {mode === 'advanced' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="adv-destination" className="text-sm font-medium text-white">
                    Destination
                  </label>
                  <input
                    id="adv-destination"
                    type="text"
                    value={advancedForm.destination}
                    onChange={(e) => setAdvancedForm({ ...advancedForm, destination: e.target.value })}
                    placeholder="e.g., Italy, Scotland, Caribbean"
                    className="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="adv-travelType" className="text-sm font-medium text-white">
                    Travel Type
                  </label>
                  <select
                    id="adv-travelType"
                    value={advancedForm.travelType}
                    onChange={(e) => setAdvancedForm({ ...advancedForm, travelType: e.target.value })}
                    className="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    <option value="">Select travel type...</option>
                    {TRAVEL_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="targetAudience" className="text-sm font-medium text-white">
                    Target Audience <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="targetAudience"
                    type="text"
                    value={advancedForm.targetAudience}
                    onChange={(e) => setAdvancedForm({ ...advancedForm, targetAudience: e.target.value })}
                    placeholder="e.g., Affluent travelers aged 45-65 planning luxury European vacations"
                    className="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="offering" className="text-sm font-medium text-white">
                    Your Offering <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="offering"
                    type="text"
                    value={advancedForm.offering}
                    onChange={(e) => setAdvancedForm({ ...advancedForm, offering: e.target.value })}
                    placeholder="e.g., Full-service luxury travel planning"
                    className="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>

                {/* Collapsible Advanced Section */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"
                >
                  {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {showAdvanced ? 'Hide' : 'Show'} optional fields
                </button>

                {showAdvanced && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <label htmlFor="painPoints" className="text-sm font-medium text-white">
                        Pain Points
                      </label>
                      <input
                        id="painPoints"
                        type="text"
                        value={advancedForm.painPoints}
                        onChange={(e) => setAdvancedForm({ ...advancedForm, painPoints: e.target.value })}
                        placeholder="e.g., Overwhelmed by research, fear of missing hidden gems"
                        className="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      />
                      <p className="text-xs text-white/50">Separate multiple pain points with commas</p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="desiredOutcome" className="text-sm font-medium text-white">
                        Desired Outcome
                      </label>
                      <input
                        id="desiredOutcome"
                        type="text"
                        value={advancedForm.desiredOutcome}
                        onChange={(e) => setAdvancedForm({ ...advancedForm, desiredOutcome: e.target.value })}
                        placeholder="e.g., Stress-free, perfectly planned vacation"
                        className="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="tone" className="text-sm font-medium text-white">
                        Tone
                      </label>
                      <select
                        id="tone"
                        value={advancedForm.tone}
                        onChange={(e) => setAdvancedForm({ ...advancedForm, tone: e.target.value })}
                        className="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      >
                        {TONE_OPTIONS.map((tone) => (
                          <option key={tone} value={tone}>{tone}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="additionalNotes" className="text-sm font-medium text-white">
                        Additional Notes / Social Proof
                      </label>
                      <textarea
                        id="additionalNotes"
                        value={advancedForm.additionalNotes}
                        onChange={(e) => setAdvancedForm({ ...advancedForm, additionalNotes: e.target.value })}
                        placeholder="e.g., Planned 200+ trips, 5-star reviews, featured in Travel + Leisure"
                        rows={3}
                        className="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating hooks...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate 20 Hooks
                </>
              )}
            </button>
          </form>
        </section>

        {/* Pipeline Status */}
        {(pipelineStatus.hookAgent !== 'idle' || pipelineStatus.verification !== 'idle') && (
          <section className="glass rounded-2xl border border-white/10 p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Generation Pipeline</h2>
              <p className="text-sm text-white/70">Tala verifies hooks before delivery</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { key: 'hookAgent', title: 'Hook Agent', status: pipelineStatus.hookAgent },
                { key: 'verification', title: 'Tala Verification', status: pipelineStatus.verification }
              ].map((stage) => (
                <div
                  key={stage.key}
                  className={cn(
                    'rounded-xl border p-4 transition',
                    stage.status === 'complete' && 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
                    stage.status === 'active' && 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200',
                    stage.status === 'retrying' && 'border-amber-400/40 bg-amber-500/10 text-amber-200',
                    stage.status === 'error' && 'border-rose-400/40 bg-rose-500/10 text-rose-200',
                    stage.status === 'idle' && 'border-white/10 bg-white/5 text-white/60'
                  )}
                >
                  <p className="text-xs uppercase tracking-wide text-white/40">{stage.title}</p>
                  <p className="text-sm font-semibold mt-1">{stageLabel(stage.status)}</p>
                </div>
              ))}
            </div>

            {reviewNotes.length > 0 && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-amber-100 space-y-2">
                <h3 className="text-sm font-semibold">Review Notes</h3>
                <ul className="space-y-1 text-xs">
                  {reviewNotes.map((note, index) => (
                    <li key={`${note}-${index}`}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Results */}
        <section className="glass rounded-2xl border border-white/10 p-6 space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Generated Hooks</h2>
              <p className="text-sm text-white/70">
                20 hooks organized by awareness level, ready to deploy
              </p>
            </div>
          </div>

          {summaryItems.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-white">Request Summary</h3>
              <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                {summaryItems.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <dt className="text-[10px] uppercase tracking-wide text-white/40">{item.label}</dt>
                    <dd className="text-sm text-white/80 leading-relaxed">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-8 text-center">
              <p className="text-white/70">
                Fill out the form above and click "Generate 20 Hooks" to get started
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {(() => {
                const grouped = results.reduce((acc, hook) => {
                  const key = hook.awareness;
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(hook);
                  return acc;
                }, {} as Record<string, GeneratedHook[]>);

                const awarenessOrder = [
                  { key: 'Problem Aware', label: 'Problem-Aware Hooks (Pain-Driven)' },
                  { key: 'Solution Aware', label: 'Solution-Aware Hooks (Promise-Driven)' },
                  { key: 'Product Aware', label: 'Product-Aware Hooks (Proof-Driven)' },
                  { key: 'Completely Unaware', label: 'Unaware Hooks (Curiosity-Driven)' },
                  { key: 'Most Aware', label: 'Most Aware Hooks (Reinforcement-Driven)' }
                ];

                return awarenessOrder
                  .filter(({ key }) => grouped[key] && grouped[key].length > 0)
                  .map(({ key, label }) => (
                    <div key={key} className="space-y-4">
                      <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                        {label}
                      </h3>
                      <div className="space-y-3">
                        {grouped[key].map((hook) => (
                          <div
                            key={hook.id}
                            className="group flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-4 hover:border-white/10 hover:bg-white/5 transition"
                          >
                            <p className="flex-1 text-white/90 leading-relaxed">
                              "{hook.text}"
                            </p>
                            <button
                              type="button"
                              onClick={() => handleCopy(hook)}
                              className="flex-shrink-0 rounded-md border border-white/10 p-2 text-white/60 hover:text-white hover:border-cyan-400 transition opacity-0 group-hover:opacity-100"
                              aria-label="Copy hook to clipboard"
                            >
                              {copiedId === hook.id ? (
                                <ClipboardCheck size={16} className="text-cyan-300" />
                              ) : (
                                <Clipboard size={16} />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
              })()}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default HookGenerator;
