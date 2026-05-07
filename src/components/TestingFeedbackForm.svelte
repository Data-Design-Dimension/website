<script lang="ts">
  /**
   * Early-access tester feedback form for /testing.
   *
   * Submitting prefills a GitHub issue (opens GitHub's new-issue page
   * in a new tab with title + body + tester-feedback label populated).
   * The tester clicks Submit on GitHub's side to create the issue —
   * one-click from their perspective; GitHub's confirm step is unavoidable
   * without a server backend (logged in #32 backlog).
   *
   * Email fallback: same form fields, but composes a mailto: with the
   * body filled in. Universal — no GitHub account needed.
   *
   * URL length safety: GitHub's prefilled URL has a ~6000-char practical
   * limit. If the body exceeds it, copy the body to clipboard and open
   * the issue page with title-only.
   */

  const REPO = 'Data-Design-Dimension/website';
  const EMAIL = 'kathryn@dadeda.design';
  const SAFE_URL_LENGTH = 6000;

  let name = $state('');
  let browserDevice = $state('');
  let task1 = $state('');
  let task2 = $state('');
  let task3 = $state('');
  let task4 = $state('');
  let task5 = $state('');
  let task6 = $state('');
  let surprised = $state('');
  let frustrated = $state('');
  let feltGood = $state('');
  let webmcpNotes = $state('');
  let mobileNotes = $state('');

  let submitMessage = $state<string | null>(null);
  let submitState = $state<'idle' | 'opened' | 'copied' | 'error'>('idle');

  const browserDeviceValid = $derived(browserDevice.trim().length > 0);

  function buildIssueBody(): string {
    const today = new Date().toISOString().slice(0, 10);
    const lines: string[] = [];
    lines.push(`# Early access tester feedback — ${today}`);
    lines.push('');
    if (name.trim()) lines.push(`**Name**: ${name.trim()}`);
    lines.push(`**Browser + device**: ${browserDevice.trim()}`);
    lines.push('');
    lines.push('## Per-task feedback');
    lines.push('');
    const tasks: Array<[string, string, string]> = [
      ['1', 'Discovery (See Work) — find AI work + a demo', task1],
      ['2', 'Discovery (Get to Know) — find an article', task2],
      ['3', 'Reading — open one expanded card', task3],
      ['4', 'Sharing — share the site', task4],
      ['5', 'Contact — email about a hypothetical project', task5],
      ['6', 'Architecture — find docs about how the site is built', task6],
    ];
    for (const [n, label, value] of tasks) {
      const v = value.trim();
      if (v) {
        lines.push(`### ${n}. ${label}`);
        lines.push('');
        for (const line of v.split('\n')) lines.push(line);
        lines.push('');
      }
    }
    lines.push('## Open observations');
    lines.push('');
    if (surprised.trim()) {
      lines.push('**Surprised**:');
      lines.push(surprised.trim());
      lines.push('');
    }
    if (frustrated.trim()) {
      lines.push('**Frustrated**:');
      lines.push(frustrated.trim());
      lines.push('');
    }
    if (feltGood.trim()) {
      lines.push('**Felt good**:');
      lines.push(feltGood.trim());
      lines.push('');
    }
    if (webmcpNotes.trim()) {
      lines.push('## WebMCP / agent notes');
      lines.push('');
      lines.push(webmcpNotes.trim());
      lines.push('');
    }
    if (mobileNotes.trim()) {
      lines.push('## Mobile notes');
      lines.push('');
      lines.push(mobileNotes.trim());
      lines.push('');
    }
    lines.push('---');
    lines.push('');
    lines.push('_Submitted via the /testing form. Add screenshots as a comment after the issue is created._');
    return lines.join('\n');
  }

  function buildIssueTitle(): string {
    const today = new Date().toISOString().slice(0, 10);
    const tag = name.trim() || 'anonymous';
    return `[tester] ${tag} — ${today}`;
  }

  function clearMessage() {
    submitState = 'idle';
    submitMessage = null;
  }

  async function submitGitHub(e: SubmitEvent) {
    e.preventDefault();
    clearMessage();
    if (!browserDeviceValid) {
      submitState = 'error';
      submitMessage = 'Please fill in browser + device first.';
      return;
    }
    const title = buildIssueTitle();
    const body = buildIssueBody();
    const baseUrl = `https://github.com/${REPO}/issues/new`;
    const params = new URLSearchParams({ title, body, labels: 'tester-feedback' });
    const fullUrl = `${baseUrl}?${params.toString()}`;
    if (fullUrl.length <= SAFE_URL_LENGTH) {
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
      submitState = 'opened';
      submitMessage =
        'GitHub opened in a new tab with everything prefilled. Click "Submit new issue" on GitHub to send. Add screenshots as a comment afterward.';
    } else {
      try {
        if (navigator.clipboard) await navigator.clipboard.writeText(body);
        const fallbackParams = new URLSearchParams({
          title,
          body: '<!-- Body was too long for a single URL — copied to your clipboard. Paste here. -->',
          labels: 'tester-feedback',
        });
        window.open(`${baseUrl}?${fallbackParams.toString()}`, '_blank', 'noopener,noreferrer');
        submitState = 'copied';
        submitMessage =
          'Body was too long for a URL — copied to your clipboard. Paste it into the GitHub issue body and submit.';
      } catch {
        submitState = 'error';
        submitMessage =
          'Browser blocked clipboard access. Open DevTools console and run window.__lastBody to copy manually.';
        (window as unknown as { __lastBody?: string }).__lastBody = body;
      }
    }
  }

  function submitEmail(e: MouseEvent) {
    e.preventDefault();
    clearMessage();
    if (!browserDeviceValid) {
      submitState = 'error';
      submitMessage = 'Please fill in browser + device first.';
      return;
    }
    const title = buildIssueTitle();
    const body = buildIssueBody();
    const params = new URLSearchParams({ subject: title, body });
    const mailto = `mailto:${EMAIL}?${params.toString()}`;
    if (mailto.length <= SAFE_URL_LENGTH) {
      window.location.href = mailto;
      submitState = 'opened';
      submitMessage = 'Opening your mail client with the form contents in the body.';
    } else {
      // Long body — copy + open mailto with empty body.
      try {
        if (navigator.clipboard) navigator.clipboard.writeText(body);
        window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(title)}`;
        submitState = 'copied';
        submitMessage =
          'Body was too long for a mailto URL — copied to your clipboard. Paste it into the email body before sending.';
      } catch {
        submitState = 'error';
        submitMessage =
          "Browser blocked clipboard access. Use the GitHub button above, or copy the form text manually and email it.";
      }
    }
  }

  async function copyAll() {
    clearMessage();
    const body = buildIssueBody();
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(body);
      submitState = 'copied';
      submitMessage = 'Form contents copied to clipboard. Paste into a GitHub issue body or email.';
    } catch {
      submitState = 'error';
      submitMessage = 'Clipboard access blocked. Select the text manually below and copy.';
    }
  }
</script>

<form class="tf-form" onsubmit={submitGitHub}>
  <h2>Submit your feedback</h2>
  <p class="tf-intro">
    Fill in whatever fields are relevant — most are optional. The
    <strong>browser + device</strong> field is required so I can
    correlate visual / perf issues across hardware.
  </p>

  <div class="tf-grid">
    <label class="tf-field">
      <span class="tf-label">Your name <span class="tf-optional">(optional)</span></span>
      <input
        type="text"
        bind:value={name}
        placeholder="How you'd like me to credit you, if at all"
      />
    </label>

    <label class="tf-field tf-field-required">
      <span class="tf-label">
        Browser + specific device <span class="tf-required-tag">required</span>
      </span>
      <input
        type="text"
        bind:value={browserDevice}
        placeholder="e.g., Chrome 145 / MacBook Pro 16-inch 2019 / macOS 14.5"
        required
      />
      <span class="tf-hint">
        Be precise — the exact model matters for perf / CPU / GPU
        diagnostics. Other examples: "Safari / iPhone 14 Pro / iOS 18",
        "Firefox 130 / Dell XPS 13 9310 / Windows 11".
      </span>
    </label>
  </div>

  <fieldset class="tf-fieldset">
    <legend>Per-task feedback</legend>
    <p class="tf-hint">For each: did you complete it? How did it feel — fast / normal / slow / couldn't? Anything to flag?</p>

    <label class="tf-field">
      <span class="tf-label">1. Discovery (See Work) — find AI work + a demo</span>
      <textarea bind:value={task1} rows="2" placeholder="Result, how it felt, notes"></textarea>
    </label>
    <label class="tf-field">
      <span class="tf-label">2. Discovery (Get to Know) — find an article</span>
      <textarea bind:value={task2} rows="2" placeholder="Result, how it felt, notes"></textarea>
    </label>
    <label class="tf-field">
      <span class="tf-label">3. Reading — open one expanded card and scroll</span>
      <textarea bind:value={task3} rows="2" placeholder="Result, how it felt, notes"></textarea>
    </label>
    <label class="tf-field">
      <span class="tf-label">4. Sharing — share the site (any path)</span>
      <textarea bind:value={task4} rows="2" placeholder="Path you took, result, how it felt"></textarea>
    </label>
    <label class="tf-field">
      <span class="tf-label">5. Contact — email me about a hypothetical project</span>
      <textarea bind:value={task5} rows="2" placeholder="Result, how it felt, notes"></textarea>
    </label>
    <label class="tf-field">
      <span class="tf-label">6. Architecture — find docs about how the site is built</span>
      <textarea bind:value={task6} rows="2" placeholder="Result, how it felt, notes"></textarea>
    </label>
  </fieldset>

  <fieldset class="tf-fieldset">
    <legend>Open observations</legend>
    <label class="tf-field">
      <span class="tf-label">What surprised you?</span>
      <textarea bind:value={surprised} rows="2" placeholder="Visual artifacts, unexpected behaviors, 'wait, what?' moments"></textarea>
    </label>
    <label class="tf-field">
      <span class="tf-label">What frustrated you?</span>
      <textarea bind:value={frustrated} rows="2" placeholder="Anything that felt slow, broken, or annoying"></textarea>
    </label>
    <label class="tf-field">
      <span class="tf-label">What felt good?</span>
      <textarea bind:value={feltGood} rows="2" placeholder="Equally important — the threads to pull on"></textarea>
    </label>
  </fieldset>

  <fieldset class="tf-fieldset">
    <legend>Optional</legend>
    <label class="tf-field">
      <span class="tf-label">WebMCP / agent notes</span>
      <textarea
        bind:value={webmcpNotes}
        rows="2"
        placeholder="Extension used, tools that worked, tools that didn't"
      ></textarea>
    </label>
    <label class="tf-field">
      <span class="tf-label">Mobile testing notes</span>
      <textarea
        bind:value={mobileNotes}
        rows="2"
        placeholder="If you tried on a phone — what worked / what didn't"
      ></textarea>
    </label>
  </fieldset>

  <div class="tf-actions">
    <button type="submit" class="tf-btn tf-btn-primary">
      Submit via GitHub →
    </button>
    <button type="button" class="tf-btn" onclick={submitEmail}>
      Send via email
    </button>
    <button type="button" class="tf-btn tf-btn-text" onclick={copyAll}>
      Copy all to clipboard
    </button>
  </div>
  {#if submitMessage}
    <p
      class="tf-status"
      class:error={submitState === 'error'}
      role="status"
      aria-live="polite"
    >
      {submitMessage}
    </p>
  {/if}
  <p class="tf-screenshot-hint">
    Screenshots are best added as comments to the GitHub issue (after submission)
    or as attachments to the email — neither prefilled URL can carry binary
    files.
  </p>
</form>

<style>
  .tf-form {
    margin: var(--space-12) 0 0;
    padding: var(--space-8) var(--space-6);
    background: var(--color-canvas-light);
    border-radius: 0.75rem;
    border: 1px solid var(--color-border);
  }
  .tf-form h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 var(--space-3);
  }
  .tf-intro {
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin: 0 0 var(--space-6);
  }
  .tf-intro :global(strong) {
    color: var(--color-text-primary);
  }
  .tf-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }
  @media (min-width: 720px) {
    .tf-grid {
      grid-template-columns: 1fr 2fr;
    }
  }
  .tf-fieldset {
    margin: 0 0 var(--space-6);
    border: none;
    padding: 0;
  }
  .tf-fieldset legend {
    font-size: 0.8125rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
    padding: 0;
    margin: 0 0 var(--space-3);
  }
  .tf-field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: var(--space-4);
  }
  .tf-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-primary);
  }
  .tf-optional {
    color: var(--color-text-muted);
    font-weight: 400;
  }
  .tf-required-tag {
    background: oklch(0.78 0.10 25);
    color: oklch(0.20 0.05 25);
    font-size: 0.625rem;
    font-weight: 600;
    padding: 0.05rem 0.4rem;
    border-radius: 0.3rem;
    margin-left: 0.4rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .tf-hint {
    color: var(--color-text-muted);
    font-size: 0.8125rem;
    line-height: 1.5;
  }
  .tf-form input[type='text'],
  .tf-form textarea {
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    padding: 0.5rem 0.7rem;
    font: inherit;
    font-size: 0.9375rem;
    line-height: 1.5;
    background: var(--color-surface);
    color: var(--color-text-primary);
    box-sizing: border-box;
    width: 100%;
  }
  .tf-form input[type='text']:focus,
  .tf-form textarea:focus {
    outline: 2px solid var(--color-accent-blue);
    outline-offset: 1px;
  }
  .tf-form textarea {
    resize: vertical;
    min-height: 3.5rem;
  }
  .tf-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
    margin-top: var(--space-6);
  }
  .tf-btn {
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
    border-radius: 0.4rem;
    padding: 0.6rem 1.1rem;
    cursor: pointer;
    font: inherit;
    font-size: 0.9375rem;
    font-weight: 500;
    transition: transform var(--duration-fast) ease, background var(--duration-fast) ease, border-color var(--duration-fast) ease;
  }
  .tf-btn:hover {
    background: var(--color-canvas-light);
    transform: translateY(-1px);
  }
  .tf-btn:active {
    transform: translateY(0);
  }
  .tf-btn-primary {
    background: oklch(0.78 0.12 145);
    border-color: oklch(0.55 0.16 145);
    color: oklch(0.18 0.05 145);
    font-weight: 600;
  }
  .tf-btn-primary:hover {
    background: oklch(0.82 0.14 145);
  }
  .tf-btn-text {
    border-color: transparent;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .tf-btn-text:hover {
    background: transparent;
    color: var(--color-text-primary);
  }
  .tf-status {
    margin: var(--space-4) 0 0;
    padding: 0.6rem 0.9rem;
    background: oklch(0.95 0.04 145);
    border: 1px solid oklch(0.65 0.10 145);
    border-radius: 0.4rem;
    font-size: 0.875rem;
    color: oklch(0.30 0.10 145);
    line-height: 1.5;
  }
  .tf-status.error {
    background: oklch(0.95 0.04 25);
    border-color: oklch(0.65 0.16 25);
    color: oklch(0.30 0.16 25);
  }
  .tf-screenshot-hint {
    margin: var(--space-4) 0 0;
    color: var(--color-text-muted);
    font-size: 0.8125rem;
    line-height: 1.5;
  }
</style>
