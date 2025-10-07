import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Clipboard, ClipboardCheck, Sparkles } from 'lucide-react';
import { DEFAULT_MARKETING_CHANNELS } from '../data/hookKnowledge';
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

const marketingChannelHints: Record<string, string> = {
  'Paid Ads': 'Meta, TikTok, YouTube, etc.',
  'Organic Social': 'Reels, Shorts, carousels, LinkedIn posts…',
  Email: 'Subject lines & preview text',
  Webinar: 'Opening slides and intros',
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

const formatList = (items: string[]) => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
};

const HookGenerator = () => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [results, setResults] = useState<GeneratedHook[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<HookRequest | null>(null);

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

    const marketingChannels = form.marketingChannels.length
      ? form.marketingChannels
      : [DEFAULT_MARKETING_CHANNELS[0]];

    const request: HookRequest = {
      targetAudience: form.targetAudience,
      offering: form.offering,
      painPoints: splitLines(form.painPoints),
      desiredOutcome: form.desiredOutcome,
      marketingChannels,
      tone: form.tone,
      campaignGoal: form.campaignGoal,
      additionalNotes: form.additionalNotes
    };

    const generated = generateHooks(request);
    setResults(generated);
    setLastRequest(request);
    toast.success('Generated 20 hooks tuned to your brief.');
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

  const briefItems = lastRequest
    ? [
        { label: 'Audience', value: lastRequest.targetAudience },
        { label: 'Offer', value: lastRequest.offering },
        { label: 'Top pains', value: formatList(lastRequest.painPoints) },
        { label: 'Desired outcome', value: lastRequest.desiredOutcome },
        { label: 'Campaign goal', value: lastRequest.campaignGoal },
        { label: 'Tone', value: lastRequest.tone },
        { label: 'Channels', value: formatList(lastRequest.marketingChannels) },
        { label: 'Notes', value: lastRequest.additionalNotes }
      ].filter((item) => item.value)
    : [];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="text-cyan-300" /> Hook Generator
          </h1>
          <p className="text-white/70 max-w-2xl">
            Tala ingests your audience insights, offer, and campaign goal, then builds twenty focused openings you can deploy
            across channels. Share the brief, press generate, and test the angles that feel right.
          </p>
        </header>

        <section className="glass rounded-2xl border border-white/10 p-6 space-y-6" aria-labelledby="hook-intake">
          <div>
            <h2 id="hook-intake" className="text-xl font-semibold mb-2">
              Discovery Questions
            </h2>
            <p className="text-sm text-white/70">
              These prompts mirror the way our strategists gather context before writing hooks. Keep answers tight and specific.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="targetAudience">
                Who is the exact target audience?
              </label>
              <input
                id="targetAudience"
                value={form.targetAudience}
                onChange={(event) => handleChange('targetAudience', event.target.value)}
                placeholder="e.g., SaaS founders, gym owners, busy parents"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="offering">
                What are you offering them?
              </label>
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
            <label className="text-sm font-medium" htmlFor="painPoints">
              What pain points are they feeling right now?
            </label>
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
              <label className="text-sm font-medium" htmlFor="desiredOutcome">
                What outcome should the hook promise?
              </label>
              <input
                id="desiredOutcome"
                value={form.desiredOutcome}
                onChange={(event) => handleChange('desiredOutcome', event.target.value)}
                placeholder="e.g., double booked calls, profitable launches"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="campaignGoal">
                What's the campaign goal?
              </label>
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
              <label className="text-sm font-medium" htmlFor="tone">
                Preferred tone or vibe?
              </label>
              <select
                id="tone"
                value={form.tone}
                onChange={(event) => handleChange('tone', event.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                {toneSuggestions.map((tone) => (
                  <option key={tone} value={tone}>
                    {tone}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="additionalNotes">
              Anything else we should know?
            </label>
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

        <section className="glass rounded-2xl border border-white/10 p-6 space-y-6" aria-labelledby="generated-hooks">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="generated-hooks" className="text-2xl font-semibold">
                Generated Hooks
              </h2>
              <p className="text-sm text-white/70">
                Tala threads your brief through each hook, pairing the pains you listed with the promise you need to make.
              </p>
            </div>
            {results.length > 0 && <p className="text-xs uppercase tracking-wide text-white/50">20 hooks ready to deploy</p>}
          </div>

          {briefItems.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-white">Active brief</h3>
              <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                {briefItems.map((item) => (
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
                Answer the discovery questions above and click "Generate 20 Hooks" to see tailored angles appear here.
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
                    {hook.supportingInsights.map((insight) => (
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
