# Sustain & Save – AI Chatbots (Website bot + CRM bot)

Implements quotation **NMD/QT/2026/103**: two chatbots on **Gemini 3.5 Flash**, developed and trained separately, one backend.

| Quotation requirement | Where it is |
|---|---|
| Bot 1 – Website (frontend), 24x7, trained on website content/FAQs/documents | `app/bots/website_bot.py`, content in `knowledge/website/` |
| Bot 2 – CRM (backend), leads/customers/follow-ups/reports, CRM guide + SOPs | `app/bots/crm_bot.py`, `app/reports.py`, `knowledge/crm/` |
| Pie and bar charts | `chart` in every response, drawn by `static/widget.js` |
| Smart Escalation (no guessing → Call / WhatsApp buttons) | `escalate: true` + `support` in the response, buttons in the widget |
| Chat history in the CRM panel | `chat_history` table, `/admin/history`, `/api/admin/*` |
| Separate training / knowledge bases | one folder per bot, one retriever per bot |
| CRM: secure read-only data access | all CRM queries use a SQLite `mode=ro` connection |
| CRM: role-based access | `PERMS` / `OWNER_SCOPED` in `app/reports.py`; role is looked up server-side |
| First training with 100 questions | `app/training/crm_training_100.json` (72 data + 28 how-to) |
| 1M tokens per bot | usage is logged; see `/api/admin/usage` |

## 1. Run it (5 minutes)

```bash
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                   # Windows: copy .env.example .env
uvicorn app.main:app --reload
```

Open:
- http://localhost:8000/ – demo website with the **website bot**
- http://localhost:8000/demo/crm – demo CRM with the **CRM bot** (switch users to see role-based access)
- http://localhost:8000/admin/history?token=change-me-admin – **chat history** panel

Without a `GEMINI_API_KEY` the bots run in **offline demo mode** (answers come straight from the knowledge base and
SQL, so everything works, just without Gemini's natural-language phrasing). To switch on Gemini:
put the key in `.env` (get it from Google AI Studio) and check `GEMINI_MODEL` matches the exact model id shown there.

Run the tests: `python -m pytest -q` (26 tests, includes role access, read-only enforcement and training-set checks).

## 2. How each bot decides what to do

**Website bot:** finds the best matching passages in `knowledge/website/`. If nothing matches well, it does **not** call Gemini
and does not guess: it returns the Call / WhatsApp escalation. If a match exists, Gemini writes the answer using only those passages
(and may attach a chart from `knowledge/website_charts.json`).

**CRM bot:** (1) how-to question → answer from the CRM guide; (2) data question → a fixed, tested SQL report for the user's role,
so figures are **never invented by the AI**; (3) asks to change data → politely refused; (4) anything else → Gemini picks a report as a
fallback, otherwise escalation.

## 3. Before it is real – replace the sample content

Everything marked `[SAMPLE CONTENT]` / "Sample" is placeholder. I did not have Sustain & Save's real content.

1. `knowledge/website/*.md` – paste the real website text, FAQs, policies. One `## Heading` per topic; the first paragraph of each file is skipped.
2. `knowledge/website_charts.json` – real figures for visual answers (or delete the entries).
3. `knowledge/crm/*.md` – the real CRM user guide, SOPs and business rules.
4. `.env` – real `SUPPORT_PHONE`, `SUPPORT_WHATSAPP`, and new random values for `ADMIN_TOKEN` and `CRM_SHARED_SECRET`; set `DEMO_MODE=0`.
5. Training questions – add the team's real questions to `app/training/crm_training_100.json` (this is the AMC "add new questions" work).
   Entries with `"a"` are answered directly; others map to a report `intent`.

## 4. Connecting the real CRM (the one part that needs the CRM's details)

The demo uses a sample SQLite database. For the real CRM:
1. Create a **read-only database user** on the CRM database (this is what makes "read-only" real).
2. Point `app/db.py → ro()` at it, and adjust the SQL in `app/reports.py` to the CRM's real table and column names.
   Keep the `PERMS` table in sync with the CRM's roles.
3. **Login:** the CRM backend must know the logged-in user. Add an endpoint in the CRM that returns
   `security.make_token(user_id)` (copy `app/security.py`'s logic using the same `CRM_SHARED_SECRET`) and give it to the widget through `getToken`.
   The chatbot only trusts that signed token, never a role sent by the browser.

## 5. Putting the widgets on the sites

Website (before `</body>`):
```html
<script src="https://YOUR-BOT-SERVER/static/widget.js" data-bot="website"></script>
```
CRM:
```html
<script src="https://YOUR-BOT-SERVER/static/widget.js"></script>
<script>
  SustainSaveBot.init({ bot: "crm", apiBase: "https://YOUR-BOT-SERVER",
    getToken: () => fetch("/crm/chatbot-token").then(r => r.json()).then(j => j.token) });
</script>
```
In `app/main.py` change `allow_origins=["*"]` to the real website and CRM domains.

**Chat history in the CRM panel:** embed or link `/admin/history`, or have the CRM call
`GET /api/admin/sessions?bot=website|crm` and `GET /api/admin/conversation?bot=…&session_id=…` with `Authorization: Bearer <ADMIN_TOKEN>`.
Put it behind the CRM's own admin login in production.

## 6. Deployment notes

Any Linux server or platform that runs Python 3.10+: `uvicorn app.main:app --host 0.0.0.0 --port 8000` behind HTTPS (nginx/Caddy).
Back up `data/sustain_save.db` (chat history lives there). Gemini needs outbound internet access.

## Known limits (be upfront with the client)

- The Gemini connection was written to the public REST API but **could not be tested here** (no API key / network in my build environment). Test it once with your key; the offline path is fully tested.
- Questions the keyword router doesn't recognise rely on Gemini as a fallback; with no key they go to escalation. More training questions improve this.
- The widget was checked for syntax and served correctly but I could not click through it in a real browser. Please do one visual check of the pie/bar charts.
- Rate limiting is in-memory (single server). Use a proper gateway if you run several servers.
