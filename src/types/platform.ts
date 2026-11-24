export type UserRole =
  | 'SUPER_ADMIN'
  | 'CRM_ADMIN'
  | 'CRM_EMPLOYEE'
  | 'WEBSITE_VISITOR';

export type BotType = 'website' | 'crm';

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  role: UserRole;
  department?: string;
  status: 'active' | 'suspended';
  createdAt?: string;
  updatedAt?: string;
}

export interface SupportConfig {
  companyName: string;
  supportPhone: string;
  whatsappNumber: string;
  supportEmail: string;
  headOffice: string;
  branchOffice: string;
  contactUrl: string;
  updatedAt?: string;
}

export interface BotConfig {
  botType: BotType;
  botName: string;
  welcomeMessage: string;
  systemInstructions: string;
  model: string;
  temperature: number;
  maxResponseLength: number;
  knowledgeBaseId: string;
  crmDataMode?: 'demo_ro' | 'production_ro';
  enabled: boolean;
  suggestedQuestions: string[];
  updatedAt?: string;
}

export interface ChartDatum {
  name: string;
  value: number;
  secondary?: number;
}

export interface ChartPayload {
  type: 'pie' | 'bar' | 'line';
  title: string;
  subtitle?: string;
  valueLabel?: string;
  secondaryLabel?: string;
  data: ChartDatum[];
}

export interface ChatMessageItem {
  id: string;
  conversationId: string;
  botType: BotType;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  escalated?: boolean;
  feedback?: 'none' | 'up' | 'down';
  sourceRefs?: string[];
  chart?: ChartPayload;
  secondaryChart?: ChartPayload;
  tablePreview?: {
    columns: string[];
    rows: Array<Array<string | number>>;
  };
  isDemoData?: boolean;
}

export interface ConversationSummary {
  id: string;
  ownerId: string;
  ownerLabel: string;
  botType: BotType;
  title: string;
  status: 'active' | 'escalated' | 'resolved';
  unansweredCount: number;
  messageCount: number;
  lastMessagePreview: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessageItem[];
}

export interface KnowledgeDoc {
  id: string;
  botType: BotType;
  title: string;
  category: string;
  sourceType: 'pdf' | 'docx' | 'txt' | 'custom';
  content: string;
  chunkCount: number;
  active: boolean;
  processingStatus: 'indexed' | 'processing' | 'disabled';
  hasEmbeddings: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingQuestion {
  id: string;
  botType: BotType;
  category: string;
  question: string;
  answer: string;
  intent?: string;
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EscalationItem {
  id: string;
  ownerId: string;
  ownerLabel: string;
  botType: BotType;
  conversationId: string;
  question: string;
  channel: 'auto' | 'call' | 'whatsapp' | 'email';
  status: 'open' | 'in_review' | 'resolved';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogItem {
  id: string;
  actorUid: string;
  actorLabel: string;
  action: string;
  target: string;
  detail: string;
  createdAt: string;
}

export interface DemoLead {
  id: string;
  name: string;
  company: string;
  source: 'Website Chatbot' | 'LinkedIn' | 'Organic Search' | 'Referral' | 'Trade Expo' | 'Direct Inquiry';
  status: 'New' | 'Qualified' | 'Proposal Sent' | 'Negotiation' | 'Won' | 'Lost';
  owner: string;
  estimatedValueInr: number;
  createdAt: string;
  requiresFollowUp: boolean;
}

export interface DemoCustomer {
  id: string;
  company: string;
  contactName: string;
  industry: string;
  plan: 'Starter Energy Audit' | 'Growth Sustainability' | 'Enterprise Net-Zero';
  annualContractInr: number;
  registeredAt: string;
  accountManager: string;
  lastInteraction: string;
}

export interface DemoFollowUp {
  id: string;
  subject: string;
  accountName: string;
  owner: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'Overdue' | 'Completed';
}

export interface DemoSupportTicket {
  id: string;
  subject: string;
  customer: string;
  category: 'Hardware Telemetry' | 'Billing & AMC' | 'ESG Reporting' | 'Portal Access';
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Pending' | 'Resolved';
  createdAt: string;
  slaHoursRemaining: number;
}
