import { Queue } from 'bullmq';
import { createQueueConnection } from './connection.js';
import logger from '../logger/index.js';

const queueInstances = new Map<string, Queue>();

export function getOrCreateQueueInstance(queueName: string): Queue {
  let queue = queueInstances.get(queueName);

  if (!queue) {
    queue = new Queue(queueName, {
      connection: createQueueConnection(),
    });

    queueInstances.set(queueName, queue);
    logger.info({ queue: queueName }, 'Queue instance created');
  }

  return queue;
}

export async function closeQueueInstances(): Promise<void> {
  const promises = Array.from(queueInstances.entries()).map(
    async ([name, queue]) => {
      try {
        await queue.close();
        logger.info({ queue: name }, 'Queue instance closed');
      } catch (error) {
        logger.error({ queue: name, err: error }, 'Error closing queue instance');
      }
    },
  );

  await Promise.allSettled(promises);
  queueInstances.clear();
}

export { queueInstances };
