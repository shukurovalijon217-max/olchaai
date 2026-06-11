import { readFileSync, writeFileSync } from "fs";

const FILE = "artifacts/nexus/src/lib/i18n.ts";

const AUTH_ADDITIONS = {
  uz: { full_name: "Ism Familiya", join: "OlCha ga qo'shilish", enter: "OlCha ga kirish", tagline: "Yagona AI-powered ijtimoiy koinot. Har bir platforma. Bitta signal.", username_req: "Username kiritilishi shart", name_req: "Ism kiritilishi shart" },
  en: { full_name: "Full Name", join: "Join OlCha", enter: "Sign in to OlCha", tagline: "One AI-powered social universe. Every platform. One signal.", username_req: "Username is required", name_req: "Full name is required" },
  ru: { full_name: "Полное имя", join: "Присоединиться к OlCha", enter: "Войти в OlCha", tagline: "Единая AI-социальная вселенная. Каждая платформа. Один сигнал.", username_req: "Имя пользователя обязательно", name_req: "Полное имя обязательно" },
  zh: { full_name: "全名", join: "加入OlCha", enter: "登录OlCha", tagline: "统一的AI社交宇宙。每个平台。一个信号。", username_req: "用户名是必填项", name_req: "全名是必填项" },
  ar: { full_name: "الاسم الكامل", join: "انضم إلى OlCha", enter: "الدخول إلى OlCha", tagline: "كون اجتماعي واحد بالذكاء الاصطناعي. كل منصة. إشارة واحدة.", username_req: "اسم المستخدم مطلوب", name_req: "الاسم الكامل مطلوب" },
  es: { full_name: "Nombre completo", join: "Únete a OlCha", enter: "Entrar en OlCha", tagline: "Un universo social con IA. Cada plataforma. Una señal.", username_req: "El nombre de usuario es obligatorio", name_req: "El nombre completo es obligatorio" },
  fr: { full_name: "Nom complet", join: "Rejoindre OlCha", enter: "Entrer dans OlCha", tagline: "Un univers social IA. Chaque plateforme. Un signal.", username_req: "Le nom d'utilisateur est obligatoire", name_req: "Le nom complet est obligatoire" },
  hi: { full_name: "पूरा नाम", join: "OlCha में शामिल हों", enter: "OlCha में साइन इन", tagline: "एक AI सामाजिक ब्रह्माण्ड। हर प्लेटफॉर्म। एक सिग्नल।", username_req: "उपयोगकर्ता नाम आवश्यक है", name_req: "पूरा नाम आवश्यक है" },
  pt: { full_name: "Nome completo", join: "Entrar no OlCha", enter: "Entrar no OlCha", tagline: "Um universo social com IA. Cada plataforma. Um sinal.", username_req: "Nome de usuário é obrigatório", name_req: "Nome completo é obrigatório" },
  de: { full_name: "Vollständiger Name", join: "OlCha beitreten", enter: "Anmelden bei OlCha", tagline: "Ein KI-soziales Universum. Jede Plattform. Ein Signal.", username_req: "Benutzername ist erforderlich", name_req: "Vollständiger Name ist erforderlich" },
  ja: { full_name: "フルネーム", join: "OlChaに参加", enter: "OlChaにサインイン", tagline: "AIソーシャルユニバース。すべてのプラットフォーム。一つのシグナル。", username_req: "ユーザー名は必須です", name_req: "フルネームは必須です" },
  ko: { full_name: "성함", join: "OlCha 가입", enter: "OlCha에 로그인", tagline: "AI 기반 소셜 유니버스. 모든 플랫폼. 하나의 신호.", username_req: "사용자 이름이 필요합니다", name_req: "성함이 필요합니다" },
  it: { full_name: "Nome completo", join: "Unisciti a OlCha", enter: "Accedi a OlCha", tagline: "Un universo sociale AI. Ogni piattaforma. Un segnale.", username_req: "Nome utente obbligatorio", name_req: "Nome completo obbligatorio" },
  tr: { full_name: "Tam ad", join: "OlCha katıl", enter: "OlCha giriş", tagline: "Yapay zeka destekli sosyal evren. Her platform. Bir sinyal.", username_req: "Kullanıcı adı gereklidir", name_req: "Tam ad gereklidir" },
  nl: { full_name: "Volledige naam", join: "Doe mee met OlCha", enter: "Inloggen bij OlCha", tagline: "Één AI-aangedreven sociaal universum. Elk platform. Één signaal.", username_req: "Gebruikersnaam is vereist", name_req: "Volledige naam is vereist" },
  pl: { full_name: "Pełne imię", join: "Dołącz do OlCha", enter: "Zaloguj się do OlCha", tagline: "Jedno AI społeczne uniwersum. Każda platforma. Jeden sygnał.", username_req: "Nazwa użytkownika jest wymagana", name_req: "Pełne imię jest wymagane" },
  fa: { full_name: "نام کامل", join: "به OlCha بپیوندید", enter: "ورود به OlCha", tagline: "یک جهان اجتماعی هوش مصنوعی. هر پلتفرم. یک سیگنال.", username_req: "نام کاربری الزامی است", name_req: "نام کامل الزامی است" },
  bn: { full_name: "পূর্ণ নাম", join: "OlCha যোগ দিন", enter: "OlCha সাইন ইন", tagline: "একটি AI সামাজিক মহাবিশ্ব। প্রতিটি প্ল্যাটফর্ম। একটি সংকেত।", username_req: "ব্যবহারকারীর নাম আবশ্যক", name_req: "পূর্ণ নাম আবশ্যক" },
  id: { full_name: "Nama lengkap", join: "Bergabung OlCha", enter: "Masuk ke OlCha", tagline: "Semesta sosial bertenaga AI. Setiap platform. Satu sinyal.", username_req: "Nama pengguna diperlukan", name_req: "Nama lengkap diperlukan" },
  vi: { full_name: "Họ và tên", join: "Tham gia OlCha", enter: "Đăng nhập OlCha", tagline: "Vũ trụ xã hội AI. Mọi nền tảng. Một tín hiệu.", username_req: "Tên người dùng là bắt buộc", name_req: "Họ và tên là bắt buộc" },
  th: { full_name: "ชื่อเต็ม", join: "เข้าร่วม OlCha", enter: "เข้าสู่ระบบ OlCha", tagline: "จักรวาลสังคม AI ทุกแพลตฟอร์ม หนึ่งสัญญาณ", username_req: "ต้องระบุชื่อผู้ใช้", name_req: "ต้องระบุชื่อเต็ม" },
  uk: { full_name: "Повне ім'я", join: "Приєднатися до OlCha", enter: "Увійти в OlCha", tagline: "Єдиний AI соціальний всесвіт. Кожна платформа. Один сигнал.", username_req: "Ім'я користувача обов'язкове", name_req: "Повне ім'я обов'язкове" },
  sv: { full_name: "Fullständigt namn", join: "Gå med i OlCha", enter: "Logga in på OlCha", tagline: "Ett AI-drivet socialt universum. Varje plattform. En signal.", username_req: "Användarnamn krävs", name_req: "Fullständigt namn krävs" },
  no: { full_name: "Fullt navn", join: "Bli med i OlCha", enter: "Logg inn på OlCha", tagline: "Et AI-drevet sosialt univers. Hver plattform. Ett signal.", username_req: "Brukernavn er påkrevd", name_req: "Fullt navn er påkrevd" },
  da: { full_name: "Fuldt navn", join: "Bliv medlem af OlCha", enter: "Log ind på OlCha", tagline: "Et AI-drevet socialt univers. Hver platform. Ét signal.", username_req: "Brugernavn er påkrævet", name_req: "Fuldt navn er påkrævet" },
  fi: { full_name: "Koko nimi", join: "Liity OlChaan", enter: "Kirjaudu OlChaan", tagline: "Yksi AI sosiaalinen universumi. Jokainen alusta. Yksi signaali.", username_req: "Käyttäjänimi vaaditaan", name_req: "Koko nimi vaaditaan" },
  el: { full_name: "Πλήρες όνομα", join: "Γίνε μέλος OlCha", enter: "Σύνδεση στο OlCha", tagline: "Ένα AI κοινωνικό σύμπαν. Κάθε πλατφόρμα. Ένα σήμα.", username_req: "Απαιτείται όνομα χρήστη", name_req: "Απαιτείται πλήρες όνομα" },
  cs: { full_name: "Celé jméno", join: "Připojit se k OlCha", enter: "Přihlásit se do OlCha", tagline: "Jeden AI sociální vesmír. Každá platforma. Jeden signál.", username_req: "Uživatelské jméno je povinné", name_req: "Celé jméno je povinné" },
  hu: { full_name: "Teljes név", join: "Csatlakozz OlCha-hoz", enter: "Belépés OlCha-ba", tagline: "Egy AI szociális univerzum. Minden platform. Egy jel.", username_req: "Felhasználónév kötelező", name_req: "Teljes név kötelező" },
  ro: { full_name: "Nume complet", join: "Alătură-te OlCha", enter: "Conectare la OlCha", tagline: "Un univers social AI. Fiecare platformă. Un semnal.", username_req: "Numele de utilizator este obligatoriu", name_req: "Numele complet este obligatoriu" },
  he: { full_name: "שם מלא", join: "הצטרף ל-OlCha", enter: "התחבר ל-OlCha", tagline: "יקום חברתי אחד עם בינה מלאכותית. כל פלטפורמה. אות אחד.", username_req: "שם משתמש הוא חובה", name_req: "שם מלא הוא חובה" },
  ms: { full_name: "Nama penuh", join: "Sertai OlCha", enter: "Log masuk ke OlCha", tagline: "Satu alam sosial berkuasa AI. Setiap platform. Satu isyarat.", username_req: "Nama pengguna diperlukan", name_req: "Nama penuh diperlukan" },
  sw: { full_name: "Jina kamili", join: "Jiunge na OlCha", enter: "Ingia kwenye OlCha", tagline: "Ulimwengu mmoja wa kijamii wa AI. Kila jukwaa. Ishara moja.", username_req: "Jina la mtumiaji linahitajika", name_req: "Jina kamili linahitajika" },
  tl: { full_name: "Buong pangalan", join: "Sumali sa OlCha", enter: "Mag-sign in sa OlCha", tagline: "Isang AI social universe. Bawat platform. Isang signal.", username_req: "Kinakailangan ang username", name_req: "Kinakailangan ang buong pangalan" },
  az: { full_name: "Ad Soyad", join: "OlCha qoşul", enter: "OlCha daxil ol", tagline: "Vahid AI sosial kainat. Hər platforma. Bir siqnal.", username_req: "İstifadəçi adı tələb olunur", name_req: "Ad soyad tələb olunur" },
  kk: { full_name: "Толық аты", join: "OlCha қосылу", enter: "OlCha кіру", tagline: "Бірыңғай AI әлеуметтік әлем. Әр платформа. Бір сигнал.", username_req: "Пайдаланушы аты қажет", name_req: "Толық ат қажет" },
  ky: { full_name: "Толук аты", join: "OlCha кошулуу", enter: "OlCha кирүү", tagline: "Бирдиктүү AI социалдык дүйнө. Ар платформа. Бир сигнал.", username_req: "Колдонуучу аты талап кылынат", name_req: "Толук ат талап кылынат" },
  tk: { full_name: "Doly ady", join: "OlCha goşulyň", enter: "OlCha giriň", tagline: "Ýeke AI sosial älem. Her platforma. Bir signal.", username_req: "Ulanyjy ady gerek", name_req: "Doly at gerek" },
  tg: { full_name: "Номи пурра", join: "Ба OlCha ҳамроҳ шавед", enter: "Ба OlCha ворид шавед", tagline: "Олами ягонаи иҷтимоии AI. Ҳар платформа. Як сигнал.", username_req: "Номи корбар лозим аст", name_req: "Номи пурра лозим аст" },
  mn: { full_name: "Бүтэн нэр", join: "OlCha-д нэгдэх", enter: "OlCha нэвтрэх", tagline: "Нэгдсэн AI нийгмийн орчлон. Бүх платформ. Нэг дохио.", username_req: "Хэрэглэгчийн нэр шаардлагатай", name_req: "Бүтэн нэр шаардлагатай" },
};

