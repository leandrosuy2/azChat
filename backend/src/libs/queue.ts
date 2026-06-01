import 'dotenv/config';
import BullQueue, { Job, JobOptions } from 'bull';
import { REDIS_URI_MSG_CONN } from "../config/redis";
import configLoader from '../services/ConfigLoaderService/configLoaderService';
import * as jobs from '../jobs';
import logger from '../utils/logger';

const config = configLoader();

// Concorrência por consumidor. Valor sintonizado para suportar dezenas de sessões
// Baileys simultaneamente sem saturar o pool do Postgres (DB_POOL_MAX=60 no .env).
// Pode ser sobrescrito via env BULL_MSG_CONCURRENCY / BULL_ACK_CONCURRENCY.
const MSG_CONCURRENCY = Number(process.env.BULL_MSG_CONCURRENCY || 8);
const ACK_CONCURRENCY = Number(process.env.BULL_ACK_CONCURRENCY || 16);

const queueOptions = {
  defaultJobOptions: {
    attempts: config.webhook.attempts,
    backoff: {
      type: config.webhook.backoff.type,
      delay: config.webhook.backoff.delay,
    },
    removeOnFail: 1000,
    removeOnComplete: 500,
  },
  // limiter global por queue — evita rajadas que derrubam o WhatsApp Web ou o Postgres.
  limiter: {
    max: Number(process.env.BULL_LIMITER_MAX || 30),
    duration: Number(process.env.BULL_LIMITER_DURATION || 1000),
  },
};

interface QueueEntry {
  bull: BullQueue.Queue;
  name: string;
  handle: (job: Job) => Promise<unknown>;
  concurrency: number;
}

const queues: QueueEntry[] = Object.values(jobs).reduce((acc: QueueEntry[], job: any) => {
  const isAck = String(job.key).endsWith("-handleMessageAck");
  acc.push({
    bull: new BullQueue(job.key, REDIS_URI_MSG_CONN, queueOptions),
    name: job.key,
    handle: job.handle,
    concurrency: isAck ? ACK_CONCURRENCY : MSG_CONCURRENCY,
  });
  return acc;
}, []);

export default {
  queues,

  add(name: string, data: any, params: JobOptions = {}) {
    const queue = this.queues.find(q => q.name === name);
    if (!queue) {
      throw new Error(`Queue ${name} not found`);
    }
    return queue.bull.add(data, {
      removeOnComplete: 500,
      removeOnFail: 1000,
      ...params,
    });
  },

  process() {
    this.queues.forEach(queue => {
      // Concorrência configurada por tipo de queue.
      queue.bull.process(queue.concurrency, queue.handle);

      queue.bull.on('failed', (job, err) => {
        logger.error(
          `Bull job failed queue=${queue.name} jobId=${job?.id} attempt=${job?.attemptsMade} err=${err?.message}`
        );
      });

      queue.bull.on('error', err => {
        logger.error(`Bull queue error queue=${queue.name} err=${err?.message}`);
      });

      logger.info(
        `Bull worker iniciado queue=${queue.name} concurrency=${queue.concurrency}`
      );
    });
  }
};
