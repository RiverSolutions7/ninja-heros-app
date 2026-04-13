# NINJA H.E.R.O.S. COACH HUB — ROADMAP

*Updated April 2026.*

---

## STATUS KEY
[ ] = Not started
[~] = In progress / needs fixes or testing
[x] = Fully done and confirmed working
[—] = Removed — no longer part of the architecture

---

## CURRENT FOCUS
- [x] Replace Handoff tab with Today's Plan tab
- [x] Library tab shows Components only (Games / Warmups / Stations)
- [x] Today's Plan — pick components from library into slots
- [x] Today's Plan — 48 hour auto-delete with 36 hour nudge
- [x] Today's Plan — save plan to a date (becomes class history)
- [x] Skill recency tracker sourced from saved plan history
- [x] Voice input on Today's Plan coach notes
- [x] Voice input on component logging (description field)
- [x] Remove full class builder system entirely

---

## REMOVED (architectural decision — April 2026)
- [—] Full class builder (warmup / lanes / game block form)
- [—] Log Class flow (/library/new)
- [—] Class detail view (/library/[classId])
- [—] Class run view (/class/[id])
- [—] Quick Log flow (/library/quick-log)
- [—] Save Today's Plan as a Full Class (replaced by: saved plan IS the history)
- [—] Skill recency from lane_blocks / class_blocks join (replaced by plan history)

---

## IN PROGRESS

---

## DESIGN
[ ] Full visual redesign — elevate app from prototype aesthetic to
    premium SaaS quality. Goals:
    - Clean typography hierarchy, one font, precise sizing, generous whitespace
    - Restrained color palette — one or two accent colors used intentionally
    - Remove all visual noise: gradients, glows, emoji icons
    - Every screen feels consistent, intentional, and spacious
    - Reference: Notion, Linear, Apple native apps
    - Target feel: software worth paying $20-50/month for

---

## QUICK WINS (Do Next)
[ ] Sub Briefing mode — tap a saved plan to get a read-only view
    formatted for a sub coach (replaces the old Handoff tab purpose)
[ ] Component use count — "Last used: 2 weeks ago" sourced from plan history
[ ] "What should I teach today?" — skill recency drives AI suggestion

---

## MEDIUM TERM
[ ] AI component suggestions based on skill gaps and recent plan history
[ ] Curriculum standards view — shareable read-only page per curriculum
[ ] Program stats dashboard — classes per curriculum, most used components,
    skill coverage over time
[ ] Class templates — clone a saved plan as a starting point for a new plan

---

## LONG TERM
[ ] Multi-gym architecture — each gym gets its own workspace
[ ] SaaS pricing model — monthly subscription per gym
[ ] Network effect — aggregate data across gyms for best practices

---

## DONE (archive)
- [x] Auto-populate components from logged classes
- [x] Toast confirmation after save
- [x] Draft auto-save — restore unfinished log if coach is interrupted
- [x] + Log Component button on library header
- [x] Persist curriculum selection in URL params (/skills?curriculum=Mini+Ninjas)
- [x] Block reordering — drag handles so coaches can reorder plan items

---

*Do not delete any items. Update status markers as work progresses.*
