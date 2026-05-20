const { Expo } = require('expo-server-sdk');

let expo = new Expo();

const sendPushNotification = async (pushToken, title, body, data = {}) => {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Push token ${pushToken} is not a valid Expo push token`);
    return;
  }

  const messages = [{
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
  }];

  try {
    let ticketChunk = await expo.sendPushNotificationsAsync(messages);
    console.log('Push notification sent', ticketChunk);
  } catch (error) {
    console.error('Error sending push notification', error);
  }
};

module.exports = {
  sendPushNotification,
};
