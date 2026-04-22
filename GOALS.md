# NINJA H.E.R.O.S. COACH HUB — GOALS & STRATEGY

---

## THE VISION

Most gym programs live inside one person's head.

The lead coach knows how to structure a class, which skills to
rotate, what equipment goes where, how to modify for different
ages, and what games keep kids engaged. None of that is written
down anywhere.

When that coach calls out sick, takes a vacation, or quits —
the program quality drops immediately. When a new hire starts,
they shadow for weeks before they can run a class alone. When
the owner wants to open a second location, they realize the
program can't be copied because it was never a system. It was
a person.

**This app exists to change that.**

The Ninja H.E.R.O.S. Coach Hub is a visual architecture of
your unique program — organized, searchable, and growing in
value over time. Every component logged makes the library
richer. Every skill tracked builds a record. Every plan saved
becomes the history.

---

## WHAT THIS APP CHANGES

**Before:** Program lives in one coach's head. Quality depends
on who shows up that day.

**After:** Program lives in a system. Any coach can open the
app, understand the standards, visualize the layout, and run
a class confidently on day one.

---

## THE COMPETITIVE BET

Most SaaS apps for gyms compete on features. This one competes
on *feel*.

Coaches use this app while standing on the gym floor during
live class — phone in one hand, kids running around, 30 seconds
between activities. If any interaction feels janky — a button
that doesn't respond, an animation that stutters, a gesture
that misfires — the coach loses trust. Over a month, that
trust erodes into churn.

The product bar is **Apple-grade mobile polish.** Interactions
match iOS 17+ system apps (Photos, Notes, Messages, Reminders).
This is the moat. Feature-rich competitors exist; polished
competitors don't.

Polish is not aesthetics. Polish is retention.

---

## THE TWO-TOOL ARCHITECTURE

### Library — The Knowledge Base

Individual components (games and stations) are logged here.
Each component has:
- Description and coaching cues (logged by voice or typed)
- Photos showing real equipment setup
- Video of the activity in action
- Tagged skills, curriculum, and equipment

The library is searchable and organized by type (Games /
Stations). The more components are logged, the more valuable
the library becomes. Every coach who logs a great game is
contributing to a shared system that outlasts them.

### Today's Plan — The Class Record

Coaches assemble plans by pulling from the library. When a
plan is saved to a date, that saved plan **is** the class
history. No separate logging step. No duplicate data entry.

Plan → Save → Done. The calendar becomes the class history
automatically.

---

## WHAT THE APP MAKES EASY

- **Log new material** — quick, mobile-first, done in minutes.
  Speak your description with the mic button; the app formats
  it into coaching cues automatically
- **Log partial information** — had a great game but no time
  to document more? Log just the game. The system accepts it
  cleanly
- **Plan with confidence** — build classes by pulling from a
  real library of proven components that already worked in
  your gym
- **Track skills over time** — the Skills tab shows what's
  been worked recently and what needs attention, sourced
  directly from saved plan history
- **Onboard new coaches** — no more weeks of shadowing. Open
  the app, read the library, use the plan history, run the
  class
- **Add new curriculums** — Mini Ninjas, Junior Ninjas, Girls
  Gymnastics, whatever comes next — each with their own skill
  sets

---

## THE HEAD COACH'S VOICE LAYER

Every component description can be captured by speaking.
Every plan item gets a coach note captured by speaking.

This means the system captures the institutional knowledge
that normally exists only in a coach's head — the real cues,
the real modifications, the real context — in the same time
it takes to say them out loud.

---

## THE CORE PRINCIPLE

This is not a scheduling tool. This is not a billing tool.

**This is a program intelligence system.**

The data compounds. The more components are logged, the more
valuable the library becomes. The more plans are saved, the
richer the class history. The more coaches who use it, the
stronger the institutional knowledge.

A gym that builds this system owns something no competitor
can copy — a living, growing record of everything that makes
their program work.

---

## LOGGING PHILOSOPHY

