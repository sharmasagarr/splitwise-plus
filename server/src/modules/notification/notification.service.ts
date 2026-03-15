import { firebaseAdmin } from "../../config/index.js";

interface SendNotificationParams {
  prisma: any;
  recipientId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Creates an in-app Notification row and sends a push notification via FCM.
 * If the user has no fcmToken, only the in-app record is created.
 * Catches FCM errors gracefully (invalid token → clears fcmToken).
 */
export async function sendNotification({
  prisma,
  recipientId,
  type,
  title,
  body,
  data = {},
}: SendNotificationParams) {
  // 1. Create in-app notification record
  const notification = await prisma.notification.create({
    data: {
      userId: recipientId,
      type,
      payload: { title, body, ...data },
    },
  });

  // 2. Look up FCM token
  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { fcmToken: true },
  });

  if (!recipient?.fcmToken) {
    return notification;
  }

  // 3. Send push notification via FCM
  try {
    await firebaseAdmin.messaging().send({
      token: recipient.fcmToken,
      notification: { title, body },
      data: { type, notificationId: notification.id, ...data },
    });

    // Mark as delivered
    await prisma.notification.update({
      where: { id: notification.id },
      data: { deliveredAt: new Date() },
    });
  } catch (error: any) {
    // If the token is invalid, clear it so we don't keep retrying
    if (
      error?.code === "messaging/invalid-registration-token" ||
      error?.code === "messaging/registration-token-not-registered"
    ) {
      await prisma.user.update({
        where: { id: recipientId },
        data: { fcmToken: null },
      });
    }
    console.error(`FCM send failed for user ${recipientId}:`, error?.message);
  }

  return notification;
}
