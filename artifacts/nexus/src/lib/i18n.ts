import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

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

export const RTL_LANGS = new Set(LANGUAGES.filter(l => l.rtl).map(l => l.code));

const t = {
  uz: {
    nav: { home: "Bosh sahifa", explore: "Kashf qilish", reels: "Reels", messages: "Xabarlar", groups: "Guruhlar", notifications: "Bildirishnomalar", profile: "Profil", settings: "Sozlamalar", admin: "Admin", premium: "Premium" },
    auth: { login: "Kirish", register: "Ro'yxatdan o'tish", email: "Email", password: "Parol", username: "Foydalanuvchi nomi", logout: "Chiqish", welcome: "Qaytganingizdan xursandmiz", sign_in: "Kirish", no_account: "Akkaunt yo'qmi?", have_account: "Akkaunt bormi?" },
    post: { like: "Yoqtirish", comment: "Izoh", share: "Ulashish", report: "Shikoyat", follow: "Obuna", unfollow: "Obunani bekor qilish", save: "Saqlash", more: "Ko'proq" },
    settings: {
      title: "Sozlamalar", subtitle: "Akkauntingizni boshqaring",
      profile: "Profil", account: "Akkaunt", notifications: "Bildirishnomalar",
      appearance: "Ko'rinish", privacy: "Maxfiylik", language: "Til",
    },
    lang: { title: "Til", subtitle: "Interfeys tilini tanlang", search: "Tilni qidirish...", current: "Joriy til", popular: "Mashhur tillar", all: "Barcha tillar", applied: "Til o'zgartirildi!" },
    common: { save: "Saqlash", cancel: "Bekor qilish", loading: "Yuklanmoqda...", error: "Xato", success: "Muvaffaqiyat", network_error: "Tarmoq xatosi", try_again: "Qayta urinib ko'ring", close: "Yopish", search: "Qidirish", back: "Orqaga" },
  },
  en: {
    nav: { home: "Home", explore: "Explore", reels: "Reels", messages: "Messages", groups: "Groups", notifications: "Notifications", profile: "Profile", settings: "Settings", admin: "Admin", premium: "Premium" },
    auth: { login: "Login", register: "Register", email: "Email", password: "Password", username: "Username", logout: "Logout", welcome: "Welcome back", sign_in: "Sign in", no_account: "No account?", have_account: "Have an account?" },
    post: { like: "Like", comment: "Comment", share: "Share", report: "Report", follow: "Follow", unfollow: "Unfollow", save: "Save", more: "More" },
    settings: {
      title: "Settings", subtitle: "Manage your account",
      profile: "Profile", account: "Account", notifications: "Notifications",
      appearance: "Appearance", privacy: "Privacy", language: "Language",
    },
    lang: { title: "Language", subtitle: "Choose your interface language", search: "Search language...", current: "Current language", popular: "Popular", all: "All languages", applied: "Language changed!" },
    common: { save: "Save", cancel: "Cancel", loading: "Loading...", error: "Error", success: "Success", network_error: "Network error", try_again: "Try again", close: "Close", search: "Search", back: "Back" },
  },
  ru: {
    nav: { home: "Главная", explore: "Обзор", reels: "Reels", messages: "Сообщения", groups: "Группы", notifications: "Уведомления", profile: "Профиль", settings: "Настройки", admin: "Админ", premium: "Премиум" },
    auth: { login: "Войти", register: "Регистрация", email: "Email", password: "Пароль", username: "Имя пользователя", logout: "Выйти", welcome: "Добро пожаловать", sign_in: "Войти", no_account: "Нет аккаунта?", have_account: "Есть аккаунт?" },
    post: { like: "Нравится", comment: "Комментарий", share: "Поделиться", report: "Пожаловаться", follow: "Подписаться", unfollow: "Отписаться", save: "Сохранить", more: "Ещё" },
    settings: {
      title: "Настройки", subtitle: "Управление аккаунтом",
      profile: "Профиль", account: "Аккаунт", notifications: "Уведомления",
      appearance: "Внешний вид", privacy: "Конфиденциальность", language: "Язык",
    },
    lang: { title: "Язык", subtitle: "Выберите язык интерфейса", search: "Поиск языка...", current: "Текущий язык", popular: "Популярные", all: "Все языки", applied: "Язык изменён!" },
    common: { save: "Сохранить", cancel: "Отмена", loading: "Загрузка...", error: "Ошибка", success: "Успех", network_error: "Ошибка сети", try_again: "Попробуйте снова", close: "Закрыть", search: "Поиск", back: "Назад" },
  },
  zh: {
    nav: { home: "主页", explore: "探索", reels: "短视频", messages: "消息", groups: "群组", notifications: "通知", profile: "个人资料", settings: "设置", admin: "管理员", premium: "高级版" },
    auth: { login: "登录", register: "注册", email: "邮箱", password: "密码", username: "用户名", logout: "退出", welcome: "欢迎回来", sign_in: "登录", no_account: "没有账号？", have_account: "已有账号？" },
    post: { like: "点赞", comment: "评论", share: "分享", report: "举报", follow: "关注", unfollow: "取消关注", save: "收藏", more: "更多" },
    settings: { title: "设置", subtitle: "管理您的账号", profile: "个人资料", account: "账号", notifications: "通知", appearance: "外观", privacy: "隐私", language: "语言" },
    lang: { title: "语言", subtitle: "选择界面语言", search: "搜索语言...", current: "当前语言", popular: "热门", all: "所有语言", applied: "语言已更改！" },
    common: { save: "保存", cancel: "取消", loading: "加载中...", error: "错误", success: "成功", network_error: "网络错误", try_again: "重试", close: "关闭", search: "搜索", back: "返回" },
  },
  ar: {
    nav: { home: "الرئيسية", explore: "استكشاف", reels: "ريلز", messages: "رسائل", groups: "مجموعات", notifications: "إشعارات", profile: "الملف الشخصي", settings: "الإعدادات", admin: "المسؤول", premium: "مميز" },
    auth: { login: "تسجيل الدخول", register: "إنشاء حساب", email: "البريد الإلكتروني", password: "كلمة المرور", username: "اسم المستخدم", logout: "تسجيل الخروج", welcome: "مرحباً بعودتك", sign_in: "دخول", no_account: "ليس لديك حساب؟", have_account: "لديك حساب؟" },
    post: { like: "إعجاب", comment: "تعليق", share: "مشاركة", report: "إبلاغ", follow: "متابعة", unfollow: "إلغاء المتابعة", save: "حفظ", more: "المزيد" },
    settings: { title: "الإعدادات", subtitle: "إدارة حسابك", profile: "الملف الشخصي", account: "الحساب", notifications: "الإشعارات", appearance: "المظهر", privacy: "الخصوصية", language: "اللغة" },
    lang: { title: "اللغة", subtitle: "اختر لغة الواجهة", search: "ابحث عن لغة...", current: "اللغة الحالية", popular: "الأكثر شيوعاً", all: "جميع اللغات", applied: "تم تغيير اللغة!" },
    common: { save: "حفظ", cancel: "إلغاء", loading: "جار التحميل...", error: "خطأ", success: "نجاح", network_error: "خطأ في الشبكة", try_again: "حاول مجدداً", close: "إغلاق", search: "بحث", back: "رجوع" },
  },
  es: {
    nav: { home: "Inicio", explore: "Explorar", reels: "Reels", messages: "Mensajes", groups: "Grupos", notifications: "Notificaciones", profile: "Perfil", settings: "Ajustes", admin: "Admin", premium: "Premium" },
    auth: { login: "Iniciar sesión", register: "Registrarse", email: "Correo", password: "Contraseña", username: "Usuario", logout: "Salir", welcome: "Bienvenido de vuelta", sign_in: "Entrar", no_account: "¿Sin cuenta?", have_account: "¿Tienes cuenta?" },
    post: { like: "Me gusta", comment: "Comentar", share: "Compartir", report: "Reportar", follow: "Seguir", unfollow: "Dejar de seguir", save: "Guardar", more: "Más" },
    settings: { title: "Ajustes", subtitle: "Gestiona tu cuenta", profile: "Perfil", account: "Cuenta", notifications: "Notificaciones", appearance: "Apariencia", privacy: "Privacidad", language: "Idioma" },
    lang: { title: "Idioma", subtitle: "Elige el idioma de la interfaz", search: "Buscar idioma...", current: "Idioma actual", popular: "Populares", all: "Todos los idiomas", applied: "¡Idioma cambiado!" },
    common: { save: "Guardar", cancel: "Cancelar", loading: "Cargando...", error: "Error", success: "Éxito", network_error: "Error de red", try_again: "Inténtalo de nuevo", close: "Cerrar", search: "Buscar", back: "Atrás" },
  },
  fr: {
    nav: { home: "Accueil", explore: "Explorer", reels: "Reels", messages: "Messages", groups: "Groupes", notifications: "Notifications", profile: "Profil", settings: "Paramètres", admin: "Admin", premium: "Premium" },
    auth: { login: "Connexion", register: "S'inscrire", email: "Email", password: "Mot de passe", username: "Nom d'utilisateur", logout: "Déconnexion", welcome: "Bon retour", sign_in: "Se connecter", no_account: "Pas de compte ?", have_account: "Déjà un compte ?" },
    post: { like: "J'aime", comment: "Commenter", share: "Partager", report: "Signaler", follow: "Suivre", unfollow: "Ne plus suivre", save: "Enregistrer", more: "Plus" },
    settings: { title: "Paramètres", subtitle: "Gérez votre compte", profile: "Profil", account: "Compte", notifications: "Notifications", appearance: "Apparence", privacy: "Confidentialité", language: "Langue" },
    lang: { title: "Langue", subtitle: "Choisissez la langue de l'interface", search: "Rechercher une langue...", current: "Langue actuelle", popular: "Populaires", all: "Toutes les langues", applied: "Langue modifiée !" },
    common: { save: "Enregistrer", cancel: "Annuler", loading: "Chargement...", error: "Erreur", success: "Succès", network_error: "Erreur réseau", try_again: "Réessayer", close: "Fermer", search: "Rechercher", back: "Retour" },
  },
  hi: {
    nav: { home: "होम", explore: "एक्सप्लोर", reels: "रील्स", messages: "संदेश", groups: "समूह", notifications: "सूचनाएं", profile: "प्रोफ़ाइल", settings: "सेटिंग्स", admin: "एडमिन", premium: "प्रीमियम" },
    auth: { login: "लॉगिन", register: "रजिस्टर", email: "ईमेल", password: "पासवर्ड", username: "उपयोगकर्ता नाम", logout: "लॉगआउट", welcome: "वापस स्वागत है", sign_in: "साइन इन", no_account: "खाता नहीं है?", have_account: "खाता है?" },
    post: { like: "पसंद", comment: "टिप्पणी", share: "शेयर", report: "रिपोर्ट", follow: "फ़ॉलो", unfollow: "अनफ़ॉलो", save: "सेव", more: "और" },
    settings: { title: "सेटिंग्स", subtitle: "अपना खाता प्रबंधित करें", profile: "प्रोफ़ाइल", account: "खाता", notifications: "सूचनाएं", appearance: "दिखावट", privacy: "गोपनीयता", language: "भाषा" },
    lang: { title: "भाषा", subtitle: "इंटरफ़ेस भाषा चुनें", search: "भाषा खोजें...", current: "वर्तमान भाषा", popular: "लोकप्रिय", all: "सभी भाषाएं", applied: "भाषा बदल गई!" },
    common: { save: "सेव", cancel: "रद्द", loading: "लोड हो रहा है...", error: "त्रुटि", success: "सफलता", network_error: "नेटवर्क त्रुटि", try_again: "पुनः प्रयास", close: "बंद", search: "खोज", back: "वापस" },
  },
  pt: {
    nav: { home: "Início", explore: "Explorar", reels: "Reels", messages: "Mensagens", groups: "Grupos", notifications: "Notificações", profile: "Perfil", settings: "Configurações", admin: "Admin", premium: "Premium" },
    auth: { login: "Entrar", register: "Registrar", email: "Email", password: "Senha", username: "Nome de usuário", logout: "Sair", welcome: "Bem-vindo de volta", sign_in: "Entrar", no_account: "Sem conta?", have_account: "Tem conta?" },
    post: { like: "Curtir", comment: "Comentar", share: "Compartilhar", report: "Denunciar", follow: "Seguir", unfollow: "Deixar de seguir", save: "Salvar", more: "Mais" },
    settings: { title: "Configurações", subtitle: "Gerencie sua conta", profile: "Perfil", account: "Conta", notifications: "Notificações", appearance: "Aparência", privacy: "Privacidade", language: "Idioma" },
    lang: { title: "Idioma", subtitle: "Escolha o idioma da interface", search: "Buscar idioma...", current: "Idioma atual", popular: "Populares", all: "Todos os idiomas", applied: "Idioma alterado!" },
    common: { save: "Salvar", cancel: "Cancelar", loading: "Carregando...", error: "Erro", success: "Sucesso", network_error: "Erro de rede", try_again: "Tentar novamente", close: "Fechar", search: "Buscar", back: "Voltar" },
  },
  de: {
    nav: { home: "Startseite", explore: "Entdecken", reels: "Reels", messages: "Nachrichten", groups: "Gruppen", notifications: "Benachrichtigungen", profile: "Profil", settings: "Einstellungen", admin: "Admin", premium: "Premium" },
    auth: { login: "Anmelden", register: "Registrieren", email: "E-Mail", password: "Passwort", username: "Benutzername", logout: "Abmelden", welcome: "Willkommen zurück", sign_in: "Einloggen", no_account: "Kein Konto?", have_account: "Konto vorhanden?" },
    post: { like: "Gefällt mir", comment: "Kommentar", share: "Teilen", report: "Melden", follow: "Folgen", unfollow: "Entfolgen", save: "Speichern", more: "Mehr" },
    settings: { title: "Einstellungen", subtitle: "Konto verwalten", profile: "Profil", account: "Konto", notifications: "Benachrichtigungen", appearance: "Erscheinungsbild", privacy: "Datenschutz", language: "Sprache" },
    lang: { title: "Sprache", subtitle: "Oberflächensprache wählen", search: "Sprache suchen...", current: "Aktuelle Sprache", popular: "Beliebt", all: "Alle Sprachen", applied: "Sprache geändert!" },
    common: { save: "Speichern", cancel: "Abbrechen", loading: "Laden...", error: "Fehler", success: "Erfolg", network_error: "Netzwerkfehler", try_again: "Erneut versuchen", close: "Schließen", search: "Suchen", back: "Zurück" },
  },
  ja: {
    nav: { home: "ホーム", explore: "探索", reels: "リール", messages: "メッセージ", groups: "グループ", notifications: "通知", profile: "プロフィール", settings: "設定", admin: "管理者", premium: "プレミアム" },
    auth: { login: "ログイン", register: "新規登録", email: "メール", password: "パスワード", username: "ユーザー名", logout: "ログアウト", welcome: "おかえりなさい", sign_in: "サインイン", no_account: "アカウントがない？", have_account: "アカウントをお持ちですか？" },
    post: { like: "いいね", comment: "コメント", share: "シェア", report: "報告", follow: "フォロー", unfollow: "フォロー解除", save: "保存", more: "もっと" },
    settings: { title: "設定", subtitle: "アカウントを管理", profile: "プロフィール", account: "アカウント", notifications: "通知", appearance: "外観", privacy: "プライバシー", language: "言語" },
    lang: { title: "言語", subtitle: "インターフェース言語を選択", search: "言語を検索...", current: "現在の言語", popular: "人気", all: "すべての言語", applied: "言語が変更されました！" },
    common: { save: "保存", cancel: "キャンセル", loading: "読み込み中...", error: "エラー", success: "成功", network_error: "ネットワークエラー", try_again: "もう一度試す", close: "閉じる", search: "検索", back: "戻る" },
  },
  ko: {
    nav: { home: "홈", explore: "탐색", reels: "릴스", messages: "메시지", groups: "그룹", notifications: "알림", profile: "프로필", settings: "설정", admin: "관리자", premium: "프리미엄" },
    auth: { login: "로그인", register: "회원가입", email: "이메일", password: "비밀번호", username: "사용자명", logout: "로그아웃", welcome: "다시 오신 것을 환영합니다", sign_in: "로그인", no_account: "계정이 없으신가요?", have_account: "계정이 있으신가요?" },
    post: { like: "좋아요", comment: "댓글", share: "공유", report: "신고", follow: "팔로우", unfollow: "팔로우 취소", save: "저장", more: "더보기" },
    settings: { title: "설정", subtitle: "계정 관리", profile: "프로필", account: "계정", notifications: "알림", appearance: "외관", privacy: "개인정보", language: "언어" },
    lang: { title: "언어", subtitle: "인터페이스 언어 선택", search: "언어 검색...", current: "현재 언어", popular: "인기", all: "모든 언어", applied: "언어가 변경되었습니다!" },
    common: { save: "저장", cancel: "취소", loading: "로딩 중...", error: "오류", success: "성공", network_error: "네트워크 오류", try_again: "다시 시도", close: "닫기", search: "검색", back: "뒤로" },
  },
  it: {
    nav: { home: "Home", explore: "Esplora", reels: "Reels", messages: "Messaggi", groups: "Gruppi", notifications: "Notifiche", profile: "Profilo", settings: "Impostazioni", admin: "Admin", premium: "Premium" },
    auth: { login: "Accedi", register: "Registrati", email: "Email", password: "Password", username: "Nome utente", logout: "Esci", welcome: "Bentornato", sign_in: "Accedi", no_account: "Nessun account?", have_account: "Hai un account?" },
    post: { like: "Mi piace", comment: "Commenta", share: "Condividi", report: "Segnala", follow: "Segui", unfollow: "Non seguire", save: "Salva", more: "Altro" },
    settings: { title: "Impostazioni", subtitle: "Gestisci il tuo account", profile: "Profilo", account: "Account", notifications: "Notifiche", appearance: "Aspetto", privacy: "Privacy", language: "Lingua" },
    lang: { title: "Lingua", subtitle: "Scegli la lingua dell'interfaccia", search: "Cerca lingua...", current: "Lingua attuale", popular: "Popolari", all: "Tutte le lingue", applied: "Lingua cambiata!" },
    common: { save: "Salva", cancel: "Annulla", loading: "Caricamento...", error: "Errore", success: "Successo", network_error: "Errore di rete", try_again: "Riprova", close: "Chiudi", search: "Cerca", back: "Indietro" },
  },
  tr: {
    nav: { home: "Ana Sayfa", explore: "Keşfet", reels: "Reels", messages: "Mesajlar", groups: "Gruplar", notifications: "Bildirimler", profile: "Profil", settings: "Ayarlar", admin: "Admin", premium: "Premium" },
    auth: { login: "Giriş Yap", register: "Kayıt Ol", email: "E-posta", password: "Şifre", username: "Kullanıcı adı", logout: "Çıkış", welcome: "Tekrar hoş geldiniz", sign_in: "Giriş", no_account: "Hesabın yok mu?", have_account: "Hesabın var mı?" },
    post: { like: "Beğen", comment: "Yorum", share: "Paylaş", report: "Şikayet", follow: "Takip Et", unfollow: "Takibi Bırak", save: "Kaydet", more: "Daha Fazla" },
    settings: { title: "Ayarlar", subtitle: "Hesabınızı yönetin", profile: "Profil", account: "Hesap", notifications: "Bildirimler", appearance: "Görünüm", privacy: "Gizlilik", language: "Dil" },
    lang: { title: "Dil", subtitle: "Arayüz dilini seçin", search: "Dil ara...", current: "Mevcut dil", popular: "Popüler", all: "Tüm diller", applied: "Dil değiştirildi!" },
    common: { save: "Kaydet", cancel: "İptal", loading: "Yükleniyor...", error: "Hata", success: "Başarı", network_error: "Ağ hatası", try_again: "Tekrar dene", close: "Kapat", search: "Ara", back: "Geri" },
  },
  nl: {
    nav: { home: "Home", explore: "Verkennen", reels: "Reels", messages: "Berichten", groups: "Groepen", notifications: "Meldingen", profile: "Profiel", settings: "Instellingen", admin: "Admin", premium: "Premium" },
    auth: { login: "Inloggen", register: "Registreren", email: "E-mail", password: "Wachtwoord", username: "Gebruikersnaam", logout: "Uitloggen", welcome: "Welkom terug", sign_in: "Aanmelden", no_account: "Geen account?", have_account: "Al een account?" },
    post: { like: "Vind ik leuk", comment: "Reageren", share: "Delen", report: "Melden", follow: "Volgen", unfollow: "Ontvolgen", save: "Opslaan", more: "Meer" },
    settings: { title: "Instellingen", subtitle: "Beheer uw account", profile: "Profiel", account: "Account", notifications: "Meldingen", appearance: "Uiterlijk", privacy: "Privacy", language: "Taal" },
    lang: { title: "Taal", subtitle: "Kies de interfacetaal", search: "Taal zoeken...", current: "Huidige taal", popular: "Populair", all: "Alle talen", applied: "Taal gewijzigd!" },
    common: { save: "Opslaan", cancel: "Annuleren", loading: "Laden...", error: "Fout", success: "Succes", network_error: "Netwerkfout", try_again: "Opnieuw proberen", close: "Sluiten", search: "Zoeken", back: "Terug" },
  },
  pl: {
    nav: { home: "Strona główna", explore: "Odkryj", reels: "Reels", messages: "Wiadomości", groups: "Grupy", notifications: "Powiadomienia", profile: "Profil", settings: "Ustawienia", admin: "Admin", premium: "Premium" },
    auth: { login: "Zaloguj się", register: "Zarejestruj się", email: "Email", password: "Hasło", username: "Nazwa użytkownika", logout: "Wyloguj", welcome: "Witaj z powrotem", sign_in: "Zaloguj", no_account: "Brak konta?", have_account: "Masz konto?" },
    post: { like: "Lubię to", comment: "Komentarz", share: "Udostępnij", report: "Zgłoś", follow: "Obserwuj", unfollow: "Przestań obserwować", save: "Zapisz", more: "Więcej" },
    settings: { title: "Ustawienia", subtitle: "Zarządzaj swoim kontem", profile: "Profil", account: "Konto", notifications: "Powiadomienia", appearance: "Wygląd", privacy: "Prywatność", language: "Język" },
    lang: { title: "Język", subtitle: "Wybierz język interfejsu", search: "Szukaj języka...", current: "Aktualny język", popular: "Popularne", all: "Wszystkie języki", applied: "Język zmieniony!" },
    common: { save: "Zapisz", cancel: "Anuluj", loading: "Ładowanie...", error: "Błąd", success: "Sukces", network_error: "Błąd sieci", try_again: "Spróbuj ponownie", close: "Zamknij", search: "Szukaj", back: "Wstecz" },
  },
  fa: {
    nav: { home: "خانه", explore: "کاوش", reels: "ریلز", messages: "پیام‌ها", groups: "گروه‌ها", notifications: "اعلان‌ها", profile: "پروفایل", settings: "تنظیمات", admin: "مدیر", premium: "پریمیوم" },
    auth: { login: "ورود", register: "ثبت نام", email: "ایمیل", password: "رمز عبور", username: "نام کاربری", logout: "خروج", welcome: "خوش آمدید", sign_in: "ورود", no_account: "حساب ندارید؟", have_account: "حساب دارید؟" },
    post: { like: "پسندیدن", comment: "نظر", share: "اشتراک", report: "گزارش", follow: "دنبال کردن", unfollow: "لغو دنبال کردن", save: "ذخیره", more: "بیشتر" },
    settings: { title: "تنظیمات", subtitle: "حساب خود را مدیریت کنید", profile: "پروفایل", account: "حساب", notifications: "اعلان‌ها", appearance: "ظاهر", privacy: "حریم خصوصی", language: "زبان" },
    lang: { title: "زبان", subtitle: "زبان رابط کاربری را انتخاب کنید", search: "جستجوی زبان...", current: "زبان فعلی", popular: "محبوب", all: "همه زبان‌ها", applied: "زبان تغییر کرد!" },
    common: { save: "ذخیره", cancel: "لغو", loading: "در حال بارگذاری...", error: "خطا", success: "موفقیت", network_error: "خطای شبکه", try_again: "دوباره تلاش کنید", close: "بستن", search: "جستجو", back: "بازگشت" },
  },
  bn: {
    nav: { home: "হোম", explore: "অন্বেষণ", reels: "রিলস", messages: "বার্তা", groups: "গ্রুপ", notifications: "বিজ্ঞপ্তি", profile: "প্রোফাইল", settings: "সেটিংস", admin: "অ্যাডমিন", premium: "প্রিমিয়াম" },
    auth: { login: "লগইন", register: "নিবন্ধন", email: "ইমেইল", password: "পাসওয়ার্ড", username: "ব্যবহারকারী নাম", logout: "লগআউট", welcome: "স্বাগতম", sign_in: "সাইন ইন", no_account: "অ্যাকাউন্ট নেই?", have_account: "অ্যাকাউন্ট আছে?" },
    post: { like: "পছন্দ", comment: "মন্তব্য", share: "শেয়ার", report: "রিপোর্ট", follow: "অনুসরণ", unfollow: "আনফলো", save: "সেভ", more: "আরও" },
    settings: { title: "সেটিংস", subtitle: "আপনার অ্যাকাউন্ট পরিচালনা করুন", profile: "প্রোফাইল", account: "অ্যাকাউন্ট", notifications: "বিজ্ঞপ্তি", appearance: "চেহারা", privacy: "গোপনীয়তা", language: "ভাষা" },
    lang: { title: "ভাষা", subtitle: "ইন্টারফেস ভাষা বেছে নিন", search: "ভাষা খুঁজুন...", current: "বর্তমান ভাষা", popular: "জনপ্রিয়", all: "সব ভাষা", applied: "ভাষা পরিবর্তিত হয়েছে!" },
    common: { save: "সেভ", cancel: "বাতিল", loading: "লোড হচ্ছে...", error: "ত্রুটি", success: "সফলতা", network_error: "নেটওয়ার্ক ত্রুটি", try_again: "আবার চেষ্টা", close: "বন্ধ", search: "খোঁজ", back: "পেছনে" },
  },
  id: {
    nav: { home: "Beranda", explore: "Jelajahi", reels: "Reels", messages: "Pesan", groups: "Grup", notifications: "Notifikasi", profile: "Profil", settings: "Pengaturan", admin: "Admin", premium: "Premium" },
    auth: { login: "Masuk", register: "Daftar", email: "Email", password: "Kata sandi", username: "Nama pengguna", logout: "Keluar", welcome: "Selamat datang kembali", sign_in: "Masuk", no_account: "Belum punya akun?", have_account: "Sudah punya akun?" },
    post: { like: "Suka", comment: "Komentar", share: "Bagikan", report: "Laporkan", follow: "Ikuti", unfollow: "Berhenti ikuti", save: "Simpan", more: "Lainnya" },
    settings: { title: "Pengaturan", subtitle: "Kelola akun Anda", profile: "Profil", account: "Akun", notifications: "Notifikasi", appearance: "Tampilan", privacy: "Privasi", language: "Bahasa" },
    lang: { title: "Bahasa", subtitle: "Pilih bahasa antarmuka", search: "Cari bahasa...", current: "Bahasa saat ini", popular: "Populer", all: "Semua bahasa", applied: "Bahasa diubah!" },
    common: { save: "Simpan", cancel: "Batal", loading: "Memuat...", error: "Kesalahan", success: "Berhasil", network_error: "Kesalahan jaringan", try_again: "Coba lagi", close: "Tutup", search: "Cari", back: "Kembali" },
  },
  vi: {
    nav: { home: "Trang chủ", explore: "Khám phá", reels: "Reels", messages: "Tin nhắn", groups: "Nhóm", notifications: "Thông báo", profile: "Hồ sơ", settings: "Cài đặt", admin: "Quản trị", premium: "Cao cấp" },
    auth: { login: "Đăng nhập", register: "Đăng ký", email: "Email", password: "Mật khẩu", username: "Tên người dùng", logout: "Đăng xuất", welcome: "Chào mừng trở lại", sign_in: "Đăng nhập", no_account: "Chưa có tài khoản?", have_account: "Đã có tài khoản?" },
    post: { like: "Thích", comment: "Bình luận", share: "Chia sẻ", report: "Báo cáo", follow: "Theo dõi", unfollow: "Bỏ theo dõi", save: "Lưu", more: "Thêm" },
    settings: { title: "Cài đặt", subtitle: "Quản lý tài khoản", profile: "Hồ sơ", account: "Tài khoản", notifications: "Thông báo", appearance: "Giao diện", privacy: "Quyền riêng tư", language: "Ngôn ngữ" },
    lang: { title: "Ngôn ngữ", subtitle: "Chọn ngôn ngữ giao diện", search: "Tìm ngôn ngữ...", current: "Ngôn ngữ hiện tại", popular: "Phổ biến", all: "Tất cả ngôn ngữ", applied: "Đã thay đổi ngôn ngữ!" },
    common: { save: "Lưu", cancel: "Hủy", loading: "Đang tải...", error: "Lỗi", success: "Thành công", network_error: "Lỗi mạng", try_again: "Thử lại", close: "Đóng", search: "Tìm kiếm", back: "Quay lại" },
  },
  th: {
    nav: { home: "หน้าหลัก", explore: "สำรวจ", reels: "รีลส์", messages: "ข้อความ", groups: "กลุ่ม", notifications: "การแจ้งเตือน", profile: "โปรไฟล์", settings: "การตั้งค่า", admin: "ผู้ดูแล", premium: "พรีเมียม" },
    auth: { login: "เข้าสู่ระบบ", register: "ลงทะเบียน", email: "อีเมล", password: "รหัสผ่าน", username: "ชื่อผู้ใช้", logout: "ออกจากระบบ", welcome: "ยินดีต้อนรับกลับ", sign_in: "เข้าสู่ระบบ", no_account: "ไม่มีบัญชี?", have_account: "มีบัญชีแล้ว?" },
    post: { like: "ถูกใจ", comment: "ความคิดเห็น", share: "แชร์", report: "รายงาน", follow: "ติดตาม", unfollow: "เลิกติดตาม", save: "บันทึก", more: "เพิ่มเติม" },
    settings: { title: "การตั้งค่า", subtitle: "จัดการบัญชีของคุณ", profile: "โปรไฟล์", account: "บัญชี", notifications: "การแจ้งเตือน", appearance: "รูปลักษณ์", privacy: "ความเป็นส่วนตัว", language: "ภาษา" },
    lang: { title: "ภาษา", subtitle: "เลือกภาษาสำหรับอินเทอร์เฟซ", search: "ค้นหาภาษา...", current: "ภาษาปัจจุบัน", popular: "ยอดนิยม", all: "ทุกภาษา", applied: "เปลี่ยนภาษาแล้ว!" },
    common: { save: "บันทึก", cancel: "ยกเลิก", loading: "กำลังโหลด...", error: "ข้อผิดพลาด", success: "สำเร็จ", network_error: "ข้อผิดพลาดเครือข่าย", try_again: "ลองอีกครั้ง", close: "ปิด", search: "ค้นหา", back: "กลับ" },
  },
  uk: {
    nav: { home: "Головна", explore: "Огляд", reels: "Рілс", messages: "Повідомлення", groups: "Групи", notifications: "Сповіщення", profile: "Профіль", settings: "Налаштування", admin: "Адмін", premium: "Преміум" },
    auth: { login: "Увійти", register: "Реєстрація", email: "Email", password: "Пароль", username: "Ім'я користувача", logout: "Вийти", welcome: "Ласкаво просимо", sign_in: "Увійти", no_account: "Немає акаунту?", have_account: "Є акаунт?" },
    post: { like: "Вподобати", comment: "Коментар", share: "Поділитися", report: "Поскаржитися", follow: "Підписатися", unfollow: "Відписатися", save: "Зберегти", more: "Ще" },
    settings: { title: "Налаштування", subtitle: "Керуйте акаунтом", profile: "Профіль", account: "Акаунт", notifications: "Сповіщення", appearance: "Вигляд", privacy: "Конфіденційність", language: "Мова" },
    lang: { title: "Мова", subtitle: "Оберіть мову інтерфейсу", search: "Пошук мови...", current: "Поточна мова", popular: "Популярні", all: "Усі мови", applied: "Мову змінено!" },
    common: { save: "Зберегти", cancel: "Скасувати", loading: "Завантаження...", error: "Помилка", success: "Успіх", network_error: "Помилка мережі", try_again: "Спробуйте знову", close: "Закрити", search: "Пошук", back: "Назад" },
  },
  sv: {
    nav: { home: "Hem", explore: "Utforska", reels: "Reels", messages: "Meddelanden", groups: "Grupper", notifications: "Aviseringar", profile: "Profil", settings: "Inställningar", admin: "Admin", premium: "Premium" },
    auth: { login: "Logga in", register: "Registrera", email: "E-post", password: "Lösenord", username: "Användarnamn", logout: "Logga ut", welcome: "Välkommen tillbaka", sign_in: "Logga in", no_account: "Inget konto?", have_account: "Har du ett konto?" },
    post: { like: "Gilla", comment: "Kommentar", share: "Dela", report: "Rapportera", follow: "Följ", unfollow: "Sluta följa", save: "Spara", more: "Mer" },
    settings: { title: "Inställningar", subtitle: "Hantera ditt konto", profile: "Profil", account: "Konto", notifications: "Aviseringar", appearance: "Utseende", privacy: "Integritet", language: "Språk" },
    lang: { title: "Språk", subtitle: "Välj gränssnittsspråk", search: "Sök språk...", current: "Nuvarande språk", popular: "Populära", all: "Alla språk", applied: "Språk ändrat!" },
    common: { save: "Spara", cancel: "Avbryt", loading: "Läser in...", error: "Fel", success: "Framgång", network_error: "Nätverksfel", try_again: "Försök igen", close: "Stäng", search: "Sök", back: "Tillbaka" },
  },
  no: {
    nav: { home: "Hjem", explore: "Utforsk", reels: "Reels", messages: "Meldinger", groups: "Grupper", notifications: "Varsler", profile: "Profil", settings: "Innstillinger", admin: "Admin", premium: "Premium" },
    auth: { login: "Logg inn", register: "Registrer", email: "E-post", password: "Passord", username: "Brukernavn", logout: "Logg ut", welcome: "Velkommen tilbake", sign_in: "Logg inn", no_account: "Ingen konto?", have_account: "Har du en konto?" },
    post: { like: "Lik", comment: "Kommentar", share: "Del", report: "Rapporter", follow: "Følg", unfollow: "Slutt å følge", save: "Lagre", more: "Mer" },
    settings: { title: "Innstillinger", subtitle: "Administrer kontoen din", profile: "Profil", account: "Konto", notifications: "Varsler", appearance: "Utseende", privacy: "Personvern", language: "Språk" },
    lang: { title: "Språk", subtitle: "Velg grensesnittspråk", search: "Søk etter språk...", current: "Gjeldende språk", popular: "Populære", all: "Alle språk", applied: "Språk endret!" },
    common: { save: "Lagre", cancel: "Avbryt", loading: "Laster...", error: "Feil", success: "Suksess", network_error: "Nettverksfeil", try_again: "Prøv igjen", close: "Lukk", search: "Søk", back: "Tilbake" },
  },
  da: {
    nav: { home: "Hjem", explore: "Udforsk", reels: "Reels", messages: "Beskeder", groups: "Grupper", notifications: "Notifikationer", profile: "Profil", settings: "Indstillinger", admin: "Admin", premium: "Premium" },
    auth: { login: "Log ind", register: "Tilmeld", email: "E-mail", password: "Adgangskode", username: "Brugernavn", logout: "Log ud", welcome: "Velkommen tilbage", sign_in: "Log ind", no_account: "Ingen konto?", have_account: "Har du en konto?" },
    post: { like: "Synes godt om", comment: "Kommentar", share: "Del", report: "Rapporter", follow: "Følg", unfollow: "Hold op med at følge", save: "Gem", more: "Mere" },
    settings: { title: "Indstillinger", subtitle: "Administrer din konto", profile: "Profil", account: "Konto", notifications: "Notifikationer", appearance: "Udseende", privacy: "Privatliv", language: "Sprog" },
    lang: { title: "Sprog", subtitle: "Vælg grænsefladesprog", search: "Søg efter sprog...", current: "Nuværende sprog", popular: "Populære", all: "Alle sprog", applied: "Sprog ændret!" },
    common: { save: "Gem", cancel: "Annuller", loading: "Indlæser...", error: "Fejl", success: "Succes", network_error: "Netværksfejl", try_again: "Prøv igen", close: "Luk", search: "Søg", back: "Tilbage" },
  },
  fi: {
    nav: { home: "Koti", explore: "Tutustu", reels: "Reels", messages: "Viestit", groups: "Ryhmät", notifications: "Ilmoitukset", profile: "Profiili", settings: "Asetukset", admin: "Admin", premium: "Premium" },
    auth: { login: "Kirjaudu", register: "Rekisteröidy", email: "Sähköposti", password: "Salasana", username: "Käyttäjänimi", logout: "Kirjaudu ulos", welcome: "Tervetuloa takaisin", sign_in: "Kirjaudu sisään", no_account: "Ei tiliä?", have_account: "Onko sinulla tili?" },
    post: { like: "Tykkää", comment: "Kommentti", share: "Jaa", report: "Ilmoita", follow: "Seuraa", unfollow: "Lopeta seuraaminen", save: "Tallenna", more: "Lisää" },
    settings: { title: "Asetukset", subtitle: "Hallitse tiliäsi", profile: "Profiili", account: "Tili", notifications: "Ilmoitukset", appearance: "Ulkoasu", privacy: "Yksityisyys", language: "Kieli" },
    lang: { title: "Kieli", subtitle: "Valitse käyttöliittymän kieli", search: "Hae kieltä...", current: "Nykyinen kieli", popular: "Suositut", all: "Kaikki kielet", applied: "Kieli vaihdettu!" },
    common: { save: "Tallenna", cancel: "Peruuta", loading: "Ladataan...", error: "Virhe", success: "Menestys", network_error: "Verkkovirhe", try_again: "Yritä uudelleen", close: "Sulje", search: "Hae", back: "Takaisin" },
  },
  el: {
    nav: { home: "Αρχική", explore: "Εξερεύνηση", reels: "Reels", messages: "Μηνύματα", groups: "Ομάδες", notifications: "Ειδοποιήσεις", profile: "Προφίλ", settings: "Ρυθμίσεις", admin: "Διαχειριστής", premium: "Πριμ" },
    auth: { login: "Σύνδεση", register: "Εγγραφή", email: "Email", password: "Κωδικός", username: "Όνομα χρήστη", logout: "Αποσύνδεση", welcome: "Καλωσόρισες ξανά", sign_in: "Σύνδεση", no_account: "Δεν έχεις λογαριασμό;", have_account: "Έχεις λογαριασμό;" },
    post: { like: "Μου αρέσει", comment: "Σχόλιο", share: "Κοινοποίηση", report: "Αναφορά", follow: "Ακολούθησε", unfollow: "Κατάργηση παρακολούθησης", save: "Αποθήκευση", more: "Περισσότερα" },
    settings: { title: "Ρυθμίσεις", subtitle: "Διαχείριση λογαριασμού", profile: "Προφίλ", account: "Λογαριασμός", notifications: "Ειδοποιήσεις", appearance: "Εμφάνιση", privacy: "Απόρρητο", language: "Γλώσσα" },
    lang: { title: "Γλώσσα", subtitle: "Επιλέξτε γλώσσα διεπαφής", search: "Αναζήτηση γλώσσας...", current: "Τρέχουσα γλώσσα", popular: "Δημοφιλείς", all: "Όλες οι γλώσσες", applied: "Η γλώσσα άλλαξε!" },
    common: { save: "Αποθήκευση", cancel: "Ακύρωση", loading: "Φόρτωση...", error: "Σφάλμα", success: "Επιτυχία", network_error: "Σφάλμα δικτύου", try_again: "Δοκιμάστε ξανά", close: "Κλείσιμο", search: "Αναζήτηση", back: "Πίσω" },
  },
  cs: {
    nav: { home: "Domů", explore: "Prozkoumat", reels: "Reels", messages: "Zprávy", groups: "Skupiny", notifications: "Oznámení", profile: "Profil", settings: "Nastavení", admin: "Admin", premium: "Premium" },
    auth: { login: "Přihlásit se", register: "Registrovat", email: "Email", password: "Heslo", username: "Uživatelské jméno", logout: "Odhlásit", welcome: "Vítejte zpět", sign_in: "Přihlásit", no_account: "Nemáte účet?", have_account: "Máte účet?" },
    post: { like: "To se mi líbí", comment: "Komentář", share: "Sdílet", report: "Nahlásit", follow: "Sledovat", unfollow: "Přestat sledovat", save: "Uložit", more: "Více" },
    settings: { title: "Nastavení", subtitle: "Spravujte svůj účet", profile: "Profil", account: "Účet", notifications: "Oznámení", appearance: "Vzhled", privacy: "Soukromí", language: "Jazyk" },
    lang: { title: "Jazyk", subtitle: "Vyberte jazyk rozhraní", search: "Hledat jazyk...", current: "Aktuální jazyk", popular: "Populární", all: "Všechny jazyky", applied: "Jazyk změněn!" },
    common: { save: "Uložit", cancel: "Zrušit", loading: "Načítání...", error: "Chyba", success: "Úspěch", network_error: "Chyba sítě", try_again: "Zkuste znovu", close: "Zavřít", search: "Hledat", back: "Zpět" },
  },
  hu: {
    nav: { home: "Főoldal", explore: "Felfedezés", reels: "Reels", messages: "Üzenetek", groups: "Csoportok", notifications: "Értesítések", profile: "Profil", settings: "Beállítások", admin: "Admin", premium: "Prémium" },
    auth: { login: "Bejelentkezés", register: "Regisztráció", email: "Email", password: "Jelszó", username: "Felhasználónév", logout: "Kijelentkezés", welcome: "Üdvözöljük újra", sign_in: "Bejelentkezés", no_account: "Nincs fiókja?", have_account: "Van fiókja?" },
    post: { like: "Tetszik", comment: "Hozzászólás", share: "Megosztás", report: "Jelentés", follow: "Követés", unfollow: "Követés eltávolítása", save: "Mentés", more: "Több" },
    settings: { title: "Beállítások", subtitle: "Fiók kezelése", profile: "Profil", account: "Fiók", notifications: "Értesítések", appearance: "Megjelenés", privacy: "Adatvédelem", language: "Nyelv" },
    lang: { title: "Nyelv", subtitle: "Válassza ki a felületi nyelvet", search: "Keresés...", current: "Jelenlegi nyelv", popular: "Népszerű", all: "Összes nyelv", applied: "Nyelv megváltozott!" },
    common: { save: "Mentés", cancel: "Mégse", loading: "Betöltés...", error: "Hiba", success: "Siker", network_error: "Hálózati hiba", try_again: "Próbálja újra", close: "Bezárás", search: "Keresés", back: "Vissza" },
  },
  ro: {
    nav: { home: "Acasă", explore: "Explorează", reels: "Reels", messages: "Mesaje", groups: "Grupuri", notifications: "Notificări", profile: "Profil", settings: "Setări", admin: "Admin", premium: "Premium" },
    auth: { login: "Conectare", register: "Înregistrare", email: "Email", password: "Parolă", username: "Nume de utilizator", logout: "Deconectare", welcome: "Bine ai revenit", sign_in: "Intră", no_account: "Nu ai cont?", have_account: "Ai deja cont?" },
    post: { like: "Apreciez", comment: "Comentariu", share: "Distribuire", report: "Raportare", follow: "Urmărire", unfollow: "Nu mai urmări", save: "Salvare", more: "Mai mult" },
    settings: { title: "Setări", subtitle: "Gestionați contul", profile: "Profil", account: "Cont", notifications: "Notificări", appearance: "Aspect", privacy: "Confidențialitate", language: "Limbă" },
    lang: { title: "Limbă", subtitle: "Alegeți limba interfeței", search: "Căutați o limbă...", current: "Limba curentă", popular: "Populare", all: "Toate limbile", applied: "Limba schimbată!" },
    common: { save: "Salvare", cancel: "Anulare", loading: "Se încarcă...", error: "Eroare", success: "Succes", network_error: "Eroare de rețea", try_again: "Încercați din nou", close: "Închidere", search: "Căutare", back: "Înapoi" },
  },
  he: {
    nav: { home: "בית", explore: "גלה", reels: "ריילס", messages: "הודעות", groups: "קבוצות", notifications: "התראות", profile: "פרופיל", settings: "הגדרות", admin: "מנהל", premium: "פרמיום" },
    auth: { login: "כניסה", register: "הרשמה", email: "אימייל", password: "סיסמה", username: "שם משתמש", logout: "יציאה", welcome: "ברוך שובך", sign_in: "כנס", no_account: "אין לך חשבון?", have_account: "יש לך חשבון?" },
    post: { like: "אהבתי", comment: "תגובה", share: "שיתוף", report: "דיווח", follow: "עקוב", unfollow: "הפסק לעקוב", save: "שמור", more: "עוד" },
    settings: { title: "הגדרות", subtitle: "נהל את חשבונך", profile: "פרופיל", account: "חשבון", notifications: "התראות", appearance: "מראה", privacy: "פרטיות", language: "שפה" },
    lang: { title: "שפה", subtitle: "בחר שפת ממשק", search: "חפש שפה...", current: "שפה נוכחית", popular: "פופולרי", all: "כל השפות", applied: "השפה שונתה!" },
    common: { save: "שמור", cancel: "ביטול", loading: "טוען...", error: "שגיאה", success: "הצלחה", network_error: "שגיאת רשת", try_again: "נסה שוב", close: "סגור", search: "חפש", back: "חזור" },
  },
  ms: {
    nav: { home: "Laman Utama", explore: "Terokai", reels: "Reels", messages: "Mesej", groups: "Kumpulan", notifications: "Pemberitahuan", profile: "Profil", settings: "Tetapan", admin: "Admin", premium: "Premium" },
    auth: { login: "Log Masuk", register: "Daftar", email: "E-mel", password: "Kata Laluan", username: "Nama Pengguna", logout: "Log Keluar", welcome: "Selamat Kembali", sign_in: "Log Masuk", no_account: "Tiada akaun?", have_account: "Ada akaun?" },
    post: { like: "Suka", comment: "Komen", share: "Kongsi", report: "Laporkan", follow: "Ikuti", unfollow: "Berhenti Ikuti", save: "Simpan", more: "Lagi" },
    settings: { title: "Tetapan", subtitle: "Urus akaun anda", profile: "Profil", account: "Akaun", notifications: "Pemberitahuan", appearance: "Penampilan", privacy: "Privasi", language: "Bahasa" },
    lang: { title: "Bahasa", subtitle: "Pilih bahasa antara muka", search: "Cari bahasa...", current: "Bahasa semasa", popular: "Popular", all: "Semua bahasa", applied: "Bahasa ditukar!" },
    common: { save: "Simpan", cancel: "Batal", loading: "Memuatkan...", error: "Ralat", success: "Berjaya", network_error: "Ralat rangkaian", try_again: "Cuba lagi", close: "Tutup", search: "Cari", back: "Kembali" },
  },
  sw: {
    nav: { home: "Nyumbani", explore: "Gundua", reels: "Reels", messages: "Ujumbe", groups: "Vikundi", notifications: "Arifa", profile: "Wasifu", settings: "Mipangilio", admin: "Admin", premium: "Premium" },
    auth: { login: "Ingia", register: "Jisajili", email: "Barua pepe", password: "Nywila", username: "Jina la mtumiaji", logout: "Toka", welcome: "Karibu tena", sign_in: "Ingia", no_account: "Huna akaunti?", have_account: "Una akaunti?" },
    post: { like: "Penda", comment: "Maoni", share: "Shiriki", report: "Ripoti", follow: "Fuata", unfollow: "Acha kufuata", save: "Hifadhi", more: "Zaidi" },
    settings: { title: "Mipangilio", subtitle: "Simamia akaunti yako", profile: "Wasifu", account: "Akaunti", notifications: "Arifa", appearance: "Muonekano", privacy: "Faragha", language: "Lugha" },
    lang: { title: "Lugha", subtitle: "Chagua lugha ya kiolesura", search: "Tafuta lugha...", current: "Lugha ya sasa", popular: "Maarufu", all: "Lugha zote", applied: "Lugha imebadilishwa!" },
    common: { save: "Hifadhi", cancel: "Ghairi", loading: "Inapakia...", error: "Hitilafu", success: "Mafanikio", network_error: "Hitilafu ya mtandao", try_again: "Jaribu tena", close: "Funga", search: "Tafuta", back: "Rudi" },
  },
  tl: {
    nav: { home: "Home", explore: "I-explore", reels: "Reels", messages: "Mga Mensahe", groups: "Mga Grupo", notifications: "Mga Abiso", profile: "Profile", settings: "Mga Setting", admin: "Admin", premium: "Premium" },
    auth: { login: "Mag-login", register: "Mag-rehistro", email: "Email", password: "Password", username: "Username", logout: "Mag-logout", welcome: "Maligayang pagbabalik", sign_in: "Mag-sign in", no_account: "Wala pang account?", have_account: "Mayroon nang account?" },
    post: { like: "I-like", comment: "Mag-komento", share: "I-share", report: "I-report", follow: "Sundan", unfollow: "Alisin sa sundan", save: "I-save", more: "Higit pa" },
    settings: { title: "Mga Setting", subtitle: "Pamahalaan ang iyong account", profile: "Profile", account: "Account", notifications: "Mga Abiso", appearance: "Hitsura", privacy: "Privacy", language: "Wika" },
    lang: { title: "Wika", subtitle: "Piliin ang wika ng interface", search: "Maghanap ng wika...", current: "Kasalukuyang wika", popular: "Sikat", all: "Lahat ng wika", applied: "Nabago na ang wika!" },
    common: { save: "I-save", cancel: "Kanselahin", loading: "Naglo-load...", error: "Error", success: "Matagumpay", network_error: "Network error", try_again: "Subukang muli", close: "Isara", search: "Hanapin", back: "Bumalik" },
  },
  az: {
    nav: { home: "Ana Səhifə", explore: "Kəşf Et", reels: "Reels", messages: "Mesajlar", groups: "Qruplar", notifications: "Bildirişlər", profile: "Profil", settings: "Parametrlər", admin: "Admin", premium: "Premium" },
    auth: { login: "Daxil ol", register: "Qeydiyyat", email: "E-poçt", password: "Şifrə", username: "İstifadəçi adı", logout: "Çıxış", welcome: "Xoş gəlmisiniz", sign_in: "Giriş", no_account: "Hesabınız yoxdur?", have_account: "Hesabınız var?" },
    post: { like: "Bəyən", comment: "Şərh", share: "Paylaş", report: "Şikayət", follow: "İzlə", unfollow: "İzləməyi dayandır", save: "Saxla", more: "Daha çox" },
    settings: { title: "Parametrlər", subtitle: "Hesabınızı idarə edin", profile: "Profil", account: "Hesab", notifications: "Bildirişlər", appearance: "Görünüş", privacy: "Məxfilik", language: "Dil" },
    lang: { title: "Dil", subtitle: "İnterfeys dilini seçin", search: "Dil axtar...", current: "Cari dil", popular: "Populyar", all: "Bütün dillər", applied: "Dil dəyişdirildi!" },
    common: { save: "Saxla", cancel: "Ləğv et", loading: "Yüklənir...", error: "Xəta", success: "Uğur", network_error: "Şəbəkə xətası", try_again: "Yenidən cəhd edin", close: "Bağla", search: "Axtar", back: "Geri" },
  },
  kk: {
    nav: { home: "Басты бет", explore: "Зерттеу", reels: "Reels", messages: "Хабарлар", groups: "Топтар", notifications: "Хабарландырулар", profile: "Профиль", settings: "Баптаулар", admin: "Әкімші", premium: "Премиум" },
    auth: { login: "Кіру", register: "Тіркелу", email: "Email", password: "Құпия сөз", username: "Пайдаланушы аты", logout: "Шығу", welcome: "Қош келдіңіз", sign_in: "Кіру", no_account: "Аккаунт жоқ па?", have_account: "Аккаунт бар ма?" },
    post: { like: "Ұнату", comment: "Пікір", share: "Бөлісу", report: "Шағым", follow: "Жазылу", unfollow: "Жазылымды болдырмау", save: "Сақтау", more: "Көбірек" },
    settings: { title: "Баптаулар", subtitle: "Аккаунтыңызды басқарыңыз", profile: "Профиль", account: "Аккаунт", notifications: "Хабарландырулар", appearance: "Сыртқы түр", privacy: "Құпиялылық", language: "Тіл" },
    lang: { title: "Тіл", subtitle: "Интерфейс тілін таңдаңыз", search: "Тіл іздеу...", current: "Ағымдағы тіл", popular: "Танымал", all: "Барлық тілдер", applied: "Тіл өзгертілді!" },
    common: { save: "Сақтау", cancel: "Болдырмау", loading: "Жүктелуде...", error: "Қате", success: "Сәтті", network_error: "Желі қатесі", try_again: "Қайталап көріңіз", close: "Жабу", search: "Іздеу", back: "Артқа" },
  },
  ky: {
    nav: { home: "Башкы бет", explore: "Изилдөө", reels: "Reels", messages: "Билдирүүлөр", groups: "Топтор", notifications: "Эскертмелер", profile: "Профиль", settings: "Жөндөөлөр", admin: "Администратор", premium: "Премиум" },
    auth: { login: "Кирүү", register: "Катталуу", email: "Email", password: "Сырсөз", username: "Колдонуучу аты", logout: "Чыгуу", welcome: "Кайра кош келдиңиз", sign_in: "Кирүү", no_account: "Аккаунт жокпу?", have_account: "Аккаунт барбы?" },
    post: { like: "Жактыруу", comment: "Комментарий", share: "Бөлүшүү", report: "Арыз", follow: "Жазылуу", unfollow: "Жазылымдан чыгуу", save: "Сактоо", more: "Дагы" },
    settings: { title: "Жөндөөлөр", subtitle: "Аккаунтуңузду башкаруу", profile: "Профиль", account: "Аккаунт", notifications: "Эскертмелер", appearance: "Көрүнүш", privacy: "Купуялуулук", language: "Тил" },
    lang: { title: "Тил", subtitle: "Интерфейс тилин тандаңыз", search: "Тил издөө...", current: "Азыркы тил", popular: "Популярдуу", all: "Бардык тилдер", applied: "Тил өзгөртүлдү!" },
    common: { save: "Сактоо", cancel: "Жокко чыгаруу", loading: "Жүктөлүүдө...", error: "Ката", success: "Ийгилик", network_error: "Тармак катасы", try_again: "Кайра аракет кылыңыз", close: "Жабуу", search: "Издөө", back: "Артка" },
  },
  tk: {
    nav: { home: "Baş sahypa", explore: "Açmak", reels: "Reels", messages: "Habarlar", groups: "Toparlar", notifications: "Habarlamalar", profile: "Profil", settings: "Sazlamalar", admin: "Admin", premium: "Premium" },
    auth: { login: "Giriş", register: "Hasap açmak", email: "Email", password: "Parol", username: "Ulanyjy ady", logout: "Çykmak", welcome: "Hoş geldiňiz", sign_in: "Giriş", no_account: "Hasabyňyz ýokmy?", have_account: "Hasabyňyz barmy?" },
    post: { like: "Halaýaryn", comment: "Teswir", share: "Paýlaşmak", report: "Şikaýat", follow: "Yzarlamak", unfollow: "Yzarlamagy bes etmek", save: "Saklamak", more: "Koprak" },
    settings: { title: "Sazlamalar", subtitle: "Hasabyňyzy dolandyrmak", profile: "Profil", account: "Hasap", notifications: "Habarlamalar", appearance: "Görnüş", privacy: "Gizlinlik", language: "Dil" },
    lang: { title: "Dil", subtitle: "Interfeýs dilini saýlaň", search: "Dil gözlemek...", current: "Häzirki dil", popular: "Meşhur", all: "Ähli diller", applied: "Dil üýtgedildi!" },
    common: { save: "Saklamak", cancel: "Ýatyrymak", loading: "Ýüklenýär...", error: "Ýalňyşlyk", success: "Üstünlik", network_error: "Tor ýalňyşlygy", try_again: "Täzeden synanyşyň", close: "Ýapmak", search: "Gözlemek", back: "Yza" },
  },
  tg: {
    nav: { home: "Саҳифаи асосӣ", explore: "Кашф кардан", reels: "Reels", messages: "Паёмҳо", groups: "Гурӯҳҳо", notifications: "Огоҳиҳо", profile: "Профил", settings: "Танзимот", admin: "Маъмур", premium: "Премиум" },
    auth: { login: "Воридшавӣ", register: "Сабти ном", email: "Email", password: "Рамз", username: "Номи корбар", logout: "Баромадан", welcome: "Хуш омадед", sign_in: "Ворид шудан", no_account: "Аккаунт надоред?", have_account: "Аккаунт доред?" },
    post: { like: "Писандидан", comment: "Шарҳ", share: "Мубодила", report: "Шикоят", follow: "Пайравӣ", unfollow: "Бекор кардан", save: "Нигоҳ доштан", more: "Бештар" },
    settings: { title: "Танзимот", subtitle: "Аккаунтатонро идора кунед", profile: "Профил", account: "Аккаунт", notifications: "Огоҳиҳо", appearance: "Намуд", privacy: "Махфият", language: "Забон" },
    lang: { title: "Забон", subtitle: "Забони интерфейсро интихоб кунед", search: "Ҷустуҷӯи забон...", current: "Забони ҷорӣ", popular: "Маъмул", all: "Ҳамаи забонҳо", applied: "Забон тағйир ёфт!" },
    common: { save: "Нигоҳ доштан", cancel: "Бекор кардан", loading: "Бор шудан...", error: "Хато", success: "Муваффақият", network_error: "Хатои шабака", try_again: "Дубора кӯшиш кунед", close: "Бастан", search: "Ҷустуҷӯ", back: "Бозгашт" },
  },
  mn: {
    nav: { home: "Нүүр", explore: "Судлах", reels: "Reels", messages: "Мессеж", groups: "Бүлгүүд", notifications: "Мэдэгдэл", profile: "Профайл", settings: "Тохиргоо", admin: "Админ", premium: "Премиум" },
    auth: { login: "Нэвтрэх", register: "Бүртгүүлэх", email: "Имэйл", password: "Нууц үг", username: "Хэрэглэгчийн нэр", logout: "Гарах", welcome: "Тавтай морил", sign_in: "Нэвтрэх", no_account: "Бүртгэл байхгүй?", have_account: "Бүртгэл байна уу?" },
    post: { like: "Таалах", comment: "Сэтгэгдэл", share: "Хуваалцах", report: "Мэдээлэх", follow: "Дагах", unfollow: "Дагахаа болих", save: "Хадгалах", more: "Дэлгэрэнгүй" },
    settings: { title: "Тохиргоо", subtitle: "Дансаа удирдах", profile: "Профайл", account: "Данс", notifications: "Мэдэгдэл", appearance: "Харагдах байдал", privacy: "Нууцлал", language: "Хэл" },
    lang: { title: "Хэл", subtitle: "Интерфейсийн хэлийг сонгоно уу", search: "Хэл хайх...", current: "Одоогийн хэл", popular: "Алдартай", all: "Бүх хэлүүд", applied: "Хэл өөрчлөгдлөө!" },
    common: { save: "Хадгалах", cancel: "Цуцлах", loading: "Ачааллаж байна...", error: "Алдаа", success: "Амжилт", network_error: "Сүлжээний алдаа", try_again: "Дахин оролдоно уу", close: "Хаах", search: "Хайх", back: "Буцах" },
  },
};

const resources: Record<string, { translation: (typeof t)["en"] }> = {};
for (const [lang, data] of Object.entries(t)) {
  resources[lang] = { translation: data as (typeof t)["en"] };
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "uz",
    supportedLngs: Object.keys(t),
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "olcha_lang",
    },
    interpolation: { escapeValue: false },
  });

export function applyRTL(lang: string) {
  const isRTL = RTL_LANGS.has(lang as LangCode);
  document.documentElement.setAttribute("dir", isRTL ? "rtl" : "ltr");
  document.documentElement.setAttribute("lang", lang);
}

i18n.on("languageChanged", (lng) => {
  applyRTL(lng);
});

applyRTL(i18n.language);

export default i18n;
