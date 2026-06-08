export function shouldRunKafkaConsumers(): boolean {
  if (process.env.APP_MODE === 'worker') return true;
  if (process.env.ENABLE_KAFKA_CONSUMERS === 'true') return true;
  if (process.env.ENABLE_KAFKA_CONSUMERS === 'false') return false;
  return process.env.ENABLE_KAFKA === 'true';
}