**Log what you have, nothing more.**

A coach should be able to log just a game or just one station
without being forced to fill out an entire class structure. A
single great component documented is more valuable than a
complex template left blank.

**Voice first.**

If a coach has to type a detailed description at the end of
a long day, it won't get done. If they can tap a mic button
and speak for 30 seconds, it will. Voice is the primary input
method for descriptions and coach notes.

---

## HOW THIS APP IS BUILT

Polish at this bar requires infrastructure most solo founders
skip. The workflow is deliberate:

- **Claude Design** (primary — 80% of polish work). Every new
  feature and every polish iteration starts in a visual design
  tool. Iterate on the feel before any code gets written.
- **Claude Code** (implementation). Builds features from Claude
  Design specs. Uses the canonical primitive library from
  `memory/MEMORY.md` (Button, Chip, BottomSheet, ConfirmSheet,
  ChoiceSheet, MenuList, etc.). Never invents a new primitive
  when an existing one covers the case.
- **polish-audit subagent** (automated quality gate). Fires
  after every commit via a PostToolUse hook. Reviews against
  iOS HIG, design primitives, accessibility, state coverage.
  Catches drift before it ships.
- **inspect.dev** (rare — 20%). Device-level debugging when a
  bug reproduces on the iPhone but not locally. Reserved for
  cases where the design is right but the code isn't doing
  what the design says.

**Rule of thumb: 80% of polish work starts in Claude Design.
Code is the output, not the starting point.**

---

## WHO THIS IS BUILT FOR

**Right now:** Just Tumble Ninja H.E.R.O.S. program in
Connecticut — proving the model works in a real gym with real
coaches and real classes.

**Next:** Any ninja gym, gymnastics program, or youth fitness
facility that has the same problem — great coaches, no system.

---

## SHORT-TERM GOALS (Now)

1. Build the component library consistently — 20+ components
   logged with photos and voice descriptions
2. Use Today's Plan for every class — save each plan to a
   date so it becomes the class history automatically
3. Use the Skills tab weekly — let plan history drive the
   skill rotation
4. Keep the app simple — every feature must pass the test:
   would a tired coach use this at 8pm after teaching 3 classes?

---

## MEDIUM-TERM GOALS (3-6 Months)

*Preconditioned on the polish workflow running at full speed
— polish fixes taking ~5 minutes end-to-end, not 90. Until
that pace is real, these goals stay on hold.*

1. Pitch to other ninja and gymnastics gyms
2. Multi-gym architecture — each gym gets their own workspace
3. Coach onboarding flow — new coaches see program context
   immediately on first open

---

## LONG-TERM VISION (6-12+ Months)

1. Become the operating system for youth fitness programs
2. Pricing model: monthly SaaS subscription per gym
3. Network effect — aggregate data across gyms shows industry
   trends, best practices, most effective skill progressions
4. The gym that builds this system wins — not because their
   coaches are better, but because their program doesn't depend
   on any one of them

---

## DESIGN PRINCIPLES

- **Build for the busiest coach** — if it takes more than 5
  minutes to log a component, it won't get used
- **Voice first** — speaking is faster than typing. Mic
  buttons appear wherever descriptions or notes are captured
- **Log what you have** — partial logs are valid. Never force
  a coach to complete more than they have time for
- **Visual first** — photos and videos are not optional. A
  sub coach needs to see the setup, not just read about it
- **The library is the product** — the more that gets logged,
  the more valuable the system becomes
- **Simple over feature-rich** — every addition should make
  the app easier to use, not harder
- **Grow beyond any one coach** — the whole point is that the
  program outlasts the people who built it
- **Design before code** — new features start in Claude Design,
  not in the codebase. Iterate on the feel first, then implement.
- **Use the primitive registry** — every interactive element
  has a canonical primitive (see `memory/MEMORY.md`). Never
  invent a new one when an existing one covers the case.

---

*This document is the north star. Every feature, every design
decision, every conversation about this product should trace
back to something on this page.*
