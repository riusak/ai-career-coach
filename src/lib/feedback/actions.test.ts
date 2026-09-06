import { describe, it, expect, vi, beforeEach } from 'vitest';
import { _resetRateLimitStoreForTesting } from '@/lib/security/rate-limit';

// Mock Supabase server and service
const mockGetUser = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: vi.fn(() => ({
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
    eq: mockEq,
    maybeSingle: mockMaybeSingle,
  })),
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

vi.mock('@/lib/admin/guard', () => ({
  getCurrentAdmin: vi.fn(async () => ({ ok: true, userId: 'admin-123', fullName: 'Admin' })),
}));

vi.mock('@/lib/admin/audit', () => ({
  writeAuditLog: vi.fn(async () => true),
}));

import { submitFeedback } from './actions';

describe('User Feedback Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetRateLimitStoreForTesting();
  });

  it('rejects feedback when user is unauthenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Not logged in' } });

    const result = await submitFeedback({
      category: 'bug',
      subject: 'Test subject',
      message: 'Here is a descriptive bug report with enough chars.',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('connecté');
  });

  it('rejects feedback with too short subject', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    });

    const result = await submitFeedback({
      category: 'bug',
      subject: 'Hi',
      message: 'Here is a descriptive bug report with enough chars.',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('3 caractères');
  });

  it('rejects feedback with too short message', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    });

    const result = await submitFeedback({
      category: 'bug',
      subject: 'Valid subject',
      message: 'Too short',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('10 caractères');
  });

  it('successfully submits valid feedback and sanitizes content', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    });

    mockSelect.mockReturnValue({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: { full_name: 'Jane Doe' }, error: null }),
      })),
    });

    mockInsert.mockResolvedValueOnce({ error: null });

    const result = await submitFeedback({
      category: 'feature',
      rating: 5,
      subject: '<b>New feature request</b>',
      message: '<script>alert("xss")</script>Please add dark mode toggles in the dashboard.',
      pageUrl: '/dashboard/settings',
    });

    expect(result.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        user_email: 'test@example.com',
        category: 'feature',
        rating: 5,
        subject: 'New feature request',
        message: 'alert("xss")Please add dark mode toggles in the dashboard.',
        status: 'new',
      })
    );
  });

  it('enforces rate limiting on repeated submissions', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-spammer', email: 'spam@example.com' } },
      error: null,
    });
    mockSelect.mockReturnValue({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    });
    mockInsert.mockResolvedValue({ error: null });

    // Submit 5 times (limit is 5)
    for (let i = 0; i < 5; i++) {
      const res = await submitFeedback({
        category: 'general',
        subject: `Feedback ${i}`,
        message: 'A nice and long feedback message to test rate limiting.',
      });
      expect(res.success).toBe(true);
    }

    // 6th submission should be rate-limited
    const rateLimitedRes = await submitFeedback({
      category: 'general',
      subject: 'Spam Feedback 6',
      message: 'A nice and long feedback message to test rate limiting.',
    });
    expect(rateLimitedRes.success).toBe(false);
    expect(rateLimitedRes.error).toContain('patienter');
  });
});
