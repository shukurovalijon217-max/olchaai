import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, AlertTriangle, Check, X, Lock, Bot } from "lucide-react";

type ConsentLang = {
  title: string;
  subtitle: string;
  shield_title: string;
  shield_body: string;
  warn_title: string;
  warn_body: string;
  check: string;
  btn_agree: string;
  btn_cancel: string;
};

const TEXTS: Record<string, ConsentLang> = {
  uz: {
    title: "Xavfsizlik va Shartlar",
    subtitle: "Ro'yxatdan o'tishdan oldin diqqat bilan o'qing",
    shield_title: "Xavfsizligingiz himoyalangan",
    shield_body: "Kiber xavfsizligingiz kuchaytirilgan va markaziy AI yordamchilari orqali 100% himoya qilinadi.",
    warn_title: "Kontent siyosati",
    warn_body: "Platformaga diniy oqimga undiruvchi yoki axloqsiz kontent, videolar joylasangiz, akkauntingiz bloklanishi yoki ogohlantirishdan so'ng markaziy AI yordamchilari tomonidan o'chirilib yuborilishi mumkin.",
    check: "Ushbu shartlarni o'qidim va roziman",
    btn_agree: "Roziman — Ro'yxatdan o'tish",
    btn_cancel: "Bekor qilish",
  },
  en: {
    title: "Safety & Terms",
    subtitle: "Please read carefully before registering",
    shield_title: "Your security is protected",
    shield_body: "Your cybersecurity is strengthened and 100% protected by central AI assistants.",
    warn_title: "Content Policy",
    warn_body: "If you post content promoting religious extremism or immoral content/videos on the platform, your account may be blocked or, after a warning, deleted by central AI assistants.",
    check: "I have read and agree to these terms",
    btn_agree: "Agree — Register",
    btn_cancel: "Cancel",
  },
  ru: {
    title: "Безопасность и Условия",
    subtitle: "Прочтите внимательно перед регистрацией",
    shield_title: "Ваша безопасность защищена",
    shield_body: "Ваша кибербезопасность усилена и на 100% защищена центральными AI-ассистентами.",
    warn_title: "Политика контента",
    warn_body: "Если вы размещаете контент, пропагандирующий религиозный экстремизм или аморальный контент/видео, ваш аккаунт может быть заблокирован или, после предупреждения, удалён центральными AI-ассистентами.",
    check: "Я прочитал(а) и соглашаюсь с условиями",
    btn_agree: "Согласен — Зарегистрироваться",
    btn_cancel: "Отмена",
  },
  zh: {
    title: "安全与条款",
    subtitle: "注册前请仔细阅读",
    shield_title: "您的安全受到保护",
    shield_body: "您的网络安全得到加强，由中央AI助手100%保护。",
    warn_title: "内容政策",
    warn_body: "如果您在平台上发布宣扬宗教极端主义或不道德内容/视频，您的账户可能会被封锁，或在警告后被中央AI助手删除。",
    check: "我已阅读并同意这些条款",
    btn_agree: "同意 — 注册",
    btn_cancel: "取消",
  },
  ar: {
    title: "الأمان والشروط",
    subtitle: "يرجى القراءة بعناية قبل التسجيل",
    shield_title: "أمانك محمي",
    shield_body: "تم تعزيز أمنك الإلكتروني وحمايتك بنسبة 100% بواسطة مساعدي الذكاء الاصطناعي المركزيين.",
    warn_title: "سياسة المحتوى",
    warn_body: "إذا نشرت محتوى يروج للتطرف الديني أو محتوى/مقاطع فيديو غير أخلاقية، فقد يتم حظر حسابك أو حذفه بواسطة مساعدي الذكاء الاصطناعي المركزيين بعد تحذير.",
    check: "لقد قرأت هذه الشروط وأوافق عليها",
    btn_agree: "أوافق — أسجّل",
    btn_cancel: "إلغاء",
  },
  es: {
    title: "Seguridad y Términos",
    subtitle: "Por favor, lea atentamente antes de registrarse",
    shield_title: "Su seguridad está protegida",
    shield_body: "Su ciberseguridad está reforzada y protegida al 100% por asistentes de IA centrales.",
    warn_title: "Política de contenido",
    warn_body: "Si publica contenido que promueve el extremismo religioso o contenido/videos inmorales, su cuenta puede ser bloqueada o, tras una advertencia, eliminada por los asistentes de IA centrales.",
    check: "He leído y acepto estos términos",
    btn_agree: "Acepto — Registrarme",
    btn_cancel: "Cancelar",
  },
  fr: {
    title: "Sécurité et Conditions",
    subtitle: "Veuillez lire attentivement avant de vous inscrire",
    shield_title: "Votre sécurité est protégée",
    shield_body: "Votre cybersécurité est renforcée et protégée à 100% par les assistants IA centraux.",
    warn_title: "Politique de contenu",
    warn_body: "Si vous publiez du contenu promouvant l'extrémisme religieux ou du contenu/vidéos immoraux, votre compte peut être bloqué ou, après avertissement, supprimé par les assistants IA centraux.",
    check: "J'ai lu et j'accepte ces conditions",
    btn_agree: "J'accepte — M'inscrire",
    btn_cancel: "Annuler",
  },
  hi: {
    title: "सुरक्षा और शर्तें",
    subtitle: "कृपया पंजीकरण से पहले ध्यान से पढ़ें",
    shield_title: "आपकी सुरक्षा सुरक्षित है",
    shield_body: "आपकी साइबर सुरक्षा मजबूत है और केंद्रीय AI सहायकों द्वारा 100% सुरक्षित है।",
    warn_title: "सामग्री नीति",
    warn_body: "यदि आप धार्मिक उग्रवाद या अनैतिक सामग्री/वीडियो को बढ़ावा देने वाली सामग्री पोस्ट करते हैं, तो आपका खाता ब्लॉक हो सकता है या चेतावनी के बाद केंद्रीय AI सहायकों द्वारा हटाया जा सकता है।",
    check: "मैंने इन शर्तों को पढ़ा है और सहमत हूं",
    btn_agree: "सहमत — पंजीकरण करें",
    btn_cancel: "रद्द करें",
  },
  tr: {
    title: "Güvenlik ve Koşullar",
    subtitle: "Kayıt olmadan önce lütfen dikkatle okuyun",
    shield_title: "Güvenliğiniz korunuyor",
    shield_body: "Siber güvenliğiniz güçlendirilmiş ve merkezi AI asistanları tarafından %100 korunmaktadır.",
    warn_title: "İçerik Politikası",
    warn_body: "Dini aşırılığı veya ahlaka aykırı içerik/video yayınlarsanız, hesabınız engellenebilir veya uyarının ardından merkezi AI asistanları tarafından silinebilir.",
    check: "Bu koşulları okudum ve kabul ediyorum",
    btn_agree: "Kabul Et — Kayıt Ol",
    btn_cancel: "İptal",
  },
  de: {
    title: "Sicherheit & Bedingungen",
    subtitle: "Bitte sorgfältig vor der Registrierung lesen",
    shield_title: "Ihre Sicherheit ist geschützt",
    shield_body: "Ihre Cybersicherheit wird gestärkt und von zentralen KI-Assistenten zu 100% geschützt.",
    warn_title: "Inhaltsrichtlinien",
    warn_body: "Wenn Sie Inhalte veröffentlichen, die religiösen Extremismus oder unmoralische Inhalte/Videos fördern, kann Ihr Konto gesperrt oder nach einer Warnung von zentralen KI-Assistenten gelöscht werden.",
    check: "Ich habe diese Bedingungen gelesen und stimme zu",
    btn_agree: "Zustimmen — Registrieren",
    btn_cancel: "Abbrechen",
  },
  ja: {
    title: "安全とご利用条件",
    subtitle: "登録前に注意してお読みください",
    shield_title: "あなたのセキュリティは保護されています",
    shield_body: "あなたのサイバーセキュリティは強化され、中央AIアシスタントにより100%保護されています。",
    warn_title: "コンテンツポリシー",
    warn_body: "宗教的過激主義や不道徳なコンテンツ・動画を投稿した場合、アカウントがブロックされるか、警告後に中央AIアシスタントにより削除される場合があります。",
    check: "これらの条件を読み、同意します",
    btn_agree: "同意 — 登録する",
    btn_cancel: "キャンセル",
  },
  ko: {
    title: "보안 및 약관",
    subtitle: "가입 전 주의 깊게 읽어주세요",
    shield_title: "귀하의 보안이 보호됩니다",
    shield_body: "귀하의 사이버 보안이 강화되어 중앙 AI 어시스턴트에 의해 100% 보호됩니다.",
    warn_title: "콘텐츠 정책",
    warn_body: "종교적 극단주의 또는 부도덕한 콘텐츠/동영상을 게시하면 계정이 차단되거나 경고 후 중앙 AI 어시스턴트에 의해 삭제될 수 있습니다.",
    check: "본 약관을 읽었으며 동의합니다",
    btn_agree: "동의 — 가입하기",
    btn_cancel: "취소",
  },
  it: {
    title: "Sicurezza e Termini",
    subtitle: "Si prega di leggere attentamente prima di registrarsi",
    shield_title: "La tua sicurezza è protetta",
    shield_body: "La tua sicurezza informatica è rafforzata e protetta al 100% dagli assistenti AI centrali.",
    warn_title: "Politica dei contenuti",
    warn_body: "Se pubblichi contenuti che promuovono l'estremismo religioso o contenuti/video immorali, il tuo account può essere bloccato o, dopo un avvertimento, eliminato dagli assistenti AI centrali.",
    check: "Ho letto e accetto questi termini",
    btn_agree: "Accetto — Registrarmi",
    btn_cancel: "Annulla",
  },
  pt: {
    title: "Segurança e Termos",
    subtitle: "Por favor, leia atentamente antes de se registrar",
    shield_title: "Sua segurança está protegida",
    shield_body: "Sua segurança cibernética está reforçada e 100% protegida por assistentes de IA centrais.",
    warn_title: "Política de conteúdo",
    warn_body: "Se você publicar conteúdo que promova extremismo religioso ou conteúdo/vídeos imorais, sua conta pode ser bloqueada ou, após um aviso, excluída pelos assistentes de IA centrais.",
    check: "Li e aceito estes termos",
    btn_agree: "Aceito — Registrar",
    btn_cancel: "Cancelar",
  },
  nl: {
    title: "Veiligheid & Voorwaarden",
    subtitle: "Lees dit aandachtig voor registratie",
    shield_title: "Uw veiligheid is beschermd",
    shield_body: "Uw cyberbeveiliging is versterkt en 100% beschermd door centrale AI-assistenten.",
    warn_title: "Inhoudsbeleid",
    warn_body: "Als u inhoud plaatst die religieus extremisme of immorele inhoud/video's bevordert, kan uw account worden geblokkeerd of, na een waarschuwing, worden verwijderd door centrale AI-assistenten.",
    check: "Ik heb deze voorwaarden gelezen en ga akkoord",
    btn_agree: "Akkoord — Registreren",
    btn_cancel: "Annuleren",
  },
  pl: {
    title: "Bezpieczeństwo i Warunki",
    subtitle: "Przeczytaj uważnie przed rejestracją",
    shield_title: "Twoje bezpieczeństwo jest chronione",
    shield_body: "Twoje cyberbezpieczeństwo jest wzmocnione i w 100% chronione przez centralnych asystentów AI.",
    warn_title: "Polityka treści",
    warn_body: "Jeśli publikujesz treści promujące ekstremizm religijny lub niemoralne treści/filmy, Twoje konto może zostać zablokowane lub po ostrzeżeniu usunięte przez centralnych asystentów AI.",
    check: "Przeczytałem(am) i zgadzam się z tymi warunkami",
    btn_agree: "Zgadzam się — Rejestruję",
    btn_cancel: "Anuluj",
  },
  fa: {
    title: "امنیت و شرایط",
    subtitle: "لطفاً قبل از ثبت‌نام با دقت بخوانید",
    shield_title: "امنیت شما محافظت می‌شود",
    shield_body: "امنیت سایبری شما تقویت شده و توسط دستیاران مرکزی هوش مصنوعی ۱۰۰٪ محافظت می‌شود.",
    warn_title: "سیاست محتوا",
    warn_body: "اگر محتوایی که تبلیغ افراط‌گرایی مذهبی یا محتوا/ویدیوهای غیراخلاقی می‌کند منتشر کنید، حساب شما ممکن است مسدود شود یا پس از اخطار توسط دستیاران مرکزی هوش مصنوعی حذف شود.",
    check: "این شرایط را خواندم و موافقم",
    btn_agree: "موافقم — ثبت‌نام",
    btn_cancel: "لغو",
  },
  id: {
    title: "Keamanan & Ketentuan",
    subtitle: "Harap baca dengan seksama sebelum mendaftar",
    shield_title: "Keamanan Anda terlindungi",
    shield_body: "Keamanan siber Anda diperkuat dan dilindungi 100% oleh asisten AI pusat.",
    warn_title: "Kebijakan Konten",
    warn_body: "Jika Anda memposting konten yang mempromosikan ekstremisme agama atau konten/video tidak bermoral, akun Anda dapat diblokir atau, setelah peringatan, dihapus oleh asisten AI pusat.",
    check: "Saya telah membaca dan menyetujui ketentuan ini",
    btn_agree: "Setuju — Daftar",
    btn_cancel: "Batal",
  },
  ms: {
    title: "Keselamatan & Terma",
    subtitle: "Sila baca dengan teliti sebelum mendaftar",
    shield_title: "Keselamatan anda dilindungi",
    shield_body: "Keselamatan siber anda diperkukuh dan dilindungi 100% oleh pembantu AI pusat.",
    warn_title: "Dasar Kandungan",
    warn_body: "Jika anda menyiarkan kandungan yang mempromosikan ekstremisme agama atau kandungan/video tidak bermoral, akaun anda boleh disekat atau, selepas amaran, dipadam oleh pembantu AI pusat.",
    check: "Saya telah membaca dan bersetuju dengan terma ini",
    btn_agree: "Bersetuju — Daftar",
    btn_cancel: "Batal",
  },
  az: {
    title: "Təhlükəsizlik və Şərtlər",
    subtitle: "Qeydiyyatdan əvvəl diqqətlə oxuyun",
    shield_title: "Təhlükəsizliyiniz qorunur",
    shield_body: "Kibertəhlükəsizliyiniz gücləndirilmiş və mərkəzi AI assistentlər tərəfindən 100% qorunur.",
    warn_title: "Kontent siyasəti",
    warn_body: "Dini ekstremizmi və ya əxlaqsız kontent/videolar yerləşdirsəniz, hesabınız bloklanabilər və ya xəbərdarlıqdan sonra mərkəzi AI assistentlər tərəfindən silinə bilər.",
    check: "Bu şərtləri oxudum və razıyam",
    btn_agree: "Razıyam — Qeydiyyat",
    btn_cancel: "Ləğv et",
  },
  kk: {
    title: "Қауіпсіздік пен Шарттар",
    subtitle: "Тіркелмес бұрын мұқият оқыңыз",
    shield_title: "Қауіпсіздігіңіз қорғалған",
    shield_body: "Кибер қауіпсіздігіңіз күшейтілген және орталық AI көмекшілері арқылы 100% қорғалған.",
    warn_title: "Мазмұн саясаты",
    warn_body: "Платформаға діни экстремизмді немесе адамгершілікке жат мазмұн/бейнелер жарияласаңыз, аккаунтыңыз бұғатталуы немесе ескертуден кейін орталық AI көмекшілері тарапынан жойылуы мүмкін.",
    check: "Осы шарттарды оқыдым және келісемін",
    btn_agree: "Келісемін — Тіркелу",
    btn_cancel: "Бас тарту",
  },
  ky: {
    title: "Коопсуздук жана Шарттар",
    subtitle: "Катталуудан мурун кылдат окуңуз",
    shield_title: "Коопсуздугуңуз корголгон",
    shield_body: "Киберкоопсуздугуңуз бекемделген жана борбордук AI жардамчылары тарабынан 100% корголгон.",
    warn_title: "Мазмун саясаты",
    warn_body: "Диний экстремизмди же адепсиз мазмун/видео жарыялаган болсоңуз, аккаунтуңуз бөгөттөлүшү же эскертүүдөн кийин борбордук AI жардамчылары тарабынан жойулушу мүмкүн.",
    check: "Мен бул шарттарды окудум жана макулмун",
    btn_agree: "Макулмун — Катталуу",
    btn_cancel: "Жокко чыгаруу",
  },
  tk: {
    title: "Howpsuzlyk we Şertler",
    subtitle: "Hasaba alynmakdan öň ünsli okaň",
    shield_title: "Howpsuzlygyňyz goralýar",
    shield_body: "Kiber howpsuzlygyňyz güýçlendirilendir we merkezi AI kömekçileri tarapyndan 100% goralandyr.",
    warn_title: "Mazmun syýasaty",
    warn_body: "Platformada dini ekstremizmi ýa-da ahlaksyz mazmun/wideo ýerleşdirenizde hasabyňyz bloklanmak ýa-da duýduryşdan soň merkezi AI kömekçileri tarapyndan öçürilmek mümkin.",
    check: "Bu şertleri okadym we ylalaşýaryn",
    btn_agree: "Ylalaşýaryn — Hasaba Al",
    btn_cancel: "Ýatyr",
  },
  tg: {
    title: "Амнияти ва Шартҳо",
    subtitle: "Пеш аз қайд шудан бодиққат бихонед",
    shield_title: "Амнияти шумо ҳимоя шудааст",
    shield_body: "Амнияти киберии шумо тақвият ёфтааст ва аз ҷониби ёрдамчиёни марказии AI 100% ҳимоя мешавад.",
    warn_title: "Сиёсати мӯҳтавогӣ",
    warn_body: "Агар шумо мӯҳтавои тарвиҷи экстремизми динӣ ё мӯҳтавои/видеоҳои ғайриахлоқиро нашр кунед, аккаунти шумо баста мешавад ё пас аз огоҳонидан аз ҷониби ёрдамчиёни марказии AI ҳазф карда мешавад.",
    check: "Ин шартҳоро хондам ва розиям",
    btn_agree: "Розиям — Қайд шудан",
    btn_cancel: "Бекор кардан",
  },
  mn: {
    title: "Аюулгүй байдал ба Нөхцлүүд",
    subtitle: "Бүртгүүлэхийн өмнө анхааралтай уншина уу",
    shield_title: "Таны аюулгүй байдал хамгаалагдсан",
    shield_body: "Таны кибер аюулгүй байдал бэхжиж, төв AI туслагчдын тусламжтайгаар 100% хамгаалагдсан байна.",
    warn_title: "Контентийн бодлого",
    warn_body: "Хэрэв та шашны экстремизм эсвэл ёс суртахуунгүй контент/видео нийтэлбэл, таны бүртгэл хаагдах эсвэл анхааруулгын дараа төв AI туслагчдаар устгагдах боломжтой.",
    check: "Эдгээр нөхцлийг уншиж, зөвшөөрч байна",
    btn_agree: "Зөвшөөрч — Бүртгүүлэх",
    btn_cancel: "Цуцлах",
  },
  uk: {
    title: "Безпека та Умови",
    subtitle: "Будь ласка, уважно прочитайте перед реєстрацією",
    shield_title: "Ваша безпека захищена",
    shield_body: "Ваша кібербезпека посилена та на 100% захищена центральними AI-асистентами.",
    warn_title: "Політика контенту",
    warn_body: "Якщо ви публікуєте контент, що пропагує релігійний екстремізм або аморальний контент/відео, ваш акаунт може бути заблокований або, після попередження, видалений центральними AI-асистентами.",
    check: "Я прочитав(ла) і погоджуюся з умовами",
    btn_agree: "Погоджуюся — Зареєструватись",
    btn_cancel: "Скасувати",
  },
  he: {
    title: "בטיחות ותנאים",
    subtitle: "אנא קרא/י בעיון לפני ההרשמה",
    shield_title: "הביטחון שלך מוגן",
    shield_body: "אבטחת הסייבר שלך מחוזקת ומוגנת 100% על ידי עוזרי AI מרכזיים.",
    warn_title: "מדיניות תוכן",
    warn_body: "אם תפרסם/י תוכן המקדם קיצוניות דתית או תוכן/סרטונים לא מוסריים, חשבונך עלול להיחסם או, לאחר אזהרה, להימחק על ידי עוזרי AI מרכזיים.",
    check: "קראתי ומסכים/ה לתנאים אלה",
    btn_agree: "מסכים/ה — הרשמה",
    btn_cancel: "ביטול",
  },
  sw: {
    title: "Usalama na Masharti",
    subtitle: "Tafadhali soma kwa makini kabla ya kusajili",
    shield_title: "Usalama wako unalindwa",
    shield_body: "Usalama wako wa mtandao umeimarishwa na kulindwa 100% na wasaidizi wa AI wa kati.",
    warn_title: "Sera ya Maudhui",
    warn_body: "Ukichapisha maudhui yanayokuza msimamo mkali wa kidini au maudhui/video zisizo na maadili, akaunti yako inaweza kuzuiwa au, baada ya onyo, kufutwa na wasaidizi wa AI wa kati.",
    check: "Nimesoma na ninakubali masharti haya",
    btn_agree: "Nakubali — Sajili",
    btn_cancel: "Ghairi",
  },
  th: {
    title: "ความปลอดภัยและข้อกำหนด",
    subtitle: "โปรดอ่านอย่างละเอียดก่อนลงทะเบียน",
    shield_title: "ความปลอดภัยของคุณได้รับการปกป้อง",
    shield_body: "ความปลอดภัยทางไซเบอร์ของคุณได้รับการเสริมและปกป้อง 100% โดยผู้ช่วย AI กลาง",
    warn_title: "นโยบายเนื้อหา",
    warn_body: "หากคุณโพสต์เนื้อหาที่ส่งเสริมลัทธิหัวรุนแรงทางศาสนาหรือเนื้อหา/วิดีโอที่ผิดศีลธรรม บัญชีของคุณอาจถูกบล็อกหรือถูกลบโดยผู้ช่วย AI กลางหลังจากได้รับคำเตือน",
    check: "ฉันได้อ่านและยอมรับข้อกำหนดเหล่านี้",
    btn_agree: "ยอมรับ — ลงทะเบียน",
    btn_cancel: "ยกเลิก",
  },
  vi: {
    title: "An toàn và Điều khoản",
    subtitle: "Vui lòng đọc kỹ trước khi đăng ký",
    shield_title: "Bảo mật của bạn được bảo vệ",
    shield_body: "An ninh mạng của bạn được tăng cường và bảo vệ 100% bởi các trợ lý AI trung tâm.",
    warn_title: "Chính sách nội dung",
    warn_body: "Nếu bạn đăng nội dung quảng bá chủ nghĩa cực đoan tôn giáo hoặc nội dung/video vô đạo đức, tài khoản của bạn có thể bị chặn hoặc, sau cảnh báo, bị xóa bởi các trợ lý AI trung tâm.",
    check: "Tôi đã đọc và đồng ý với các điều khoản này",
    btn_agree: "Đồng ý — Đăng ký",
    btn_cancel: "Hủy",
  },
  bn: {
    title: "নিরাপত্তা ও শর্তাবলী",
    subtitle: "নিবন্ধনের আগে অনুগ্রহ করে মনোযোগ দিয়ে পড়ুন",
    shield_title: "আপনার নিরাপত্তা সুরক্ষিত",
    shield_body: "আপনার সাইবার নিরাপত্তা শক্তিশালী করা হয়েছে এবং কেন্দ্রীয় AI সহকারীদের দ্বারা 100% সুরক্ষিত।",
    warn_title: "কন্টেন্ট নীতি",
    warn_body: "আপনি যদি ধর্মীয় উগ্রবাদ বা অনৈতিক কন্টেন্ট/ভিডিও প্রচার করে এমন কন্টেন্ট পোস্ট করেন, তাহলে আপনার অ্যাকাউন্ট ব্লক হতে পারে বা সতর্কতার পরে কেন্দ্রীয় AI সহকারীদের দ্বারা মুছে ফেলা হতে পারে।",
    check: "আমি এই শর্তাবলী পড়েছি এবং সম্মত হচ্ছি",
    btn_agree: "সম্মত — নিবন্ধন",
    btn_cancel: "বাতিল",
  },
  tl: {
    title: "Kaligtasan at Mga Tuntunin",
    subtitle: "Mangyaring basahin nang mabuti bago mag-register",
    shield_title: "Ang iyong seguridad ay protektado",
    shield_body: "Ang iyong cybersecurity ay pinahusay at 100% protektado ng mga sentral na AI assistant.",
    warn_title: "Patakaran sa Nilalaman",
    warn_body: "Kung mag-post ka ng nilalaman na nagtataguyod ng relihiyosong ekstremismo o imoral na nilalaman/video, ang iyong account ay maaaring ma-block o, pagkatapos ng babala, matanggal ng mga sentral na AI assistant.",
    check: "Nabasa ko at sumasang-ayon sa mga tuntuning ito",
    btn_agree: "Sumasang-ayon — Mag-register",
    btn_cancel: "Kanselahin",
  },
};

