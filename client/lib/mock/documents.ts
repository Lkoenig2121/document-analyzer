import type { DocumentDetail, DocumentListPage, DocumentSummary } from '@/lib/api/documents';

/**
 * Set to false once Gemini rate limits clear and you want live API data only.
 */
export const USE_DASHBOARD_MOCK_DATA = false;

const now = Date.now();

function hoursAgo(hours: number): string {
  return new Date(now - hours * 60 * 60 * 1000).toISOString();
}

export const MOCK_DOCUMENT_SUMMARIES: DocumentSummary[] = [
  {
    id: 'mock-doc-1',
    originalName: 'Q2-Financial-Report.pdf',
    mimeType: 'application/pdf',
    uploadedAt: hoursAgo(5),
    analysis: {
      summary:
        'Quarterly financial report covering revenue growth, operating expenses, and cash flow. Highlights a 12% YoY increase in recurring revenue and improved gross margins in the cloud segment.',
      topics: ['Finance', 'Revenue', 'Quarterly Report'],
    },
  },
  {
    id: 'mock-doc-2',
    originalName: 'Vendor-Agreement-Acme.docx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    uploadedAt: hoursAgo(18),
    analysis: {
      summary:
        'Service agreement between Acme Corp and Northwind Labs outlining deliverables, payment terms, liability caps, and a 24-month renewal cycle with a 60-day termination notice.',
      topics: ['Legal', 'Contracts', 'Procurement'],
    },
  },
  {
    id: 'mock-doc-3',
    originalName: 'Product-Roadmap-2026.pdf',
    mimeType: 'application/pdf',
    uploadedAt: hoursAgo(36),
    analysis: {
      summary:
        'Product roadmap prioritizing semantic search, embedding pipelines, and dashboard analytics. Key milestones include vector indexing in August and enterprise SSO in Q4.',
      topics: ['Product', 'Roadmap', 'AI'],
    },
  },
  {
    id: 'mock-doc-4',
    originalName: 'Meeting-Notes-Jul-21.txt',
    mimeType: 'text/plain',
    uploadedAt: hoursAgo(72),
    analysis: {
      summary:
        'Notes from the engineering sync covering upload reliability, Gemini rate-limit mitigations, and plans to seed the dashboard with sample analyses during development.',
      topics: ['Engineering', 'Meeting Notes', 'Operations'],
    },
  },
  {
    id: 'mock-doc-5',
    originalName: 'Invoice-Scan-88421.png',
    mimeType: 'image/png',
    uploadedAt: hoursAgo(96),
    analysis: {
      summary:
        'Scanned invoice from Brightline Supplies for office hardware totaling $4,280. Due date is August 15 with net-30 payment terms and a purchase order reference of PO-5521.',
      topics: ['Invoice', 'Finance', 'Accounts Payable'],
    },
  },
  {
    id: 'mock-doc-6',
    originalName: 'Research-Brief-Embeddings.pdf',
    mimeType: 'application/pdf',
    uploadedAt: hoursAgo(120),
    analysis: {
      summary:
        'Technical brief comparing embedding models for document retrieval. Recommends Gemini text-embedding paired with pgvector for chunk-level semantic search in the document analyzer.',
      topics: ['AI', 'Research', 'Embeddings'],
    },
  },
];

export const MOCK_TOPICS: string[] = Array.from(
  new Set(
    MOCK_DOCUMENT_SUMMARIES.flatMap((doc) => doc.analysis?.topics ?? []).sort((a, b) =>
      a.localeCompare(b),
    ),
  ),
);

