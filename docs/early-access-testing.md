# Early Access Testing — dadeda.design

Welcome — and thank you. You're seeing the v0.1.0-preview release. The site is functional and most things should work; the goal of this round is to surface what surprises, frustrates, or feels good before the apex domain cutover.

**Staging URL**: <https://website.kathryn-89d.workers.dev/>

Plan to spend ~10–15 minutes. The guided tasks below are not a script — they're prompts to help you encounter the major surfaces. If something pulls your attention sideways, follow it; that's exactly what I want to hear about.

---

## Guided tasks (~10 minutes)

For each: did you complete it? How did it feel — fast / normal / slow / couldn't? Anything to flag?

1. **Discovery (See Work).** Find work I've done on data visualization. Open the case study and read it.

2. **Discovery (Get to Know).** Find an article I've written. Open it (it'll link out to the publishing site).

3. **Reading.** Open one expanded card and scroll through its full body content. Use the navigation inside the card.

4. **Sharing.** Share the site with someone. Any path counts: agent-driven via WebMCP, browser share menu, copy-paste, etc.

5. **Contact.** Email me about a hypothetical project (no need to actually send unless you want to). The path you take matters more than the message.

6. **Architecture.** Find documentation about how the site is built.

After the tasks: **5 minutes of open exploration**. Click around. Try things that don't make sense. Try the site on your phone if you can.

---

## Optional — WebMCP / agent testing

If you have a WebMCP-capable Chrome extension (e.g., a recent build of the Chrome WebMCP test extension or similar), the site exposes 10 tools. Try these prompts via your agent:

- "List the clusters and cards on this site."
- "Find cards tagged with 'data-viz' and summarize them."
- "Open the Sustain Our Soil card and read the full case study."
- "Get Kathryn's resume URL."
- "Share this site with me as a brief intro."

Tools registered: `getSiteMap`, `getCard`, `searchCards`, `focusCard`, `setPrivacyPreferences`, `getResume`, `sendEmail`, `openLinkedInProfile`, `openGitHubProfile`, `shareProfile`. (Also callable via the browser console: `await window.dadeda.callTool('getSiteMap')`.)

If you don't have a WebMCP-capable extension, skip this section — there's no fallback you need.

---

## Submitting feedback

Two paths, pick whichever is easier:

**A. Structured GitHub issue** (preferred for technical testers).
Use this link: <https://github.com/Data-Design-Dimension/website/issues/new?template=tester-feedback.yml>. Form fields cover the per-task pass/fail and open observations. Threaded so I can respond.

**B. Email** (universal fallback).
`kathryn@dadeda.design` with the same fields filled in: per-task pass/fail + how-long + open notes + browser/device. No structure required — just write what you saw.

Either way: **screenshots are gold**, especially for visual issues. Drag-drop them into the GitHub issue or attach to the email.

---

## What I'm NOT looking for in this round

- Polish-level word smithing on case-study text. The bodies are first drafts and will iterate.
- Missing case-study content for older works (sustain-our-soil, freedom-map, invest-as-one are sketches). Filling those out is post-launch.
- The CRT-style scanlines / flicker enhancement question (issue #32). I want to hear if the cards feel insufficiently CRT BEFORE deciding whether to add those.

## What I AM looking for

- **Did you find what you were looking for?** Each task should resolve in seconds, not minutes.
- **Did the site feel responsive?** Cursor lag, expand jank, scroll weirdness — name it.
- **Did anything surprise you?** Visual artifacts, unexpected behaviors, "wait, what just happened?" moments.
- **Did anything feel really good?** Equally important — those are the threads to pull on.
- **Mobile.** If you tried on a phone, even just for a minute: report.

---

## Outreach copy I send to testers

Reusable for whatever channel I'm using to invite people:

> Hey — I'm rolling out an early-access preview of dadeda.design and would love your eyes on it. Visit https://website.kathryn-89d.workers.dev/. There's a short list of guided tasks (~10 min) plus open exploration here: https://github.com/Data-Design-Dimension/website/blob/main/docs/early-access-testing.md. Submit feedback via this issue template (https://github.com/Data-Design-Dimension/website/issues/new?template=tester-feedback.yml) or just email me at kathryn@dadeda.design. Anything that surprises, frustrates, or feels good is gold. Thanks ✌️
