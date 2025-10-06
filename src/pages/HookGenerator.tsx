import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Clipboard, ClipboardCheck, PlusCircle, Sparkles } from 'lucide-react';
import { BASE_HOOK_KNOWLEDGE_SNIPPETS, DEFAULT_MARKETING_CHANNELS, HOOK_KNOWLEDGE, type KnowledgeSnippet } from '../data/hookKnowledge';
import { generateHooks, type GeneratedHook, type HookRequest } from '../utils/hookGenerator';
import { cn } from '../utils/cn';

interface FormState {
  targetAudience: string;
  offering: string;
  painPoints: string;
  desiredOutcome: string;
  marketingChannels: string[];
  tone: string;
  campaignGoal: string;
  additionalNotes: string;
}

const initialForm: FormState = {
  targetAudience: '',
  offering: '',
  painPoints: '',
  desiredOutcome: '',
  marketingChannels: [],
  tone: 'Bold and direct',
  campaignGoal: '',
  additionalNotes: ''
};

const LOCAL_STORAGE_KEY = 'tala-hook-knowledge-snippets';

const marketingChannelHints: Record<string, string> = {
  'Paid Ads': 'Meta, TikTok, YouTube, etc.',
  'Organic Social': 'Reels, Shorts, carousels, LinkedIn posts…',
  'Email': 'Subject lines & preview text',
  'Webinar': 'Opening slides and intros',
  'Landing Page': 'Hero headlines & subheads',
  'Direct Mail': 'Postcards, flyers, dimensional mailers',
  'Sales Call': 'Live or recorded pitch openers'
};

const toneSuggestions = [
  'Bold and direct',
  'Conversational and empathetic',
  'High-energy hype',
  'Calm authority',
  'Data-driven confidence'
];

const splitLines = (value: string) =>
  value
    .split(/\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean);

