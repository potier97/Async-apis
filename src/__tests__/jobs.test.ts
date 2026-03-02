/**
 * Job validation tests
 * Tests Zod schema validation via the new defineJob system
 */

import { sendEmailJob } from '../queue/jobs/send-email.js';
import { processDataJob } from '../queue/jobs/process-data.js';

describe('Job Validation', () => {
  describe('Email Job Validation', () => {
    it('should validate correct email payload', () => {
      const data = {
        email: 'test@example.com',
        subject: 'Test',
        body: 'Test body',
      };

      const result = sendEmailJob.parse(data);
      expect(result.email).toBe('test@example.com');
    });

    it('should reject invalid email format', () => {
      const data = {
        email: 'invalid-email',
        subject: 'Test',
        body: 'Test body',
      };

      expect(() => {
        sendEmailJob.parse(data);
      }).toThrow();
    });

    it('should accept optional idempotencyKey', () => {
      const data = {
        email: 'test@example.com',
        subject: 'Test',
        body: 'Test body',
        idempotencyKey: 'key-123',
      };

      const result = sendEmailJob.parse(data);
      expect(result.idempotencyKey).toBe('key-123');
    });
  });

  describe('Data Processing Job Validation', () => {
    it('should validate correct data processing payload', () => {
      const data = {
        dataId: '550e8400-e29b-41d4-a716-446655440000',
        processType: 'type1' as const,
      };

      const result = processDataJob.parse(data);
      expect(result.dataId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should reject invalid processType', () => {
      const data = {
        dataId: '550e8400-e29b-41d4-a716-446655440000',
        processType: 'invalid',
      };

      expect(() => {
        processDataJob.parse(data);
      }).toThrow();
    });
  });
});
