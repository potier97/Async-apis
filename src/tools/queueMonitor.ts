/**
 * Legacy queue monitoring tool
 * DEPRECATED: Use PM2 instead for professional monitoring
 *
 * This tool is kept for reference but PM2 is recommended:
 * - npm run dev:pm2  to start with PM2
 * - pm2 monit        to monitor
 * - pm2 logs         to view logs
 */

import logger from '../logger/index.js';

logger.warn('Queue monitor started - Consider using PM2 for production monitoring');
logger.info('To use PM2: npm run dev:pm2 && pm2 monit');
