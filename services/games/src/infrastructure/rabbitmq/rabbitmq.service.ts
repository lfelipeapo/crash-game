import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import * as amqp from "amqplib";

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  private readonly url = process.env.RABBITMQ_URL ?? "amqp://admin:admin@rabbitmq:5672";

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();

      // Declare queues
      await this.channel.assertQueue("wallet.debit.requested", { durable: true });
      await this.channel.assertQueue("wallet.credit.requested", { durable: true });
      await this.channel.assertQueue("wallet.debit.succeeded", { durable: true });
      await this.channel.assertQueue("wallet.debit.failed", { durable: true });
      await this.channel.assertQueue("wallet.credit.succeeded", { durable: true });
      await this.channel.assertQueue("wallet.credit.failed", { durable: true });

      this.logger.log("RabbitMQ connected and queues asserted");
    } catch (error) {
      this.logger.error("Failed to connect to RabbitMQ", error);
      throw error;
    }
  }

  private async disconnect(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.logger.log("RabbitMQ disconnected");
    } catch (error) {
      this.logger.error("Error disconnecting from RabbitMQ", error);
    }
  }

  getChannel(): amqp.Channel {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }
    return this.channel;
  }

  async consume(queue: string, handler: (msg: amqp.ConsumeMessage) => Promise<void>): Promise<void> {
    const channel = this.getChannel();
    await channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        await handler(msg);
        channel.ack(msg);
      } catch (error) {
        this.logger.error(`Error handling message from ${queue}`, error);
        channel.nack(msg, false, true);
      }
    });
    this.logger.log(`Started consuming queue: ${queue}`);
  }

  async publish(queue: string, message: object): Promise<void> {
    const channel = this.getChannel();
    const buffer = Buffer.from(JSON.stringify(message));
    channel.sendToQueue(queue, buffer, { persistent: true });
  }
}
