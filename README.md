# 🌱 Sustain & Save — Dual AI Chatbot Platform

An enterprise-oriented AI-powered chatbot platform developed for **Sustain & Save by NMD Pvt Ltd**.

The platform combines two specialized AI assistants — a Public Website Chatbot and an Internal CRM Copilot — with a centralized Admin Dashboard to improve customer engagement, business support, and CRM insights.

## 🚀 Project Overview

Sustain & Save — Dual AI Chatbot Platform is designed to provide intelligent customer assistance and internal business support using Google's Gemini AI.

The system consists of three major modules:

1. **Public Website AI Chatbot:** Assists website visitors with company-related queries, services, pricing, and support information.
2. **Internal CRM AI Copilot:** Provides authenticated employees with AI-assisted CRM insights and read-only business data analysis.
3. **Admin Dashboard:** Provides centralized administration, chatbot configuration, knowledge management, and monitoring capabilities.

## ✨ Key Features

### 1. Public Website Chatbot
- Gemini-powered conversational AI.
- Context-aware responses using a knowledge base.
- Suggested questions for visitors.
- Customer feedback and support escalation.
- Interactive charts for relevant business queries.

### 2. CRM AI Copilot
- Dedicated internal AI assistant.
- Role-based access control.
- Read-only CRM data queries.
- AI-generated business insights.
- CRM analytics and visualizations.

### 3. Admin Dashboard
- Centralized administration.
- User and role management.
- Chatbot configuration.
- Knowledge base management.
- Conversation monitoring.
- Support escalation management.

### 4. Security and Authentication
- Firebase Authentication.
- Google Sign-In.
- Role-based access control (RBAC).
- Firestore security rules.
- Server-side Gemini API integration.
- API request rate limiting.

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React, TypeScript |
| Styling | Tailwind CSS |
| Backend | Node.js, Express.js |
| AI Integration | Google Gemini API |
| Database | Firebase Firestore |
| Authentication | Firebase Authentication |
| Charts | Recharts |
| Icons | Lucide React |
| Build Tool | Vite |

## 🏗️ Project Architecture

The application follows a frontend-backend architecture:

- React frontend handles the user interface and chatbot interactions.
- Express backend handles API requests and server-side business logic.
- Gemini API generates AI-powered responses.
- Firebase provides authentication and database services.
- Knowledge retrieval provides relevant business context to the AI assistants.

## 📁 Project Structure

```text
sustain-save-dual-ai-chatbot/
│
├── public/
│   └── assets/
│
├── src/
│   ├── assets/
│   ├── components/
│   ├── lib/
│   ├── types/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
│
├── server/
│   ├── authVerify.ts
│   ├── crmDemoData.ts
│   ├── geminiService.ts
│   └── knowledgeStore.ts
│
├── data/
├── .env.example
├── .gitignore
├── firebase-applet-config.json
├── firestore.rules
├── package.json
├── server.ts
├── security_spec.md
├── tsconfig.json
└── vite.config.ts
```

## ⚙️ Installation and Setup

### Prerequisites

Install the following:

- Node.js
- npm
- Git
- A Google AI Studio Gemini API key
- A Firebase project

### Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR-USERNAME/sustain-save-dual-ai-chatbot.git
```

### Step 2: Navigate to the Project

```bash
cd sustain-save-dual-ai-chatbot
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Configure Environment Variables

Create a `.env` file in the root directory.

Add:

```env
GEMINI_API_KEY=your_gemini_api_key
APP_URL=http://localhost:3000
```

Never upload your actual API key to GitHub.

### Step 5: Configure Firebase

1. Create or select a Firebase project.
2. Enable Firebase Authentication.
3. Enable Google Sign-In.
4. Set up Cloud Firestore.
5. Configure the Firebase application settings.
6. Update `firebase-applet-config.json` with your own Firebase project configuration.
7. Review and deploy the provided `firestore.rules`.

### Step 6: Run the Application

```bash
npm run dev
```

Open the local application using the URL displayed in your terminal.

## 🔐 Environment Variables

| Variable | Description |
|---|---|
| GEMINI_API_KEY | Google Gemini API key |
| APP_URL | Application base URL |
| SUPPORT_PHONE | Support phone number |
| SUPPORT_WHATSAPP | WhatsApp support number |
| SUPPORT_EMAIL | Support email address |

Keep sensitive credentials private and use environment variables for production deployments.

## 📊 Future Enhancements

- Advanced CRM analytics.
- Improved knowledge retrieval.
- Enhanced chatbot response evaluation.
- Production CRM integrations.
- Advanced reporting and monitoring.
- Scalable cloud deployment.

## 🎯 Project Objective

To develop an intelligent dual-chatbot ecosystem that improves customer interaction, simplifies internal CRM assistance, and supports business operations through AI-powered conversational interfaces.

## 👩‍💻 Author

**Prachi Mahajan**

Project: Sustain & Save — Dual AI Chatbot Platform

## 🙏 Acknowledgements

- Google AI Studio and Gemini
- Firebase
- React and TypeScript communities
- Sustain & Save by NMD Pvt Ltd

---

⭐ If you find this project interesting, consider giving the repository a star!