const FALLBACK = TEXTS.en;

function getText(lang: string): ConsentLang {
  const base = lang.split("-")[0];
  return TEXTS[base] ?? FALLBACK;
}

interface Props {
  open: boolean;
  lang: string;
  onAgree: () => void;
  onCancel: () => void;
}

export default function SafetyConsentModal({ open, lang, onAgree, onCancel }: Props) {
  const [agreed, setAgreed] = useState(false);
  const T = getText(lang);
  const isRTL = ["ar", "fa", "he", "ur"].includes(lang.split("-")[0]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[200]"
            style={{ background: "rgba(4,4,14,0.85)", backdropFilter: "blur(12px)" }}
            onClick={onCancel}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.88, y: 32, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.92, y: 20, filter: "blur(4px)" }}
            transition={{ type: "spring", stiffness: 340, damping: 30, mass: 0.9 }}
            className="fixed inset-0 z-[201] flex items-center justify-center px-4"
            dir={isRTL ? "rtl" : "ltr"}
          >
            <div
              className="relative w-full max-w-md rounded-3xl overflow-hidden"
              onClick={e => e.stopPropagation()}
              style={{
                background: "linear-gradient(160deg, rgba(10,8,24,0.98) 0%, rgba(6,4,16,0.99) 100%)",
                border: "1px solid rgba(124,58,237,0.35)",
                boxShadow: "0 0 60px rgba(124,58,237,0.18), 0 0 120px rgba(59,130,246,0.08), inset 0 1px 0 rgba(167,139,250,0.12)",
              }}
            >
              {/* Animated rainbow top border */}
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
                background: "linear-gradient(90deg, #7c3aed, #3b82f6, #06b6d4, #10b981, #f59e0b, #ef4444, #ec4899, #7c3aed)",
                backgroundSize: "200% 100%",
                animation: "gradientShift 3s linear infinite",
              }} />

              {/* Close button */}
              <button
                onClick={onCancel}
                className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-colors z-10"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="p-6 pb-5">
                {/* Header */}
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{
                    background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.2))",
                    border: "1px solid rgba(124,58,237,0.4)",
                    boxShadow: "0 0 16px rgba(124,58,237,0.25)",
                  }}>
                    <Lock className="w-5 h-5" style={{ color: "#a78bfa" }} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: "#e2d9f3" }}>{T.title}</h2>
                    <p className="text-[11px]" style={{ color: "rgba(167,139,250,0.6)" }}>{T.subtitle}</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="my-4 h-px" style={{ background: "rgba(124,58,237,0.18)" }} />

                {/* Security card */}
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-2xl p-4 mb-3 flex gap-3"
                  style={{
                    background: "rgba(16,185,129,0.07)",
                    border: "1px solid rgba(16,185,129,0.2)",
                  }}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center" style={{
                    background: "rgba(16,185,129,0.15)",
                    border: "1px solid rgba(16,185,129,0.3)",
                  }}>
                    <Shield className="w-4 h-4" style={{ color: "#34d399" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold mb-1" style={{ color: "#34d399" }}>{T.shield_title}</p>
                    <p className="text-[11px] leading-relaxed" style={{ color: "rgba(167,239,183,0.75)" }}>{T.shield_body}</p>
                  </div>
                </motion.div>

                {/* Warning card */}
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.18 }}
                  className="rounded-2xl p-4 mb-4 flex gap-3"
                  style={{
                    background: "rgba(251,146,60,0.07)",
                    border: "1px solid rgba(251,146,60,0.22)",
                  }}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center" style={{
                    background: "rgba(251,146,60,0.15)",
                    border: "1px solid rgba(251,146,60,0.3)",
                  }}>
                    <AlertTriangle className="w-4 h-4" style={{ color: "#fb923c" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold mb-1" style={{ color: "#fb923c" }}>{T.warn_title}</p>
                    <p className="text-[11px] leading-relaxed" style={{ color: "rgba(254,215,170,0.75)" }}>{T.warn_body}</p>
                  </div>
                </motion.div>

                {/* AI badge */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl"
                  style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}
                >
                  <Bot className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#60a5fa" }} />
                  <p className="text-[10px]" style={{ color: "rgba(147,197,253,0.8)" }}>
                    SafeGuard AI — 24/7
                  </p>
                  <div className="ml-auto flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-1 h-1 rounded-full"
                        style={{ background: "#34d399" }}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                      />
                    ))}
                  </div>
                </motion.div>

                {/* Checkbox */}
                <motion.label
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-start gap-3 cursor-pointer mb-5 group select-none"
                >
                  <div
                    onClick={() => setAgreed(v => !v)}
                    className="relative flex-shrink-0 w-5 h-5 mt-0.5 rounded-md transition-all duration-200"
                    style={{
                      background: agreed ? "linear-gradient(135deg, #7c3aed, #3b82f6)" : "rgba(255,255,255,0.04)",
                      border: agreed ? "1px solid transparent" : "1px solid rgba(124,58,237,0.35)",
                      boxShadow: agreed ? "0 0 12px rgba(124,58,237,0.4)" : "none",
                    }}
                  >
                    <AnimatePresence>
                      {agreed && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <span
                    className="text-[11px] leading-relaxed"
                    style={{ color: agreed ? "rgba(216,180,254,0.9)" : "rgba(255,255,255,0.45)" }}
                    onClick={() => setAgreed(v => !v)}
                  >
                    {T.check}
                  </span>
                </motion.label>

                {/* Buttons */}
                <div className="flex gap-3">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={onCancel}
                    className="flex-1 py-3 rounded-xl text-xs font-semibold transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.45)",
                    }}
                  >
                    {T.btn_cancel}
                  </motion.button>

                  <motion.button
                    whileTap={agreed ? { scale: 0.97 } : {}}
                    onClick={() => { if (agreed) { setAgreed(false); onAgree(); } }}
                    className="flex-[2] py-3 rounded-xl text-xs font-bold relative overflow-hidden transition-all duration-200"
                    style={{
                      background: agreed
                        ? "linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)"
                        : "rgba(124,58,237,0.12)",
                      border: agreed
                        ? "1px solid rgba(167,139,250,0.4)"
                        : "1px solid rgba(124,58,237,0.2)",
                      color: agreed ? "#fff" : "rgba(167,139,250,0.35)",
                      boxShadow: agreed ? "0 0 24px rgba(124,58,237,0.35)" : "none",
                      cursor: agreed ? "pointer" : "not-allowed",
                    }}
                  >
                    {agreed && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)" }}
                        animate={{ x: ["-110%", "210%"] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.2 }}
                      />
                    )}
                    <span style={{ position: "relative", zIndex: 1 }}>{T.btn_agree}</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

          <style>{`@keyframes gradientShift { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }`}</style>
        </>
      )}
    </AnimatePresence>
  );
}