const HookGenerator = () => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [results, setResults] = useState<GeneratedHook[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customKnowledge, setCustomKnowledge] = useState<KnowledgeSnippet[]>([]);
  const [newSnippet, setNewSnippet] = useState({ title: '', content: '' });

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as KnowledgeSnippet[];
        setCustomKnowledge(parsed);
      } catch (error) {
        console.error('Failed to parse stored hook knowledge', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customKnowledge));
  }, [customKnowledge]);

  const fullKnowledge = useMemo(
    () => [...BASE_HOOK_KNOWLEDGE_SNIPPETS, ...customKnowledge],
    [customKnowledge]
  );

  const handleChange = (field: keyof FormState, value: string | string[]) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleChannel = (channel: string) => {
    setForm((prev) => {
      const exists = prev.marketingChannels.includes(channel);
      return {
        ...prev,
        marketingChannels: exists
          ? prev.marketingChannels.filter((item) => item !== channel)
          : [...prev.marketingChannels, channel]
      };
    });
  };

  const handleGenerate = () => {
    if (!form.targetAudience || !form.offering || !form.painPoints) {
      toast.error('Please complete the audience, offering, and pain points before generating hooks.');
      return;
    }

    const request: HookRequest = {
      targetAudience: form.targetAudience,
      offering: form.offering,
      painPoints: splitLines(form.painPoints),
      desiredOutcome: form.desiredOutcome,
      marketingChannels: form.marketingChannels,
      tone: form.tone,
      campaignGoal: form.campaignGoal,
      additionalNotes: form.additionalNotes
    };

    const generated = generateHooks(request, fullKnowledge);
    setResults(generated);
    toast.success('20 hooks generated from the Hooks That Get Clicks playbook.');
  };

  const handleCopy = async (hook: GeneratedHook) => {
    try {
      await navigator.clipboard.writeText(hook.text);
      setCopiedId(hook.id);
      toast.success('Hook copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Copy failed', error);
      toast.error('Unable to copy. Try again.');
    }
  };

  const addCustomSnippet = () => {
    if (!newSnippet.title.trim() || !newSnippet.content.trim()) {
      toast.error('Add both a title and supporting insight.');
      return;
    }

    const snippet: KnowledgeSnippet = {
      id: `custom-${Date.now()}`,
      title: newSnippet.title.trim(),
      content: newSnippet.content.trim()
    };

    setCustomKnowledge((prev) => [snippet, ...prev]);
    setNewSnippet({ title: '', content: '' });
    toast.success('Knowledge added. Future hooks will use it as context.');
  };

  const removeSnippet = (id: string) => {
    setCustomKnowledge((prev) => prev.filter((snippet) => snippet.id !== id));
    toast.success('Removed custom knowledge.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Sparkles className="text-cyan-300" /> Hook Generator
            </h1>
            <p className="text-white/70 max-w-2xl">
              Build 20 hooks in seconds using the Hooks That Get Clicks playbook. Answer a few strategic questions so the system
              can tailor each line to your audience, offer, pain points, and marketing channel.
            </p>
          </div>
          <div className="glass rounded-xl p-4 border border-white/10 max-w-sm">
            <p className="text-sm uppercase tracking-wide text-white/60">Knowledge Source</p>
            <p className="font-semibold">Hooks That Get Clicks</p>
            <p className="text-sm text-white/70 mt-1">All copy is generated solely from the provided playbook. Add your own supporting knowledge below to specialize outputs.</p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3" aria-label="Hook generator inputs and outputs">
          <section className="glass rounded-2xl border border-white/10 p-6 lg:col-span-2 space-y-6" aria-labelledby="hook-intake">
            <div>
              <h2 id="hook-intake" className="text-xl font-semibold mb-2">Discovery Questions</h2>
              <p className="text-sm text-white/70">These inputs mirror the questions we'd ask live before writing hooks.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="targetAudience">Who is the exact target audience?</label>
                <input
                  id="targetAudience"
                  value={form.targetAudience}
                  onChange={(event) => handleChange('targetAudience', event.target.value)}
                  placeholder="e.g., SaaS founders, gym owners, busy parents"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="offering">What are you offering them?</label>
                <input
                  id="offering"
                  value={form.offering}
                  onChange={(event) => handleChange('offering', event.target.value)}
                  placeholder="e.g., 8-week growth program, AI copy coach, membership"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="painPoints">What pain points are they feeling right now?</label>
              <textarea
                id="painPoints"
                value={form.painPoints}
                onChange={(event) => handleChange('painPoints', event.target.value)}
                placeholder="List each pain on a new line or separate with commas."
                rows={3}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
              <p className="text-xs text-white/50">Example: no-shows, ad fatigue, offers feel copycat.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="desiredOutcome">What outcome should the hook promise?</label>
                <input
                  id="desiredOutcome"
                  value={form.desiredOutcome}
                  onChange={(event) => handleChange('desiredOutcome', event.target.value)}
                  placeholder="e.g., double booked calls, profitable launches"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="campaignGoal">What's the campaign goal?</label>
                <input
                  id="campaignGoal"
                  value={form.campaignGoal}
                  onChange={(event) => handleChange('campaignGoal', event.target.value)}
                  placeholder="e.g., webinar signups, booked demos, digital sales"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">What kind of marketing are you running?</label>
                <div className="grid grid-cols-2 gap-2">
                  {DEFAULT_MARKETING_CHANNELS.map((channel) => (
                    <button
                      key={channel}
                      type="button"
                      onClick={() => toggleChannel(channel)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm transition',
                        form.marketingChannels.includes(channel)
                          ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                          : 'border-white/10 bg-white/5 text-white/80 hover:border-cyan-400'
                      )}
                    >
                      <div className="flex flex-col text-left">
                        <span>{channel}</span>
                        <span className="text-[10px] uppercase tracking-wide text-white/40">{marketingChannelHints[channel]}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="tone">Preferred tone or vibe?</label>
                <select
                  id="tone"
                  value={form.tone}
                  onChange={(event) => handleChange('tone', event.target.value)}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  {toneSuggestions.map((tone) => (
                    <option key={tone} value={tone}>{tone}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="additionalNotes">Anything else we should know?</label>
              <textarea
                id="additionalNotes"
                value={form.additionalNotes}
                onChange={(event) => handleChange('additionalNotes', event.target.value)}
                placeholder="Context, competitive angles, phrases to include, etc."
                rows={3}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 py-3 font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:scale-[1.01] hover:shadow-purple-500/30"
            >
              Generate 20 Hooks
            </button>
          </section>

          <aside className="space-y-6" aria-label="Knowledge base and reminders">
            <section className="glass rounded-2xl border border-white/10 p-6 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="text-cyan-300" size={18} /> Core Principles</h2>
              <ul className="space-y-3 text-sm text-white/80">
                {HOOK_KNOWLEDGE.principles.map((principle) => (
                  <li key={principle.id} className="rounded-lg bg-white/5 border border-white/10 p-3">
                    <p className="font-medium text-white">{principle.title}</p>
                    <p className="text-white/70 text-sm mt-1">{principle.description}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="glass rounded-2xl border border-white/10 p-6 space-y-4" aria-labelledby="knowledge-library">
              <div className="flex items-center justify-between">
                <h2 id="knowledge-library" className="text-lg font-semibold">Knowledge Library</h2>
                <span className="text-xs uppercase tracking-wide text-white/50">Used in generation</span>
              </div>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {fullKnowledge.map((snippet) => (
                  <article key={snippet.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <header className="flex items-center justify-between gap-2">
                      <p className="font-medium text-white text-sm">{snippet.title}</p>
                      {snippet.id.startsWith('custom-') && (
                        <button
                          type="button"
                          onClick={() => removeSnippet(snippet.id)}
                          className="text-xs text-red-300 hover:text-red-200"
                        >
                          Remove
                        </button>
                      )}
                    </header>
                    <p className="text-xs text-white/70 mt-1 leading-relaxed">{snippet.content}</p>
                  </article>
                ))}
              </div>

              <div className="space-y-2 border-t border-white/10 pt-4">
                <p className="text-sm font-medium text-white">Add more knowledge</p>
                <p className="text-xs text-white/60">Log your own frameworks, proof, or industry nuances and they'll inform every future generation.</p>
                <input
                  value={newSnippet.title}
                  onChange={(event) => setNewSnippet((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Snippet title"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
                <textarea
                  value={newSnippet.content}
                  onChange={(event) => setNewSnippet((prev) => ({ ...prev, content: event.target.value }))}
                  placeholder="Key insight, proof, or nuance"
                  rows={3}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
                <button
                  type="button"
                  onClick={addCustomSnippet}
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/60 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400/20"
                >
                  <PlusCircle size={16} /> Save Insight
                </button>
              </div>
            </section>
          </aside>
        </div>

        <section className="glass rounded-2xl border border-white/10 p-6" aria-labelledby="generated-hooks">
          <div className="flex flex-col gap-2 mb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="generated-hooks" className="text-2xl font-semibold">Generated Hooks</h2>
              <p className="text-sm text-white/70">Each line includes the hook type, awareness angle, and reminders on where to deploy it.</p>
            </div>
            {results.length > 0 && (
              <p className="text-xs uppercase tracking-wide text-white/50">20 hooks ready to deploy</p>
            )}
          </div>

          {results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-8 text-center">
              <p className="text-white/70">Answer the discovery questions above and click "Generate 20 Hooks" to see ideas here.</p>
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
                    {hook.supportingInsights.map((insight) => (
                      <span key={insight} className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{insight}</span>
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
