/**
 * API routes tests
 */

import request from 'supertest';
import app from '../index.js';

describe('API Routes', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('GET /stats', () => {
    it('should return queue statistics', async () => {
      const response = await request(app).get('/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.queues).toBeDefined();
    });
  });

  describe('POST /jobs/send-email', () => {
    it('should accept valid email job', async () => {
      const response = await request(app)
        .post('/jobs/send-email')
        .send({
          email: 'test@example.com',
          subject: 'Test Subject',
          body: 'Test Body',
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBeDefined();
      expect(response.body.status).toBe('queued');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/jobs/send-email')
        .send({
          email: 'invalid-email',
          subject: 'Test',
          body: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /jobs/process-data', () => {
    it('should accept valid data processing job', async () => {
      const response = await request(app)
        .post('/jobs/process-data')
        .send({
          dataId: '550e8400-e29b-41d4-a716-446655440000',
          processType: 'type1',
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBeDefined();
    });
  });
});
