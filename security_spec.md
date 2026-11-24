# Security Specification — Sustain & Save Dual AI Chatbot Platform

## 1. Data Invariants
1. **Identity & Privilege Isolation**: No user may self-assign `SUPER_ADMIN`, `CRM_ADMIN`, or `CRM_EMPLOYEE` on profile creation or update. Only a verified `SUPER_ADMIN` (or bootstrapped primary admin `prachiamahajan192008@gmail.com`) may modify user roles or write to `/admins/{uid}`.
2. **PII Isolation**: User email and phone numbers live strictly in `/users/{userId}/private/{docId}`, readable only by the profile owner or a verified Super Admin.
3. **Bot Knowledge & History Separation**: Website Bot documents (`/website_knowledge_base`) and Website conversations (`/website_conversations`) are completely isolated from CRM Bot documents (`/crm_knowledge_base`) and CRM conversations (`/crm_conversations`).
4. **Master Gate Subcollection Ownership**: Messages in `/website_conversations/{conversationId}/website_messages/{messageId}` and `/crm_conversations/{conversationId}/crm_messages/{messageId}` require parent conversation existence and ownership verification (`get()` on parent `ownerId == request.auth.uid`) or Admin role.
5. **Immutable Audit & Creation Fields**: `createdAt`, `ownerId`, `createdBy`, and `actorUid` are immutable once created. All `createdAt` / `updatedAt` fields must match `request.time`.
6. **CRM Data Read-Only Guarantee**: The CRM Chatbot only queries read-only CRM endpoints on the server; no client mutation rule exists for CRM business records.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Self-Privilege Escalation on Create**: Unprivileged user creates `/users/{uid}` with `role: "SUPER_ADMIN"`.
2. **Self-Privilege Escalation on Update**: Existing `WEBSITE_VISITOR` updates `/users/{uid}` with `affectedKeys: ["role"]` set to `"CRM_ADMIN"`.
3. **Ghost Field Injection (Shadow Update)**: User updates `/users/{uid}` with `displayName` plus an unallowed shadow key `isAdmin: true`.
4. **Email Spoofing (Unverified Email)**: Request with `request.auth.token.email == "prachiamahajan192008@gmail.com"` and `email_verified: false` attempting admin write.
5. **PII Cross-Read Attack**: Authenticated `CRM_EMPLOYEE` attempts `get` on `/users/otherUid/private/info`.
6. **Blanket Query Scraping**: Non-owner authenticated user runs unconstrained `list` on `/crm_conversations`.
7. **ID Poisoning Attack**: Attacker attempts `create` on `/website_conversations/invalid$id!with*spaces` or a 1,500-character document ID.
8. **Cross-Owner Message Injection**: Attacker attempts `create` in `/crm_conversations/{victimConvId}/crm_messages/{msgId}` with spoofed `ownerId`.
9. **Temporal Forgery**: User submits `createdAt` backdated to `2020-01-01T00:00:00Z` instead of `request.time`.
10. **Terminal State Bypass**: Non-admin user tries to reopen or modify a `resolved` escalation in `/escalations/{id}`.
11. **Value Poisoning / Resource Exhaustion**: User submits a 150,000-character string in `title` or `text`.
12. **Audit Log Tampering**: Non-admin user attempts to `update` or `delete` an entry in `/audit_logs/{logId}`.
