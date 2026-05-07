# Early Access Testing — dadeda.design

Welcome — and thank you. You're seeing the v0.1.0-preview release. The site is functional and most things should work; the goal of this round is to surface what surprises, frustrates, or feels good before the apex domain cutover.

**Staging URL**: <https://website.kathryn-89d.workers.dev/>

Plan to spend ~10–15 minutes. The guided tasks below are not a script — they're prompts to help you encounter the major surfaces. If something pulls your attention sideways, follow it; that's exactly what I want to hear about.

---

## Guided tasks (~10 minutes)

For each: did you complete it? How did it feel — fast / normal / slow / couldn't? Anything to flag?

1. **Discovery (See Work).** Find work I've done on AI. Expand the card and read about it. Find a demo to watch.

2. **Discovery (Get to Know).** Find an article I've written. Open it (it'll link out to the publishing site).

3. **Reading.** Open one expanded card and scroll through its full body content. Use the navigation inside the card.

4. **Sharing.** Share the site with someone. Any path counts: contact > share, browser share menu, copy-paste, etc.

5. **Contact.** Email me about a hypothetical project (no need to actually send unless you want to). The path you take matters more than the message.

6. **Architecture.** Find documentation about how the site is built.

After the tasks: **5 minutes of open exploration**. Click around. Try things that don't make sense. Try the site on your phone if you can.

---

## Optional — WebMCP / agent testing

If you have a WebMCP-capable Chrome extension (e.g., [WebMCP Inspector 3.0.0](https://chromewebstore.google.com/detail/webmcp-inspector/edfjnadfiapmddgplgnphlflgafmcino?pli=1) or [WebMCP - Model Context Tool Inspector](https://chromewebstore.google.com/detail/webmcp-model-context-tool/gbpdfapgefenggkahomfgkhfehlcenpd)) and the following pre-requisite Chrome flags enabled, the site exposes 10 tools.

⚠️ **Prerequisites**: Go to `chrome://flags` and enable the "WebMCP for testing" flag in Chrome 146.0.7672.0 or higher.

Try these prompts via your agent:

- "List the clusters and cards on this site."
- "Find cards tagged with 'data-viz' and summarize them."
- "Open the Sustain Our Soil card and read the full case study."
- "Get Kathryn's resume URL."
- "Share this site with me as a brief intro."

Tools registered: `getSiteMap`, `getCard`, `searchCards`, `focusCard`, `setPrivacyPreferences`, `getResume`, `sendEmail`, `openLinkedInProfile`, `openGitHubProfile`, `shareProfile`. (Also callable via the browser console: `await window.dadeda.callTool('getSiteMap')`.)

If you don't have a WebMCP-capable extension, skip this section — there's no fallback you need.

---

## Submitting feedback

Three paths, easiest first:

**A. The form at [/testing](https://website.kathryn-89d.workers.dev/testing).** Below this doc on that page is an interactive form. Fill the fields, click **Submit via GitHub** (opens a prefilled issue in a new tab; you click submit on GitHub to send) or **Send via email** (opens your mail client with everything in the body). Universal — works whether or not you have a GitHub account.

**B. The GitHub issue template directly.** <https://github.com/Data-Design-Dimension/website/issues/new?template=tester-feedback.yml>. Same fields, filled in on GitHub.

**C. Plain email.** `kathryn@dadeda.design` with the same fields. **Please include the specific browser and device you tested on** — be precise, the exact model matters for perf / CPU / GPU diagnostics (e.g., "Chrome 145 / MacBook Pro 16-inch 2019 / macOS 14.5", "Safari / iPhone 14 Pro / iOS 18", "Firefox 130 / Dell XPS 13 9310 / Windows 11"). No other structure required — just write what you saw.

Either way: **screenshots help a lot**, especially for visual issues. Drag-drop them into the GitHub issue or attach to the email — neither prefilled URL can carry binary files, so add them after submission.

---

## What I'm NOT looking for in this round

- Polish-level word smithing on case-study text. The bodies are first drafts and will iterate.
- Missing case-study content for other works. Older projects were archived and I'll be adding more anonymized examples from NDA-protected agency work post-launch. For now, my goal is a slim balanced set of projects across AI / engineering and dataviz.

## What I AM looking for

- **Did you find what you were looking for?** Each task should resolve in seconds, not minutes.
- **Did the site feel responsive?** Cursor lag, expand jank, scroll weirdness — name it.
- **Did anything surprise you?** Visual artifacts, unexpected behaviors, "wait, what just happened?" moments.
- **Did anything feel really good?** Equally important — those are the threads to pull on.
- **Mobile.** If you tried on a phone, even just for a minute: report.

---

## Outreach copy I send to testers

Reusable for whatever channel I'm using to invite people:

> Hi. I'm rolling out an early-access preview of dadeda.design, my personal professional website, and would love your eyes on it. Visit https://website.kathryn-89d.workers.dev/. There's a short list of guided tasks to follow (~10 min) plus open exploration, with a feedback form at the bottom of the page: https://website.kathryn-89d.workers.dev/testing. The form submits via GitHub if you have an account, or by email if you don't (please include the specific browser and device you tested on — model matters for perf diagnostics). Anything that surprises, frustrates, or feels good will help me. Thanks ✌️
