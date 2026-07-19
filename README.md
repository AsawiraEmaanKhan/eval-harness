# Calibrate — Eval Harness for Prompts

A small instrument for a real question: does this prompt actually do what I think it does?

## Why

"How do you evaluate AI features?" comes up in most AI PM interviews. This is the answer as a working tool instead of a talking point — define what "good" means for a use case, run real test cases against a live model, and get back a scored, reasoned report per criterion instead of a gut check.

## How it works

1. Write the prompt you'd actually ship, with `{{input}}` marking where each test case drops in
2. Define a rubric — a handful of named criteria and what good looks like for each
3. Add test cases with real inputs (and optional reference notes)
4. Run — the tool calls Claude once to generate the output, then again as a judge to score it against the rubric
5. Read the report: per-case scores with reasoning, plus an aggregate reading on the gauge

## Try it

Live: `https://asawiraemaankhan.github.io/eval-harness/`

Bring your own Anthropic API key. It's used only in your browser for that session — never stored, never sent anywhere but Anthropic's API.

## Stack

Vanilla HTML, CSS, and JS. No build step, no framework, no backend. Three files:

- `index.html` — structure
- `styles.css` — design system
- `script.js` — logic and the Anthropic Messages API call

## Files in this repo

```
index.html
styles.css
script.js
README.md
```

Deploy by pushing to GitHub and turning on Pages (Settings → Pages → Deploy from branch → main → /root).
