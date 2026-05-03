import { Router } from "express";
import { Webhook } from "svix";
import { prisma } from "@aggregator/db";

export const clerkWebhookRouter = Router();

interface ClerkUserPayload {
  id: string;
  email_addresses: Array<{ email_address: string; id: string }>;
  primary_email_address_id: string;
  first_name?: string;
  last_name?: string;
  image_url?: string;
}

clerkWebhookRouter.post("/", async (req, res) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET ?? "";
  const wh = new Webhook(webhookSecret);

  let event: { type: string; data: ClerkUserPayload };
  try {
    event = wh.verify(JSON.stringify(req.body), {
      "svix-id": req.headers["svix-id"] as string,
      "svix-timestamp": req.headers["svix-timestamp"] as string,
      "svix-signature": req.headers["svix-signature"] as string,
    }) as typeof event;
  } catch {
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  const eventId = req.headers["svix-id"] as string;
  const existing = await prisma.webhookEvent.findUnique({ where: { id: eventId } });
  if (existing?.processedAt) {
    res.json({ received: true });
    return;
  }

  await prisma.webhookEvent.upsert({
    where: { id: eventId },
    create: { id: eventId, provider: "clerk", type: event.type, payload: event.data as object },
    update: {},
  });

  try {
    if (event.type === "user.created" || event.type === "user.updated") {
      const payload = event.data;
      const primaryEmail = payload.email_addresses.find(
        (e) => e.id === payload.primary_email_address_id,
      )?.email_address;

      if (!primaryEmail) {
        res.json({ received: true });
        return;
      }

      await prisma.user.upsert({
        where: { clerkId: payload.id },
        create: {
          clerkId: payload.id,
          email: primaryEmail,
          name: [payload.first_name, payload.last_name].filter(Boolean).join(" ") || null,
          avatarUrl: payload.image_url ?? null,
        },
        update: {
          email: primaryEmail,
          name: [payload.first_name, payload.last_name].filter(Boolean).join(" ") || null,
          avatarUrl: payload.image_url ?? null,
        },
      });
    } else if (event.type === "user.deleted") {
      await prisma.user.deleteMany({ where: { clerkId: event.data.id } });
    }

    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: { processedAt: new Date() },
    });
  } catch (err) {
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: { error: (err as Error).message },
    });
  }

  res.json({ received: true });
});
