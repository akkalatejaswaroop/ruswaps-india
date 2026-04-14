/**
 * OneSignal REST API wrapper for sending notifications.
 * This avoids the dependency on onesignal-node if installation fails.
 */

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

export async function sendNotification({
  title,
  message,
  playerIds,
  data = {},
}: {
  title: string;
  message: string;
  playerIds: string[];
  data?: any;
}) {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.error('OneSignal credentials missing');
    return null;
  }

  if (playerIds.length === 0) return null;

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: playerIds,
        headings: { en: title },
        contents: { en: message },
        data: data,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('OneSignal Notification Error:', error);
    return null;
  }
}

export async function sendBroadcastNotification({
  title,
  message,
  data = {},
}: {
  title: string;
  message: string;
  data?: any;
}) {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.error('OneSignal credentials missing');
    return null;
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ['All'],
        headings: { en: title },
        contents: { en: message },
        data: data,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('OneSignal Broadcast Error:', error);
    return null;
  }
}
