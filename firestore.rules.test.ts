/**
 * Static and structural verification suite for Sustain & Save Firestore rules
 * against the Dirty Dozen adversarial payloads defined in security_spec.md.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  expectedResult: 'PERMISSION_DENIED';
  guardChecked: string;
}

export const DIRTY_DOZEN_TESTS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Self-Privilege Escalation on Create',
    collectionPath: '/users/attackerUid',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    guardChecked: "incoming().role == 'WEBSITE_VISITOR' || isSuperAdmin()",
  },
  {
    id: 2,
    name: 'Self-Privilege Escalation on Update',
    collectionPath: '/users/attackerUid',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    guardChecked: "affectedKeys().hasOnly(['displayName', 'department', 'updatedAt'])",
  },
  {
    id: 3,
    name: 'Shadow Update Ghost Field Injection',
    collectionPath: '/users/attackerUid',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    guardChecked: 'isValidUserProfile(incoming()) && affectedKeys().hasOnly(...)',
  },
  {
    id: 4,
    name: 'Unverified Email Admin Spoof',
    collectionPath: '/bot_settings/crm',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    guardChecked: 'request.auth.token.email_verified == true',
  },
  {
    id: 5,
    name: 'PII Cross-Read Attack',
    collectionPath: '/users/victimUid/private/info',
    operation: 'get',
    expectedResult: 'PERMISSION_DENIED',
    guardChecked: 'isOwner(userId) || isSuperAdmin()',
  },
  {
    id: 6,
    name: 'Blanket Query Scraping on CRM Conversations',
    collectionPath: '/crm_conversations',
    operation: 'list',
    expectedResult: 'PERMISSION_DENIED',
    guardChecked: 'resource.data.ownerId == request.auth.uid || isBootstrappedSuperAdmin()',
  },
  {
    id: 7,
    name: 'Document ID Poisoning',
    collectionPath: '/website_conversations/bad$id',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    guardChecked: "isValidId(conversationId) && id.matches('^[a-zA-Z0-9_\\\\-]+$')",
  },
  {
    id: 8,
    name: 'Cross-Owner Subcollection Message Injection',
    collectionPath: '/crm_conversations/victimConv/crm_messages/msg1',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    guardChecked: 'get(/databases/$(database)/documents/crm_conversations/$(conversationId)).data.ownerId == request.auth.uid',
  },
  {
    id: 9,
    name: 'Temporal Timestamp Forgery',
    collectionPath: '/website_conversations/conv1',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    guardChecked: 'incoming().createdAt == request.time',
  },
  {
    id: 10,
    name: 'Terminal State Bypass on Resolved Escalation',
    collectionPath: '/escalations/esc1',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    guardChecked: "existing().status != 'resolved' || isSuperAdmin()",
  },
  {
    id: 11,
    name: 'Value Poisoning Oversized String',
    collectionPath: '/website_conversations/conv1/website_messages/msg1',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    guardChecked: 'data.text is string && data.text.size() >= 1 && data.text.size() <= 12000',
  },
  {
    id: 12,
    name: 'Audit Log Immutability Violation',
    collectionPath: '/audit_logs/log1',
    operation: 'delete',
    expectedResult: 'PERMISSION_DENIED',
    guardChecked: 'allow update, delete: if false;',
  },
];
