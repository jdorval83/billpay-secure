// Load .env for EXPO_PUBLIC_* vars (Expo also loads .env automatically)
try {
  require("dotenv").config({ path: ".env" });
} catch (_) {}

module.exports = {
  expo: {
    name: "BillPay Secure",
    slug: "billpay-secure",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#059669",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.billpaysecure.app",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#059669",
        foregroundImage: "./assets/adaptive-icon.png",
      },
      package: "com.billpaysecure.app",
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://billpaysecure.com",
    },
    scheme: "billpay-secure",
  },
};