const MOCK_DETAILS: Record<string, DocumentDetail> = {
  'mock-doc-1': {
    document: {
      id: 'mock-doc-1',
      filename: 'Q2-Financial-Report.pdf',
      mimeType: 'application/pdf',
      fileSize: 482_112,
      uploadedAt: hoursAgo(5),
      updatedAt: hoursAgo(5),
    },
    content: {
      text: 'Q2 Financial Report\n\nRevenue grew 12% year over year, driven by cloud subscriptions. Operating expenses remained flat. Cash reserves increased to $18.4M.',
      wordCount: 28,
    },
    analysis: {
      summary:
        'Quarterly financial report covering revenue growth, operating expenses, and cash flow. Highlights a 12% YoY increase in recurring revenue and improved gross margins in the cloud segment.',
      topics: ['Finance', 'Revenue', 'Quarterly Report'],
      entities: ['Cloud Segment', 'Recurring Revenue'],
      extractedData: {
        period: 'Q2',
        revenueGrowthYoY: '12%',
        cashReserves: '$18.4M',
      },
      createdAt: hoursAgo(5),
    },
  },
  'mock-doc-2': {
    document: {
      id: 'mock-doc-2',
      filename: 'Vendor-Agreement-Acme.docx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileSize: 91_240,
      uploadedAt: hoursAgo(18),
      updatedAt: hoursAgo(18),
    },
    content: {
      text: 'This Service Agreement is entered into by Acme Corp and Northwind Labs. Term: 24 months. Termination notice: 60 days. Liability cap: fees paid in prior 12 months.',
      wordCount: 32,
    },
    analysis: {
      summary:
        'Service agreement between Acme Corp and Northwind Labs outlining deliverables, payment terms, liability caps, and a 24-month renewal cycle with a 60-day termination notice.',
      topics: ['Legal', 'Contracts', 'Procurement'],
      entities: ['Acme Corp', 'Northwind Labs'],
      extractedData: {
        termMonths: 24,
        terminationNoticeDays: 60,
        parties: ['Acme Corp', 'Northwind Labs'],
      },
      createdAt: hoursAgo(18),
    },
  },
  'mock-doc-3': {
    document: {
      id: 'mock-doc-3',
      filename: 'Product-Roadmap-2026.pdf',
      mimeType: 'application/pdf',
      fileSize: 256_000,
      uploadedAt: hoursAgo(36),
      updatedAt: hoursAgo(36),
    },
    content: {
      text: '2026 Product Roadmap\n\nAugust: vector indexing\nSeptember: semantic search beta\nQ4: enterprise SSO',
      wordCount: 16,
    },
    analysis: {
      summary:
        'Product roadmap prioritizing semantic search, embedding pipelines, and dashboard analytics. Key milestones include vector indexing in August and enterprise SSO in Q4.',
      topics: ['Product', 'Roadmap', 'AI'],
      entities: ['Semantic Search', 'SSO'],
      extractedData: {
        milestones: ['vector indexing', 'semantic search beta', 'enterprise SSO'],
      },
      createdAt: hoursAgo(36),
    },
  },
  'mock-doc-4': {
    document: {
      id: 'mock-doc-4',
      filename: 'Meeting-Notes-Jul-21.txt',
      mimeType: 'text/plain',
      fileSize: 4_120,
      uploadedAt: hoursAgo(72),
      updatedAt: hoursAgo(72),
    },
    content: {
      text: 'Engineering sync — Jul 21\n- Upload reliability improvements\n- Gemini rate-limit mitigations\n- Seed dashboard with sample analyses',
      wordCount: 18,
    },
    analysis: {
      summary:
        'Notes from the engineering sync covering upload reliability, Gemini rate-limit mitigations, and plans to seed the dashboard with sample analyses during development.',
      topics: ['Engineering', 'Meeting Notes', 'Operations'],
      entities: ['Gemini'],
      extractedData: {
        date: '2026-07-21',
        actionItems: ['rate-limit mitigations', 'dashboard sample data'],
      },
      createdAt: hoursAgo(72),
    },
  },
  'mock-doc-5': {
    document: {
      id: 'mock-doc-5',
      filename: 'Invoice-Scan-88421.png',
      mimeType: 'image/png',
      fileSize: 1_024_000,
      uploadedAt: hoursAgo(96),
      updatedAt: hoursAgo(96),
    },
    content: {
      text: 'Brightline Supplies\nInvoice #88421\nTotal due: $4,280\nDue: Aug 15\nPO-5521\nTerms: Net 30',
      wordCount: 16,
    },
    analysis: {
      summary:
        'Scanned invoice from Brightline Supplies for office hardware totaling $4,280. Due date is August 15 with net-30 payment terms and a purchase order reference of PO-5521.',
      topics: ['Invoice', 'Finance', 'Accounts Payable'],
      entities: ['Brightline Supplies', 'PO-5521'],
      extractedData: {
        invoiceNumber: '88421',
        total: '$4,280',
        dueDate: '2026-08-15',
        purchaseOrder: 'PO-5521',
      },
      createdAt: hoursAgo(96),
    },
  },
  'mock-doc-6': {
    document: {
      id: 'mock-doc-6',
      filename: 'Research-Brief-Embeddings.pdf',
      mimeType: 'application/pdf',
      fileSize: 312_400,
      uploadedAt: hoursAgo(120),
      updatedAt: hoursAgo(120),
    },
    content: {
      text: 'Embedding model comparison for document retrieval. Recommendation: Gemini text-embedding + pgvector for chunk-level semantic search.',
      wordCount: 18,
    },
    analysis: {
      summary:
        'Technical brief comparing embedding models for document retrieval. Recommends Gemini text-embedding paired with pgvector for chunk-level semantic search in the document analyzer.',
      topics: ['AI', 'Research', 'Embeddings'],
      entities: ['Gemini', 'pgvector'],
      extractedData: {
        recommendation: 'Gemini text-embedding + pgvector',
      },
      createdAt: hoursAgo(120),
    },
  },
};

function mimeMatchesType(
  mimeType: string,
  type: NonNullable<import('@/lib/api/documents').DocumentListParams['type']>,
): boolean {
  switch (type) {
    case 'pdf':
      return mimeType === 'application/pdf';
    case 'docx':
      return mimeType.includes('wordprocessingml');
    case 'image':
      return mimeType.startsWith('image/');
    case 'txt':
      return mimeType === 'text/plain';
    default:
      return true;
  }
}

export function getMockDocumentPage(params: {
  q?: string;
  type?: 'pdf' | 'docx' | 'image' | 'txt';
  topics?: string[];
  page?: number;
  limit?: number;
}): DocumentListPage {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const query = params.q?.trim().toLowerCase() ?? '';

  let filtered = [...MOCK_DOCUMENT_SUMMARIES];

  if (query) {
    filtered = filtered.filter((doc) => {
      const haystack = [
        doc.originalName,
        doc.analysis?.summary ?? '',
        ...(doc.analysis?.topics ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  if (params.type) {
    filtered = filtered.filter((doc) => mimeMatchesType(doc.mimeType, params.type!));
  }

  if (params.topics && params.topics.length > 0) {
    filtered = filtered.filter((doc) => {
      const docTopics = doc.analysis?.topics ?? [];
      return params.topics!.every((topic) => docTopics.includes(topic));
    });
  }

  const total = filtered.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const documents = filtered.slice(start, start + limit);

  return { documents, page, limit, total, totalPages };
}

export function getMockDocumentDetail(id: string): DocumentDetail | null {
  return MOCK_DETAILS[id] ?? null;
}

export function isMockDocumentId(id: string): boolean {
  return id.startsWith('mock-doc-');
}
