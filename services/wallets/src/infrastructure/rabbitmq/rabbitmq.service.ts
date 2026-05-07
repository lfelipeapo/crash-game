import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import * as amqp from "amqplib";

const QUEUES = [
  "wallet.debit.requested",
  "wallet.credit.requested",
  "wallet.debit.succeeded",
  "wallet.debit.failed",
  "wallet.credit.succeeded",
  "wallet.credit.failed",
];

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  async onModuleInit(): Promise<void> {
    const url = process.env.RABBITMQ_URL || "amqp://admin:admin@rabbitmq:5672";
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();

    for (const queue of QUEUES) {
      await this.channel.assertQueue(queue, { durable: true });
    }

    console.log("RabbitMQ connected and queues declared");
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  getChannel(): amqp.Channel {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }
    return this.channel;
  }

  publish(queue: string, message: unknown): void {
    const channel = this.getChannel();
    const buffer = Buffer.from(JSON.stringify(message));
    channel.sendToQueue(queue, buffer, { persistent: true });
  }

  consume(queue: string, handler: (msg: amqp.ConsumeMessage | null) => Promise<void>): void {
    const channel = this.getChannel();
    channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        await handler(msg);
        channel.ack(msg);
      } catch (error) {
        console.error(`Error processing message from ${queue}:`, error);
        channel.nack(msg, false, false);
      }
    });
  }
}
