# OlCha — Do'konga yuborish qo'llanmasi

## App Store va Play Store uchun tayyor ma'lumotlar

### 📱 App nomi
**OlCha**

### 🏷️ Tagline / Subtitle
Yagona AI ijtimoiy platforma

### 📝 Tavsif (Description)
OlCha — Instagram, TikTok, Facebook, Snapchat va Telegram imkoniyatlarini birlashtirgan yagona AI-powered super ijtimoiy platforma.

**Asosiy xususiyatlar:**
• 📸 Postlar va Stories — foto, video, matn
• 🎬 Reels — qisqa videolar va monetizatsiya
• 💬 Xabarlar — shaxsiy va guruh suhbatlar
• 👥 Jamoalar — guruhlar va hamjamiyatlar
• 🤖 AI yordamchi — kontent tavsiyalari
• 💰 Hamyon — Click, Payme, Visa, Mastercard
• 👑 Premium — reklamasiz, eksklyuziv xususiyatlar
• 🌍 40 tilda interfeys

---

## 🍎 App Store (iOS)

### Kerakli narsalar:
1. **Apple Developer Account** — [developer.apple.com](https://developer.apple.com) ($99/yil)
2. **App Store Connect** — [appstoreconnect.apple.com](https://appstoreconnect.apple.com)

### Qadamlar:
```bash
# 1. EAS CLI o'rnatish
npm install -g eas-cli

# 2. Expo akkauntga kirish
eas login

# 3. Loyihani ro'yxatdan o'tkazish
eas init

# 4. iOS uchun build
eas build --platform ios --profile production

# 5. App Store ga yuborish
eas submit --platform ios --profile production
```

### App Store kategoriya:
- **Primary**: Social Networking
- **Secondary**: Entertainment

### Keywords (100 belgi):
olcha,ijtimoiy,social,network,reels,stories,uzbek,chat,video,premium,ai,tarmoq

---

## 🤖 Google Play Store (Android)

### Kerakli narsalar:
1. **Google Play Console** — [play.google.com/console](https://play.google.com/console) ($25 bir martalik)
2. **Google Play API Service Account JSON** — konsoldan yuklab olinadi

### Qadamlar:
```bash
# 1. Android uchun build (AAB format)
eas build --platform android --profile production

# 2. Play Store ga yuborish
eas submit --platform android --profile production
```

### Play Store kategoriya:
- **Category**: Social
- **Content Rating**: Everyone / Teen

---

## 📐 Asset o'lchamlari (tayyor)

| Asset | O'lcham | Holat |
|-------|---------|-------|
| App Icon | 1024×1024 px | ✅ Tayyor |
| Splash Screen | 1284×2778 px | ✅ Tayyor |
| Android Adaptive Icon | 1024×1024 px | ✅ Tayyor |

### Kerak bo'ladigan qo'shimcha assetlar:
- **App Store screenshots**: 6.7" (1290×2796), 6.5" (1242×2688), 5.5" (1242×2208)
- **Play Store screenshots**: 1080×1920 px (min 2 ta, max 8 ta)
- **Feature Graphic** (Play Store): 1024×500 px

---

## ⚙️ EAS Project ID olish:
1. [expo.dev](https://expo.dev) ga kiring
2. Yangi loyiha yarating: "OlCha"
3. `eas.json` dagi `YOUR_EAS_PROJECT_ID` ni almashtiring
4. `app.json` dagi `extra.eas.projectId` ni ham yangilang

---

## 📋 Muhim eslatmalar:
- `bundleIdentifier`: `com.olcha.app` (iOS) — Apple da ro'yxatdan o'tkazish kerak
- `package`: `com.olcha.app` (Android) — Play Console da yaratiladi
- Har yangi versiyada `buildNumber` (iOS) va `versionCode` (Android) oshiriladi
