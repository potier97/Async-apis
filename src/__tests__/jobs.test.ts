/**
 * Job validation tests
 */

import { validateJobPayload } from '../jobs/schemas.js';
import JOB_TYPES from '../jobs/types.js';

describe('Job Validation', () => {
  describe('Email Job Validation', () => {
    it('should validate correct email payload', () => {
      const data = {
        email: 'test@example.com',
        subject: 'Test',
        body: 'Test body',
      };

      const result = validateJobPayload(JOB_TYPES.SEND_EMAIL, data);
      expect(result.email).toBe('test@example.com');
    });

    it('should reject invalid email format', () => {
      const data = {
        email: 'invalid-email',
        subject: 'Test',
        body: 'Test body',
      };

      expect(() => {
        validateJobPayload(JOB_TYPES.SEND_EMAIL, data);
      }).toThrow();
    });
  });

  describe('Data Processing Job Validation', () => {
    it('should validate correct data processing payload', () => {
      const data = {
        dataId: '550e8400-e29b-41d4-a716-446655440000',
        processType: 'type1',
      };

      const result = validateJobPayload(JOB_TYPES.PROCESS_DATA, data);
      expect(result.dataId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });
});
