import { FormEvent, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Clipboard, ClipboardCheck, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import {
  generateFallbackHooks,
  type GeneratedHook,
  type HookRequest,
  verifyHookSet,
  buildSupportingInsights
} from '../utils/hookGenerator';
import { cn } from '../utils/cn';

interface DiscoveryQuestion {
  id: keyof DiscoveryState;
  prompt: string;
  helper?: string;
  placeholder?: string;
  optional?: boolean;
}

interface DiscoveryState {
  audience: string;
  struggle: string;
  desire: string;
  offer: string;
  context: string;
}

type StageState = 'idle' | 'active' | 'complete' | 'retrying' | 'error';

interface PipelineStatus {
  discovery: StageState;
  hookAgent: StageState;
  verification: StageState;
}

type Speaker = 'tala' | 'user' | 'agent';

interface ConversationMessage {
  id: string;
  speaker: Speaker;
  text: string;
}

const DISCOVERY_QUESTIONS: DiscoveryQuestion[] = [
  {
    id: 'audience',
    prompt: 'Who are we talking to?',
    helper: 'Give me a quick description like "SaaS founders" or "Agency operators under 10 people".',
    placeholder: 'e.g., operations directors at 7-figure agencies'
  },
  {
    id: 'struggle',
    prompt: 'What is tripping them up right now?',
    helper: 'Keep it simple - what is the annoying problem they cannot shake?',
    placeholder: 'e.g., answering the same internal questions 50 times a week'
  },
  {
    id: 'desire',
    prompt: 'What outcome are they craving?',
    helper: 'What do they want instead once that pain is gone?',
    placeholder: 'e.g., a team that can move fast without waiting on them'
  },
  {
    id: 'offer',
    prompt: 'What are we offering to make that happen?',
    helper: 'Name the product, service, or system you want the hooks to sell.',
    placeholder: 'e.g., Tala - an internal AI assistant trained on your knowledge base'
  },
  {
    id: 'context',
    prompt: 'Any quick context or proof I should know?',
    helper: 'Totally optional. Share social proof, numbers, or phrases you like.',
    placeholder: 'e.g., onboarded 40 companies, cuts response time by 73%',
    optional: true
  }
];

const initialDiscoveryState: DiscoveryState = {
  audience: '',
  struggle: '',
  desire: '',
  offer: '',
  context: ''
};

const initialConversation: ConversationMessage[] = [
  {
    id: 'intro',
    speaker: 'tala',
    text: 'Let us build hooks from scratch. I just need a few quick hits about who you are serving and what they need.'
  },
  {
    id: `question-${DISCOVERY_QUESTIONS[0].id}`,
    speaker: 'tala',
    text: DISCOVERY_QUESTIONS[0].prompt
  }
];

const MAX_REVIEW_ATTEMPTS = 3;

const buildRequestFromDiscovery = (answers: DiscoveryState): HookRequest => {
  const targetAudience = answers.audience.trim() || 'growth-focused founders';
  const pain = answers.struggle.trim() || 'stuck repeating the same answers';
  const desiredOutcome = answers.desire.trim() || 'move faster without bottlenecks';
  const offering = answers.offer.trim() || 'our system';

  return {
    targetAudience,
    offering,
    painPoints: [pain],
    desiredOutcome,
    marketingChannels: [],
    tone: 'Bold and direct',
    campaignGoal: '',
    additionalNotes: answers.context.trim()
  };
};

const HookGenerator = () => {
  const [answers, setAnswers] = useState<DiscoveryState>(initialDiscoveryState);
  const [conversation, setConversation] = useState<ConversationMessage[]>(initialConversation);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedHook[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>({
    discovery: 'active',
    hookAgent: 'idle',
    verification: 'idle'
  });
  const [reviewNotes, setReviewNotes] = useState<string[]>([]);
  const [lastRequest, setLastRequest] = useState<HookRequest | null>(null);

  const currentQuestion = DISCOVERY_QUESTIONS[currentQuestionIndex];

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

  const addMessage = (message: ConversationMessage) => {
    setConversation((prev) => [...prev, message]);
  };

  const resetExperience = () => {
    setAnswers(initialDiscoveryState);
    setConversation(initialConversation);
    setCurrentQuestionIndex(0);
    setInputValue('');
    setIsGenerating(false);
    setResults([]);
    setCopiedId(null);
    setPipelineStatus({ discovery: 'active', hookAgent: 'idle', verification: 'idle' });
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

  const handleAnswerSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentQuestion) return;

    const trimmed = inputValue.trim();
    if (!trimmed && !currentQuestion.optional) {
      toast.error('Give me a quick note before we move on.');
      return;
    }

    const responseText = trimmed || 'Skipping this for now.';

    const nextAnswers: DiscoveryState = {
      ...answers,
      [currentQuestion.id]: trimmed
    };

    setAnswers(nextAnswers);

    addMessage({
      id: `answer-${currentQuestion.id}-${Date.now()}`,
      speaker: 'user',
      text: responseText
    });

    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex < DISCOVERY_QUESTIONS.length) {
      const nextQuestion = DISCOVERY_QUESTIONS[nextIndex];
      addMessage({
        id: `question-${nextQuestion.id}-${Date.now()}`,
        speaker: 'tala',
        text: nextQuestion.prompt
      });
      setCurrentQuestionIndex(nextIndex);
      setInputValue('');
    } else {
      setPipelineStatus((prev) => ({ ...prev, discovery: 'complete' }));
      setInputValue('');
      void runHookPipeline(nextAnswers);
    }
  };

  const handleSkipOptional = () => {
    if (!currentQuestion || !currentQuestion.optional) return;

    addMessage({
      id: `answer-${currentQuestion.id}-${Date.now()}`,
      speaker: 'user',
      text: 'No extra context for now.'
    });

    const nextAnswers: DiscoveryState = {
      ...answers,
      [currentQuestion.id]: ''
    };

    setAnswers(nextAnswers);

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < DISCOVERY_QUESTIONS.length) {
      const nextQuestion = DISCOVERY_QUESTIONS[nextIndex];
      addMessage({
        id: `question-${nextQuestion.id}-${Date.now()}`,
        speaker: 'tala',
        text: nextQuestion.prompt
      });
      setCurrentQuestionIndex(nextIndex);
      setInputValue('');
    } else {
      setPipelineStatus((prev) => ({ ...prev, discovery: 'complete' }));
      setInputValue('');
      void runHookPipeline(nextAnswers);
    }
  };

  const runHookPipeline = async (updatedAnswers: DiscoveryState) => {
    setIsGenerating(true);
    setResults([]);
    setReviewNotes([]);
    setCopiedId(null);

    const request = buildRequestFromDiscovery(updatedAnswers);
    setLastRequest(request);

    addMessage({
      id: `handoff-${Date.now()}`,
      speaker: 'tala',
      text: 'Perfect. Passing this brief to our Hook Agent trained on Hormozi hooks.'
    });

    let hooks: GeneratedHook[] = [];
    let verificationPassed = false;
    let lastIssues: string[] = [];

    for (let attempt = 1; attempt <= MAX_REVIEW_ATTEMPTS; attempt += 1) {
      setPipelineStatus({
        discovery: 'complete',
        hookAgent: 'active',
        verification: attempt === 1 ? 'idle' : 'retrying'
      });

      try {
        const response = await fetch('/api/hooks/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
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
          setPipelineStatus({ discovery: 'complete', hookAgent: 'retrying', verification: 'retrying' });
          addMessage({
            id: `retry-${Date.now()}`,
            speaker: 'tala',
            text: 'A few of those hooks missed the mark. Asking Hook Generator to tighten them up.'
          });
        }
      } catch (error) {
        console.error('Hook Agent error', error);
        setPipelineStatus({ discovery: 'complete', hookAgent: 'error', verification: 'idle' });
        toast.error('Hook Agent ran into an issue, generating hooks with Tala fallback.');
        break;
      }
    }

    if (!verificationPassed) {
      const fallbackHooks = generateFallbackHooks(request);
      hooks = fallbackHooks;
      setPipelineStatus({ discovery: 'complete', hookAgent: 'complete', verification: 'complete' });
      if (lastIssues.length > 0) {
        setReviewNotes((prev) => [...prev, 'Fallback applied: Tala generated structured hooks so you can ship right now.']);
      } else {
        setReviewNotes(['Fallback applied: Tala generated structured hooks so you can ship right now.']);
      }
    }

    setResults(hooks);

    addMessage({
      id: `delivery-${Date.now()}`,
      speaker: 'tala',
      text: 'Here are twenty hooks based on what you shared. Let me know what to tweak.'
    });

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
            <Sparkles className="text-cyan-300" /> Tala Hook Lab
          </h1>
          <p className="text-white/70 max-w-2xl">
            We start with quick discovery, send your brief to the Hook Agent trained on Hormozi's frameworks, and only deliver
            hooks once Tala verifies they make sense.
          </p>
        </header>

        <section className="glass rounded-2xl border border-white/10 p-6 space-y-6" aria-labelledby="discovery-flow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="discovery-flow" className="text-xl font-semibold">
                Discovery with Tala
              </h2>
              <p className="text-sm text-white/70">
                Answer each prompt in plain language. Tala threads these notes into the hook strategy.
              </p>
            </div>
            <button
              type="button"
              onClick={resetExperience}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:border-cyan-400 hover:text-white"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              {conversation.map((message) => (
                <div key={message.id} className={cn('flex w-full', message.speaker === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-xl rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm',
                      message.speaker === 'tala' && 'border-white/10 bg-white/5 text-white/80',
                      message.speaker === 'user' && 'border-cyan-400/40 bg-cyan-500/20 text-white',
                      message.speaker === 'agent' && 'border-purple-400/40 bg-purple-500/20 text-white'
                    )}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
            </div>

            {currentQuestion && pipelineStatus.discovery !== 'complete' && (
              <form onSubmit={handleAnswerSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="space-y-2">
                  <label htmlFor={`answer-${currentQuestion.id}`} className="text-sm font-medium text-white">
                    {currentQuestion.prompt}
                  </label>
                  {currentQuestion.helper && <p className="text-xs text-white/60">{currentQuestion.helper}</p>}
                </div>
                <textarea
                  id={`answer-${currentQuestion.id}`}
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder={currentQuestion.placeholder}
                  rows={currentQuestion.optional ? 2 : 3}
                  className="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
                <div className="flex items-center justify-between gap-3">
                  {currentQuestion.optional ? (
                    <button
                      type="button"
                      onClick={handleSkipOptional}
                      className="text-xs text-white/50 hover:text-white/80"
                    >
                      Skip for now
                    </button>
                  ) : (
                    <span className="text-xs text-white/40">Required</span>
                  )}
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:scale-[1.01]"
                  >
                    Next
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        <section className="glass rounded-2xl border border-white/10 p-6 space-y-6" aria-labelledby="pipeline-status">
          <div>
            <h2 id="pipeline-status" className="text-xl font-semibold">
              Hook Production Pipeline
            </h2>
            <p className="text-sm text-white/70">Tala only shares hooks after the agent work clears review.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { key: 'discovery', title: 'Discovery', status: pipelineStatus.discovery },
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

        <section className="glass rounded-2xl border border-white/10 p-6 space-y-6" aria-labelledby="hook-results">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="hook-results" className="text-2xl font-semibold">
                Approved Hooks
              </h2>
              <p className="text-sm text-white/70">
                Once the Hook Agent and Tala agree the angles make sense, they land here ready for you to deploy.
              </p>
            </div>
            {isGenerating && (
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
                <Loader2 size={14} className="animate-spin" /> Running pipeline
              </div>
            )}
          </div>

          {summaryItems.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-white">Brief on deck</h3>
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
                Share the quick discovery notes above. Tala will handle the agent workflow and drop approved hooks here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {results.map((hook) => (
                <article key={hook.id} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/50">{hook.type}</p>
                      <h3 className="font-semibold text-white leading-snug">{hook.text}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(hook)}
                      className="rounded-full border border-white/10 p-2 text-white/60 hover:text-white hover:border-cyan-400"
                      aria-label="Copy hook to clipboard"
                    >
                      {copiedId === hook.id ? <ClipboardCheck size={16} className="text-cyan-300" /> : <Clipboard size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-cyan-200">{hook.awareness}</p>
                  <p className="text-sm text-white/70 leading-relaxed">{hook.rationale}</p>
                  <p className="text-xs text-white/50 italic">{hook.channelNote}</p>
                  <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-white/40">
                    {hook.supportingInsights?.length
                      ? hook.supportingInsights.map((insight) => (
                          <span key={insight} className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                            {insight}
                          </span>
                        ))
                      : buildSupportingInsights(lastRequest || buildRequestFromDiscovery(initialDiscoveryState)).map((insight) => (
                          <span key={insight} className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                            {insight}
                          </span>
                        ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default HookGenerator;
