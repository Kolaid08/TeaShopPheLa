// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
// Khách hàng cần thay các thông số này bằng config thật của họ
const firebaseConfig = {
  apiKey: "AIzaSyDJPzco8rY9kptXTTEcYKrD3gB4HtcyNvs",
  authDomain: "phela-web.firebaseapp.com",
  projectId: "phela-web",
  storageBucket: "phela-web.firebasestorage.app",
  messagingSenderId: "502005971130",
  appId: "1:502005971130:web:7fd995c21ca7bffdf3aa83",
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png' // Change to actual logo path
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