let content = readFileSync(FILE, "utf8");
let count = 0;

// The file structure uses unquoted keys: uz: { ... auth: { ... } }
// We find each language's auth section and append new keys

for (const [code, keys] of Object.entries(AUTH_ADDITIONS)) {
  // Check if already added
  if (content.includes(`full_name: "${keys.full_name}"`)) {
    // Check it's in this language by finding it near the language block
    const langIdx = content.indexOf(`  ${code}: {`);
    if (langIdx !== -1) {
      const nextLangIdx = content.indexOf(`\n  `, langIdx + 5);
      const langSection = content.slice(langIdx, nextLangIdx > langIdx ? nextLangIdx : langIdx + 2000);
      if (langSection.includes("full_name:")) {
        continue;
      }
    }
  }

  const suffix = `, full_name: "${keys.full_name}", join: "${keys.join}", enter: "${keys.enter}", tagline: "${keys.tagline}", username_req: "${keys.username_req}", name_req: "${keys.name_req}"`;

  // Find: auth: { ... have_account: "<val>" }
  // Strategy: find the language section boundary, then find auth within it
  const langMarker = `  ${code}: {`;
  const langIdx = content.indexOf(langMarker);
  if (langIdx === -1) {
    console.log(`Language ${code} not found with marker "${langMarker}"`);
    continue;
  }

  // Extract the language section (up to 5000 chars)
  const sectionStart = langIdx;
  const sectionEnd = langIdx + 5000;
  const section = content.slice(sectionStart, sectionEnd);

  // Find auth section and its have_account closing
  const authPos = section.indexOf("have_account:");
  if (authPos === -1) {
    console.log(`have_account not found in ${code} section`);
    continue;
  }

  // Find the closing " } after have_account value
  const afterHaveAccount = section.slice(authPos);
  // Pattern: have_account: "VALUE" }
  const closeMatch = afterHaveAccount.match(/have_account: "([^"]*)" \}/);
  if (!closeMatch) {
    console.log(`Pattern not matched for ${code}: ${afterHaveAccount.slice(0, 100)}`);
    continue;
  }

  const haveAccountVal = closeMatch[1];
  const searchStr = `have_account: "${haveAccountVal}" }`;
  const replaceStr = `have_account: "${haveAccountVal}"${suffix} }`;

  // Replace only in the language section
  const before = content.slice(0, sectionStart);
  const langSection = content.slice(sectionStart, sectionEnd);
  const after = content.slice(sectionEnd);

  if (!langSection.includes(searchStr)) {
    console.log(`Search string not found in ${code} section`);
    continue;
  }

  const newLangSection = langSection.replace(searchStr, replaceStr);
  content = before + newLangSection + after;
  count++;
  console.log(`✓ Added auth keys for ${code}`);
}

writeFileSync(FILE, content, "utf8");
console.log(`\nDone! Updated ${count} languages.`);
