import type {
  ChartPayload,
  DemoCustomer,
  DemoFollowUp,
  DemoLead,
  DemoSupportTicket,
  UserRole,
} from '../src/types/platform';

const SOURCES: DemoLead['source'][] = [
  'Website Chatbot',
  'LinkedIn',
  'Organic Search',
  'Referral',
  'Trade Expo',
  'Direct Inquiry',
];

const LEAD_STATUSES: DemoLead['status'][] = [
  'New',
  'Qualified',
  'Proposal Sent',
  'Negotiation',
  'Won',
  'Lost',
];

const OWNERS = [
  'Aarav Kulkarni',
  'Sneha Deshmukh',
  'Rohan Joshi',
  'Priya Nair',
];

const INDUSTRIES = [
  'Manufacturing',
  'Cold Chain Logistics',
  'Pharmaceuticals',
  'Textiles',
  'Commercial Real Estate',
  'Hospitality',
];

const PLANS: DemoCustomer['plan'][] = [
  'Starter Energy Audit',
  'Growth Sustainability',
  'Enterprise Net-Zero',
];

const COMPANIES = [
  'Sahyadri Precision Gears',
  'Deccan Cold Storage Pvt Ltd',
  'Kaveri BioPharma Labs',
  'Indus Green Textiles',
  'Poona Eco Packaging',
  'Maratha Agro Processors',
  'Zenith Automotive Components',
  'Western Ghats Hospitality',
  'Bharat Solar Castings',
  'Navratna Specialty Chemicals',
  'Vindhya Paper Mills',
  'Konkan Marine Logistics',
  'Narmada Dairy Cooperative',
  'Satpura Steel Fabricators',
  'Godavari Food Park',
  'Chakan Industrial Warehousing',
  'Talegaon Robotics Hub',
  'Bhosari Polymer Works',
  'Hinjewadi Tech Campus',
  'Solapur Spinning Mills',
  'Kolhapur Foundry Works',
  'Nashik Cold Chain Hub',
  'Aurangabad Auto Ancillaries',
  'Thane Green Plastics',
  'Navi Mumbai Port Logistics',
  'Pune Metro Facilities',
  'Baramati Organic Foods',
  'Sangli Sugar & Ethanol',
  'Nagpur Solar Grid Co',
  'Amravati Cotton Ginning',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isoDayOffset(daysAgo: number): string {
  const base = new Date('2026-11-24T09:00:00Z');
  base.setUTCDate(base.getUTCDate() - daysAgo);
  return base.toISOString().slice(0, 10);
}

// 50 Sample Leads (Clearly marked DEMO)
export const DEMO_LEADS: DemoLead[] = Array.from({ length: 50 }, (_, idx) => {
  const num = idx + 1;
  // First 22 leads in current month (Nov 2026), remaining 28 in Oct/Sep 2026
  const daysAgo = idx < 22 ? (idx % 23) : 25 + ((idx - 22) * 2);
  const source = SOURCES[idx % SOURCES.length];
  const status = LEAD_STATUSES[(idx * 3 + 1) % LEAD_STATUSES.length];
  const owner = OWNERS[idx % OWNERS.length];
  const requiresFollowUp = status === 'New' || status === 'Qualified' || status === 'Proposal Sent';

  return {
    id: `DEMO-LD-${String(num).padStart(3, '0')}`,
    name: `Lead Contact ${num}`,
    company: `${COMPANIES[idx % COMPANIES.length]}${idx >= COMPANIES.length ? ' Unit II' : ''}`,
    source,
    status,
    owner,
    estimatedValueInr: 45000 + ((idx * 17500) % 240000),
    createdAt: isoDayOffset(daysAgo),
    requiresFollowUp,
  };
});

// 30 Sample Customers (Clearly marked DEMO)
export const DEMO_CUSTOMERS: DemoCustomer[] = Array.from({ length: 30 }, (_, idx) => {
  const num = idx + 1;
  // 8 registered in current month (Nov 2026), 22 earlier
  const daysAgo = idx < 8 ? idx * 2 + 1 : 28 + (idx - 8) * 9;
  const plan = PLANS[idx % PLANS.length];
  const acv =
    plan === 'Enterprise Net-Zero'
      ? 240000 + (idx % 4) * 35000
      : plan === 'Growth Sustainability'
      ? 125000 + (idx % 3) * 20000
      : 69998 + (idx % 3) * 10000;

  return {
    id: `DEMO-CU-${String(num).padStart(3, '0')}`,
    company: COMPANIES[idx % COMPANIES.length],
    contactName: `Account Representative ${num}`,
    industry: INDUSTRIES[idx % INDUSTRIES.length],
    plan,
    annualContractInr: acv,
    registeredAt: isoDayOffset(daysAgo),
    accountManager: OWNERS[idx % OWNERS.length],
    lastInteraction:
      idx % 3 === 0
        ? 'Completed Q4 energy baseline audit and shared EM-100 telemetry report.'
        : idx % 3 === 1
        ? 'Reviewed monthly kWh savings (+14.2% reduction) and scheduled AMC check-in.'
        : 'Requested ESG compliance export for ISO 14001 renewal.',
  };
});

// 20 Sample Follow-Ups (Clearly marked DEMO)
export const DEMO_FOLLOWUPS: DemoFollowUp[] = Array.from({ length: 20 }, (_, idx) => {
  const num = idx + 1;
  const status: DemoFollowUp['status'] =
    idx < 8 ? 'Pending' : idx < 13 ? 'Overdue' : 'Completed';
  const priority: DemoFollowUp['priority'] =
    idx % 3 === 0 ? 'High' : idx % 3 === 1 ? 'Medium' : 'Low';
  return {
    id: `DEMO-FU-${String(num).padStart(3, '0')}`,
    subject:
      idx % 4 === 0
        ? 'Quotation NMD/QT/2026/103 & ROI Walkthrough'
        : idx % 4 === 1
        ? 'EM-100 Hardware Installation Scheduling'
        : idx % 4 === 2
        ? 'Annual Sustainability Contract Renewal'
        : 'Post-Demo Technical Compliance Call',
    accountName: COMPANIES[idx % COMPANIES.length],
    owner: OWNERS[idx % OWNERS.length],
    dueDate:
      status === 'Overdue'
        ? isoDayOffset(2 + (idx % 5))
        : `2026-11-${pad2(24 + (idx % 6))}`,
    priority,
    status,
  };
});

// 15 Sample Support Tickets (Clearly marked DEMO)
const TICKET_CATEGORIES: DemoSupportTicket['category'][] = [
  'Hardware Telemetry',
  'Billing & AMC',
  'ESG Reporting',
  'Portal Access',
];

export const DEMO_TICKETS: DemoSupportTicket[] = Array.from({ length: 15 }, (_, idx) => {
  const num = idx + 1;
  const status: DemoSupportTicket['status'] =
    idx < 4 ? 'Open' : idx < 8 ? 'In Progress' : idx < 11 ? 'Pending' : 'Resolved';
  const priority: DemoSupportTicket['priority'] =
    idx % 4 === 0 ? 'High' : idx % 2 === 0 ? 'Medium' : 'Low';
  return {
    id: `DEMO-TK-${String(num).padStart(3, '0')}`,
    subject:
      idx % 3 === 0
        ? 'Gateway telemetry sync delay on plant meter #3'
        : idx % 3 === 1
        ? 'Requesting Scope 2 emission factor update in monthly PDF'
        : 'Add 2 CRM employee seats with read-only report access',
    customer: COMPANIES[idx % COMPANIES.length],
    category: TICKET_CATEGORIES[idx % TICKET_CATEGORIES.length],
    priority,
    status,
    createdAt: isoDayOffset(idx % 18),
    slaHoursRemaining: status === 'Resolved' ? 0 : 4 + ((idx * 5) % 36),
  };
});

export interface CrmQueryResult {
  matched: boolean;
  refusedMutation?: boolean;
  summaryText: string;
  facts: Record<string, string | number>;
  chart?: ChartPayload;
  secondaryChart?: ChartPayload;
  tablePreview?: {
    columns: string[];
    rows: Array<Array<string | number>>;
  };
  sourceName: string;
}

const MUTATION_PATTERN =
  /\b(delete|remove|drop|truncate|update|modify|edit|change|insert|create|add|overwrite|wipe)\b.*\b(lead|leads|customer|customers|record|records|ticket|tickets|follow[\s-]?up|database|table|crm)\b/i;

export function getScopedDemoDataset(role: UserRole, userName?: string) {
  // CRM_EMPLOYEE sees owner-scoped subset for lead/follow-up ownership if matched, otherwise full anonymized aggregate;
  // for demo clarity we scope leads/follow-ups to primary owner when employee role is active and show clear notice.
  const isEmployee = role === 'CRM_EMPLOYEE';
  const scopedOwner = userName && OWNERS.includes(userName) ? userName : 'Aarav Kulkarni';

  const leads = isEmployee
    ? DEMO_LEADS.filter((l) => l.owner === scopedOwner)
    : DEMO_LEADS;
  const followUps = isEmployee
    ? DEMO_FOLLOWUPS.filter((f) => f.owner === scopedOwner)
    : DEMO_FOLLOWUPS;
  const customers = isEmployee
    ? DEMO_CUSTOMERS.filter((c) => c.accountManager === scopedOwner)
    : DEMO_CUSTOMERS;
  const tickets = DEMO_TICKETS;

  return {
    isDemo: true,
    scopeLabel: isEmployee
      ? `DEMO DATA · Employee Scope (${scopedOwner})`
      : 'DEMO DATA · Organization-Wide Read-Only View',
    leads,
    customers,
    followUps,
    tickets,
  };
}

export function queryCrmReadOnly(
  question: string,
  role: UserRole,
  userName?: string
): CrmQueryResult {
  const q = question.toLowerCase();

  if (MUTATION_PATTERN.test(q)) {
    return {
      matched: true,
      refusedMutation: true,
      summaryText:
        'CRM Chatbot operates strictly in read-only mode. Creating, updating, or deleting CRM leads, customers, follow-ups, or tickets is disabled by server policy. Please perform record modifications directly inside the authorized CRM workflow.',
      facts: { accessMode: 'READ_ONLY_ENFORCED' },
      sourceName: 'CRM Security Policy (Read-Only Guard)',
    };
  }

  const scoped = getScopedDemoDataset(role, userName);
  const currentMonthPrefix = '2026-11';
  const monthlyLeads = scoped.leads.filter((l) => l.createdAt.startsWith(currentMonthPrefix));
  const monthlyCustomers = scoped.customers.filter((c) =>
    c.registeredAt.startsWith(currentMonthPrefix)
  );

  // 1. Leads by source / this month's leads
  if (
    (q.includes('lead') && (q.includes('source') || q.includes('channel'))) ||
    q.includes('leads by source')
  ) {
    const targetLeads = q.includes('month') ? monthlyLeads : scoped.leads;
    const counts: Record<string, number> = {};
    for (const lead of targetLeads) {
      counts[lead.source] = (counts[lead.source] || 0) + 1;
    }
    const chartData = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    return {
      matched: true,
      summaryText: `[DEMO DATA] Computed ${targetLeads.length} ${
        q.includes('month') ? 'November 2026 ' : ''
      }leads across ${chartData.length} acquisition sources (${scoped.scopeLabel}).`,
      facts: {
        totalLeads: targetLeads.length,
        topSource: chartData[0]?.name || 'N/A',
        topSourceCount: chartData[0]?.value || 0,
      },
      chart: {
        type: 'pie',
        title: q.includes('month')
          ? 'This Month Leads by Source (DEMO)'
          : 'Total Leads by Source (DEMO)',
        subtitle: `${targetLeads.length} leads analyzed`,
        valueLabel: 'Leads',
        data: chartData,
      },
      secondaryChart: {
        type: 'bar',
        title: 'Lead Volume Comparison by Source (DEMO)',
        valueLabel: 'Leads',
        data: chartData,
      },
      tablePreview: {
        columns: ['Source', 'Lead Count', 'Share %'],
        rows: chartData.map((d) => [
          d.name,
          d.value,
          `${((d.value / Math.max(targetLeads.length, 1)) * 100).toFixed(1)}%`,
        ]),
      },
      sourceName: 'CRM Read-Only Lead Analytics (DEMO)',
    };
  }

  // 2. Which leads require follow-up / follow-up stats
  if (q.includes('follow-up') || q.includes('followup') || q.includes('follow up')) {
    const pendingFollowUps = scoped.followUps.filter((f) => f.status !== 'Completed');
    const leadsNeedingFollowUp = scoped.leads.filter((l) => l.requiresFollowUp);
    const statusMap: Record<string, number> = { Pending: 0, Overdue: 0, Completed: 0 };
    for (const f of scoped.followUps) {
      statusMap[f.status] = (statusMap[f.status] || 0) + 1;
    }
    const chartData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    return {
      matched: true,
      summaryText: `[DEMO DATA] Found ${pendingFollowUps.length} active follow-up tasks (${statusMap.Overdue} overdue, ${statusMap.Pending} pending) and ${leadsNeedingFollowUp.length} leads flagged for follow-up.`,
      facts: {
        totalFollowUps: scoped.followUps.length,
        pending: statusMap.Pending,
        overdue: statusMap.Overdue,
        completed: statusMap.Completed,
        leadsRequiringFollowUp: leadsNeedingFollowUp.length,
      },
      chart: {
        type: 'bar',
        title: 'Follow-Up Status Breakdown (DEMO)',
        valueLabel: 'Tasks',
        data: chartData,
      },
      secondaryChart: {
        type: 'pie',
        title: 'Follow-Up Completion Share (DEMO)',
        valueLabel: 'Tasks',
        data: chartData,
      },
      tablePreview: {
        columns: ['ID', 'Account', 'Owner', 'Due Date', 'Priority', 'Status'],
        rows: pendingFollowUps.slice(0, 8).map((f) => [
          f.id,
          f.accountName,
          f.owner,
          f.dueDate,
          f.priority,
          f.status,
        ]),
      },
      sourceName: 'CRM Read-Only Follow-Up Module (DEMO)',
    };
  }

  // 3. Pending support tickets / ticket reports
  if (q.includes('ticket') || q.includes('support queue') || q.includes('sla')) {
    const pendingTickets = scoped.tickets.filter((t) => t.status !== 'Resolved');
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    for (const t of scoped.tickets) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    }
    const statusChartData = Object.entries(byStatus).map(([name, value]) => ({ name, value }));
    const catChartData = Object.entries(byCategory).map(([name, value]) => ({ name, value }));

    return {
      matched: true,
      summaryText: `[DEMO DATA] There are ${pendingTickets.length} unresolved support tickets out of ${scoped.tickets.length} total tickets (${byStatus.Open || 0} Open, ${byStatus['In Progress'] || 0} In Progress, ${byStatus.Pending || 0} Pending).`,
      facts: {
        totalTickets: scoped.tickets.length,
        unresolvedTickets: pendingTickets.length,
        open: byStatus.Open || 0,
        inProgress: byStatus['In Progress'] || 0,
        pending: byStatus.Pending || 0,
        resolved: byStatus.Resolved || 0,
      },
      chart: {
        type: 'bar',
        title: 'Support Tickets by Status (DEMO)',
        valueLabel: 'Tickets',
        data: statusChartData,
      },
      secondaryChart: {
        type: 'pie',
        title: 'Tickets by Category (DEMO)',
        valueLabel: 'Tickets',
        data: catChartData,
      },
      tablePreview: {
        columns: ['Ticket ID', 'Customer', 'Category', 'Priority', 'Status', 'SLA Left (h)'],
        rows: pendingTickets.slice(0, 8).map((t) => [
          t.id,
          t.customer,
          t.category,
          t.priority,
          t.status,
          t.slaHoursRemaining,
        ]),
      },
      sourceName: 'CRM Read-Only Ticket Desk (DEMO)',
    };
  }

  // 4. Customer registrations / customer history / customer analytics
  if (q.includes('customer') || q.includes('client') || q.includes('registered')) {
    const byPlan: Record<string, number> = {};
    const byIndustry: Record<string, number> = {};
    let totalAcv = 0;
    for (const c of scoped.customers) {
      byPlan[c.plan] = (byPlan[c.plan] || 0) + 1;
      byIndustry[c.industry] = (byIndustry[c.industry] || 0) + 1;
      totalAcv += c.annualContractInr;
    }
    const planData = Object.entries(byPlan).map(([name, value]) => ({ name, value }));
    const industryData = Object.entries(byIndustry).map(([name, value]) => ({ name, value }));

    return {
      matched: true,
      summaryText: `[DEMO DATA] ${monthlyCustomers.length} customers registered in November 2026 out of ${scoped.customers.length} total active accounts (Combined Demo ACV: ₹${totalAcv.toLocaleString('en-IN')}).`,
      facts: {
        totalCustomers: scoped.customers.length,
        registeredThisMonth: monthlyCustomers.length,
        totalAcvInr: totalAcv,
      },
      chart: {
        type: 'pie',
        title: 'Customers by Sustainability Plan (DEMO)',
        valueLabel: 'Accounts',
        data: planData,
      },
      secondaryChart: {
        type: 'bar',
        title: 'Customers by Industry (DEMO)',
        valueLabel: 'Accounts',
        data: industryData,
      },
      tablePreview: {
        columns: ['ID', 'Company', 'Industry', 'Plan', 'Registered', 'Last Interaction'],
        rows: scoped.customers.slice(0, 8).map((c) => [
          c.id,
          c.company,
          c.industry,
          c.plan,
          c.registeredAt,
          c.lastInteraction,
        ]),
      },
      sourceName: 'CRM Read-Only Customer Registry (DEMO)',
    };
  }

  // 5. This month's leads / lead pipeline / monthly performance report
  if (
    q.includes('lead') ||
    q.includes('monthly') ||
    q.includes('performance') ||
    q.includes('pipeline') ||
    q.includes('report')
  ) {
    const byStatus: Record<string, number> = {};
    for (const l of monthlyLeads) {
      byStatus[l.status] = (byStatus[l.status] || 0) + 1;
    }
    const statusData = LEAD_STATUSES.map((s) => ({
      name: s,
      value: byStatus[s] || 0,
    }));

    const wonValue = scoped.leads
      .filter((l) => l.status === 'Won')
      .reduce((acc, l) => acc + l.estimatedValueInr, 0);

    const trendData = [
      { name: 'Sep 2026', value: scoped.leads.filter((l) => l.createdAt.startsWith('2026-09')).length, secondary: 6 },
      { name: 'Oct 2026', value: scoped.leads.filter((l) => l.createdAt.startsWith('2026-10')).length, secondary: 11 },
      { name: 'Nov 2026', value: monthlyLeads.length, secondary: monthlyCustomers.length },
    ];

    return {
      matched: true,
      summaryText: `[DEMO DATA] November 2026 generated ${monthlyLeads.length} leads (${scoped.leads.length} total pipeline leads) and ${monthlyCustomers.length} new customer registrations. Won pipeline value in dataset: ₹${wonValue.toLocaleString('en-IN')}.`,
      facts: {
        leadsThisMonth: monthlyLeads.length,
        totalLeads: scoped.leads.length,
        customersThisMonth: monthlyCustomers.length,
        wonPipelineInr: wonValue,
        openTickets: scoped.tickets.filter((t) => t.status !== 'Resolved').length,
      },
      chart: {
        type: 'bar',
        title: 'This Month Leads by Pipeline Stage (DEMO)',
        valueLabel: 'Leads',
        data: statusData,
      },
      secondaryChart: {
        type: 'line',
        title: '3-Month Lead & Customer Acquisition Trend (DEMO)',
        valueLabel: 'Leads',
        secondaryLabel: 'New Customers',
        data: trendData,
      },
      tablePreview: {
        columns: ['Lead ID', 'Company', 'Source', 'Status', 'Owner', 'Est. Value (₹)'],
        rows: monthlyLeads.slice(0, 8).map((l) => [
          l.id,
          l.company,
          l.source,
          l.status,
          l.owner,
          l.estimatedValueInr.toLocaleString('en-IN'),
        ]),
      },
      sourceName: 'CRM Read-Only Performance Engine (DEMO)',
    };
  }

  return {
    matched: false,
    summaryText: '',
    facts: {},
    sourceName: '',
  };
}
