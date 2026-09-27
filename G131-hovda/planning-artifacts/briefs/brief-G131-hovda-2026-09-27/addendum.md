# Addendum: Studievenn

Background detail for downstream documents (PRD, architecture). This addendum is not part of the brief itself.

## Landscape research (web, 2026-09-27; unverified secondary sources)

### Comparables
- **Google NotebookLM / Gemini Notebook**: summaries, flashcards, quizzes and a learning guide from uploaded sources; generous free tier. No awareness of course codes or exams; weak progress tracking.
- **Quizlet**: AI features behind Plus (~$8/mo); spaced repetition, term-level "retention insights".
- **Knowt**: free for students; turns PDF, PPT and video into cards and practice tests; unit mastery only for US standardized tests.
- **StudyFetch**: AI tutor and study sets; ~$20/mo.
- **Anki**: free, FSRS scheduler; AI generation needs add-ons (high setup cost).
- **ChatGPT study mode**: Socratic knowledge checks; no persistent per-course progress.
- **Norwegian**: StuderSmartere.no (quiz, flashcards, study plans from pasted curriculum), Eksamensportalen (exam simulation and progress statistics; NTNU/BI), Penseum (supports Norwegian).
- Market signal: Norwegian students increasingly replace textbooks with ChatGPT (Utdanningsnytt/NRK 2025).

### Observed gap
No tool found that gives per-course readiness feedback measured against the course's learning outcomes (læringsutbytte), nor one designed around time-poor part-time students.

### Legal and policy constraints
- **Copyright**: Kopinor agreement limits copying (~15% of a book, education use). Uploading others' copyrighted work to external AI services is discouraged. Favour students' own notes.
- **HiMolde AI policy (2026)**: AI allowed with declaration; no personal data or copyrighted material into open AI tools; approved tools include Sikt KI, Copilot Chat.
- **GDPR**: EU data residency, a no-training agreement with the LLM provider, data minimisation and user deletion. EU AI Act preparation (source: HK-dir).

### Learning science
- Spaced retrieval practice compared with massed practice: g = 0.74 (ERIC EJ1310148). The effect is smaller in math (g = 0.28) and mixed in introductory STEM.
- Implication: short, spaced quiz sessions; FSRS-style scheduling; honest claims about effects.

### Sources
- https://notebooklm-guide.com/notebooklm-quiz-flashcard-upgrade-2026-enhanced/
- https://knowt.com/
- https://openai.com/index/chatgpt-study-mode/
- https://studersmartere.no/
- https://www.penseum.com/
- https://www.utdanningsnytt.no/hoyere-utdanning-kunstig-intelligens-pensum/studenter-kutter-ut-pensumboker-velger-chatgpt/456194
- https://www.kopinor.no/artikler/kopinor-avtalen-for-universiteter-og-hgskoler
- https://www.uio.no/tjenester/ki/juridiskeforinger.html
- https://www.himolde.no/om/aktuelt/aktuelle-saker/2026/nye-retningslinjer-for-ki-for-studenter.html
- https://sikt.no/tjenester/sikt-ki
- https://eric.ed.gov/?id=EJ1310148

## Pilot course: IBE430 Forretningsprosesser og ERP (checked 2026-09-27)

- Page: https://www.himolde.no/studier/emner/log/2026/host/ibe430.html
- URL pattern: `/studier/emner/{faculty}/{year}/{semester}/{code}.html`. The faculty segment (`log`) is not derivable from the course code alone, so lookup needs a search step or a mapping.
- Content is plain HTML sections. No JSON or API is visible; the data originates in FS (Felles Studentsystem). Fetching therefore means scraping, which breaks if the site changes.
- 7.5 ECTS. Learning outcomes are split into:
  - Knowledge: models for purchasing, sales, production and integrated processes; how ERP supports and automates them.
  - Skills: execute processes in ERP/SAP; link models to execution; document work, data, document and information flows.
  - Competence: evaluate ERP aspects.
- The reading list is in Leganto (external; likely requires login). No chapter list on the course page, so the chapter structure must come from the user.
- Exam: choice of 2-hour written school exam without aids, or 15-minute oral remote exam; A–F.
- Implication: quizzes can train the knowledge outcomes and flow-documentation understanding, but not hands-on SAP execution.

## Development approach

- The app is built with Claude Code and BMad agents, which satisfies IBE160's "AI-generated application" requirement. The brief, `.memlog.md` and later BMad artifacts serve as evidence of AI usage.
- The runtime LLM provider the app calls (for summaries, questions, feedback) is not yet chosen. The architecture must choose one, weighing EU data residency, no-training terms, cost and Norwegian-language quality.
- Voice spike: early on, test browser speech-to-text in Norwegian on the user's iPad and phone (about 1 hour).
- Planning deadline: 22 November 2026 (end of teaching). Exact submission date unconfirmed.
