# Calibrate

A small tool for a real question. Does this prompt actually do what I think it does?

## Why this exists

"How do you evaluate AI features?" comes up in most AI PM interviews. This is a working answer instead of a talking point. It describes what I want the AI to do, build a checklist for what good looks like, run a real example through it, and get back a scored, plain language report instead of a guess.

## How it is different from the big tools

Tools like Braintrust and Confident AI already offer no code evaluation for product managers in 2026. They are built for teams. They need an account, usually a paid plan, and someone to connect your actual product to the platform.

This is a single file version of the same core idea, built for one person to use in one sitting. No account, no setup call, no team plan. You open it, paste your own API key, and it works.

## How it works

1. Pick what you want the AI to do from a short list, or describe your own task in plain words
2. Confirm the instruction, then build a checklist using the rubric library. Search it, browse it by category, or write your own criteria
3. Paste a real example, or attach a text file
4. Run it. The tool checks your example is real content first, then generates an output, then grades that output against your checklist
5. Read the report. It leads with a plain language verdict, then shows the reasoning behind each score

## A few honest notes

The same AI that generates the output also grades it in this version, and self grading has a known bias where a model can favor its own style of answer. The report says this plainly rather than hiding it. A more rigorous setup would use a different model family as the judge.

One test case is not a statistically meaningful result. Treat a single run as a first look, not a final verdict.

## Try it

Live: `https://asawiraemaankhan.github.io/eval-harness/`

Bring your own Anthropic API key. It stays in your browser tab for that session only. It is never stored and never sent anywhere except Anthropic's API.

## What is next

These are not built yet, but they are the natural next steps if this grows past a demo.

- Save a set of test cases so re running after a prompt edit takes one click instead of starting over
- Run two versions of a prompt against the same test set and compare which one wins per criterion
- Let the judge be a different model family than the generator, to reduce self preference bias
- A shareable link for a single report, so it can be sent without opening the tool

## Stack

Plain HTML, CSS, and JavaScript. No build step, no framework, no backend.

```
index.html
styles.css
script.js
README.md
```
