import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

export type LangCode =
  | "uz" | "en" | "ru" | "zh" | "ar" | "es" | "fr" | "hi" | "pt" | "de"
  | "ja" | "ko" | "it" | "tr" | "nl" | "pl" | "fa" | "bn" | "id" | "vi"
  | "th" | "uk" | "sv" | "no" | "da" | "fi" | "el" | "cs" | "hu" | "ro"
  | "he" | "ms" | "sw" | "tl" | "az" | "kk" | "ky" | "tk" | "tg" | "mn";

export const LANGUAGES: { code: LangCode; name: string; native: string; flag: string; rtl?: boolean }[] = [
  { code: "uz", name: "Uzbek", native: "O'zbek", flag: "🇺🇿" },
  { code: "en", name: "English", native: "English", flag: "🇬🇧" },
  { code: "ru", name: "Russian", native: "Русский", flag: "🇷🇺" },
  { code: "zh", name: "Chinese", native: "中文", flag: "🇨🇳" },
  { code: "ar", name: "Arabic", native: "العربية", flag: "🇸🇦", rtl: true },
  { code: "es", name: "Spanish", native: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", native: "Français", flag: "🇫🇷" },
  { code: "hi", name: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "pt", name: "Portuguese", native: "Português", flag: "🇵🇹" },
  { code: "de", name: "German", native: "Deutsch", flag: "🇩🇪" },
  { code: "ja", name: "Japanese", native: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "Korean", native: "한국어", flag: "🇰🇷" },
  { code: "it", name: "Italian", native: "Italiano", flag: "🇮🇹" },
  { code: "tr", name: "Turkish", native: "Türkçe", flag: "🇹🇷" },
  { code: "nl", name: "Dutch", native: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polish", native: "Polski", flag: "🇵🇱" },
  { code: "fa", name: "Persian", native: "فارسی", flag: "🇮🇷", rtl: true },
  { code: "bn", name: "Bengali", native: "বাংলা", flag: "🇧🇩" },
  { code: "id", name: "Indonesian", native: "Indonesia", flag: "🇮🇩" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "Thai", native: "ภาษาไทย", flag: "🇹🇭" },
  { code: "uk", name: "Ukrainian", native: "Українська", flag: "🇺🇦" },
  { code: "sv", name: "Swedish", native: "Svenska", flag: "🇸🇪" },
  { code: "no", name: "Norwegian", native: "Norsk", flag: "🇳🇴" },
  { code: "da", name: "Danish", native: "Dansk", flag: "🇩🇰" },
  { code: "fi", name: "Finnish", native: "Suomi", flag: "🇫🇮" },
  { code: "el", name: "Greek", native: "Ελληνικά", flag: "🇬🇷" },
  { code: "cs", name: "Czech", native: "Čeština", flag: "🇨🇿" },
  { code: "hu", name: "Hungarian", native: "Magyar", flag: "🇭🇺" },
  { code: "ro", name: "Romanian", native: "Română", flag: "🇷🇴" },
  { code: "he", name: "Hebrew", native: "עברית", flag: "🇮🇱", rtl: true },
  { code: "ms", name: "Malay", native: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "sw", name: "Swahili", native: "Kiswahili", flag: "🇰🇪" },
  { code: "tl", name: "Filipino", native: "Filipino", flag: "🇵🇭" },
  { code: "az", name: "Azerbaijani", native: "Azərbaycan", flag: "🇦🇿" },
  { code: "kk", name: "Kazakh", native: "Қазақша", flag: "🇰🇿" },
  { code: "ky", name: "Kyrgyz", native: "Кыргызча", flag: "🇰🇬" },
  { code: "tk", name: "Turkmen", native: "Türkmen", flag: "🇹🇲" },
  { code: "tg", name: "Tajik", native: "Тоҷикӣ", flag: "🇹🇯" },
  { code: "mn", name: "Mongolian", native: "Монгол", flag: "🇲🇳" },
];

const translations: Record<string, Record<string, Record<string, string>>> = {
  uz: {
    nav: { home: "Bosh sahifa", explore: "Kashf qilish", reels: "Reels", messages: "Xabarlar", groups: "Guruhlar", profile: "Profil", notifications: "Bildirishnomalar" },
    common: { save: "Saqlash", cancel: "Bekor qilish", loading: "Yuklanmoqda...", logout: "Chiqish", language: "Til", settings: "Sozlamalar", search: "Qidirish", back: "Orqaga" },
    lang: { title: "Til", subtitle: "Interfeys tilini tanlang", search: "Tilni qidirish...", current: "Joriy til", popular: "Mashhur tillar", all: "Barcha tillar", applied: "Til o'zgartirildi!" },
  },
  en: {
    nav: { home: "Home", explore: "Explore", reels: "Reels", messages: "Messages", groups: "Groups", profile: "Profile", notifications: "Notifications" },
    common: { save: "Save", cancel: "Cancel", loading: "Loading...", logout: "Logout", language: "Language", settings: "Settings", search: "Search", back: "Back" },
    lang: { title: "Language", subtitle: "Choose your interface language", search: "Search language...", current: "Current language", popular: "Popular", all: "All languages", applied: "Language changed!" },
  },
  ru: {
    nav: { home: "Главная", explore: "Обзор", reels: "Reels", messages: "Сообщения", groups: "Группы", profile: "Профиль", notifications: "Уведомления" },
    common: { save: "Сохранить", cancel: "Отмена", loading: "Загрузка...", logout: "Выйти", language: "Язык", settings: "Настройки", search: "Поиск", back: "Назад" },
    lang: { title: "Язык", subtitle: "Выберите язык интерфейса", search: "Поиск языка...", current: "Текущий язык", popular: "Популярные", all: "Все языки", applied: "Язык изменён!" },
  },
  zh: {
    nav: { home: "主页", explore: "探索", reels: "短视频", messages: "消息", groups: "群组", profile: "个人资料", notifications: "通知" },
    common: { save: "保存", cancel: "取消", loading: "加载中...", logout: "退出", language: "语言", settings: "设置", search: "搜索", back: "返回" },
    lang: { title: "语言", subtitle: "选择界面语言", search: "搜索语言...", current: "当前语言", popular: "热门", all: "所有语言", applied: "语言已更改！" },
  },
  ar: {
    nav: { home: "الرئيسية", explore: "استكشاف", reels: "ريلز", messages: "رسائل", groups: "مجموعات", profile: "الملف الشخصي", notifications: "إشعارات" },
    common: { save: "حفظ", cancel: "إلغاء", loading: "جار التحميل...", logout: "تسجيل الخروج", language: "اللغة", settings: "الإعدادات", search: "بحث", back: "رجوع" },
    lang: { title: "اللغة", subtitle: "اختر لغة الواجهة", search: "ابحث عن لغة...", current: "اللغة الحالية", popular: "الأكثر شيوعاً", all: "جميع اللغات", applied: "تم تغيير اللغة!" },
  },
  es: {
    nav: { home: "Inicio", explore: "Explorar", reels: "Reels", messages: "Mensajes", groups: "Grupos", profile: "Perfil", notifications: "Notificaciones" },
    common: { save: "Guardar", cancel: "Cancelar", loading: "Cargando...", logout: "Salir", language: "Idioma", settings: "Ajustes", search: "Buscar", back: "Atrás" },
    lang: { title: "Idioma", subtitle: "Elige el idioma de la interfaz", search: "Buscar idioma...", current: "Idioma actual", popular: "Populares", all: "Todos los idiomas", applied: "¡Idioma cambiado!" },
  },
  fr: {
    nav: { home: "Accueil", explore: "Explorer", reels: "Reels", messages: "Messages", groups: "Groupes", profile: "Profil", notifications: "Notifications" },
    common: { save: "Enregistrer", cancel: "Annuler", loading: "Chargement...", logout: "Déconnexion", language: "Langue", settings: "Paramètres", search: "Rechercher", back: "Retour" },
    lang: { title: "Langue", subtitle: "Choisissez la langue", search: "Rechercher une langue...", current: "Langue actuelle", popular: "Populaires", all: "Toutes les langues", applied: "Langue modifiée !" },
  },
  tr: {
    nav: { home: "Ana Sayfa", explore: "Keşfet", reels: "Reels", messages: "Mesajlar", groups: "Gruplar", profile: "Profil", notifications: "Bildirimler" },
    common: { save: "Kaydet", cancel: "İptal", loading: "Yükleniyor...", logout: "Çıkış", language: "Dil", settings: "Ayarlar", search: "Ara", back: "Geri" },
    lang: { title: "Dil", subtitle: "Arayüz dilini seçin", search: "Dil ara...", current: "Mevcut dil", popular: "Popüler", all: "Tüm diller", applied: "Dil değiştirildi!" },
  },
  de: {
    nav: { home: "Startseite", explore: "Entdecken", reels: "Reels", messages: "Nachrichten", groups: "Gruppen", profile: "Profil", notifications: "Benachrichtigungen" },
    common: { save: "Speichern", cancel: "Abbrechen", loading: "Laden...", logout: "Abmelden", language: "Sprache", settings: "Einstellungen", search: "Suchen", back: "Zurück" },
    lang: { title: "Sprache", subtitle: "Oberflächensprache wählen", search: "Sprache suchen...", current: "Aktuelle Sprache", popular: "Beliebt", all: "Alle Sprachen", applied: "Sprache geändert!" },
  },
  ja: {
    nav: { home: "ホーム", explore: "探索", reels: "リール", messages: "メッセージ", groups: "グループ", profile: "プロフィール", notifications: "通知" },
    common: { save: "保存", cancel: "キャンセル", loading: "読み込み中...", logout: "ログアウト", language: "言語", settings: "設定", search: "検索", back: "戻る" },
    lang: { title: "言語", subtitle: "インターフェース言語を選択", search: "言語を検索...", current: "現在の言語", popular: "人気", all: "すべての言語", applied: "言語が変更されました！" },
  },
  ko: {
    nav: { home: "홈", explore: "탐색", reels: "릴스", messages: "메시지", groups: "그룹", profile: "프로필", notifications: "알림" },
    common: { save: "저장", cancel: "취소", loading: "로딩 중...", logout: "로그아웃", language: "언어", settings: "설정", search: "검색", back: "뒤로" },
    lang: { title: "언어", subtitle: "인터페이스 언어 선택", search: "언어 검색...", current: "현재 언어", popular: "인기", all: "모든 언어", applied: "언어가 변경되었습니다!" },
  },
};

const buildResources = () => {
  const base: Record<string, { translation: Record<string, Record<string, string>> }> = {};
  for (const lang of LANGUAGES) {
    base[lang.code] = {
      translation: translations[lang.code] ?? translations["en"],
    };
  }
  return base;
};

const deviceLang = Localization.getLocales()?.[0]?.languageCode ?? "uz";
const supportedCodes = LANGUAGES.map(l => l.code);
const fallback = supportedCodes.includes(deviceLang as LangCode) ? deviceLang : "uz";

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: buildResources(),
      lng: fallback,
      fallbackLng: "uz",
      interpolation: { escapeValue: false },
    });
}

export function changeLanguage(code: LangCode) {
  return i18n.changeLanguage(code);
}

export default i18n;
