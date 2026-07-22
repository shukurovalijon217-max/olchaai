import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Type, Music, Check, Trash2, ChevronLeft, ChevronRight, Smile, Sparkles, Search, Zap, Volume2, Wand2, Mic, Scissors, Palette, Camera, Download, GripVertical } from "lucide-react";
import { useMediaUpload } from "@/hooks/useMediaUpload";

export type TextOverlay = {
  id: string; text: string; x: number; y: number;
  fontSize: number; color: string;
  animation: "none"|"pulse"|"bounce"|"wave"|"neon"|"slide"|"shake"|"flip"|"rainbow"|"typewriter";
  fontStyle: "regular"|"bold"|"italic"|"shadow"|"outline";
  fontFamily: string;
  bgStyle: "none"|"dark"|"blur"|"gradient"|"highlight"|"pill";
  align: "left"|"center"|"right";
  shadowPreset: "none"|"soft"|"glow"|"neon-pink"|"neon-blue"|"fire"|"3d"|"retro";
  gradient: string;
  letterSpacing: number;
  strokeWidth: number;
  strokeColor: string;
  isSticker?: boolean;
};

interface Props {
  previews: string[];
  files: File[];
  initialOverlays?: TextOverlay[];
  initialAudioName?: string;
  onDone: (overlays: TextOverlay[], audioName: string, filterName: string, audioUrl?: string, trimStart?: number, trimEnd?: number) => void;
  onClose: () => void;
}

const COLORS = [
  "#ffffff","#000000","#ffee38","#ff6b6b","#ff4500","#ff0080",
  "#a78bfa","#7c3aed","#34d399","#06b6d4","#f472b6","#fda085",
  "#ffd700","#00ff88","#00cfff","#8b00ff",
];
const ANIMS: { id: TextOverlay["animation"]; label: string; icon: string }[] = [
  { id:"none",       label:"Statik",    icon:"Aa" },
  { id:"pulse",      label:"Puls",      icon:"◎"  },
  { id:"bounce",     label:"Sakrash",   icon:"↕"  },
  { id:"wave",       label:"To'lqin",   icon:"〰" },
  { id:"neon",       label:"Neon",      icon:"✦"  },
  { id:"slide",      label:"Sirpanish", icon:"→"  },
  { id:"shake",      label:"Silkish",   icon:"⇌"  },
  { id:"flip",       label:"Flip",      icon:"↔"  },
  { id:"rainbow",    label:"Kamalak",   icon:"🌈" },
  { id:"typewriter", label:"Mashinaka", icon:"⌨"  },
];
const FSTYLES: { id: TextOverlay["fontStyle"]; label: string }[] = [
  { id:"regular",  label:"Aa" }, { id:"bold",    label:"𝗔𝗮" },
  { id:"italic",   label:"𝘈𝘢" }, { id:"shadow",  label:"A̤a" },
  { id:"outline",  label:"A⃝o" },
];
const FONT_FAMILIES = [
  { id:"sans",    label:"Modern",  css:"system-ui,sans-serif" },
  { id:"mono",    label:"Kode",    css:"'Courier New',monospace" },
  { id:"serif",   label:"Klasik",  css:"Georgia,serif" },
  { id:"impact",  label:"Impact",  css:"Impact,'Arial Black',sans-serif" },
  { id:"round",   label:"Yumshoq", css:"'Trebuchet MS',sans-serif" },
  { id:"narrow",  label:"Tor",     css:"'Arial Narrow',Arial,sans-serif" },
  { id:"cursive", label:"Kursiv",  css:"'Comic Sans MS',cursive" },
  { id:"display", label:"Display", css:"'Arial Black',Gadget,sans-serif" },
];
const TEXT_SHADOWS = [
  { id:"none",     label:"Yo'q",    css:"none" },
  { id:"soft",     label:"Soya",    css:"0 2px 8px rgba(0,0,0,0.9)" },
  { id:"glow",     label:"Glow",    css:"0 0 12px #c084fc,0 0 30px #9333ea,0 0 60px rgba(147,51,234,0.4)" },
  { id:"neon-pink",label:"Neon🌸",  css:"0 0 7px #ff0080,0 0 20px #ff0080,0 0 50px #ff0080" },
  { id:"neon-blue",label:"Neon💧",  css:"0 0 7px #00cfff,0 0 20px #00cfff,0 0 50px #0080ff" },
  { id:"fire",     label:"Olov🔥",  css:"0 0 5px #ffd700,0 0 15px #ff8c00,0 0 35px #ff4500" },
  { id:"3d",       label:"3D🧊",    css:"3px 3px 0 #000,5px 5px 0 rgba(0,0,0,0.4),8px 8px 12px rgba(0,0,0,0.3)" },
  { id:"retro",    label:"Retro🕹", css:"3px 3px 0 #ff6b35,-1px -1px 0 #222,1px 1px 0 #222" },
];
const GRADIENT_PRESETS = [
  { id:"none",    label:"Oddiy",   css:"" },
  { id:"sunset",  label:"🌅Shafaq", css:"linear-gradient(90deg,#ff6b6b,#feca57)" },
  { id:"ocean",   label:"🌊Okean",  css:"linear-gradient(90deg,#667eea,#764ba2)" },
  { id:"fire",    label:"🔥Olov",   css:"linear-gradient(90deg,#f093fb,#f5576c)" },
  { id:"neon",    label:"⚡Neon",   css:"linear-gradient(90deg,#4facfe,#00f2fe)" },
  { id:"gold",    label:"✨Oltin",  css:"linear-gradient(90deg,#f6d365,#fda085)" },
  { id:"matrix",  label:"🟢Matrix", css:"linear-gradient(90deg,#0f9b58,#00ff88)" },
  { id:"cosmic",  label:"🌌Kosmik", css:"linear-gradient(90deg,#667eea,#ff6b6b,#feca57)" },
  { id:"rainbow", label:"🌈Kamalak",css:"linear-gradient(90deg,#ff0000,#ff8c00,#ffd700,#00ff00,#00bfff,#8b00ff)" },
];

const STICKER_GROUPS: { label: string; emojis: string[] }[] = [
  { label: "😂 Kayfiyat", emojis: ["😂","🔥","😍","💀","🤩","😎","🥹","😤","🤔","💪","🫶","✌️","🤙","👏","🫡"] },
  { label: "🌈 Tabiat",   emojis: ["🌙","⭐","✨","🌟","💫","☀️","🌊","🌸","🍀","🦋","🐉","🦅","🌺","🍁","❄️"] },
  { label: "💎 Predmet",  emojis: ["💎","🎵","🎮","🏆","💰","🎯","🚀","⚡","🔮","💣","🎁","📸","🎬","🎸","🎤"] },
  { label: "❤️ Sevgi",    emojis: ["❤️","💜","💙","💚","💛","🧡","🖤","🤍","💕","💞","💝","💖","💗","💓","♾️"] },
];

const SONGS_BY_COUNTRY: { flag: string; label: string; songs: string[] }[] = [
  { flag:"🇺🇿", label:"O'zbek", songs:[
    "Ulmas Musayev — Sevgim","Ulmas Musayev — Dunyom","Ulmas Musayev — Sarvinoz","Ulmas Musayev — Muhabbatim",
    "Shaxriyor — Ishq","Shaxriyor — Yig'lama","Shaxriyor — Orzular","Shaxriyor — Sevaman",
    "Mirzo — Alvido","Mirzo — Sog'inch","Mirzo — Qalbim","Mirzo — Izla",
    "Jasur Umirov — Sevilaman","Jasur Umirov — Muhabbat","Jasur Umirov — Yurak",
    "Dilnoza Yusupova — Yurak","Dilnoza Yusupova — Sev meni","Dilnoza Yusupova — Xayol",
    "Ziyoda — Mahkum","Ziyoda — Baxtiyor","Ziyoda — Seni eslayman",
    "Mansur Toshmatov — Ko'zlaring","Mansur Toshmatov — Sevgi","Mansur Toshmatov — Qayda sen",
    "Shohruhxon — Temir yurak","Shohruhxon — Azizim","Shohruhxon — Sevaman",
    "Shahlo Toshmatova — Baxt","Shahlo Toshmatova — Yor-yor","Shahlo Toshmatova — Mehribon",
    "Bojalar — Kel yonim","Bojalar — Seni deya","Bojalar — Baxting bo'lsin",
    "Munisa Rizayeva — Yurak","Munisa Rizayeva — Ko'rmasam","Munisa Rizayeva — Sevgi izi",
    "Nargiza Umarova — Qo'shiq","Nargiza Umarova — Seni sevaman",
    "Otabek Mutalxo'jayev — Yulduz","Otabek Mutalxo'jayev — Ko'zlar",
    "Xurshid Rasulov — Muhabbat","Xurshid Rasulov — Sen uchun",
    "Ozodbek Nazarbekov — Bedana","Ozodbek Nazarbekov — Qo'shiqlarim",
    "G'ayrat Usmonov — Qo'shiq","G'ayrat Usmonov — Sevgi haqida",
    "Dildora Niyozova — Yurak","Dildora Niyozova — Mehr",
    "Jahongir Otajonov — Sog'indim","Jahongir Otajonov — Sarvinoz",
  ]},
  { flag:"🌍", label:"Trending", songs:[
    "Dua Lipa — Levitating","Dua Lipa — New Rules","Dua Lipa — Don't Start Now","Dua Lipa — Houdini",
    "Taylor Swift — Anti-Hero","Taylor Swift — Shake It Off","Taylor Swift — Blank Space","Taylor Swift — Cruel Summer","Taylor Swift — Love Story",
    "The Weeknd — Blinding Lights","The Weeknd — Starboy","The Weeknd — Save Your Tears","The Weeknd — Die For You",
    "Harry Styles — As It Was","Harry Styles — Watermelon Sugar","Harry Styles — Golden",
    "Olivia Rodrigo — drivers license","Olivia Rodrigo — good 4 u","Olivia Rodrigo — vampire",
    "SZA — Kill Bill","SZA — Good Days","SZA — Snooze",
    "Glass Animals — Heat Waves",
    "Arctic Monkeys — Do I Wanna Know?","Arctic Monkeys — R U Mine?",
    "Hozier — Take Me To Church","Hozier — From Eden",
    "Rema — Calm Down","Tems — Free Mind",
    "Doja Cat — Say So","Doja Cat — Kiss Me More","Doja Cat — Woman",
    "Lizzo — About Damn Time","Lizzo — Good as Hell",
    "Lana Del Rey — Summertime Sadness","Lana Del Rey — Young and Beautiful",
    "Billie Eilish — bad guy","Billie Eilish — Happier Than Ever","Billie Eilish — What Was I Made For?",
    "Sabrina Carpenter — Espresso","Sabrina Carpenter — Please Please Please",
    "Chappell Roan — HOT TO GO!","Chappell Roan — Good Luck Babe!",
    "Gracie Abrams — That's So True",
  ]},
  { flag:"🇺🇸", label:"USA", songs:[
    "Drake — One Dance","Drake — God's Plan","Drake — Hotline Bling","Drake — Rich Flex",
    "Post Malone — Circles","Post Malone — Sunflower","Post Malone — rockstar","Post Malone — Chemical",
    "Ariana Grande — 7 rings","Ariana Grande — thank u, next","Ariana Grande — positions",
    "Justin Bieber — Sorry","Justin Bieber — Love Yourself","Justin Bieber — Peaches",
    "Kendrick Lamar — HUMBLE.","Kendrick Lamar — Not Like Us","Kendrick Lamar — DNA",
    "Bruno Mars — Uptown Funk","Bruno Mars — Just The Way You Are","Bruno Mars — Grenade","Bruno Mars — Locked Out of Heaven",
    "Eminem — Lose Yourself","Eminem — Without Me","Eminem — Stan","Eminem — Rap God",
    "Rihanna — Umbrella","Rihanna — We Found Love","Rihanna — Diamonds","Rihanna — Stay",
    "Beyoncé — Crazy in Love","Beyoncé — Single Ladies","Beyoncé — Halo","Beyoncé — Texas Hold 'Em",
    "Jay-Z ft Alicia Keys — Empire State of Mind",
    "Mariah Carey — All I Want for Christmas Is You",
    "Michael Jackson — Thriller","Michael Jackson — Billie Jean","Michael Jackson — Beat It",
    "Ed Sheeran — Shape of You","Ed Sheeran — Perfect","Ed Sheeran — Thinking Out Loud","Ed Sheeran — Photograph",
    "Adele — Rolling in the Deep","Adele — Someone Like You","Adele — Hello","Adele — Easy On Me",
    "Lady Gaga — Bad Romance","Lady Gaga — Poker Face","Lady Gaga — Shallow",
    "Katy Perry — Roar","Katy Perry — Firework","Katy Perry — Dark Horse",
    "Pharrell Williams — Happy",
    "Justin Timberlake — Can't Stop the Feeling","Justin Timberlake — Mirrors",
  ]},
  { flag:"🇰🇷", label:"K-Pop", songs:[
    "BTS — Dynamite","BTS — Butter","BTS — DNA","BTS — Boy With Luv","BTS — Spring Day","BTS — Fake Love",
    "BLACKPINK — Kill This Love","BLACKPINK — DDU-DU DDU-DU","BLACKPINK — How You Like That","BLACKPINK — Pink Venom",
    "aespa — Savage","aespa — Next Level","aespa — Drama",
    "NewJeans — Hype Boy","NewJeans — Ditto","NewJeans — OMG","NewJeans — Super Shy",
    "IVE — Love Dive","IVE — After Like","IVE — I AM",
    "TWICE — I CAN'T STOP ME","TWICE — Fancy","TWICE — Alcohol-Free","TWICE — Talk That Talk",
    "EXID — Up & Down","EXID — Ah Yeah",
    "EXO — Growl","EXO — Monster","EXO — Ko Ko Bop",
    "GOT7 — Hard Carry","GOT7 — Just Right",
    "Stray Kids — Miroh","Stray Kids — God's Menu","Stray Kids — CASE 143",
    "MONSTA X — Dramarama","MONSTA X — Love Killa",
    "TXT — Chasing That Feeling","TXT — Sugar Rush Ride",
    "Taeyeon — I","Taeyeon — Fine","Taeyeon — INVU",
    "IU — Celebrity","IU — Lilac","IU — Strawberry Moon",
    "G-Dragon — Crooked","G-Dragon — Fantastic Baby (BIGBANG)",
    "PSY — Gangnam Style","PSY — DADDY",
    "LE SSERAFIM — ANTIFRAGILE","LE SSERAFIM — FEARLESS",
  ]},
  { flag:"🇮🇳", label:"Bollywood", songs:[
    "Arijit Singh — Tum Hi Ho","Arijit Singh — Channa Mereya","Arijit Singh — Tera Ban Jaunga",
    "AR Rahman — Jai Ho","AR Rahman — Rang De Basanti","AR Rahman — Dil Se Re",
    "Shreya Ghoshal — Teri Meri","Shreya Ghoshal — Barso Re","Shreya Ghoshal — Sun Raha Hai",
    "Kumar Sanu — Ek Ladki Ko Dekha","Kumar Sanu — Dil Deewana",
    "Udit Narayan — Pehla Nasha","Udit Narayan — Raja Ko Rani Se",
    "Atif Aslam — Tera Hone Laga Hoon","Atif Aslam — Doorie","Atif Aslam — Woh Lamhe",
    "Yo Yo Honey Singh — Brown Rang","Yo Yo Honey Singh — Desi Kalakaar",
    "Badshah — Paani Paani","Badshah — Genda Phool","Badshah — DJ Wale Babu",
    "Neha Kakkar — O Humsafar","Neha Kakkar — Dilbar","Neha Kakkar — Coca Cola",
    "Guru Randhawa — Lahore","Guru Randhawa — High Rated Gabru",
    "Diljit Dosanjh — GOAT","Diljit Dosanjh — Born to Shine",
    "Pritam — Gerua","Pritam — Phir Le Aaya Dil",
    "Vishal-Shekhar — Zara Sa","Vishal-Shekhar — Desi Girl",
    "Shankar-Ehsaan-Loy — Kajra Re",
  ]},
  { flag:"🇧🇷", label:"Latin", songs:[
    "Bad Bunny — Me Porto Bonito","Bad Bunny — Tití Me Preguntó","Bad Bunny — TQMQ","Bad Bunny — Un Verano Sin Ti",
    "J Balvin — Mi Gente","J Balvin — Con Calma","J Balvin — Que Calor",
    "Shakira — Hips Don't Lie","Shakira — Waka Waka","Shakira — Whenever Wherever","Shakira — Bzrp Session 53",
    "Maluma — Hawái","Maluma — Felices los 4","Maluma — ADMV",
    "Ozuna — Taki Taki","Ozuna — Baila Baila Baila",
    "Karol G — BICHOTA","Karol G — Provenza","Karol G — Watati",
    "Daddy Yankee — Gasolina","Daddy Yankee — Despacito","Daddy Yankee — Con Calma",
    "Luis Fonsi — Despacito","Luis Fonsi — Échame La Culpa",
    "Rosalía — MALAMENTE","Rosalía — BIZCOCHITO","Rosalía — Despechá",
    "Rauw Alejandro — Todo de Ti","Rauw Alejandro — Estilazo",
    "Anuel AA — China","Anuel AA — Ella Quiere Beber",
    "Nicky Jam — El Perdón","Nicky Jam — X",
    "Anitta — Envolver","Anitta — Girl From Rio",
    "Sech — Otro Trago","Sech — Relación",
  ]},
  { flag:"🇷🇺", label:"Rus", songs:[
    "Miyagi ft Andy Panda — I Got Love","Miyagi ft Andy Panda — Там где нас нет",
    "Morgenshtern — Cadillac","Morgenshtern ft Элджей — Cadillac",
    "Элджей — Розовое вино","Элджей — Feduk",
    "Макс Корж — Малый повзрослел","Макс Корж — Пьяный туман",
    "Скриптонит — Буду там","Скриптонит — Пинкман",
    "Грибы — Тает лёд","Грибы — Между нами тает лёд",
    "T-Fest — Зачем","T-Fest — Ехала машина",
    "Jah Khalib — Медина","Jah Khalib — Без тебя я не я",
    "Navai ft Бьянка — Не твоя","Navai — Чем же ты дышишь",
    "Hammali ft Navai — Птица","Hammali ft Navai — Без тебя я не я",
    "NILETTO — Любимка","NILETTO — КРАШ",
    "Ёлка — Города","Ёлка — Прятки",
    "Полина Гагарина — Кукушка","Полина Гагарина — Я не буду любить",
    "Би-2 — Полковнику никто не пишет","Би-2 — Аутсайдер",
    "FACE — Грустная песня","FACE — Малиновый закат",
    "IC3PEAK — Смерти Больше Нет","IC3PEAK — Плак Плак",
    "Слава КПСС — Молодость","Скруджи — Добрый вечер",
  ]},
  { flag:"🎸", label:"Rock/Pop", songs:[
    "Queen — Bohemian Rhapsody","Queen — We Will Rock You","Queen — Don't Stop Me Now","Queen — Under Pressure",
    "Nirvana — Smells Like Teen Spirit","Nirvana — Come as You Are","Nirvana — Heart-Shaped Box",
    "Linkin Park — Numb","Linkin Park — In The End","Linkin Park — Crawling","Linkin Park — Faint",
    "Coldplay — Yellow","Coldplay — The Scientist","Coldplay — Fix You","Coldplay — Clocks","Coldplay — Viva La Vida",
    "Imagine Dragons — Enemy","Imagine Dragons — Believer","Imagine Dragons — Radioactive","Imagine Dragons — Thunder",
    "The Beatles — Let It Be","The Beatles — Hey Jude","The Beatles — Come Together",
    "Led Zeppelin — Stairway to Heaven","Led Zeppelin — Whole Lotta Love",
    "Pink Floyd — Comfortably Numb","Pink Floyd — Wish You Were Here",
    "AC/DC — Back in Black","AC/DC — Highway to Hell","AC/DC — Thunderstruck",
    "Metallica — Enter Sandman","Metallica — Nothing Else Matters",
    "Green Day — Boulevard of Broken Dreams","Green Day — American Idiot",
    "Radiohead — Creep","Radiohead — Karma Police",
    "U2 — With or Without You","U2 — One",
    "Foo Fighters — Everlong","Foo Fighters — Best of You",
    "Red Hot Chili Peppers — Under the Bridge","Red Hot Chili Peppers — Californication",
    "The Killers — Mr. Brightside","The Killers — Somebody Told Me",
    "Arctic Monkeys — Do I Wanna Know?","Arctic Monkeys — 505",
    "Oasis — Wonderwall","Oasis — Don't Look Back in Anger",
  ]},
  { flag:"🇹🇷", label:"Türk", songs:[
    "Tarkan — Şımarık","Tarkan — Kuzu Kuzu","Tarkan — Hüp",
    "Sezen Aksu — Geri Dön","Sezen Aksu — Firuze",
    "Hadise — Düm Tek Tek","Hadise — Aşk Kaç Beden Giyer",
    "Mabel Matiz — Tadı Yok","Mabel Matiz — Dokunsa Elim",
    "Simge — Yeniden Sevmek","Simge — Sen Olsan Bari",
    "Serdar Ortaç — Kırmızı","Serdar Ortaç — Affet",
    "Mustafa Sandal — Araba","Mustafa Sandal — Sen Olursan Olmaz",
    "Teoman — Paramparça","Teoman — Eski Bir Rüya Uğruna",
    "Gripin — Tüm Zamanların En İyisi","Gripin — Seninle Olmak",
    "Manga — Beni Benimle Bırak","Manga — Dün Yoktum",
    "Mor ve Ötesi — Duman","Mor ve Ötesi — Hesap Sorarım",
    "Semicenk — Kıyamam","Semicenk — İki Aşık",
    "Sagopa Kajmer — Hep Mi Ben","Sagopa Kajmer — Sitemkar",
    "Ceza — Holocaust","Ceza — Suspus",
    "Edis — Sarı Saçların","Edis — Gel Yeter",
    "Burak Doğansoy — Sağ Ol","Burak Doğansoy — Kısa Film",
  ]},
  { flag:"🇳🇬", label:"Afrobeats", songs:[
    "Burna Boy — Last Last","Burna Boy — Ye","Burna Boy — On the Low","Burna Boy — Kilometre",
    "Wizkid — Essence","Wizkid — Come Closer","Wizkid — Soco",
    "Davido — Fall","Davido — FEM","Davido — Assurance",
    "Tems — Free Mind","Tems — Higher","Tems — Crazy Tings",
    "Rema — Calm Down","Rema — Dumebi","Rema — Iron Man",
    "CKay — Love Nwantiti","CKay — Emiliana",
    "Fireboy DML — Peru","Fireboy DML — Jealous","Fireboy DML — Bandana",
    "Ckay — Love Nwantiti","Omah Lay — Bad Influence","Omah Lay — Godly",
    "Afro B — Joanna (Drogba)","Mr Eazi — Leg Over",
    "Yemi Alade — Johnny","Yemi Alade — Temptation",
    "Tiwa Savage — All Over","Tiwa Savage — Wanted",
    "Olamide — Science Student","Olamide — Wo!!",
    "Asake — Joha","Asake — Organise","Asake — Lonely at the Top",
  ]},
  { flag:"🇯🇵", label:"J-Pop", songs:[
    "YOASOBI — Idol","YOASOBI — Biri-Biri","YOASOBI — Probably",
    "Official HIGE DANdism — Pretender","Official HIGE DANdism — Subtitle",
    "Ado — Usseewa","Ado — Gira Gira","Ado — New Genesis",
    "Kenshi Yonezu — Lemon","Kenshi Yonezu — Flamingo","Kenshi Yonezu — KICK BACK",
    "LiSA — Gurenge","LiSA — Homura","LiSA — Rising Hope",
    "Zutomayo — Can't Be Right","Zutomayo — Mirror Monster",
    "King Gnu — Hakujitsu","King Gnu — Warawanaide Kure",
    "ONE OK ROCK — Wherever You Are","ONE OK ROCK — Cry Out",
    "Hikaru Utada — First Love","Hikaru Utada — Passion",
    "Perfume — Polyrhythm","Perfume — Edge",
    "Eve — Dramaturgy","Eve — Heart Glass",
    "Vaundy — Odoriko","Vaundy — Strangers",
    "Mrs. GREEN APPLE — Magic","Mrs. GREEN APPLE — In the Morning",
  ]},
  { flag:"🇫🇷", label:"Frantsuz", songs:[
    "Stromae — Papaoutai","Stromae — Alors on danse","Stromae — Formidable","Stromae — L'enfer",
    "Angèle — Balance ton quoi","Angèle — Bruxelles je t'aime",
    "Christine and the Queens — La Nuit est Belle","Christine and the Queens — Saint Claude",
    "Clara Luciani — La grenade","Clara Luciani — Sainte-Victoire",
    "Daft Punk — Get Lucky","Daft Punk — One More Time","Daft Punk — Around the World",
    "Air — La Femme d'Argent","Air — Sexy Boy",
    "Alizée — J'en ai marre","Alizée — Lili",
    "Carla Bruni — Quelqu'un m'a dit","Carla Bruni — La Toi du Toit",
    "Édith Piaf — Non je ne regrette rien","Édith Piaf — La Vie en Rose",
    "Jacques Brel — Ne me quitte pas","Jacques Brel — Amsterdam",
    "Indochine — Tes yeux noirs","Indochine — College Boy",
    "Soprano — Classico","Soprano — Mohamed Ali",
    "Jul — Tchoin","Jul — La famille",
  ]},
  { flag:"🇩🇪", label:"Deutsch", songs:[
    "Rammstein — Du Hast","Rammstein — Sonne","Rammstein — Mutter","Rammstein — Amerika",
    "Tokio Hotel — Durch den Monsun","Tokio Hotel — Schrei",
    "Herbert Grönemeyer — Mensch","Herbert Grönemeyer — Männer",
    "Milky Chance — Stolen Dance","Milky Chance — Ego",
    "CRO — Easy","CRO — Einmal Um Die Welt",
    "Peter Fox — Alles Neu","Peter Fox — Stadtaffe",
  ]},
  { flag:"🇬🇧", label:"UK", songs:[
    "Adele — Rolling in the Deep","Adele — Hello","Adele — Someone Like You","Adele — Easy On Me",
    "Sam Smith — Stay With Me","Sam Smith — Too Good at Goodbyes",
    "George Michael — Careless Whisper","George Michael — Faith",
    "Elton John — Rocket Man","Elton John — Tiny Dancer","Elton John — Crocodile Rock",
    "Amy Winehouse — Rehab","Amy Winehouse — Valerie","Amy Winehouse — Back to Black",
    "The Rolling Stones — Paint It Black","The Rolling Stones — Sympathy for the Devil",
    "David Bowie — Space Oddity","David Bowie — Heroes","David Bowie — Life on Mars?",
    "Radiohead — Creep","Radiohead — Karma Police",
    "Blur — Song 2","Blur — Girls & Boys",
    "Pulp — Common People","Pulp — Babies",
    "Dua Lipa — Levitating","Dua Lipa — Future Nostalgia",
    "Charli XCX — Boom Clap","Charli XCX — Break The Rules",
    "Little Mix — Shout Out to My Ex","Little Mix — Wings",
  ]},
  { flag:"🇮🇹", label:"Italiya", songs:[
    "Laura Pausini — La Solitudine","Laura Pausini — Strani Amori",
    "Eros Ramazzotti — Più Bella Cosa","Eros Ramazzotti — Fuego",
    "Andrea Bocelli — Time to Say Goodbye","Andrea Bocelli — Con Te Partirò",
    "Zucchero — Baila (Sexy Thing)","Zucchero — Senza una Donna",
    "Vasco Rossi — Sally","Vasco Rossi — Albachiara",
    "Jovanotti — Serenata Rap","Jovanotti — L'Ombelico del Mondo",
    "Elodie — Andromeda","Elodie — Bagno a Mezzanotte",
    "Måneskin — ZITTI E BUONI","Måneskin — Beggin","Måneskin — I WANNA BE YOUR SLAVE","Måneskin — The Loneliest",
    "Lucio Dalla — Caruso","Lucio Dalla — Anna e Marco",
    "Elisa — Luce (Tramonti a Nord Est)","Elisa — Anche Fragile",
  ]},
  { flag:"🇪🇸", label:"Ispaniya", songs:[
    "Enrique Iglesias — Bailando","Enrique Iglesias — Hero","Enrique Iglesias — I Like It",
    "Alejandro Sanz — La Tortura","Alejandro Sanz — Corazón Partío",
    "Julio Iglesias — To All the Girls","Julio Iglesias — La Paloma",
    "Pablo Alborán — Solamente Tú","Pablo Alborán — Dónde Está el Amor",
    "Juanes — La Camisa Negra","Juanes — Me Enamora",
    "Isabel Pantoja — Marinero de Luces","Isabel Pantoja — Así Fue",
    "El Fary — Qué Bueno Está","El Fary — Vamos a la Playa",
    "Sebastián Yatra — Robarte un Beso","Sebastián Yatra — Traicionera",
    "C. Tangana — Tú Me Dejaste de Querer","C. Tangana — Antes de Morirme",
    "Bad Gyal — Zorra","Bad Gyal — Lullaby",
  ]},
  { flag:"🇸🇪", label:"Shvetsiya", songs:[
    "ABBA — Dancing Queen","ABBA — Mamma Mia","ABBA — Waterloo","ABBA — Fernando","ABBA — Gimme! Gimme!",
    "Avicii — Wake Me Up","Avicii — Levels","Avicii — The Nights","Avicii — Without You",
    "Swedish House Mafia — Don't You Worry Child","Swedish House Mafia — Save the World",
    "Roxette — The Look","Roxette — It Must Have Been Love","Roxette — Listen to Your Heart",
    "Zara Larsson — Lush Life","Zara Larsson — Never Forget You","Zara Larsson — Ruin My Life",
    "Tove Lo — Habits (Stay High)","Tove Lo — Talking Body",
    "Ace of Base — All That She Wants","Ace of Base — The Sign",
    "Loreen — Euphoria","Loreen — Tattoo",
    "Robyn — Dancing On My Own","Robyn — Call Your Girlfriend",
  ]},
  { flag:"🇳🇱", label:"Niderlandiya", songs:[
    "Tiësto — Adagio for Strings","Tiësto — The Business","Tiësto — Red Lights",
    "Martin Garrix — Animals","Martin Garrix — Scared to Be Lonely","Martin Garrix — In the Name of Love",
    "Hardwell — Spaceman","Hardwell — Never Say Goodbye",
    "Armin van Buuren — This Is What It Feels Like","Armin van Buuren — Blah Blah Blah",
    "Afrojack — Take Over Control","Afrojack — Ten Feet Tall",
    "Anouk — Nobody's Wife","Anouk — Girl",
    "Candy Dulfer — Lily Was Here","Candy Dulfer — Pick Up the Pieces",
    "Marco Borsato — Binnen","Marco Borsato — Dromen Zijn Bedrog",
  ]},
  { flag:"🇦🇺", label:"Avstraliya", songs:[
    "Tame Impala — Let It Happen","Tame Impala — The Less I Know the Better","Tame Impala — Feels Like We Only Go Backwards",
    "Sia — Chandelier","Sia — Cheap Thrills","Sia — Elastic Heart","Sia — Unstoppable",
    "Nick Cave — Into My Arms","Nick Cave — The Ship Song",
    "INXS — Never Tear Us Apart","INXS — Need You Tonight",
    "Kylie Minogue — Can't Get You Out of My Head","Kylie Minogue — Spinning Around",
    "Keith Urban — Blue Ain't Your Color","Keith Urban — You'll Think of Me",
    "Vance Joy — Riptide","Vance Joy — Lay It on Me",
    "Gotye — Somebody That I Used to Know",
    "Flume — Never Be Like You","Flume — Say It",
    "The Vines — Get Free","The Vines — Ride",
  ]},
  { flag:"🇰🇿", label:"Qozog'iston", songs:[
    "Dimash Kudaibergen — S.O.S","Dimash Kudaibergen — Daybreak","Dimash Kudaibergen — Give Me Your Love",
    "Bandymas — Kele ber","Bandymas — Jur ketsek",
    "Ninety One — Itte","Ninety One — Ultra",
    "Skriptonit — Pussy Power","Skriptonit — Kroshka",
    "Zarina Altynbayeva — Seni Suyem","Zarina Altynbayeva — Bir Omir",
    "Xcho — Поверь","Xcho — Нет не так",
    "Begzat — Sevinch","Begzat — Birge",
    "Raushan — Sağyndım","Raushan — Bir Didar",
    "Doston Ergashev — Qo'shiq","Doston Ergashev — Umid",
    "Moldanazar — Qayta kel","Moldanazar — Kün",
  ]},
  { flag:"🇦🇿", label:"Ozarbayjon", songs:[
    "Elman Həsənov — Ata","Elman Həsənov — Anam",
    "Safura — Drip Drop","Safura — Always",
    "Elnur Hüseynov — Hold Me","Elnur Hüseynov — Love Me Now",
    "Samira Efendi — Cleopatra","Samira Efendi — Fly to Win",
    "Farid Mammadov — Hold Me","Farid Mammadov — Unbeatable",
    "Chingiz — Truth","Chingiz — Ordinary World",
    "Aysel Teymurzadeh — Always","Aysel Teymurzadeh — One More Day",
    "Hadise — Düm Tek Tek","Hadise — Aşk Kaç Beden Giyer",
    "Türkçe Pop — Seni Seviyorum","Türkçe Pop — Aşkım",
  ]},
  { flag:"🇨🇳", label:"Xitoy / C-Pop", songs:[
    "Jay Chou — 青花瓷 (Blue and White Porcelain)","Jay Chou — 稻香 (Sunny Rice Fields)","Jay Chou — 七里香 (Common Jasmine)",
    "Wang Fang — 传奇 (Legend)","Wang Fang — 明月几时有",
    "Teresa Teng — 月亮代表我的心 (The Moon Represents My Heart)","Teresa Teng — 甜蜜蜜",
    "G.E.M. — 泡沫 (Bubble)","G.E.M. — 喜欢你","G.E.M. — 倒数",
    "BLACKPINK — 뚜두뚜두 (Chinese ver)","EXO — 中毒 (Overdose)",
    "Jackson Wang — 100 Ways","Jackson Wang — Blow",
    "Hua Chenyu — 烟火里的尘埃","Hua Chenyu — 十年",
    "Lay Zhang — LIT","Lay Zhang — Sheep",
    "TFBoys — 宠爱 (Pet Love)","TFBoys — 青春修炼手册",
  ]},
  { flag:"🇮🇩", label:"Indoneziya", songs:[
    "Raisa — Kali Kedua","Raisa — Serba Salah","Raisa — Usai Di Sini",
    "Isyana Sarasvati — Keep Being You","Isyana Sarasvati — Kau Adalah",
    "Tulus — Monokrom","Tulus — Sepatu","Tulus — Gajah",
    "Rizky Febian — Curang","Rizky Febian — Hasta Manana",
    "Judika — Aku Yang Tersakiti","Judika — Bersama Bintang",
    "Glenn Fredly — Januari","Glenn Fredly — Kisah yang Salah",
    "Armada — Asal Kau Bahagia","Armada — Pergi Pagi Pulang Pagi",
    "Peterpan — Mungkin Nanti","Peterpan — Ada Apa Denganmu",
    "Sheila on 7 — Dan","Sheila on 7 — Saat Aku Lanjut Tua",
    "Dewa 19 — Kangen","Dewa 19 — Larut",
  ]},
  { flag:"🇵🇭", label:"Filippin", songs:[
    "Ben&Ben — Leaves","Ben&Ben — Maybe The Night","Ben&Ben — Kathang Isip",
    "December Avenue — Kung 'Di Rin Lang Ikaw","December Avenue — Buwan",
    "Sarah Geronimo — Tala","Sarah Geronimo — Diamond",
    "Gary Valenciano — Hatid ng Puso Ko","Gary Valenciano — Natutulog Ba ang Diyos",
    "Regine Velasquez — Kailangan Kita","Regine Velasquez — Gusto Kita",
    "SB19 — GENTO","SB19 — Bazinga","SB19 — What?",
    "BINI — Born to Win","BINI — Karera",
    "IV of Spades — Where Have You Been","IV of Spades — Come Inside of My Heart",
    "Eraserheads — Ang Huling El Bimbo","Eraserheads — With a Smile",
  ]},
  { flag:"🇹🇭", label:"Tailand", songs:[
    "MILLI — ทุ่มแล้ว","MILLI — Mango Sticky Rice",
    "Bodyslam — อยู่ได้โดยไม่มีเธอ","Bodyslam — แค่เพียง",
    "Potato — ดาวกระจาย","Potato — สักวัน",
    "Moderndog — ชั่วดี","Moderndog — หัวใจจะขาด",
    "Lula — ไม่ลืมเธอ","Lula — เกินพอ",
    "Peck Palitchoke — เข้าใจ","Peck Palitchoke — ห่างกัน",
    "Clash — ซ่า","Clash — ฝากใจด้วย",
    "STAMP — ลม","STAMP — เวลา",
    "Phum Viphurit — Lover Boy","Phum Viphurit — Open Invitation",
    "Jeff Satur — Bed","Jeff Satur — ท้องฟ้าสีทอง",
  ]},
  { flag:"🇸🇦", label:"Arab olami", songs:[
    "Amr Diab — Habibi Ya Nour El Ain","Amr Diab — Tamally Maak","Amr Diab — Nour El Ain",
    "Nancy Ajram — Ah W Noss","Nancy Ajram — Lawn Einak","Nancy Ajram — Ya Tabtab",
    "Fairuz — La Bkitra","Fairuz — Nassam Alayna El Hawa","Fairuz — Bhebak Ya Libnan",
    "Elissa — Aadet Hiba","Elissa — Betfakar Fi Meen",
    "Haifa Wehbe — Badi Asha","Haifa Wehbe — Khalik Leya",
    "Wael Kfoury — Khedni Maak","Wael Kfoury — Inta Eyoun",
    "Kadim Al Saher — Ahebbak","Kadim Al Saher — Ilahi Al Hakim",
    "Mohammed Abdo — Ya Zaman","Mohammed Abdo — Qalb Al Asheq",
    "Balqees — Sabry Alaik","Balqees — Tamally",
  ]},
  { flag:"🇵🇰", label:"Pokiston", songs:[
    "Coke Studio — Pasoori (Ali Sethi & Shae Gill)","Coke Studio — Tu Jhoom",
    "Atif Aslam — Woh Lamhe","Atif Aslam — Jeena Jeena","Atif Aslam — Tu Jaane Na",
    "Rahat Fateh Ali Khan — Tere Mast Mast Do Nain","Rahat Fateh Ali Khan — Zaroori Tha",
    "Nusrat Fateh Ali Khan — Dam Mast Qalandar","Nusrat Fateh Ali Khan — Afreen Afreen",
    "Ali Zafar — Channo","Ali Zafar — Rockstar",
    "Momina Mustehsan — Awari","Momina Mustehsan — Baazi",
    "Falak Shabir — Bol Do Na Zara","Falak Shabir — Tere Bina",
    "Asrar Shah — Yaar Bina","Asrar Shah — Ishq Wala Love",
    "Zoe Viccaji — Ik Baar","Zoe Viccaji — O Re Piya",
  ]},
  { flag:"🇲🇽", label:"Meksika", songs:[
    "Luis Miguel — La Incondicional","Luis Miguel — Suave","Luis Miguel — Por Debajo de la Mesa",
    "Banda MS — Tú y Yo","Banda MS — Loco",
    "Grupo Firme — El Tóxico","Grupo Firme — Yo Ya No Vuelvo Contigo",
    "Christian Nodal — Adiós Amor","Christian Nodal — Ya No Somos Ni Seremos",
    "Pepe Aguilar — Por Mujeres Como Tú","Pepe Aguilar — El Vino y el Amor",
    "Maná — Oye Mi Amor","Maná — No Ha Parado de Llover",
    "Los Tigres del Norte — La Puerta Negra","Los Tigres del Norte — Contrabando y Traición",
    "Jenni Rivera — La Gran Señora","Jenni Rivera — De Contrabando",
    "Alejandro Fernández — Como Quien Pierde una Estrella","Alejandro Fernández — Lástima Que Seas Ajena",
    "Juan Gabriel — Amor Eterno","Juan Gabriel — El Noa Noa",
  ]},
  { flag:"🇿🇦", label:"Afrika Janubiy", songs:[
    "Master KG — Jerusalema","Master KG — Shine Your Light",
    "Sho Madjozi — John Cena","Sho Madjozi — Huku",
    "Black Motion — We Are One","Black Motion — Afro Warrior",
    "Sun El Musician — Akanamali","Sun El Musician — Boy from the Slums",
    "Samthing Soweto — Akulaleki","Samthing Soweto — Isphithiphithi",
    "Kabza De Small — Sponono","Kabza De Small — Umsebenzi Wethu",
    "DJ Maphorisa — Izolo","DJ Maphorisa — Banyana",
    "Focalistic — Ke Star","Focalistic — Gugulethu",
    "Nasty C — Strings and Bling","Nasty C — SMA",
    "Cassper Nyovest — Tito Mboweni","Cassper Nyovest — Mama I Made It",
  ]},
  { flag:"🇨🇦", label:"Kanada", songs:[
    "Drake — God's Plan","Drake — Hotline Bling","Drake — God's Plan","Drake — Started From the Bottom",
    "The Weeknd — Blinding Lights","The Weeknd — Can't Feel My Face","The Weeknd — Earned It",
    "Justin Bieber — Baby","Justin Bieber — Love Yourself","Justin Bieber — Peaches","Justin Bieber — Ghost",
    "Shawn Mendes — Stitches","Shawn Mendes — Treat You Better","Shawn Mendes — There's Nothing Holdin' Me Back",
    "Celine Dion — My Heart Will Go On","Celine Dion — The Power of Love",
    "Alanis Morissette — Ironic","Alanis Morissette — You Oughta Know",
    "Arcade Fire — Wake Up","Arcade Fire — Rebellion (Lies)",
    "Tory Lanez — Luv","Tory Lanez — Broke in a Minute",
    "Loud Luxury — Body","Loud Luxury — Cold",
    "Kaytranada — 10%","Kaytranada — You're the One",
  ]},
  { flag:"🇬🇭", label:"Ghana", songs:[
    "Stonebwoy — Activate","Stonebwoy — Nominate","Stonebwoy — Everlasting",
    "Sarkodie — Non Living Thing","Sarkodie — Lucky","Sarkodie — Rollies and Cigars",
    "Shatta Wale — My Level","Shatta Wale — Freedom Wave",
    "R2Bees — Stay With Me","R2Bees — Slow Down",
    "Efya — Nobody","Efya — Getaway",
    "Bisa Kdei — Mansa","Bisa Kdei — Kae (Remember)",
    "Medikal — Omo Ada","Medikal — La Hustle",
    "King Promise — Slow Down","King Promise — CCTV",
    "KiDi — Enjoyment","KiDi — Touch It","KiDi — Spiritual",
  ]},
  { flag:"🎻", label:"Klassik", songs:[
    "Beethoven — Moonlight Sonata","Beethoven — Symphony No. 5","Beethoven — Für Elise","Beethoven — Ode to Joy",
    "Mozart — Eine Kleine Nachtmusik","Mozart — Symphony No. 40","Mozart — Requiem","Mozart — Magic Flute",
    "Bach — Air on the G String","Bach — Toccata and Fugue in D minor","Bach — Cello Suite No. 1",
    "Tchaikovsky — Swan Lake","Tchaikovsky — Nutcracker Suite","Tchaikovsky — 1812 Overture",
    "Vivaldi — The Four Seasons (Spring)","Vivaldi — The Four Seasons (Summer)",
    "Chopin — Nocturne in E-flat major","Chopin — Ballade No. 1","Chopin — Fantasie Impromptu",
    "Debussy — Clair de Lune","Debussy — Arabesque No. 1",
    "Yiruma — River Flows in You","Yiruma — Kiss the Rain","Yiruma — May Be",
    "Ludovico Einaudi — Una Mattina","Ludovico Einaudi — Nuvole Bianche","Ludovico Einaudi — Divenire",
    "Hans Zimmer — Time (Inception)","Hans Zimmer — Interstellar Theme",
    "John Williams — Imperial March","John Williams — Hedwig's Theme",
  ]},
  { flag:"🎧", label:"EDM / House", songs:[
    "Calvin Harris — Feel So Close","Calvin Harris — Summer","Calvin Harris — This Is What You Came For",
    "David Guetta — Titanium","David Guetta — Without You","David Guetta — When Love Takes Over",
    "Marshmello — Alone","Marshmello — Happier","Marshmello — Friends",
    "Skrillex — Bangarang","Skrillex — First of the Year",
    "Zedd — Clarity","Zedd — Stay the Night","Zedd — The Middle",
    "Kygo — Stole the Show","Kygo — Firestone","Kygo — Happy Now",
    "Diplo — Lean On (ft. MØ)","Diplo — Express Yourself",
    "Daft Punk — Harder Better Faster Stronger","Daft Punk — Get Lucky","Daft Punk — One More Time",
    "The Chainsmokers — Closer","The Chainsmokers — Don't Let Me Down",
    "Fisher — Losing It","Fisher — Freaks",
    "Alan Walker — Faded","Alan Walker — Alone","Alan Walker — On My Way",
  ]},
  { flag:"🎤", label:"Hip-Hop", songs:[
    "Kendrick Lamar — HUMBLE.","Kendrick Lamar — Not Like Us","Kendrick Lamar — DNA","Kendrick Lamar — Alright",
    "Kanye West — POWER","Kanye West — All Falls Down","Kanye West — Stronger","Kanye West — Gold Digger",
    "J. Cole — No Role Modelz","J. Cole — Love Yourz","J. Cole — Middle Child",
    "Lil Uzi Vert — XO TOUR Llif3","Lil Uzi Vert — Just Wanna Rock",
    "Travis Scott — SICKO MODE","Travis Scott — Goosebumps","Travis Scott — Antidote",
    "21 Savage — Bank Account","21 Savage — A Lot",
    "Cardi B — Bodak Yellow","Cardi B — WAP","Cardi B — Up",
    "Nicki Minaj — Super Bass","Nicki Minaj — Anaconda","Nicki Minaj — Monster",
    "Future — Mask Off","Future — Life Is Good","Future — Jumpin on a Jet",
    "Megan Thee Stallion — Savage","Megan Thee Stallion — Hot Girl Summer",
    "A$AP Rocky — Peso","A$AP Rocky — Fashion Killa","A$AP Rocky — LSD",
  ]},
  { flag:"🌙", label:"R&B / Soul", songs:[
    "Frank Ocean — Thinking Bout You","Frank Ocean — Nights","Frank Ocean — Pink + White",
    "H.E.R. — Focus","H.E.R. — Best Part","H.E.R. — I Can't",
    "Daniel Caesar — Get You","Daniel Caesar — Best Part","Daniel Caesar — ENTROPY",
    "Summer Walker — Playing Games","Summer Walker — Over It","Summer Walker — Come Thru",
    "Jhené Aiko — None of Your Concern","Jhené Aiko — Sativa","Jhené Aiko — Trigger Protection Mantra",
    "Bryson Tiller — Exchange","Bryson Tiller — Don't","Bryson Tiller — Sorry Not Sorry",
    "Ella Mai — Boo'd Up","Ella Mai — Trip","Ella Mai — Shot Clock",
    "Giveon — Heartbreak Anniversary","Giveon — Like I Want You","Giveon — Still Your Best",
    "Khalid — Location","Khalid — Better","Khalid — Talk",
    "Steve Lacy — Bad Habit","Steve Lacy — Dark Red","Steve Lacy — LMFTFY",
    "Usher — Yeah!","Usher — Confessions Part II","Usher — Burn",
    "Beyoncé — Drunk in Love","Beyoncé — Love On Top","Beyoncé — Crazy in Love",
  ]},
  { flag:"🇮🇷", label:"Eron / Fors", songs:[
    "Dariush — Kavir","Dariush — Jomeh",
    "Googoosh — Talagh","Googoosh — Man Amadeh Am",
    "Hayedeh — Negah Kon","Hayedeh — Ghafas",
    "Ebi — Mikhaam Beraghsam","Ebi — Dokhtar",
    "Shahram Nazeri — Shams","Shahram Nazeri — Divan-e Shams",
    "Sasy Mankan — Dokhtar Irani","Sasy Mankan — Jader",
    "Yas — Yadete Nist","Yas — Az Ma Behtar",
    "Alireza JJ — Tabestoon","Alireza JJ — Janan",
    "Ho3ein — Gole Yakh","Ho3ein — Tanhayi",
    "Mehrad Hidden — Khatereh","Mehrad Hidden — Cheshmat",
  ]},
];

const SOUND_FX: { cat: string; sounds: { name: string; emoji: string }[] }[] = [
  { cat:"😂 Qiziq", sounds:[
    { name:"Boink", emoji:"🟡" },{ name:"Whoosh", emoji:"💨" },{ name:"Pop", emoji:"🎈" },
    { name:"Fart Sound", emoji:"💨" },{ name:"Sad Trombone", emoji:"🎺" },{ name:"Fail Horn", emoji:"📯" },
    { name:"Vine Boom", emoji:"💥" },{ name:"Bruh Sound", emoji:"😶" },{ name:"Meme Laugh", emoji:"😂" },
  ]},
  { cat:"🌊 Tabiat", sounds:[
    { name:"Ocean Waves", emoji:"🌊" },{ name:"Rain Drops", emoji:"🌧" },{ name:"Birds Singing", emoji:"🐦" },
    { name:"Thunderstorm", emoji:"⛈" },{ name:"Wind Howling", emoji:"🌬" },{ name:"Forest Ambience", emoji:"🌲" },
    { name:"Fire Crackling", emoji:"🔥" },{ name:"River Stream", emoji:"💧" },
  ]},
  { cat:"🔔 Bildirishnoma", sounds:[
    { name:"iPhone Ding", emoji:"📱" },{ name:"Message Pop", emoji:"💬" },{ name:"Email Swoop", emoji:"📧" },
    { name:"Level Up!", emoji:"⬆️" },{ name:"Achievement", emoji:"🏆" },{ name:"Coins", emoji:"💰" },
    { name:"Magic Spell", emoji:"✨" },{ name:"Power Up", emoji:"⚡" },
  ]},
  { cat:"🎬 Transition", sounds:[
    { name:"Swoosh Left", emoji:"⬅️" },{ name:"Swoosh Right", emoji:"➡️" },{ name:"Zoom In", emoji:"🔍" },
    { name:"Camera Shutter", emoji:"📸" },{ name:"Film Reel", emoji:"🎞" },{ name:"Dramatic Hit", emoji:"💢" },
    { name:"Cinematic Rise", emoji:"🎬" },{ name:"Record Scratch", emoji:"💿" },
  ]},
];

const AR_FILTERS: { id: string; emoji: string; label: string; desc: string; css: string }[] = [
  { id:"none",       emoji:"✨", label:"Asl",         desc:"Filtr yo'q",          css:"none" },
  { id:"galaxy",     emoji:"🌌", label:"Galaktika",   desc:"Kosmik neon effekt",  css:"hue-rotate(200deg) saturate(3) brightness(1.2)" },
  { id:"anime",      emoji:"🌸", label:"Anime",       desc:"Anime estetika",      css:"saturate(1.6) contrast(1.15) hue-rotate(330deg)" },
  { id:"neon_glow",  emoji:"💜", label:"Neon Glow",   desc:"Ultra neon glow",     css:"saturate(4) contrast(1.4) hue-rotate(10deg) brightness(1.1)" },
  { id:"sunset",     emoji:"🌅", label:"Sunset",      desc:"Iliq qizg'ish",       css:"sepia(0.4) saturate(2) hue-rotate(10deg) brightness(1.1)" },
  { id:"cyberpunk",  emoji:"🤖", label:"Cyberpunk",   desc:"Neon shahri",         css:"hue-rotate(270deg) saturate(2.5) contrast(1.3)" },
  { id:"vintage_ar", emoji:"📽", label:"Vintage",     desc:"Retro 70s",           css:"sepia(0.7) contrast(0.85) brightness(1.15) saturate(0.6)" },
  { id:"forest",     emoji:"🌿", label:"O'rmon",      desc:"Yashil tabiat",       css:"hue-rotate(90deg) saturate(1.8) brightness(1.05)" },
  { id:"ocean",      emoji:"🌊", label:"Okean",       desc:"Ko'k dengiz",         css:"hue-rotate(190deg) saturate(2) brightness(1.05) contrast(1.1)" },
  { id:"fire",       emoji:"🔥", label:"Olov",        desc:"Issiq alanga",        css:"hue-rotate(350deg) saturate(3) contrast(1.2) brightness(1.1)" },
  { id:"ice",        emoji:"❄️", label:"Muz",         desc:"Sovuq ko'k",          css:"hue-rotate(210deg) saturate(1.5) brightness(1.2) contrast(0.9)" },
  { id:"gold",       emoji:"👑", label:"Oltin",       desc:"Lyuks oltin",         css:"sepia(0.9) saturate(2.5) brightness(1.15)" },
  { id:"horror",     emoji:"💀", label:"Dahshat",     desc:"Qo'rqinchli",        css:"grayscale(0.8) contrast(1.5) brightness(0.85)" },
  { id:"dream",      emoji:"🦄", label:"Orzuli",      desc:"Pastel xayol",        css:"brightness(1.2) saturate(1.8) hue-rotate(320deg) blur(0.4px)" },
  { id:"matrix",     emoji:"💚", label:"Matrix",      desc:"Yashil kod",          css:"hue-rotate(100deg) saturate(5) contrast(1.6) brightness(0.9)" },
  { id:"noir_ar",    emoji:"🎬", label:"Noir",        desc:"Kinematografik",      css:"grayscale(1) contrast(1.4) brightness(0.95)" },
  { id:"rainbow",    emoji:"🌈", label:"Kamalak",     desc:"Rang bayram",        css:"hue-rotate(45deg) saturate(2.5) contrast(1.1)" },
  { id:"candy",      emoji:"🍭", label:"Konfet",      desc:"Rang-barang",         css:"saturate(2.2) brightness(1.15) hue-rotate(330deg) contrast(1.05)" },
  { id:"midnight",   emoji:"🌙", label:"Yarim tun",   desc:"Tungi estetika",      css:"brightness(0.75) saturate(0.7) contrast(1.3) hue-rotate(220deg)" },
  { id:"spring",     emoji:"🌷", label:"Bahor",       desc:"Freshe yangi",        css:"saturate(1.5) brightness(1.12) hue-rotate(310deg) contrast(0.95)" },
];

const VOICE_FX: { id: string; emoji: string; label: string; desc: string }[] = [
  { id:"normal",    emoji:"🎤", label:"Normal",      desc:"O'z ovozingiz" },
  { id:"high",      emoji:"🐭", label:"Sichqon",     desc:"Baland tovush" },
  { id:"low",       emoji:"🐻", label:"Ayiq",        desc:"Past chuqur ovoz" },
  { id:"robot",     emoji:"🤖", label:"Robot",       desc:"Mexanik ovoz" },
  { id:"anime",     emoji:"🌸", label:"Anime",       desc:"Anime qahramon" },
  { id:"echo",      emoji:"🏔", label:"Aks-sado",    desc:"Tog'dagi ovoz" },
  { id:"underwater",emoji:"🌊", label:"Suv ostida",  desc:"Chuqur dengiz" },
  { id:"radio",     emoji:"📻", label:"Radio",       desc:"Vintage efir" },
  { id:"celebrity", emoji:"⭐", label:"Yulduz",      desc:"Kuchaytirilgan" },
  { id:"whisper",   emoji:"🤫", label:"Shivirla",    desc:"Sirli shivirash" },
];

const BEAUTY_OPTIONS: { id: string; emoji: string; label: string; min: number; max: number; step: number }[] = [
  { id:"smoothing",  emoji:"✨", label:"Teri sirlash",     min:0, max:100, step:5 },
  { id:"brightness", emoji:"💡", label:"Yorqinlik",         min:0, max:100, step:5 },
  { id:"slim",       emoji:"🤳", label:"Yuz ingichkalash",  min:0, max:100, step:5 },
  { id:"eyes",       emoji:"👁", label:"Ko'z kattalashtir", min:0, max:100, step:5 },
  { id:"teeth",      emoji:"😁", label:"Tishlarni oqlashtir",min:0,max:100, step:5 },
  { id:"blush",      emoji:"🌸", label:"Yonoq qizarish",   min:0, max:100, step:5 },
];

export const TRENDING_CHALLENGES = [
  "#GilosChallenge 🔥", "#DanceOff 💃", "#GlowUp ✨", "#SilhouetteChallenge 🌟",
  "#TrendingNow 📈", "#ViralDance 🎵", "#FoodChallenge 🍔", "#FitnessChallenge 💪",
  "#BeautyHacks 💄", "#LifeHacks 🛠", "#PetChallenge 🐾", "#ArtChallenge 🎨",
  "#Transition 🔄", "#LipSync 🎤", "#CommentChallenge 💬", "#OutfitOfTheDay 👗",
  "#MorningRoutine ☀️", "#NightRoutine 🌙", "#CookingChallenge 👨‍🍳", "#StudyWith 📚",
];

type StylePreset = {
  id:string; label:string; cardGrad:string;
  color:string; gradient:string; fontFamily:string;
  bgStyle:TextOverlay["bgStyle"]; shadowPreset:TextOverlay["shadowPreset"];
  strokeWidth:number; strokeColor:string;
  animation:TextOverlay["animation"]; letterSpacing:number;
  fontSize:number; fontStyle:TextOverlay["fontStyle"];
};
const STYLE_PRESETS: StylePreset[] = [
  { id:"neon-club",  label:"Neon Club",   cardGrad:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)",
    color:"#00ffff",  gradient:"", fontFamily:"mono",   bgStyle:"dark",      shadowPreset:"neon-blue", strokeWidth:0, strokeColor:"#000",    animation:"neon",       letterSpacing:4, fontSize:38, fontStyle:"bold" },
  { id:"fire",       label:"Olov 🔥",     cardGrad:"linear-gradient(135deg,#f12711,#f5af19)",
    color:"#fff",     gradient:"linear-gradient(90deg,#ff4e00,#ec9f05)", fontFamily:"impact", bgStyle:"none", shadowPreset:"fire", strokeWidth:1, strokeColor:"#7a1a00", animation:"pulse",      letterSpacing:2, fontSize:42, fontStyle:"bold" },
  { id:"cinema",     label:"Sinema 🎬",   cardGrad:"linear-gradient(135deg,#1a1a2e,#0f3460)",
    color:"#f5e642",  gradient:"", fontFamily:"serif",  bgStyle:"dark",      shadowPreset:"3d",        strokeWidth:2, strokeColor:"#000",    animation:"none",       letterSpacing:6, fontSize:40, fontStyle:"bold" },
  { id:"galaxy",     label:"Galaktika 🌌",cardGrad:"linear-gradient(135deg,#667eea,#764ba2)",
    color:"#fff",     gradient:"linear-gradient(90deg,#a78bfa,#38bdf8,#a78bfa)", fontFamily:"display", bgStyle:"none", shadowPreset:"glow", strokeWidth:0, strokeColor:"#000", animation:"rainbow", letterSpacing:3, fontSize:36, fontStyle:"bold" },
  { id:"retro",      label:"Retro 🕹️",    cardGrad:"linear-gradient(135deg,#fc4a1a,#f7b733)",
    color:"#fff",     gradient:"", fontFamily:"impact", bgStyle:"pill",      shadowPreset:"retro",     strokeWidth:0, strokeColor:"#000",    animation:"bounce",     letterSpacing:4, fontSize:34, fontStyle:"bold" },
  { id:"luxury",     label:"Luxury ✨",   cardGrad:"linear-gradient(135deg,#b8860b,#ffd700,#b8860b)",
    color:"#ffd700",  gradient:"linear-gradient(90deg,#c6a000,#ffd700,#fff8dc)", fontFamily:"serif", bgStyle:"dark", shadowPreset:"3d", strokeWidth:1, strokeColor:"#8B6914", animation:"none", letterSpacing:5, fontSize:40, fontStyle:"bold" },
  { id:"bubble",     label:"Bubble 🫧",   cardGrad:"linear-gradient(135deg,#ff9a9e,#fecfef)",
    color:"#ff6b9d",  gradient:"", fontFamily:"soft",   bgStyle:"highlight", shadowPreset:"soft",      strokeWidth:3, strokeColor:"#fff",    animation:"bounce",     letterSpacing:2, fontSize:36, fontStyle:"bold" },
  { id:"hacker",     label:"Hacker 💻",   cardGrad:"linear-gradient(135deg,#000,#003300)",
    color:"#00ff41",  gradient:"", fontFamily:"mono",   bgStyle:"none",      shadowPreset:"neon-blue", strokeWidth:0, strokeColor:"#000",    animation:"typewriter", letterSpacing:2, fontSize:32, fontStyle:"regular" },
  { id:"sunset",     label:"Sunset 🌅",   cardGrad:"linear-gradient(135deg,#f093fb,#f5576c)",
    color:"#fff",     gradient:"linear-gradient(90deg,#f093fb,#f5576c,#f093fb)", fontFamily:"soft", bgStyle:"none", shadowPreset:"glow", strokeWidth:0, strokeColor:"#000", animation:"wave", letterSpacing:1, fontSize:38, fontStyle:"bold" },
  { id:"storm",      label:"Bo'ron ⚡",   cardGrad:"linear-gradient(135deg,#373b44,#4286f4)",
    color:"#fff",     gradient:"", fontFamily:"narrow", bgStyle:"blur",      shadowPreset:"3d",        strokeWidth:2, strokeColor:"#1a3a6e", animation:"shake",      letterSpacing:3, fontSize:36, fontStyle:"bold" },
  { id:"kawaii",     label:"Kawaii 🌸",   cardGrad:"linear-gradient(135deg,#f8c8d4,#e880a0)",
    color:"#fff",     gradient:"linear-gradient(90deg,#ff9ecd,#c8a0e0)", fontFamily:"soft", bgStyle:"pill", shadowPreset:"glow", strokeWidth:2, strokeColor:"#ff80b5", animation:"pulse", letterSpacing:2, fontSize:36, fontStyle:"bold" },
  { id:"matrix",     label:"Matrix 🔢",   cardGrad:"linear-gradient(135deg,#000,#00290b)",
    color:"#39ff14",  gradient:"linear-gradient(180deg,#00ff41,#008f11)", fontFamily:"mono", bgStyle:"none", shadowPreset:"neon-blue", strokeWidth:0, strokeColor:"#000", animation:"flip", letterSpacing:1, fontSize:34, fontStyle:"regular" },
];

const SPEED_OPTIONS = [
  { label:"0.3×", val:0.3, color:"#38bdf8" },
  { label:"0.5×", val:0.5, color:"#818cf8" },
  { label:"1×",   val:1.0, color:"#a855f7" },
  { label:"1.5×", val:1.5, color:"#f97316" },
  { label:"2×",   val:2.0, color:"#ef4444" },
  { label:"3×",   val:3.0, color:"#e11d48" },
];

const BG_GRADIENTS = [
  { id:"none",      label:"Asl",       css:"none",                                                                                     thumb:"rgba(255,255,255,0.12)" },
  { id:"midnight",  label:"Tungi",     css:"linear-gradient(160deg,#0a0a1a 0%,#1a1040 100%)",                                           thumb:"#1a1040" },
  { id:"sunset",    label:"Quyosh",    css:"linear-gradient(160deg,#ff6b35 0%,#f7c948 50%,#ff3d00 100%)",                               thumb:"#f97316" },
  { id:"ocean",     label:"Okean",     css:"linear-gradient(160deg,#0ea5e9 0%,#0284c7 50%,#0c4a6e 100%)",                               thumb:"#0ea5e9" },
  { id:"galaxy",    label:"Galaktika", css:"linear-gradient(160deg,#0f0c29 0%,#302b63 50%,#7c3aed 100%)",                               thumb:"#302b63" },
  { id:"forest",    label:"O'rmon",    css:"linear-gradient(160deg,#052e16 0%,#065f46 50%,#14532d 100%)",                               thumb:"#065f46" },
  { id:"fire",      label:"Olov",      css:"linear-gradient(160deg,#7f1d1e 0%,#dc2626 40%,#f97316 70%,#fbbf24 100%)",                  thumb:"#dc2626" },
  { id:"rose",      label:"Atirgul",   css:"linear-gradient(160deg,#4c0519 0%,#9f1239 40%,#e11d48 70%,#fb7185 100%)",                  thumb:"#e11d48" },
  { id:"lavender",  label:"Lavanda",   css:"linear-gradient(160deg,#2e1065 0%,#5b21b6 50%,#a78bfa 100%)",                               thumb:"#7c3aed" },
  { id:"cyber",     label:"Cyber",     css:"linear-gradient(160deg,#041330 0%,#0d2b55 50%,#0369a1 80%,#00d4ff 100%)",                  thumb:"#00d4ff" },
  { id:"neon",      label:"Neon",      css:"linear-gradient(160deg,#0a001a 0%,#3b0764 50%,#9333ea 80%,#f0abfc 100%)",                  thumb:"#a21caf" },
  { id:"aurora",    label:"Aurora",    css:"linear-gradient(160deg,#022c22 0%,#065f46 25%,#0c4a6e 60%,#1e1b4b 100%)",                  thumb:"#065f46" },
  { id:"dusk",      label:"Shomgoh",   css:"linear-gradient(160deg,#1c0533 0%,#6a0572 35%,#c2410c 65%,#fbbf24 100%)",                  thumb:"#6a0572" },
  { id:"deep",      label:"Teranlik",  css:"linear-gradient(160deg,#000428 0%,#00204a 50%,#004e92 100%)",                               thumb:"#004e92" },
  { id:"blush",     label:"Pushti",    css:"linear-gradient(160deg,#4a044e 0%,#86198f 40%,#db2777 70%,#fb7185 100%)",                  thumb:"#db2777" },
  { id:"emerald",   label:"Zumrad",    css:"linear-gradient(160deg,#022c22 0%,#0f9b58 50%,#34d399 100%)",                               thumb:"#10b981" },
  { id:"gold",      label:"Oltin",     css:"linear-gradient(160deg,#78350f 0%,#b45309 40%,#fbbf24 80%,#fef08a 100%)",                  thumb:"#f59e0b" },
  { id:"noir",      label:"Qora",      css:"linear-gradient(160deg,#000000 0%,#0f0f23 50%,#1e1b4b 100%)",                               thumb:"#111" },
  { id:"candy",     label:"Konfet",    css:"linear-gradient(160deg,#7e22ce 0%,#db2777 40%,#f97316 70%,#fbbf24 100%)",                  thumb:"#db2777" },
  { id:"arctic",    label:"Arktika",   css:"linear-gradient(160deg,#0c4a6e 0%,#155e75 40%,#164e63 70%,#1e3a5f 100%)",                  thumb:"#0c4a6e" },
  { id:"matrix",    label:"Matrix",    css:"linear-gradient(160deg,#000000 0%,#052e16 50%,#14532d 100%)",                               thumb:"#052e16" },
  { id:"copper",    label:"Mis",       css:"linear-gradient(160deg,#431407 0%,#9a3412 40%,#c2683c 70%,#f5c29b 100%)",                  thumb:"#c2410c" },
  { id:"milk",      label:"Sut",       css:"linear-gradient(160deg,#f0fdf4 0%,#ede9fe 50%,#fce7f3 100%)",                               thumb:"#e9d5ff" },
  { id:"thunder",   label:"Momaqald.", css:"linear-gradient(160deg,#0c0c1e 0%,#1e293b 40%,#334155 70%,#6366f1 100%)",                  thumb:"#334155" },
];

const FILTERS: { id: string; label: string; css: string }[] = [
  { id: "none",     label: "Asl",     css: "none" },
  { id: "vivid",    label: "Yorqin",  css: "saturate(1.8) contrast(1.1)" },
  { id: "warm",     label: "Iliq",    css: "sepia(0.35) saturate(1.4) brightness(1.05)" },
  { id: "cool",     label: "Sovuq",   css: "hue-rotate(200deg) saturate(1.3) brightness(1.05)" },
  { id: "noir",     label: "Qora-oq", css: "grayscale(1) contrast(1.2)" },
  { id: "fade",     label: "Soliq",   css: "brightness(1.1) saturate(0.7) contrast(0.85)" },
  { id: "neon",     label: "Neon",    css: "saturate(3) contrast(1.3) hue-rotate(10deg)" },
  { id: "golden",   label: "Oltin",   css: "sepia(0.8) saturate(2) brightness(1.1)" },
  { id: "dreamy",   label: "Orzuli",  css: "brightness(1.15) saturate(1.5) hue-rotate(330deg) blur(0.3px)" },
  { id: "vintage",  label: "Retro",   css: "sepia(0.5) contrast(0.9) brightness(1.1) saturate(0.8)" },
];

function WaveText({ text, color, fontSize }: { text: string; color: string; fontSize: number }) {
  return (
    <span style={{ display:"inline-flex", gap: 0 }}>
      {text.split("").map((ch, i) => (
        <span key={i} style={{
          display:"inline-block",
          animation:`txt-wave-letter 1s ease-in-out infinite`,
          animationDelay:`${i * 0.08}s`,
          color, fontSize,
          whiteSpace: ch === " " ? "pre" : undefined,
        }}>{ch}</span>
      ))}
    </span>
  );
}

function OverlayText({ item }: { item: TextOverlay }) {
  const animCls = item.animation === "pulse"      ? "txt-anim-pulse"
    : item.animation === "bounce"     ? "txt-anim-bounce"
    : item.animation === "neon"       ? "txt-anim-neon"
    : item.animation === "slide"      ? "txt-anim-slide"
    : item.animation === "flip"       ? "txt-anim-flip"
    : item.animation === "rainbow"    ? "txt-anim-rainbow"
    : item.animation === "typewriter" ? "txt-anim-typewriter"
    : "";

  const shakeStyle: React.CSSProperties = item.animation === "shake"
    ? { animation:"txt-shake 0.5s ease-in-out infinite" } : {};

  const fontCss = FONT_FAMILIES.find(f => f.id === item.fontFamily)?.css ?? "system-ui,sans-serif";
  const shadowCss = TEXT_SHADOWS.find(s => s.id === item.shadowPreset)?.css ?? "none";

  const fStyleProps: React.CSSProperties = {
    fontWeight: item.fontStyle === "bold" ? 900 : item.fontStyle === "outline" ? 700 : 400,
    fontStyle:  item.fontStyle === "italic" ? "italic" : "normal",
    WebkitTextStroke: item.strokeWidth > 0
      ? `${item.strokeWidth}px ${item.strokeColor || "#000"}`
      : item.fontStyle === "outline" ? "1.5px rgba(0,0,0,0.85)" : undefined,
  };

  const bgProps: React.CSSProperties =
      item.bgStyle === "dark"      ? { background:"rgba(0,0,0,0.55)",     padding:"4px 12px", borderRadius:8 }
    : item.bgStyle === "blur"      ? { backdropFilter:"blur(12px)", background:"rgba(0,0,0,0.3)", padding:"4px 12px", borderRadius:8 }
    : item.bgStyle === "gradient"  ? { background:"linear-gradient(135deg,rgba(124,58,237,0.75),rgba(168,85,247,0.55))", padding:"4px 12px", borderRadius:8 }
    : item.bgStyle === "highlight" ? { background:"rgba(255,238,0,0.9)", padding:"2px 8px", borderRadius:4 }
    : item.bgStyle === "pill"      ? { background:"rgba(0,0,0,0.65)", padding:"4px 18px", borderRadius:999, border:"1.5px solid rgba(255,255,255,0.3)" }
    : {};

  if (item.isSticker) return <span style={{ fontSize: item.fontSize, lineHeight: 1 }}>{item.text}</span>;

  const hasGradient = item.gradient && item.gradient !== "";

  const textStyle: React.CSSProperties = {
    fontFamily: fontCss,
    fontSize: item.fontSize,
    letterSpacing: item.letterSpacing ?? 0,
    textAlign: item.align ?? "center",
    lineHeight: 1.25,
    whiteSpace: "pre-wrap",
    textShadow: shadowCss !== "none" ? shadowCss
      : item.fontStyle === "shadow" ? "0 2px 8px rgba(0,0,0,0.9)" : undefined,
    ...(hasGradient ? {
      background: item.gradient,
      WebkitBackgroundClip: "text" as React.CSSProperties["WebkitBackgroundClip"],
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    } : { color: item.color }),
    ...fStyleProps,
    ...shakeStyle,
  };

  if (item.animation === "wave") {
    return (
      <div className={animCls} style={bgProps}>
        <WaveText text={item.text} color={hasGradient ? "#fff" : item.color} fontSize={item.fontSize} />
      </div>
    );
  }

  return (
    <div className={animCls} style={{ display:"inline-block", ...bgProps }}>
      <span style={textStyle}>{item.text}</span>
    </div>
  );
}

export default function MediaEditor({ previews, files, initialOverlays = [], initialAudioName = "", onDone, onClose }: Props) {
  const [slide, setSlide]               = useState(0);
  const [items, setItems]               = useState<TextOverlay[]>(initialOverlays);
  const [selectedId, setSelectedId]     = useState<string|null>(null);
  const [panel, setPanel]               = useState<"none"|"text"|"music"|"sticker"|"filter"|"speed"|"soundfx"|"ar"|"voice"|"beauty"|"bg">("none");
  const [bgOverlay, setBgOverlay]       = useState("none");
  const [audioName, setAudioName]       = useState(initialAudioName);
  const [filterName, setFilterName]     = useState("none");
  const [stickerGroup, setStickerGroup] = useState(0);
  const [musicQuery, setMusicQuery]     = useState(initialAudioName);
  const [musicCat, setMusicCat]         = useState(0);
  const [videoSpeed, setVideoSpeed]     = useState(1);
  const [soundFxCat, setSoundFxCat]     = useState(0);
  const [arFilter, setArFilter]         = useState("none");
  const [voiceFx, setVoiceFx]           = useState("normal");
  const [beautyVals, setBeautyVals]     = useState<Record<string,number>>({
    smoothing:0, brightness:0, slim:0, eyes:0, teeth:0, blush:0
  });
  const [stripOffsetY, setStripOffsetY]   = useState(0);
  const stripDragRef = useRef<{ startY: number; startOffset: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  /* ── Internet music search state ── */
  type ApiSong = { name: string; artist: string; title: string; album: string; artwork: string; preview: string };
  const [musicApiResults, setMusicApiResults] = useState<ApiSong[]>([]);
  const [musicApiLoading, setMusicApiLoading] = useState(false);
  const musicDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const API_BASE = "";

  /* ── Audio server upload ── */
  const [audioServerUrl, setAudioServerUrl] = useState("");   // real server URL after upload
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioUploadFailed, setAudioUploadFailed] = useState(false);
  const { uploadFile: uploadAudioFile } = useMediaUpload({
    onSuccess: r => { setAudioServerUrl(r.serveUrl); setAudioUploading(false); setAudioUploadFailed(false); },
    onError: () => { setAudioUploading(false); setAudioUploadFailed(true); },
  });

  /* ── Audio upload + trim state ── */
  const [musicTab, setMusicTab]           = useState<"search"|"upload"|"trim">("search");
  const [audioUploadUrl, setAudioUploadUrl] = useState("");     // blob URL of uploaded file
  const [audioDuration, setAudioDuration]   = useState(0);      // seconds
  const [audioTrimStart, setAudioTrimStart] = useState(0);
  const [audioTrimEnd, setAudioTrimEnd]     = useState(30);
  const [audioPlaying, setAudioPlaying]     = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [isRecording, setIsRecording]       = useState(false);
  const audioPreviewRef   = useRef<HTMLAudioElement|null>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef    = useRef<HTMLInputElement>(null);
  const trimTrackRef      = useRef<HTMLDivElement>(null);
  const trimDragRef       = useRef<{type:"start"|"end";startX:number;startVal:number}|null>(null);
  const mediaRecorderRef  = useRef<MediaRecorder|null>(null);
  const recChunksRef      = useRef<Blob[]>([]);

  /* fake waveform bars — regenerate per song */
  const waveformBars = useMemo(() => Array.from({length:52}, () => Math.random()*0.72+0.15), [audioName]);

  const fmtTime = (s: number) =>
    `${Math.floor(s/60).toString().padStart(2,"0")}:${Math.floor(s%60).toString().padStart(2,"0")}`;

  /* audio element timeupdate → stop at trimEnd */
  useEffect(() => {
    const audio = audioPreviewRef.current;
    if (!audio) return;
    const onTime = () => {
      setAudioCurrentTime(audio.currentTime);
      if (audio.currentTime >= audioTrimEnd) {
        audio.pause(); setAudioPlaying(false);
        audio.currentTime = audioTrimStart;
      }
    };
    const onEnd = () => setAudioPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => { audio.removeEventListener("timeupdate", onTime); audio.removeEventListener("ended", onEnd); };
  }, [audioTrimEnd, audioTrimStart]);

  /* load audio url into preview element and read duration */
  const loadAudioUrl = (url: string, name: string, isBlobUrl = false) => {
    const audio = audioPreviewRef.current;
    if (!audio) return;
    audio.src = url;
    audio.load();
    const onMeta = () => {
      const dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 60;
      setAudioDuration(dur);
      setAudioTrimStart(0);
      setAudioTrimEnd(Math.min(60, dur));
      audio.removeEventListener("loadedmetadata", onMeta);
    };
    audio.addEventListener("loadedmetadata", onMeta);
    setAudioUploadUrl(url);
    setAudioName(name);
    setMusicTab("trim");
    if (!isBlobUrl) setAudioServerUrl("");  // iTunes URL: clear server url, use audioUploadUrl directly
    if (isBlobUrl && audioUploadUrl && audioUploadUrl.startsWith("blob:")) {
      URL.revokeObjectURL(audioUploadUrl);
    }
  };

  /* handle uploaded audio file */
  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    setAudioServerUrl("");
    setAudioUploadFailed(false);
    loadAudioUrl(blobUrl, file.name.replace(/\.[^.]+$/, ""), true);
    setAudioUploading(true);
    uploadAudioFile(new File([file], file.name, { type: file.type }));
    if (e.target) e.target.value = "";
  };

  /* play / pause preview inside trim window */
  const toggleAudioPreview = () => {
    const audio = audioPreviewRef.current;
    if (!audio || !audioUploadUrl) return;
    if (audioPlaying) { audio.pause(); setAudioPlaying(false); }
    else {
      audio.currentTime = audioTrimStart;
      audio.play().then(() => setAudioPlaying(true)).catch(() => {});
    }
  };

  /* trim handle drag */
  const onTrimDown = (e: React.PointerEvent, type: "start"|"end") => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    trimDragRef.current = { type, startX: e.clientX, startVal: type==="start" ? audioTrimStart : audioTrimEnd };
  };
  const onTrimMove = (e: React.PointerEvent) => {
    const trimDrag = trimDragRef.current;
    if (!trimDrag || !trimTrackRef.current) return;
    const rect = trimTrackRef.current.getBoundingClientRect();
    const frac = (e.clientX - trimDrag.startX) / rect.width;
    const delta = frac * (audioDuration || 60);
    if (trimDrag.type === "start") {
      setAudioTrimStart(prev => Math.max(0, Math.min(audioTrimEnd - 1, trimDrag.startVal + delta)));
    } else {
      setAudioTrimEnd(prev => Math.max(audioTrimStart + 1, Math.min(audioDuration || 60, trimDrag.startVal + delta)));
    }
  };
  const onTrimUp = () => { trimDragRef.current = null; };

  /* microphone recording */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(recChunksRef.current, { type:"audio/webm" });
        const url  = URL.createObjectURL(blob);
        loadAudioUrl(url, "Yozib olish " + new Date().toLocaleTimeString("uz-UZ"), true);
        setIsRecording(false);
      };
      mr.start(); mediaRecorderRef.current = mr; setIsRecording(true);
    } catch { alert("Mikrofon ruxsati berilmadi"); }
  };
  const stopRecording = () => { mediaRecorderRef.current?.stop(); };

  const [draftText, setDraftText]             = useState("");
  const [draftColor, setDraftColor]           = useState("#ffffff");
  const [draftAnim, setDraftAnim]             = useState<TextOverlay["animation"]>("none");
  const [draftFStyle, setDraftFStyle]         = useState<TextOverlay["fontStyle"]>("bold");
  const [draftBg, setDraftBg]                 = useState<TextOverlay["bgStyle"]>("none");
  const [draftSize, setDraftSize]             = useState(36);
  const [draftFont, setDraftFont]             = useState("sans");
  const [draftShadow, setDraftShadow]         = useState<TextOverlay["shadowPreset"]>("soft");
  const [draftGradient, setDraftGradient]     = useState("");
  const [draftAlign, setDraftAlign]           = useState<TextOverlay["align"]>("center");
  const [draftLetterSpacing, setDraftLetterSpacing] = useState(0);
  const [draftStrokeW, setDraftStrokeW]       = useState(0);
  const [draftStrokeColor, setDraftStrokeColor] = useState("#000000");
  const [textTab, setTextTab]                 = useState<"write"|"style"|"font"|"color"|"fx">("write");
  const [draftHue, setDraftHue]               = useState(0);
  const [draftLightness, setDraftLightness]   = useState(60);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{id:string;sx:number;sy:number;ox:number;oy:number}|null>(null);

  const isVideo = (url: string) => /\.(mp4|webm|mov|avi)(\?|$)/i.test(url);

  const addText = () => {
    if (!draftText.trim()) return;
    const id = `${Date.now()}`;
    setItems(p => [...p, {
      id, text: draftText.trim(), x: 50, y: 45,
      fontSize: draftSize, color: draftColor,
      animation: draftAnim, fontStyle: draftFStyle, bgStyle: draftBg,
      fontFamily: draftFont, shadowPreset: draftShadow, gradient: draftGradient,
      align: draftAlign, letterSpacing: draftLetterSpacing,
      strokeWidth: draftStrokeW, strokeColor: draftStrokeColor,
    }]);
    setDraftText(""); setPanel("none"); setSelectedId(id);
  };

  /* ── Resize selected text by dragging corner handle ── */
  const resizeRef = useRef<{id:string;startSize:number;startY:number}|null>(null);
  const onResizeDown = (e: React.PointerEvent, id: string, fontSize: number) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizeRef.current = { id, startSize: fontSize, startY: e.clientY };
  };

  const addSticker = (emoji: string) => {
    const id = `sticker_${Date.now()}`;
    setItems(p => [...p, { id, text: emoji, x: 30 + Math.random() * 40, y: 30 + Math.random() * 40, fontSize: 52, color:"#fff", animation:"none", fontStyle:"regular", bgStyle:"none", isSticker: true, fontFamily:"sans", shadowPreset:"none", gradient:"", align:"center", letterSpacing:0, strokeWidth:0, strokeColor:"#000" }]);
    setSelectedId(id);
  };

  const removeSelected = () => { setItems(p => p.filter(i => i.id !== selectedId)); setSelectedId(null); };

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const item = items.find(i => i.id === id)!;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { id, sx:e.clientX, sy:e.clientY, ox:item.x, oy:item.y };
    setSelectedId(id);
  };
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    /* resize takes priority — capture ref before async setter */
    const resize = resizeRef.current;
    if (resize) {
      const dy = resize.startY - e.clientY;
      const newSize = Math.max(12, Math.min(110, resize.startSize + dy * 0.55));
      setItems(p => p.map(i => i.id === resize.id ? { ...i, fontSize: newSize } : i));
      return;
    }
    const drag = dragRef.current;
    if (!drag || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - drag.sx) / r.width) * 100;
    const dy = ((e.clientY - drag.sy) / r.height) * 100;
    setItems(p => p.map(i => i.id === drag.id
      ? { ...i, x: Math.max(4, Math.min(96, drag.ox + dx)), y: Math.max(4, Math.min(96, drag.oy + dy)) }
      : i));
  }, []);
  const onPointerUp = () => { dragRef.current = null; resizeRef.current = null; };

  const selected = items.find(i => i.id === selectedId);
  const activeFilter = FILTERS.find(f => f.id === filterName) ?? FILTERS[0];
  const activeAr     = AR_FILTERS.find(f => f.id === arFilter) ?? AR_FILTERS[0];

  /* Combine regular filter + AR filter + beauty sliders into one CSS filter string */
  const combinedCss = (() => {
    const parts: string[] = [];
    if (activeFilter.css !== "none") parts.push(activeFilter.css);
    if (activeAr.css     !== "none") parts.push(activeAr.css);
    /* Beauty: smoothing → blur, brightness → brightness, blush → saturate */
    const sm = beautyVals.smoothing ?? 0;
    const br = beautyVals.brightness ?? 0;
    const bl = beautyVals.blush ?? 0;
    if (sm > 0) parts.push(`blur(${(sm / 100) * 1.8}px)`);
    if (br > 0) parts.push(`brightness(${1 + (br / 100) * 0.45})`);
    if (bl > 0) parts.push(`saturate(${1 + (bl / 100) * 0.6}) hue-rotate(${-(bl / 100) * 8}deg)`);
    return parts.length ? parts.join(" ") : "none";
  })();

  const allSongs = useMemo(() => SONGS_BY_COUNTRY.flatMap(c => c.songs), []);
  const musicSuggestions = useMemo(() => {
    const q = musicQuery.trim().toLowerCase();
    const pool = q ? allSongs : SONGS_BY_COUNTRY[musicCat].songs;
    return q
      ? allSongs.filter(s => s.toLowerCase().includes(q)).slice(0, 12)
      : pool.slice(0, 14);
  }, [musicQuery, musicCat, allSongs]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = videoSpeed;
  }, [videoSpeed]);

  /* ── iTunes internet search (debounced 450ms) ── */
  useEffect(() => {
    const q = musicQuery.trim();
    if (musicDebounceRef.current) clearTimeout(musicDebounceRef.current);
    if (q.length < 2) { setMusicApiResults([]); setMusicApiLoading(false); return; }
    setMusicApiLoading(true);
    musicDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/music/search?q=${encodeURIComponent(q)}`);
        const data = await res.json() as { results?: ApiSong[] };
        setMusicApiResults(data.results ?? []);
      } catch { setMusicApiResults([]); }
      finally { setMusicApiLoading(false); }
    }, 450);
    return () => { if (musicDebounceRef.current) clearTimeout(musicDebounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicQuery]);

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 flex flex-col"
      style={{ zIndex:99999, background:"#000", touchAction:"none" }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={() => { setSelectedId(null); setPanel("none"); }}
    >
      {/* ── Preview area ── */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        {/* Media with filter */}
        {isVideo(previews[slide]) ? (
          <video ref={videoRef} src={previews[slide]} className="w-full h-full object-cover" muted loop playsInline autoPlay
            style={{ filter: combinedCss !== "none" ? combinedCss : undefined, transition:"filter 0.25s ease" }} />
        ) : (
          <img loading="lazy" decoding="async" src={previews[slide]} alt="" className="w-full h-full object-cover"
            style={{ filter: combinedCss !== "none" ? combinedCss : undefined, transition:"filter 0.25s ease" }} />
        )}

        {/* Background gradient overlay */}
        {bgOverlay !== "none" && (
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: bgOverlay, opacity: 0.72, zIndex: 1 }} />
        )}

        {/* Text/Sticker overlays */}
        {items.map(item => {
          const isSel = selectedId === item.id;
          return (
            <div
              key={item.id}
              onPointerDown={e => onPointerDown(e, item.id)}
              style={{
                position:"absolute",
                left:`${item.x}%`, top:`${item.y}%`,
                transform:"translate(-50%,-50%)",
                cursor: isSel ? "move" : "grab",
                userSelect:"none", touchAction:"none",
              }}
              onClick={e => { e.stopPropagation(); setSelectedId(item.id); }}
            >
              <OverlayText item={item} />

              {/* Selection handles (only when selected) */}
              {isSel && (
                <>
                  {/* Dashed selection border */}
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ border:"1.5px dashed rgba(255,255,255,0.85)", borderRadius:6, margin:-6 }} />

                  {/* − / + size buttons above */}
                  <div className="absolute flex gap-1.5"
                    style={{ left:"50%", transform:"translateX(-50%)", top:-34, pointerEvents:"auto" }}>
                    <button
                      onClick={e => { e.stopPropagation(); setItems(p => p.map(i => i.id === item.id ? {...i, fontSize: Math.max(12, Math.round(i.fontSize) - 4)} : i)); }}
                      className="w-7 h-7 rounded-full text-white text-sm font-black flex items-center justify-center"
                      style={{ background:"rgba(0,0,0,0.75)", border:"1.5px solid rgba(255,255,255,0.5)" }}>−</button>
                    <div className="px-2 h-7 rounded-full flex items-center text-[10px] font-bold text-white/70"
                      style={{ background:"rgba(0,0,0,0.6)", border:"1px solid rgba(255,255,255,0.25)" }}>
                      {Math.round(item.fontSize)}px
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setItems(p => p.map(i => i.id === item.id ? {...i, fontSize: Math.min(110, Math.round(i.fontSize) + 4)} : i)); }}
                      className="w-7 h-7 rounded-full text-white text-sm font-black flex items-center justify-center"
                      style={{ background:"rgba(0,0,0,0.75)", border:"1.5px solid rgba(255,255,255,0.5)" }}>+</button>
                  </div>

                  {/* Drag-resize handle at bottom-right corner */}
                  {!item.isSticker && (
                    <div
                      onPointerDown={e => onResizeDown(e, item.id, item.fontSize)}
                      className="absolute flex items-center justify-center"
                      style={{
                        right:-14, bottom:-14, width:22, height:22,
                        background:"rgba(124,58,237,0.95)", borderRadius:"50%",
                        border:"2px solid white", cursor:"se-resize", touchAction:"none",
                        fontSize:11, color:"white", fontWeight:"bold", userSelect:"none",
                        boxShadow:"0 2px 8px rgba(0,0,0,0.5)",
                      }}>
                      ⤡
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* Slide nav dots */}
        {previews.length > 1 && (
          <>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {previews.map((_, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); setSlide(i); }}
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{ background: i===slide ? "#fff" : "rgba(255,255,255,0.4)" }} />
              ))}
            </div>
            {slide > 0 && (
              <button onClick={e => { e.stopPropagation(); setSlide(s=>s-1); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background:"rgba(0,0,0,0.4)" }}>
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
            )}
            {slide < previews.length-1 && (
              <button onClick={e => { e.stopPropagation(); setSlide(s=>s+1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background:"rgba(0,0,0,0.4)" }}>
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            )}
          </>
        )}

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 grid grid-cols-3 items-center px-4 pt-10 pb-3"
          style={{ background:"linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)" }}>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center justify-self-start"
            style={{ background:"rgba(0,0,0,0.4)" }}>
            <X className="w-5 h-5 text-white" />
          </button>
          <div />
          <button
            onClick={() => {
              const resolvedAudioUrl = audioServerUrl
                || (audioUploadUrl && !audioUploadUrl.startsWith("blob:") ? audioUploadUrl : undefined);
              onDone(items, audioName, filterName, resolvedAudioUrl,
                audioName ? audioTrimStart : undefined,
                audioName ? audioTrimEnd   : undefined);
            }}
            disabled={audioUploading}
            className="justify-self-end px-3.5 py-1 rounded-full text-xs font-bold text-white"
            style={{
              background: audioUploadFailed ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.10)",
              backdropFilter: "blur(14px) saturate(1.6)",
              WebkitBackdropFilter: "blur(14px) saturate(1.6)",
              border: audioUploadFailed ? "1px solid rgba(239,68,68,0.55)" : "1px solid rgba(255,255,255,0.25)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
              opacity: audioUploading ? 0.6 : 1,
            }}>
            {audioUploading ? "Yuklanmoqda…" : audioUploadFailed ? "⚠ Retry" : "Tayyor"}
          </button>
        </div>

        {/* Right tool strip — scrollable so all 9+ buttons fit on any screen; drag handle lets it slide up/down */}
        <div className="absolute right-2 top-2 bottom-2 flex flex-col items-center gap-1.5 overflow-y-auto py-1"
          style={{
            scrollbarWidth:"none",
            maxHeight:"calc(100% - 16px)",
            transform: `translateY(${stripOffsetY}px)`,
            transition: stripDragRef.current ? "none" : "transform 0.2s ease",
          }}>
          <div
            className="w-8 h-6 rounded-full flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
            style={{ background:"rgba(0,0,0,0.45)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.15)", marginBottom: 2 }}
            onPointerDown={e => {
              e.stopPropagation();
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              stripDragRef.current = { startY: e.clientY, startOffset: stripOffsetY };
            }}
            onPointerMove={e => {
              if (!stripDragRef.current) return;
              e.stopPropagation();
              const delta = e.clientY - stripDragRef.current.startY;
              const next = stripDragRef.current.startOffset + delta;
              const clamped = Math.max(-160, Math.min(160, next));
              setStripOffsetY(clamped);
            }}
            onPointerUp={e => { e.stopPropagation(); stripDragRef.current = null; }}
            onPointerCancel={() => { stripDragRef.current = null; }}>
            <GripVertical style={{ width:14, height:14, color:"rgba(255,255,255,0.7)" }} />
          </div>
          {[
            { id:"text",    Icon:Type,     label:"Matn"   },
            { id:"sticker", Icon:Smile,    label:"Stiker" },
            { id:"bg",      Icon:Palette,  label:"Fon"    },
            { id:"filter",  Icon:Sparkles, label:"Filtr"  },
            { id:"ar",      Icon:Wand2,    label:"AR"     },
            { id:"music",   Icon:Music,    label:"Musiqa" },
            { id:"speed",   Icon:Zap,      label:"Tezlik" },
            { id:"soundfx", Icon:Volume2,  label:"FX"     },
            { id:"voice",   Icon:Mic,      label:"Ovoz"   },
            { id:"beauty",  Icon:Scissors, label:"Beauty" },
          ].map(({ id, Icon, label }) => (
            <button key={id} onClick={e => { e.stopPropagation(); setPanel(p => p===id ? "none" : id as any); setSelectedId(null); }}
              className="w-10 h-10 rounded-2xl flex flex-col items-center justify-center gap-0.5 flex-shrink-0"
              style={{
                background: panel===id
                  ? id==="bg" ? "rgba(16,185,129,0.9)" : "rgba(124,58,237,0.9)"
                  : id==="bg" && bgOverlay!=="none" ? "rgba(16,185,129,0.4)" : "rgba(0,0,0,0.55)",
                backdropFilter:"blur(10px)",
                border: panel===id
                  ? id==="bg" ? "1.5px solid rgba(52,211,153,0.7)" : "1.5px solid rgba(168,85,247,0.7)"
                  : id==="bg" && bgOverlay!=="none" ? "1.5px solid rgba(52,211,153,0.5)" : "1px solid rgba(255,255,255,0.18)",
              }}>
              <Icon style={{ width:15, height:15, color:"#fff" }} />
              <span className="text-[8px] text-white/85 font-bold leading-none">{label}</span>
            </button>
          ))}

          {/* Camera capture button (action, not panel) */}
          <button
            onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}
            className="w-10 h-10 rounded-2xl flex flex-col items-center justify-center gap-0.5 flex-shrink-0"
            style={{ background:"rgba(0,0,0,0.55)", backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,0.18)" }}>
            <Camera style={{ width:15, height:15, color:"#fff" }} />
            <span className="text-[8px] text-white/85 font-bold leading-none">Kamera</span>
          </button>
          <input ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (!f) return;
              const url = URL.createObjectURL(f);
              const newItem: TextOverlay = {
                id: Date.now().toString(),
                text: `📷`, x: 50, y: 50,
                fontSize: 48, color: "#ffffff",
                animation: "none", fontStyle: "regular",
                fontFamily: "system", bgStyle: "none",
                align: "center", shadowPreset: "none",
                gradient: "", letterSpacing: 0,
                strokeWidth: 0, strokeColor: "#000",
                isSticker: true,
              };
              void url;
              setItems(prev => [...prev, newItem]);
              e.target.value = "";
            }}
          />

          {/* Selected item delete */}
          {selected && (
            <motion.button initial={{scale:0}} animate={{scale:1}}
              onClick={e => { e.stopPropagation(); removeSelected(); }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background:"rgba(239,68,68,0.75)", backdropFilter:"blur(10px)" }}>
              <Trash2 style={{ width:15, height:15, color:"#fff" }} />
            </motion.button>
          )}
        </div>

        {/* Active effects badges */}
        <div className="absolute bottom-8 left-3 flex flex-col gap-1 pointer-events-none">
          {filterName !== "none" && (
            <div className="px-2.5 py-1 rounded-full text-xs font-bold self-start"
              style={{ background:"rgba(124,58,237,0.8)", color:"#fff", backdropFilter:"blur(8px)" }}>
              ✦ {activeFilter.label}
            </div>
          )}
          {arFilter !== "none" && (
            <div className="px-2.5 py-1 rounded-full text-xs font-bold self-start"
              style={{ background:"rgba(16,185,129,0.8)", color:"#fff", backdropFilter:"blur(8px)" }}>
              🎭 {activeAr.label}
            </div>
          )}
          {Object.values(beautyVals).some(v => v > 0) && (
            <div className="px-2.5 py-1 rounded-full text-xs font-bold self-start"
              style={{ background:"rgba(236,72,153,0.8)", color:"#fff", backdropFilter:"blur(8px)" }}>
              ✨ Beauty faol
            </div>
          )}
          {voiceFx !== "normal" && (
            <div className="px-2.5 py-1 rounded-full text-xs font-bold self-start"
              style={{ background:"rgba(99,102,241,0.8)", color:"#fff", backdropFilter:"blur(8px)" }}>
              🎤 {VOICE_FX.find(v=>v.id===voiceFx)?.label}
            </div>
          )}
        </div>
      </div>

      {/* ── Text panel (STUDIO — revolutionary) ── */}
      <AnimatePresence>
        {panel === "text" && (() => {
          const previewItem: TextOverlay = {
            id:"__preview__", text: draftText || "GILOS Studio", x:50, y:50,
            fontSize: Math.min(draftSize, 36), color: draftColor, animation:"none",
            fontStyle: draftFStyle, bgStyle: draftBg, fontFamily: draftFont,
            shadowPreset: draftShadow, gradient: draftGradient, align: draftAlign,
            letterSpacing: draftLetterSpacing, strokeWidth: draftStrokeW, strokeColor: draftStrokeColor,
          };
          const applyPreset = (p: StylePreset) => {
            setDraftColor(p.color); setDraftGradient(p.gradient);
            setDraftFont(p.fontFamily); setDraftBg(p.bgStyle);
            setDraftShadow(p.shadowPreset); setDraftStrokeW(p.strokeWidth);
            setDraftStrokeColor(p.strokeColor); setDraftAnim(p.animation);
            setDraftLetterSpacing(p.letterSpacing); setDraftSize(p.fontSize);
            setDraftFStyle(p.fontStyle);
          };
          const TABS = [
            { id:"write" as const,  icon:"✏️", tip:"Yoz"  },
            { id:"style" as const,  icon:"🎨", tip:"Stil" },
            { id:"font"  as const,  icon:"🔤", tip:"Font" },
            { id:"color" as const,  icon:"🌈", tip:"Rang" },
            { id:"fx"    as const,  icon:"✨", tip:"FX"   },
          ];
          return (
          <motion.div
            initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
            transition={{ type:"spring", stiffness:400, damping:34 }}
            className="flex-shrink-0"
            style={{
              background:"linear-gradient(180deg,rgba(14,4,32,0.99) 0%,rgba(6,4,18,0.99) 100%)",
              borderTop:"2px solid transparent",
              backgroundClip:"padding-box",
              boxShadow:"0 -1px 0 rgba(124,58,237,0.5), inset 0 1px 0 rgba(168,85,247,0.12)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* ── Glowing icon tab bar ── */}
            <div className="flex items-center gap-1 px-3 pt-2.5 pb-0">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTextTab(t.id)}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-all"
                  style={{
                    background: textTab===t.id
                      ? "radial-gradient(ellipse at 50% 0%,rgba(124,58,237,0.4) 0%,rgba(124,58,237,0.08) 100%)"
                      : "transparent",
                    boxShadow: textTab===t.id ? "0 0 12px rgba(124,58,237,0.3)" : "none",
                  }}>
                  <span className="text-lg leading-none"
                    style={{ filter: textTab===t.id ? "drop-shadow(0 0 6px #a855f7)" : "none" }}>
                    {t.icon}
                  </span>
                  <span className="text-[8px] font-black tracking-wider"
                    style={{ color: textTab===t.id ? "#c4b5fd" : "rgba(255,255,255,0.3)" }}>
                    {t.tip}
                  </span>
                </button>
              ))}
              {/* Done button */}
              <button onClick={addText}
                className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ml-1 transition-all"
                style={{
                  background: draftText.trim()
                    ? "linear-gradient(135deg,#7c3aed,#a855f7)"
                    : "rgba(255,255,255,0.07)",
                  boxShadow: draftText.trim() ? "0 0 16px rgba(124,58,237,0.5)" : "none",
                  border: draftText.trim() ? "1.5px solid rgba(168,85,247,0.6)" : "1px solid rgba(255,255,255,0.1)",
                }}>
                <Check className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* ── Live preview banner ── */}
            <div className="mx-3 mt-2 mb-1.5 flex items-center justify-center rounded-2xl overflow-hidden"
              style={{
                minHeight:48,
                background:"radial-gradient(ellipse at 50% 50%,rgba(124,58,237,0.12) 0%,rgba(0,0,0,0.4) 100%)",
                border:"1px solid rgba(124,58,237,0.2)",
              }}>
              <OverlayText item={previewItem} />
            </div>

            {/* ── Tab content (scrollable) ── */}
            <div className="overflow-y-auto pb-6" style={{ maxHeight:"46vh", scrollbarWidth:"none" }}>

              {/* ════ WRITE TAB ════ */}
              {textTab === "write" && (
                <div className="px-3 space-y-2.5 pt-1">

                  {/* ── Character Studio — animated letter tiles ── */}
                  {(() => {
                    const fontCss = FONT_FAMILIES.find(f=>f.id===draftFont)?.css ?? "system-ui,sans-serif";
                    const tileSize = Math.min(Math.max(draftSize * 0.52, 18), 38);
                    const chars = draftText.split("");
                    return (
                      <div>
                        {/* Tile display zone */}
                        <div
                          className="relative min-h-[72px] flex flex-wrap gap-1 items-center justify-center p-3 rounded-2xl cursor-text overflow-hidden"
                          style={{
                            background:"radial-gradient(ellipse at 50% 50%,rgba(124,58,237,0.1) 0%,rgba(0,0,0,0.35) 100%)",
                            border:"1.5px solid rgba(124,58,237,0.3)",
                            animation:"bg-panel-glow 3s ease-in-out infinite",
                          }}
                          onClick={() => document.getElementById("char-studio-textarea")?.focus()}
                        >
                          {chars.length === 0 && (
                            <div className="flex flex-col items-center gap-1 pointer-events-none select-none">
                              <span className="text-xl">✏️</span>
                              <span className="text-[11px] text-white/25">Pastdagi maydondan yozishni boshlang</span>
                            </div>
                          )}
                          {chars.map((ch, i) => (
                            ch === " "
                              ? <span key={`${i}-space`} className="char-tile-space" style={{ animationDelay:`${Math.min(i*0.035, 0.5)}s` }} />
                              : <span
                                  key={`${i}-${ch}`}
                                  className="char-tile"
                                  style={{
                                    fontFamily: fontCss,
                                    fontSize: tileSize,
                                    fontWeight: draftFStyle==="bold" ? 900 : 600,
                                    fontStyle: draftFStyle==="italic" ? "italic" : "normal",
                                    ...(draftGradient
                                      ? { background:draftGradient, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }
                                      : { color: draftColor }),
                                    WebkitTextStroke: draftFStyle==="outline" ? `1.5px rgba(0,0,0,0.7)` : undefined,
                                    textShadow: draftFStyle==="shadow" ? "0 2px 6px rgba(0,0,0,0.8)" : undefined,
                                    animationDelay: `${Math.min(i*0.035, 0.5)}s`,
                                  }}>
                                  {ch}
                                </span>
                          ))}
                          {chars.length > 0 && <span className="char-cursor-blink" />}

                          {/* Char count badge */}
                          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-lg"
                            style={{ background:"rgba(124,58,237,0.35)", border:"1px solid rgba(168,85,247,0.4)" }}>
                            <span className="text-[8px] font-bold text-purple-300">{chars.length}</span>
                          </div>
                        </div>

                        {/* Quick action row */}
                        <div className="flex gap-1.5 mt-1.5">
                          {["😊","🔥","💜","✨","👑","🎵","💫","🎉"].map(em => (
                            <button key={em}
                              onClick={() => setDraftText(t => t + em)}
                              className="flex-1 text-center text-lg rounded-xl py-1 flex-shrink-0 transition-all active:scale-90"
                              style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.08)" }}>
                              {em}
                            </button>
                          ))}
                        </div>

                        {/* Actual textarea input */}
                        <textarea
                          id="char-studio-textarea"
                          autoFocus
                          rows={2}
                          value={draftText}
                          onChange={e => setDraftText(e.target.value)}
                          placeholder="⌨️ Bu yerga yozing — har harf alohida chiqib keladi..."
                          className="w-full rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none resize-none mt-1"
                          style={{
                            background:"rgba(255,255,255,0.05)",
                            border:"1.5px solid rgba(124,58,237,0.3)",
                            fontFamily: fontCss,
                            transition:"border-color 0.2s, box-shadow 0.2s",
                          }}
                          onFocus={e => {
                            e.currentTarget.style.borderColor = "rgba(168,85,247,0.7)";
                            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.18)";
                          }}
                          onBlur={e => {
                            e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        />

                        {/* Clear button */}
                        {draftText.length > 0 && (
                          <button onClick={() => setDraftText("")}
                            className="w-full text-center text-[10px] font-bold py-1 rounded-xl transition-all"
                            style={{ color:"rgba(248,113,113,0.7)", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)" }}>
                            🗑 Tozalash
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* Size control: big A ────slider──── big A */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white/30 flex-shrink-0" style={{ fontSize:11 }}>A</span>
                    <div className="relative flex-1 h-3 rounded-full cursor-pointer"
                      style={{ background:"rgba(255,255,255,0.08)" }}>
                      <div className="absolute left-0 top-0 h-full rounded-full"
                        style={{ width:`${((draftSize-12)/(110-12))*100}%`, background:"linear-gradient(90deg,#4c1d95,#7c3aed,#c4b5fd)" }} />
                      <input type="range" min={12} max={110} step={2} value={draftSize}
                        onChange={e => setDraftSize(Number(e.target.value))}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
                      {/* thumb indicator */}
                      <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full pointer-events-none"
                        style={{ left:`calc(${((draftSize-12)/(110-12))*100}% - 8px)`,
                          background:"white", boxShadow:"0 0 8px rgba(124,58,237,0.8)" }} />
                    </div>
                    <span className="text-lg font-black text-white/30 flex-shrink-0">A</span>
                    <span className="text-xs font-black text-purple-400 w-9 text-right flex-shrink-0">{draftSize}px</span>
                  </div>

                  {/* Quick 8 colors + align */}
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5 flex-1 overflow-x-auto" style={{ scrollbarWidth:"none" }}>
                      {["#ffffff","#000000","#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#a855f7","#ec4899","#06b6d4"].map(c => (
                        <button key={c} onClick={() => { setDraftColor(c); setDraftGradient(""); setDraftHue(0); }}
                          className="w-7 h-7 rounded-full flex-shrink-0 transition-all"
                          style={{
                            background: c,
                            outline: c===draftColor && !draftGradient ? "2.5px solid rgba(255,255,255,0.9)" : "none",
                            outlineOffset: 2,
                            transform: c===draftColor && !draftGradient ? "scale(1.25)" : "scale(1)",
                            boxShadow: c==="#000000" ? "inset 0 0 0 1.5px rgba(255,255,255,0.3)" : "none",
                          }} />
                      ))}
                    </div>
                    {/* Align icons */}
                    <div className="flex gap-1 flex-shrink-0 pl-1" style={{ borderLeft:"1px solid rgba(255,255,255,0.1)" }}>
                      {([["left","⬅"],["center","☰"],["right","➡"]] as const).map(([a,ico]) => (
                        <button key={a} onClick={() => setDraftAlign(a)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
                          style={{ background: draftAlign===a ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.07)",
                            color: draftAlign===a ? "#c4b5fd" : "rgba(255,255,255,0.4)" }}>
                          {ico}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font style pills */}
                  <div className="flex gap-1.5">
                    {FSTYLES.map(st => (
                      <button key={st.id} onClick={() => setDraftFStyle(st.id)}
                        className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all"
                        style={{
                          background: draftFStyle===st.id ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.05)",
                          color: draftFStyle===st.id ? "white" : "rgba(255,255,255,0.4)",
                          border: draftFStyle===st.id ? "1px solid rgba(168,85,247,0.6)" : "1px solid rgba(255,255,255,0.06)",
                        }}>
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ════ STYLE PRESETS TAB ════ */}
              {textTab === "style" && (
                <div className="px-3 pt-1 space-y-2">
                  {/* Random button */}
                  <button onClick={() => applyPreset(STYLE_PRESETS[Math.floor(Math.random()*STYLE_PRESETS.length)])}
                    className="w-full py-2.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2"
                    style={{ background:"linear-gradient(90deg,#7c3aed,#a855f7,#7c3aed)", backgroundSize:"200%", animation:"gradientShift 3s ease infinite" }}>
                    🎲 Tasodifiy Stil
                  </button>

                  {/* 2-column preset grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {STYLE_PRESETS.map(p => {
                      const sampleItem: TextOverlay = {
                        id:"__sample__", text: draftText || "Salom", x:50, y:50,
                        fontSize:22, color:p.color, animation:"none",
                        fontStyle:p.fontStyle, bgStyle:"none", fontFamily:p.fontFamily,
                        shadowPreset:p.shadowPreset, gradient:p.gradient, align:"center",
                        letterSpacing:p.letterSpacing, strokeWidth:p.strokeWidth, strokeColor:p.strokeColor,
                      };
                      return (
                        <button key={p.id} onClick={() => applyPreset(p)}
                          className="relative overflow-hidden rounded-2xl px-3 py-3 text-left transition-all"
                          style={{
                            background: p.cardGrad,
                            border: "1.5px solid rgba(255,255,255,0.1)",
                            transform: "scale(1)",
                            transition: "transform 0.15s, box-shadow 0.15s",
                          }}
                          onPointerDown={e => (e.currentTarget.style.transform="scale(0.95)")}
                          onPointerUp={e => (e.currentTarget.style.transform="scale(1)")}
                          onPointerLeave={e => (e.currentTarget.style.transform="scale(1)")}
                        >
                          {/* Sample text preview */}
                          <div className="flex items-center justify-center mb-2" style={{ minHeight:32 }}>
                            <OverlayText item={sampleItem} />
                          </div>
                          {/* Label */}
                          <p className="text-[10px] font-black text-white/80 text-center"
                            style={{ textShadow:"0 1px 4px rgba(0,0,0,0.8)" }}>
                            {p.label}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ════ FONT TAB ════ */}
              {textTab === "font" && (
                <div className="px-3 pt-1 space-y-3">
                  {/* Horizontal film strip */}
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth:"none" }}>
                    {FONT_FAMILIES.map(f => (
                      <button key={f.id} onClick={() => setDraftFont(f.id)}
                        className="flex-shrink-0 flex flex-col items-center justify-center rounded-2xl transition-all"
                        style={{
                          width:100, height:72, padding:"8px 10px",
                          background: draftFont===f.id
                            ? "radial-gradient(ellipse at 50% 0%,rgba(124,58,237,0.5),rgba(30,10,50,0.9))"
                            : "rgba(255,255,255,0.05)",
                          border: draftFont===f.id ? "2px solid rgba(124,58,237,0.9)" : "1.5px solid rgba(255,255,255,0.08)",
                          transform: draftFont===f.id ? "scale(1.04)" : "scale(1)",
                          boxShadow: draftFont===f.id ? "0 0 14px rgba(124,58,237,0.4)" : "none",
                        }}>
                        <span className="text-xl text-white mb-1" style={{ fontFamily:f.css, lineHeight:1 }}>Aa</span>
                        <span className="text-[9px] font-bold"
                          style={{ color: draftFont===f.id ? "#c4b5fd" : "rgba(255,255,255,0.4)" }}>
                          {f.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Font style */}
                  <div>
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[3px] mb-1.5">Qalinlik / Uslub</p>
                    <div className="flex gap-1.5">
                      {FSTYLES.map(st => (
                        <button key={st.id} onClick={() => setDraftFStyle(st.id)}
                          className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all"
                          style={{ background: draftFStyle===st.id ? "rgba(124,58,237,0.55)" : "rgba(255,255,255,0.05)",
                            color: draftFStyle===st.id ? "white" : "rgba(255,255,255,0.4)",
                            border: draftFStyle===st.id ? "1px solid rgba(168,85,247,0.6)" : "1px solid rgba(255,255,255,0.06)" }}>
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Letter spacing */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-[3px]">Harf oralig'i</p>
                      <span className="text-[11px] font-black text-purple-400">{draftLetterSpacing}px</span>
                    </div>
                    <div className="relative h-3 rounded-full" style={{ background:"rgba(255,255,255,0.08)" }}>
                      <div className="absolute left-0 top-0 h-full rounded-full"
                        style={{ width:`${(draftLetterSpacing/10)*100}%`, background:"linear-gradient(90deg,#7c3aed,#c4b5fd)" }} />
                      <input type="range" min={0} max={10} step={0.5} value={draftLetterSpacing}
                        onChange={e => setDraftLetterSpacing(Number(e.target.value))}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
                      <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full pointer-events-none"
                        style={{ left:`calc(${(draftLetterSpacing/10)*100}% - 8px)`, background:"white", boxShadow:"0 0 8px rgba(124,58,237,0.7)" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* ════ COLOR TAB ════ */}
              {textTab === "color" && (
                <div className="px-3 pt-1 space-y-3">
                  {/* ── Spectrum hue bar ── */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-[3px]">Rang spektri</p>
                      <div className="w-6 h-6 rounded-full border-2 border-white/40"
                        style={{ background:`hsl(${draftHue},100%,${draftLightness}%)`, boxShadow:`0 0 8px hsl(${draftHue},100%,${draftLightness}%)` }} />
                    </div>
                    {/* Hue track */}
                    <div className="relative h-5 rounded-full overflow-hidden mb-2"
                      style={{ background:"linear-gradient(90deg,#ff0000,#ff7700,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)" }}>
                      <input type="range" min={0} max={360} value={draftHue}
                        onChange={e => { const h=Number(e.target.value); setDraftHue(h); setDraftColor(`hsl(${h},100%,${draftLightness}%)`); setDraftGradient(""); }}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
                      <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white pointer-events-none"
                        style={{ left:`calc(${(draftHue/360)*100}% - 10px)`, background:`hsl(${draftHue},100%,${draftLightness}%)`, boxShadow:"0 2px 8px rgba(0,0,0,0.5)" }} />
                    </div>
                    {/* Lightness track */}
                    <div className="relative h-4 rounded-full"
                      style={{ background:`linear-gradient(90deg,hsl(${draftHue},100%,20%),hsl(${draftHue},100%,55%),hsl(${draftHue},100%,90%))` }}>
                      <input type="range" min={30} max={85} value={draftLightness}
                        onChange={e => { const l=Number(e.target.value); setDraftLightness(l); setDraftColor(`hsl(${draftHue},100%,${l}%)`); setDraftGradient(""); }}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
                      <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white pointer-events-none"
                        style={{ left:`calc(${((draftLightness-30)/55)*100}% - 8px)`, background:`hsl(${draftHue},100%,${draftLightness}%)`, boxShadow:"0 2px 6px rgba(0,0,0,0.5)" }} />
                    </div>
                  </div>

                  {/* Quick solid colors */}
                  <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth:"none" }}>
                    {["#ffffff","#000000","#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#a855f7","#ec4899","#06b6d4","#f59e0b","#6366f1"].map(c => (
                      <button key={c} onClick={() => { setDraftColor(c); setDraftGradient(""); setDraftHue(0); }}
                        className="w-8 h-8 rounded-full flex-shrink-0 transition-all"
                        style={{ background:c,
                          outline: c===draftColor && !draftGradient ? "2.5px solid white" : "none",
                          outlineOffset:2, transform: c===draftColor && !draftGradient ? "scale(1.2)" : "scale(1)",
                          boxShadow: c==="#000000" ? "inset 0 0 0 1.5px rgba(255,255,255,0.35)" : "none" }} />
                    ))}
                  </div>

                  {/* Gradient text presets */}
                  <div>
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[3px] mb-1.5">Gradient matn</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {GRADIENT_PRESETS.map(g => (
                        <button key={g.id} onClick={() => setDraftGradient(g.id==="none" ? "" : g.css)}
                          className="py-2.5 rounded-xl text-[10px] font-black transition-all"
                          style={{
                            background: g.css || "rgba(255,255,255,0.07)",
                            border: draftGradient===g.css ? "2px solid white" : "1.5px solid rgba(255,255,255,0.1)",
                            color: g.id==="none" ? "rgba(255,255,255,0.4)" : "white",
                            textShadow: g.id!=="none" ? "0 1px 4px rgba(0,0,0,0.8)" : "none",
                          }}>
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background style */}
                  <div>
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[3px] mb-1.5">Matn foni</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["none","dark","blur","gradient","highlight","pill"] as TextOverlay["bgStyle"][]).map(b => (
                        <button key={b} onClick={() => setDraftBg(b)}
                          className="py-2 rounded-xl text-[10px] font-bold transition-all"
                          style={{
                            background: draftBg===b ? "rgba(6,182,212,0.3)" : "rgba(255,255,255,0.05)",
                            color: draftBg===b ? "#67e8f9" : "rgba(255,255,255,0.4)",
                            border: draftBg===b ? "1px solid rgba(6,182,212,0.55)" : "1px solid rgba(255,255,255,0.06)",
                          }}>
                          {b==="none"?"Yo'q":b==="dark"?"Qora":b==="blur"?"Blur":b==="gradient"?"Grad":b==="highlight"?"Sariq":"Pill"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ════ FX TAB (shadow + stroke + animation) ════ */}
              {textTab === "fx" && (
                <div className="px-3 pt-1 space-y-3">
                  {/* Shadow grid */}
                  <div>
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[3px] mb-1.5">Soya / Glow</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {TEXT_SHADOWS.map(sh => (
                        <button key={sh.id} onClick={() => setDraftShadow(sh.id as TextOverlay["shadowPreset"])}
                          className="py-3 rounded-xl transition-all flex flex-col items-center gap-1"
                          style={{
                            background: draftShadow===sh.id ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.05)",
                            border: draftShadow===sh.id ? "1.5px solid rgba(124,58,237,0.8)" : "1.5px solid rgba(255,255,255,0.07)",
                          }}>
                          <span className="text-sm font-black text-white"
                            style={{ textShadow: sh.css !== "none" ? sh.css : "none" }}>
                            A
                          </span>
                          <span className="text-[9px] font-bold"
                            style={{ color: draftShadow===sh.id ? "#c4b5fd" : "rgba(255,255,255,0.35)" }}>
                            {sh.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stroke */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-[3px]">Chegara (Stroke)</p>
                      <span className="text-[11px] font-black text-amber-400">{draftStrokeW}px</span>
                    </div>
                    <div className="relative h-3 rounded-full" style={{ background:"rgba(255,255,255,0.08)" }}>
                      <div className="absolute left-0 top-0 h-full rounded-full"
                        style={{ width:`${(draftStrokeW/5)*100}%`, background:"linear-gradient(90deg,#f59e0b,#ef4444)" }} />
                      <input type="range" min={0} max={5} step={0.5} value={draftStrokeW}
                        onChange={e => setDraftStrokeW(Number(e.target.value))}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
                      <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full pointer-events-none"
                        style={{ left:`calc(${(draftStrokeW/5)*100}% - 8px)`, background:"white", boxShadow:"0 0 8px rgba(245,158,11,0.7)" }} />
                    </div>
                    {draftStrokeW > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {["#000000","#ffffff","#ef4444","#3b82f6","#eab308","#22c55e","#a855f7","#f97316"].map(c => (
                          <button key={c} onClick={() => setDraftStrokeColor(c)}
                            className="w-7 h-7 rounded-full flex-shrink-0 transition-all"
                            style={{ background:c,
                              outline: draftStrokeColor===c ? "2.5px solid rgba(255,255,255,0.9)" : "none", outlineOffset:2,
                              boxShadow: c==="#000000" ? "inset 0 0 0 1.5px rgba(255,255,255,0.3)" : "none" }} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Animations */}
                  <div>
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[3px] mb-1.5">Animatsiya</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ANIMS.map(an => (
                        <button key={an.id} onClick={() => setDraftAnim(an.id)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all"
                          style={{
                            background: draftAnim===an.id
                              ? "radial-gradient(ellipse at 0% 50%,rgba(124,58,237,0.4),rgba(30,10,50,0.5))"
                              : "rgba(255,255,255,0.04)",
                            border: draftAnim===an.id ? "1.5px solid rgba(124,58,237,0.75)" : "1.5px solid rgba(255,255,255,0.06)",
                            boxShadow: draftAnim===an.id ? "0 0 10px rgba(124,58,237,0.25)" : "none",
                          }}>
                          <span className="text-lg leading-none flex-shrink-0">{an.icon}</span>
                          <span className="text-[11px] font-bold flex-1 text-left"
                            style={{ color: draftAnim===an.id ? "#c4b5fd" : "rgba(255,255,255,0.6)" }}>
                            {an.label}
                          </span>
                          {draftAnim===an.id && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:"#7c3aed" }} />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Sticker panel ── */}
      <AnimatePresence>
        {panel === "sticker" && (
          <motion.div
            initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
            transition={{ type:"spring", stiffness:380, damping:32 }}
            className="flex-shrink-0 px-4 pt-3 pb-8"
            style={{ background:"rgba(8,8,22,0.97)", borderTop:"1px solid rgba(255,255,255,0.08)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Group tabs */}
            <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-none">
              {STICKER_GROUPS.map((g, i) => (
                <button key={i} onClick={() => setStickerGroup(i)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={{
                    background: stickerGroup===i ? "rgba(124,58,237,0.8)" : "rgba(255,255,255,0.08)",
                    color: stickerGroup===i ? "white" : "rgba(255,255,255,0.5)",
                  }}>
                  {g.label}
                </button>
              ))}
            </div>
            {/* Emoji grid */}
            <div className="grid grid-cols-8 gap-2">
              {STICKER_GROUPS[stickerGroup].emojis.map(em => (
                <button key={em} onClick={() => { addSticker(em); setPanel("none"); }}
                  className="text-2xl aspect-square flex items-center justify-center rounded-xl transition-transform active:scale-90"
                  style={{ background:"rgba(255,255,255,0.06)" }}>
                  {em}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filter panel ── */}
      <AnimatePresence>
        {panel === "filter" && (
          <motion.div
            initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
            transition={{ type:"spring", stiffness:380, damping:32 }}
            className="flex-shrink-0 px-4 pt-3 pb-8"
            style={{ background:"rgba(8,8,22,0.97)", borderTop:"1px solid rgba(255,255,255,0.08)" }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-xs font-bold text-white/40 mb-3">✦ Rasm filtri tanlang</p>
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
              {FILTERS.map(f => (
                <button key={f.id} onClick={() => setFilterName(f.id)}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5">
                  <div
                    className="w-16 h-16 rounded-xl overflow-hidden"
                    style={{
                      border: filterName===f.id ? "2.5px solid #7c3aed" : "2px solid rgba(255,255,255,0.12)",
                      boxShadow: filterName===f.id ? "0 0 0 2px rgba(124,58,237,0.5)" : "none",
                    }}>
                    {previews[0] && (
                      isVideo(previews[0]) ? (
                        <video src={previews[0]} className="w-full h-full object-cover"
                          style={{ filter: f.css === "none" ? undefined : f.css }} muted playsInline />
                      ) : (
                        <img loading="lazy" decoding="async" src={previews[0]} alt={f.label} className="w-full h-full object-cover"
                          style={{ filter: f.css === "none" ? undefined : f.css }} />
                      )
                    )}
                  </div>
                  <span className="text-[10px] font-bold"
                    style={{ color: filterName===f.id ? "#a78bfa" : "rgba(255,255,255,0.45)" }}>
                    {f.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* hidden audio element */}
      <audio ref={audioPreviewRef} style={{ display:"none" }} />

      {/* ── Music panel (STUDIO WAVE — revolutionary) ── */}
      <AnimatePresence>
        {panel === "music" && (
          <motion.div
            initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
            transition={{ type:"spring", stiffness:400, damping:34 }}
            className="flex-shrink-0"
            style={{
              background:"linear-gradient(180deg,rgba(2,14,26,0.99) 0%,rgba(2,8,18,0.99) 100%)",
              boxShadow:"0 -1px 0 rgba(6,182,212,0.4), inset 0 1px 0 rgba(34,211,238,0.1)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* ── Glowing tab bar ── */}
            <div className="flex items-center gap-1 px-3 pt-2.5 pb-0">
              {([
                { id:"search" as const, icon:"🔍", tip:"Qidirish", color:"#06b6d4", bg:"rgba(6,182,212,0.35)" },
                { id:"upload" as const, icon:"📁", tip:"Yuklash",  color:"#10b981", bg:"rgba(16,185,129,0.35)" },
                { id:"trim"   as const, icon:"✂️", tip:"Kesish",   color:"#f43f5e", bg:"rgba(244,63,94,0.35)",   disabled:!audioName },
              ] as const).map(t => (
                <button key={t.id}
                  onClick={() => !("disabled" in t && t.disabled) && setMusicTab(t.id)}
                  disabled={"disabled" in t && t.disabled}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-all"
                  style={{
                    background: musicTab===t.id
                      ? `radial-gradient(ellipse at 50% 0%,${t.bg} 0%,rgba(0,0,0,0.1) 100%)`
                      : "transparent",
                    boxShadow: musicTab===t.id ? `0 0 12px ${t.color}44` : "none",
                    opacity: "disabled" in t && t.disabled ? 0.3 : 1,
                    cursor: "disabled" in t && t.disabled ? "not-allowed" : "pointer",
                  }}>
                  <span className="text-lg leading-none"
                    style={{ filter: musicTab===t.id ? `drop-shadow(0 0 6px ${t.color})` : "none" }}>
                    {t.icon}
                  </span>
                  <span className="text-[8px] font-black tracking-wider"
                    style={{ color: musicTab===t.id ? t.color : "rgba(255,255,255,0.3)" }}>
                    {t.tip}
                  </span>
                </button>
              ))}
              {/* Done / close */}
              <button onClick={() => setPanel("none")}
                className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ml-1 transition-all"
                style={{
                  background: audioName
                    ? "linear-gradient(135deg,#0e7490,#06b6d4)"
                    : "rgba(255,255,255,0.07)",
                  boxShadow: audioName ? "0 0 16px rgba(6,182,212,0.45)" : "none",
                  border: audioName ? "1.5px solid rgba(6,182,212,0.6)" : "1px solid rgba(255,255,255,0.1)",
                }}>
                <Check className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Selected song banner */}
            {audioName && (
              <div className="flex items-center gap-2.5 mx-3 mt-2 px-3 py-2.5 rounded-2xl"
                style={{
                  background:"linear-gradient(90deg,rgba(6,182,212,0.15),rgba(6,182,212,0.08))",
                  border:"1px solid rgba(6,182,212,0.4)",
                  boxShadow:"0 0 16px rgba(6,182,212,0.1)",
                }}>
                <div className="flex items-end gap-0.5 w-5 h-4 flex-shrink-0">
                  <span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" />
                </div>
                <span className="flex-1 text-[12px] text-white font-bold truncate">{audioName}</span>
                {audioUploadUrl && (
                  <span className="text-[9px] font-bold px-2 py-1 rounded-full flex-shrink-0"
                    style={{ background:"rgba(6,182,212,0.25)", color:"#67e8f9", border:"1px solid rgba(6,182,212,0.4)" }}>
                    {fmtTime(audioTrimStart)} – {fmtTime(audioTrimEnd)}
                  </span>
                )}
                <button onClick={() => { setAudioName(""); setAudioUploadUrl(""); setAudioServerUrl(""); setAudioUploadFailed(false); setMusicQuery(""); setMusicTab("search"); }}
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background:"rgba(255,255,255,0.12)" }}>
                  <X className="w-3.5 h-3.5 text-white/70" />
                </button>
              </div>
            )}

            {/* scrollable content */}
            <div className="overflow-y-auto pb-6" style={{ maxHeight:"50vh", scrollbarWidth:"none" }}>

            {/* ════════════ SEARCH TAB ════════════ */}
            {musicTab === "search" && (
              <div>
                {/* Search bar */}
                <div className="flex gap-2 mx-3 mt-2.5">
                  <div className="flex-1 flex items-center gap-2 rounded-2xl px-3 transition-all"
                    style={{ background:"rgba(255,255,255,0.06)", border:"1.5px solid rgba(6,182,212,0.3)" }}>
                    <Search className="w-4 h-4 flex-shrink-0" style={{ color:"#06b6d4" }} />
                    <input autoFocus value={musicQuery}
                      onChange={e => { setMusicQuery(e.target.value); setMusicApiResults([]); }}
                      placeholder="Har qanday qo'shiq — qidiring…"
                      className="flex-1 bg-transparent py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none" />
                    {musicApiLoading && <div className="w-3.5 h-3.5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin flex-shrink-0" />}
                    {musicQuery && !musicApiLoading && (
                      <button onClick={() => { setMusicQuery(""); setMusicApiResults([]); }}>
                        <X className="w-3.5 h-3.5 text-white/30" />
                      </button>
                    )}
                  </div>
                </div>

                {musicQuery.length >= 1 && musicQuery.length < 2 && (
                  <p className="text-[10px] text-white/30 px-4 mt-1.5">Kamida 2 harf kiriting…</p>
                )}
                {musicQuery.length >= 2 && !musicApiLoading && musicApiResults.length === 0 && (
                  <div className="mx-3 mt-2 px-3 py-2 rounded-xl flex items-center gap-2"
                    style={{ background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)" }}>
                    <span className="text-amber-400 text-sm">⚠️</span>
                    <p className="text-[11px] text-amber-400/80">iTunes natija bermadi — quyidagi lokal qo'shiqlardan tanlang</p>
                  </div>
                )}

                {/* Country pills */}
                {!musicQuery && (
                  <div className="flex gap-1.5 px-3 mt-3 overflow-x-auto scrollbar-none pb-0.5">
                    {SONGS_BY_COUNTRY.map((cat, i) => (
                      <button key={i} onClick={() => setMusicCat(i)}
                        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-all"
                        style={{
                          background: musicCat===i ? "rgba(6,182,212,0.8)" : "rgba(255,255,255,0.07)",
                          border: musicCat===i ? "1px solid rgba(6,182,212,0.9)" : "1px solid rgba(255,255,255,0.08)",
                          color: musicCat===i ? "white" : "rgba(255,255,255,0.5)",
                          boxShadow: musicCat===i ? "0 0 10px rgba(6,182,212,0.35)" : "none",
                        }}>
                        <span className={musicCat===i ? "flag-wave" : ""} style={{ fontSize:13, lineHeight:1 }}>{cat.flag}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* iTunes results */}
                {musicQuery.length >= 2 && musicApiResults.length > 0 && (
                  <div className="mt-1 max-h-40 overflow-y-auto" style={{ scrollbarWidth:"none" }}>
                    <div className="flex items-center gap-1.5 px-4 py-1">
                      <span className="text-[10px] font-bold text-purple-400">🌐 iTunes</span>
                      <span className="text-[10px] text-white/30">{musicApiResults.length} natija</span>
                    </div>
                    {musicApiResults.map((song, i) => {
                      const name = `${song.artist} — ${song.title}`;
                      const isSelected = audioName === name;
                      return (
                        <button key={i}
                          onClick={() => {
                            setMusicQuery(name);
                            setMusicApiResults([]);
                            if (song.preview) {
                              const proxyUrl = `${API_BASE}/api/music/proxy?url=${encodeURIComponent(song.preview)}`;
                              loadAudioUrl(proxyUrl, name, false);
                            } else {
                              setAudioName(name);
                              setAudioUploadUrl("");
                            }
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 transition-all"
                          style={{
                            background: isSelected ? "rgba(6,182,212,0.12)" : "transparent",
                            borderLeft: isSelected ? "2.5px solid #06b6d4" : "2.5px solid transparent",
                          }}>
                          {song.artwork
                            ? <img loading="lazy" decoding="async" src={song.artwork} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" style={{ border:"1px solid rgba(255,255,255,0.1)" }} />
                            : <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background:"rgba(6,182,212,0.2)" }}><Music className="w-4 h-4 text-cyan-300" /></div>}
                          <div className="flex flex-col items-start flex-1 min-w-0">
                            <span className="text-[13px] font-semibold text-white truncate w-full text-left leading-tight">{song.title}</span>
                            <span className="text-[10px] text-white/40 truncate w-full text-left">{song.artist}</span>
                            {song.album && <span className="text-[9px] text-white/25 truncate w-full text-left">{song.album}</span>}
                          </div>
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            {song.preview && <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ background:"rgba(6,182,212,0.2)", color:"#67e8f9" }}>30s</span>}
                            {isSelected
                              ? <div className="flex items-end gap-0.5"><span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" /></div>
                              : <span className="text-white/20 text-xs">▶</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Local songs */}
                <div className="mt-1 max-h-44 overflow-y-auto" style={{ scrollbarWidth:"none" }}>
                  {musicQuery && musicApiResults.length === 0 && (
                    <p className="text-[10px] text-white/30 px-4 py-1">📁 Lokal: {musicSuggestions.length} natija</p>
                  )}
                  {musicSuggestions.length === 0 && !musicQuery ? null : musicSuggestions.length === 0 ? (
                    <p className="text-center text-white/30 text-xs py-3">Lokal bazada topilmadi</p>
                  ) : (
                    musicSuggestions.map((song, i) => {
                      const parts = song.split(" — ");
                      const artist = parts[0]; const title = parts.slice(1).join(" — ");
                      const isSelected = audioName === song;
                      const countryFlag = SONGS_BY_COUNTRY.find(c => c.songs.includes(song))?.flag ?? "🎵";
                      return (
                        <button key={i}
                          onClick={() => { setAudioName(song); setMusicQuery(song); setMusicApiResults([]); setAudioUploadUrl(""); }}
                          className="w-full flex items-center gap-3 px-4 py-2 transition-all"
                          style={{ background: isSelected ? "rgba(124,58,237,0.18)" : "transparent",
                            borderLeft: isSelected ? "2.5px solid #7c3aed" : "2.5px solid transparent" }}>
                          <span className="flex-shrink-0 text-base leading-none">{countryFlag}</span>
                          <div className="flex flex-col items-start flex-1 min-w-0">
                            <span className="text-[13px] font-semibold text-white truncate w-full text-left leading-tight">{title}</span>
                            <span className="text-[10px] text-white/40 truncate w-full text-left">{artist}</span>
                          </div>
                          {isSelected
                            ? <div className="flex items-end gap-0.5 flex-shrink-0"><span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" /></div>
                            : <span className="text-white/20 flex-shrink-0 text-xs">▶</span>}
                        </button>
                      );
                    })
                  )}
                </div>
                <p className="text-center text-white/20 text-[10px] pt-1 pb-0.5">
                  🌐 iTunes + 📁 {allSongs.length}+ lokal · {SONGS_BY_COUNTRY.length} mamlakat
                </p>
              </div>
            )}

            {/* ════════════ UPLOAD TAB ════════════ */}
            {musicTab === "upload" && (
              <div className="px-3 pt-3 space-y-3">
                {/* ── BIG drop zone with label (bug fix: reliable file picker) ── */}
                <label htmlFor="music-file-input" className="block cursor-pointer">
                  <input
                    id="music-file-input"
                    ref={audioFileInputRef}
                    type="file"
                    accept="audio/*"
                    style={{ position:"absolute", width:1, height:1, opacity:0, pointerEvents:"none" }}
                    onChange={handleAudioFileUpload}
                  />
                  <div className="flex flex-col items-center justify-center gap-3 py-8 rounded-3xl transition-all"
                    style={{
                      background:"linear-gradient(135deg,rgba(16,185,129,0.08),rgba(6,182,212,0.06))",
                      border:"2px dashed rgba(16,185,129,0.5)",
                      boxShadow:"0 0 24px rgba(16,185,129,0.06)",
                    }}>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background:"rgba(16,185,129,0.15)", border:"1.5px solid rgba(16,185,129,0.4)" }}>
                      <span className="text-3xl">🎵</span>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-white">Qurilmadan audio yuklash</p>
                      <p className="text-[11px] mt-1" style={{ color:"rgba(16,185,129,0.9)" }}>
                        MP3 · WAV · AAC · OGG · FLAC · M4A
                      </p>
                      <div className="mt-2.5 px-5 py-2 rounded-full inline-block"
                        style={{ background:"linear-gradient(135deg,#059669,#10b981)", boxShadow:"0 0 16px rgba(16,185,129,0.4)" }}>
                        <span className="text-white text-xs font-black">📁 Fayl tanlash</span>
                      </div>
                    </div>
                  </div>
                </label>

                {/* ── Mic recording ── */}
                <button onClick={isRecording ? stopRecording : startRecording}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all relative overflow-hidden"
                  style={{
                    background: isRecording
                      ? "linear-gradient(135deg,rgba(239,68,68,0.2),rgba(239,68,68,0.08))"
                      : "rgba(255,255,255,0.05)",
                    border: isRecording ? "1.5px solid rgba(239,68,68,0.7)" : "1.5px solid rgba(255,255,255,0.1)",
                  }}>
                  {/* Pulsing ring when recording */}
                  {isRecording && (
                    <div className="absolute inset-0 pointer-events-none"
                      style={{ background:"radial-gradient(ellipse at 20% 50%,rgba(239,68,68,0.15) 0%,transparent 70%)", animation:"pulse 1.5s ease-in-out infinite" }} />
                  )}
                  <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 relative"
                    style={{
                      background: isRecording ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)",
                      border: isRecording ? "2px solid #ef4444" : "2px solid rgba(255,255,255,0.12)",
                      boxShadow: isRecording ? "0 0 20px rgba(239,68,68,0.5)" : "none",
                    }}>
                    {isRecording
                      ? <div className="w-5 h-5 rounded-sm" style={{ background:"#ef4444" }} />
                      : <Mic className="w-7 h-7 text-white/60" />}
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-[13px] font-black" style={{ color: isRecording ? "#fca5a5" : "white" }}>
                      {isRecording ? "🔴 Yozmoqda… — To'xtatish uchun bosing" : "🎙️ Mikrofon orqali yozish"}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color:"rgba(255,255,255,0.35)" }}>
                      {isRecording ? "Gapiring yoki kuylay boshlang" : "O'zingizning ovozingizni yozing"}
                    </p>
                  </div>
                  {isRecording && (
                    <div className="ml-auto flex items-end gap-0.5 flex-shrink-0">
                      <span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" />
                    </div>
                  )}
                </button>

                {/* Go to trim if audio loaded */}
                {audioUploadUrl && (
                  <button onClick={() => setMusicTab("trim")}
                    className="w-full py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2"
                    style={{
                      background:"linear-gradient(135deg,#0e7490,#06b6d4)",
                      boxShadow:"0 0 20px rgba(6,182,212,0.4)",
                    }}>
                    <Scissors className="w-4 h-4" />
                    ✂️ Kesish/Sozlashga o'tish →
                  </button>
                )}
              </div>
            )}

            {/* ════════════ TRIM TAB ════════════ */}
            {musicTab === "trim" && (
              <div className="px-3 pt-3 space-y-3">
                {!audioUploadUrl ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                      style={{ background:"rgba(244,63,94,0.1)", border:"1.5px solid rgba(244,63,94,0.3)" }}>
                      <span className="text-3xl">✂️</span>
                    </div>
                    <p className="text-sm text-white/40 mb-3">Avval audio yuklang yoki yozing</p>
                    <button onClick={() => setMusicTab("upload")}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold"
                      style={{ background:"linear-gradient(135deg,#059669,#10b981)", color:"white" }}>
                      📁 Yuklashga o'tish →
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Upload progress indicator */}
                    {audioUploading && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background:"rgba(6,182,212,0.12)", border:"1px solid rgba(6,182,212,0.3)" }}>
                        <div className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin flex-shrink-0" />
                        <span className="text-[11px] font-bold text-cyan-300">Audio yuklanmoqda… iltimos kuting</span>
                      </div>
                    )}
                    {!audioUploading && audioServerUrl && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background:"rgba(16,185,129,0.12)", border:"1px solid rgba(16,185,129,0.3)" }}>
                        <span className="text-green-400 text-sm">✓</span>
                        <span className="text-[11px] font-bold text-green-300">Audio yuklandi — endi o'ynaydi!</span>
                      </div>
                    )}
                    {audioUploadFailed && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.35)" }}>
                        <span className="text-red-400 text-sm">⚠</span>
                        <span className="text-[11px] font-bold text-red-300">Audio yuklanmadi. Qaytadan tanlang yoki qo'shiq nomini kiriting.</span>
                      </div>
                    )}
                    {/* Track info + transport */}
                    <div className="flex items-center gap-3 px-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-black text-white truncate">{audioName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold" style={{ color:"rgba(244,63,94,0.9)" }}>
                            ✂️ {fmtTime(audioTrimEnd - audioTrimStart)}
                          </span>
                          <span className="text-[10px] text-white/25">/ {fmtTime(audioDuration || 0)}</span>
                        </div>
                      </div>
                      {/* Play/Pause */}
                      <button onClick={toggleAudioPreview}
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: audioPlaying
                            ? "linear-gradient(135deg,#b91c1c,#ef4444)"
                            : "linear-gradient(135deg,#0e7490,#06b6d4)",
                          boxShadow: audioPlaying ? "0 0 16px rgba(239,68,68,0.5)" : "0 0 16px rgba(6,182,212,0.4)",
                        }}>
                        {audioPlaying
                          ? <div className="flex gap-1"><div className="w-1.5 h-5 rounded-sm bg-white" /><div className="w-1.5 h-5 rounded-sm bg-white" /></div>
                          : <span className="text-white text-lg pl-0.5">▶</span>}
                      </button>
                    </div>

                    {/* Waveform track */}
                    <div className="relative"
                      onPointerMove={onTrimMove} onPointerUp={onTrimUp} onPointerCancel={onTrimUp}>
                      <div ref={trimTrackRef}
                        className="relative flex items-end gap-px overflow-hidden rounded-2xl"
                        style={{ height:72, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(244,63,94,0.2)", cursor:"crosshair" }}>
                        {waveformBars.map((h, i) => {
                          const pct = i / waveformBars.length;
                          const dur = audioDuration || 60;
                          const inRange = pct >= audioTrimStart/dur && pct <= audioTrimEnd/dur;
                          const isCurrent = audioPlaying && Math.abs(pct - audioCurrentTime/dur) < 0.015;
                          return (
                            <div key={i} className="flex-1 rounded-t-sm transition-colors duration-75"
                              style={{
                                height:`${h*100}%`,
                                background: isCurrent ? "#ffffff"
                                  : inRange ? "rgba(244,63,94,0.8)"
                                  : "rgba(255,255,255,0.14)",
                              }} />
                          );
                        })}
                        {/* Dim overlays */}
                        <div className="absolute left-0 top-0 bottom-0 rounded-l-2xl pointer-events-none"
                          style={{ width:`${(audioTrimStart/(audioDuration||60))*100}%`, background:"rgba(0,0,0,0.6)" }} />
                        <div className="absolute right-0 top-0 bottom-0 rounded-r-2xl pointer-events-none"
                          style={{ width:`${(1-audioTrimEnd/(audioDuration||60))*100*100/100}%`, background:"rgba(0,0,0,0.6)" }} />
                        {/* Selection border */}
                        <div className="absolute top-0 h-0.5 pointer-events-none"
                          style={{ left:`${(audioTrimStart/(audioDuration||60))*100}%`, right:`${(1-audioTrimEnd/(audioDuration||60))*100}%`, background:"#f43f5e" }} />
                        <div className="absolute bottom-0 h-0.5 pointer-events-none"
                          style={{ left:`${(audioTrimStart/(audioDuration||60))*100}%`, right:`${(1-audioTrimEnd/(audioDuration||60))*100}%`, background:"#f43f5e" }} />
                        {/* Playhead */}
                        {audioPlaying && (
                          <div className="absolute top-0 bottom-0 w-px pointer-events-none"
                            style={{ left:`${(audioCurrentTime/(audioDuration||60))*100}%`, background:"white" }} />
                        )}
                      </div>
                      {/* START handle */}
                      <div onPointerDown={e => onTrimDown(e, "start")}
                        className="absolute top-0 bottom-0 flex items-center"
                        style={{ left:`calc(${(audioTrimStart/(audioDuration||60))*100}% - 12px)`, width:24, cursor:"ew-resize", zIndex:10, touchAction:"none" }}>
                        <div className="w-4 h-full rounded-l-xl flex flex-col items-center justify-center gap-1"
                          style={{ background:"rgba(244,63,94,0.9)", border:"1.5px solid #fb7185", boxShadow:"0 0 10px rgba(244,63,94,0.6)" }}>
                          <div className="w-0.5 h-4 rounded-full bg-white/80" />
                          <div className="w-0.5 h-4 rounded-full bg-white/80" />
                        </div>
                      </div>
                      {/* END handle */}
                      <div onPointerDown={e => onTrimDown(e, "end")}
                        className="absolute top-0 bottom-0 flex items-center justify-end"
                        style={{ left:`calc(${(audioTrimEnd/(audioDuration||60))*100}% - 12px)`, width:24, cursor:"ew-resize", zIndex:10, touchAction:"none" }}>
                        <div className="w-4 h-full rounded-r-xl flex flex-col items-center justify-center gap-1"
                          style={{ background:"rgba(244,63,94,0.9)", border:"1.5px solid #fb7185", boxShadow:"0 0 10px rgba(244,63,94,0.6)" }}>
                          <div className="w-0.5 h-4 rounded-full bg-white/80" />
                          <div className="w-0.5 h-4 rounded-full bg-white/80" />
                        </div>
                      </div>
                    </div>

                    {/* Time pickers */}
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { label:"Boshlanish", val:audioTrimStart, set:(v:number)=>setAudioTrimStart(v), clamp:(v:number)=>Math.max(0,Math.min(audioTrimEnd-1,v)), dir:"◀" },
                        { label:"Tugash",     val:audioTrimEnd,   set:(v:number)=>setAudioTrimEnd(v),   clamp:(v:number)=>Math.max(audioTrimStart+1,Math.min(audioDuration||60,v)), dir:"▶" },
                      ]).map(item => (
                        <div key={item.label}>
                          <p className="text-[9px] font-black text-white/25 uppercase tracking-widest mb-1">{item.label}</p>
                          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
                            style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(244,63,94,0.35)" }}>
                            <span className="text-[11px] font-black flex-shrink-0" style={{ color:"#fb7185" }}>{item.dir}</span>
                            <span className="text-white font-mono font-bold text-[13px] flex-1 text-center">{fmtTime(item.val)}</span>
                            <div className="flex flex-col gap-0.5">
                              <button onClick={() => item.set(item.clamp(item.val - 1))} className="text-[9px] text-white/50 px-1 leading-none">▲</button>
                              <button onClick={() => item.set(item.clamp(item.val + 1))} className="text-[9px] text-white/50 px-1 leading-none">▼</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick presets */}
                    <div className="flex gap-1.5">
                      {[15,30,45,60].map(sec => {
                        const active = Math.round(audioTrimEnd - audioTrimStart) === sec;
                        return (
                          <button key={sec} onClick={() => { setAudioTrimStart(0); setAudioTrimEnd(Math.min(sec, audioDuration||60)); }}
                            className="flex-1 py-2 rounded-xl text-[11px] font-black transition-all"
                            style={{
                              background: active ? "rgba(244,63,94,0.35)" : "rgba(255,255,255,0.05)",
                              color: active ? "#fb7185" : "rgba(255,255,255,0.35)",
                              border: active ? "1px solid rgba(244,63,94,0.6)" : "1px solid rgba(255,255,255,0.06)",
                            }}>
                            {sec}s
                          </button>
                        );
                      })}
                      <button onClick={() => { setAudioTrimStart(0); setAudioTrimEnd(audioDuration||60); }}
                        className="flex-1 py-2 rounded-xl text-[11px] font-black transition-all"
                        style={{ background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.35)", border:"1px solid rgba(255,255,255,0.06)" }}>
                        Hammasi
                      </button>
                    </div>

                    {/* Download + Confirm row */}
                    <div className="flex gap-2">
                      {/* ⬇ Download button */}
                      <button
                        onClick={async () => {
                          const url = audioServerUrl || (audioUploadUrl && !audioUploadUrl.startsWith("blob:") ? audioUploadUrl : audioUploadUrl);
                          if (!url) return;
                          try {
                            const resp = await fetch(url);
                            const blob = await resp.blob();
                            const a = document.createElement("a");
                            a.href = URL.createObjectURL(blob);
                            a.download = `${audioName || "qo'shiq"}.m4a`;
                            document.body.appendChild(a); a.click(); document.body.removeChild(a);
                            setTimeout(() => URL.revokeObjectURL(a.href), 10000);
                          } catch {
                            const a = document.createElement("a");
                            a.href = url; a.target = "_blank"; a.download = `${audioName || "qo'shiq"}.m4a`;
                            document.body.appendChild(a); a.click(); document.body.removeChild(a);
                          }
                        }}
                        className="flex-shrink-0 px-4 py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-1.5"
                        style={{ background:"linear-gradient(135deg,#0e7490,#0891b2)", boxShadow:"0 0 16px rgba(6,182,212,0.35)" }}
                        title="Yuklab olish">
                        <Download className="w-4 h-4" />
                        Yuklab
                      </button>
                      {/* ✓ Confirm */}
                      <button onClick={() => setPanel("none")}
                        className="flex-1 py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2"
                        style={{ background:"linear-gradient(135deg,#be123c,#f43f5e)", boxShadow:"0 0 20px rgba(244,63,94,0.4)" }}>
                        <Check className="w-4 h-4" />
                        {fmtTime(audioTrimEnd - audioTrimStart)} tasdiqlash
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            </div>{/* end scrollable */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Speed panel ── */}
      <AnimatePresence>
        {panel === "speed" && (
          <motion.div
            initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
            transition={{ type:"spring", stiffness:380, damping:32 }}
            className="flex-shrink-0 px-4 pt-4 pb-8"
            style={{ background:"rgba(6,6,20,0.98)", borderTop:"1px solid rgba(255,255,255,0.08)" }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-xs font-bold text-white/40 mb-3">⚡ Video tezligi — CapCutdan ustun!</p>
            {/* Speed track */}
            <div className="relative mb-4">
              <div className="flex gap-2 justify-between">
                {SPEED_OPTIONS.map(sp => (
                  <button key={sp.val} onClick={() => setVideoSpeed(sp.val)}
                    className="flex-1 py-3 rounded-2xl flex flex-col items-center gap-1 transition-all"
                    style={{
                      background: videoSpeed===sp.val ? `${sp.color}30` : "rgba(255,255,255,0.06)",
                      border: videoSpeed===sp.val ? `1.5px solid ${sp.color}` : "1.5px solid rgba(255,255,255,0.1)",
                      transform: videoSpeed===sp.val ? "scale(1.08)" : "scale(1)",
                    }}>
                    <span className="text-[13px] font-black" style={{ color: videoSpeed===sp.val ? sp.color : "rgba(255,255,255,0.6)" }}>
                      {sp.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {/* Speed description */}
            <div className="px-3 py-2 rounded-xl" style={{ background:"rgba(255,255,255,0.05)" }}>
              {videoSpeed < 1
                ? <p className="text-[11px] text-cyan-300 font-semibold">🐌 Sekin harakat — dramatik effekt</p>
                : videoSpeed === 1
                ? <p className="text-[11px] text-white/40 font-semibold">▶ Oddiy tezlik</p>
                : videoSpeed === 1.5
                ? <p className="text-[11px] text-orange-300 font-semibold">⚡ Biroz tezroq — ko'proq kontent</p>
                : <p className="text-[11px] text-red-400 font-semibold">🚀 Super tez — hype effekti!</p>
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Background / Fon panel ── */}
      <AnimatePresence>
        {panel === "bg" && (
          <motion.div
            initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
            transition={{ type:"spring", stiffness:380, damping:32 }}
            className="flex-shrink-0 pb-8"
            style={{ background:"rgba(6,6,20,0.98)", borderTop:"1px solid rgba(16,185,129,0.2)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div>
                <p className="text-[13px] font-black text-white">🎨 Fon Studiyasi</p>
                <p className="text-[10px] text-white/40">24 ta premium gradient — TikTokdan yaxshi!</p>
              </div>
              {bgOverlay !== "none" && (
                <button onClick={() => setBgOverlay("none")}
                  className="px-2.5 py-1 rounded-xl text-[10px] font-bold"
                  style={{ background:"rgba(239,68,68,0.15)", color:"#f87171", border:"1px solid rgba(239,68,68,0.3)" }}>
                  ✕ O'chirish
                </button>
              )}
            </div>

            {/* Gradient grid */}
            <div className="grid grid-cols-4 gap-2 px-4 max-h-52 overflow-y-auto" style={{ scrollbarWidth:"none" }}>
              {BG_GRADIENTS.map(bg => {
                const isActive = bgOverlay === bg.css;
                return (
                  <button key={bg.id} onClick={() => setBgOverlay(bg.css === "none" ? "none" : bg.css)}
                    className="flex flex-col items-center gap-1.5 rounded-2xl overflow-hidden transition-all active:scale-95"
                    style={{
                      border: isActive ? "2.5px solid rgba(52,211,153,0.9)" : "2px solid rgba(255,255,255,0.08)",
                      transform: isActive ? "scale(0.94)" : "scale(1)",
                      boxShadow: isActive ? "0 0 12px rgba(52,211,153,0.4)" : "none",
                    }}>
                    {/* Color swatch */}
                    <div className="w-full h-12 rounded-xl"
                      style={{
                        background: bg.css === "none" ? "rgba(255,255,255,0.08)" : bg.css,
                        border: bg.css === "none" ? "1.5px dashed rgba(255,255,255,0.2)" : "none",
                        display:"flex", alignItems:"center", justifyContent:"center",
                      }}>
                      {bg.css === "none" && <span className="text-sm text-white/30">✕</span>}
                      {isActive && bg.css !== "none" && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background:"rgba(255,255,255,0.9)" }}>
                          <span className="text-[9px] text-black font-black">✓</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-bold pb-1.5"
                      style={{ color: isActive ? "#34d399" : "rgba(255,255,255,0.5)" }}>
                      {bg.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Opacity control when active */}
            {bgOverlay !== "none" && (
              <div className="mx-4 mt-3 px-3 py-2 rounded-2xl"
                style={{ background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.25)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-400">Shaffoflik:</span>
                  <span className="text-[10px] text-white/50">Fon qo'shildi ✓</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: BG_GRADIENTS.find(b=>b.css===bgOverlay)?.thumb }} />
                    <span className="text-[10px] font-bold text-emerald-300">
                      {BG_GRADIENTS.find(b=>b.css===bgOverlay)?.label}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sound FX panel ── */}
      <AnimatePresence>
        {panel === "soundfx" && (
          <motion.div
            initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
            transition={{ type:"spring", stiffness:380, damping:32 }}
            className="flex-shrink-0 pb-8"
            style={{ background:"rgba(6,6,20,0.98)", borderTop:"1px solid rgba(255,255,255,0.08)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex gap-2 px-4 pt-3 mb-3 overflow-x-auto scrollbar-none">
              {SOUND_FX.map((cat, i) => (
                <button key={i} onClick={() => setSoundFxCat(i)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
                  style={{
                    background: soundFxCat===i ? "rgba(168,85,247,0.8)" : "rgba(255,255,255,0.08)",
                    color: soundFxCat===i ? "white" : "rgba(255,255,255,0.5)",
                  }}>
                  {cat.cat}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 px-4 max-h-44 overflow-y-auto" style={{ scrollbarWidth:"none" }}>
              {SOUND_FX[soundFxCat].sounds.map((fx, i) => {
                const isSelected = audioName === fx.name;
                return (
                  <button key={i} onClick={() => setAudioName(isSelected ? "" : fx.name)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all"
                    style={{
                      background: isSelected ? "rgba(168,85,247,0.25)" : "rgba(255,255,255,0.06)",
                      border: isSelected ? "1.5px solid rgba(168,85,247,0.8)" : "1.5px solid rgba(255,255,255,0.08)",
                      transform: isSelected ? "scale(0.95)" : "scale(1)",
                    }}>
                    <span className="text-2xl leading-none">{fx.emoji}</span>
                    <span className="text-[9px] font-bold text-center leading-tight px-1"
                      style={{ color: isSelected ? "#d8b4fe" : "rgba(255,255,255,0.45)" }}>
                      {fx.name}
                    </span>
                  </button>
                );
              })}
            </div>
            {audioName && SOUND_FX.flatMap(c=>c.sounds).some(s=>s.name===audioName) && (
              <div className="flex items-center gap-2 mx-4 mt-2 px-3 py-2 rounded-2xl"
                style={{ background:"rgba(168,85,247,0.12)", border:"1px solid rgba(168,85,247,0.35)" }}>
                <div className="flex items-end gap-0.5">
                  <span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" />
                </div>
                <span className="text-sm text-purple-300 font-bold">{audioName} qo'shildi</span>
                <button onClick={() => setAudioName("")} className="ml-auto">
                  <X className="w-3.5 h-3.5 text-white/40" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AR Filters panel ── */}
      <AnimatePresence>
        {panel === "ar" && (
          <motion.div
            initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
            transition={{ type:"spring", stiffness:380, damping:32 }}
            className="flex-shrink-0 px-4 pt-3 pb-8"
            style={{ background:"rgba(6,6,20,0.98)", borderTop:"1px solid rgba(255,255,255,0.08)" }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-xs font-bold text-white/40 mb-3">🎭 AR Filtrlar — 20 ta unikal effekt</p>
            <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto" style={{ scrollbarWidth:"none" }}>
              {AR_FILTERS.map(f => {
                const isActive = arFilter === f.id;
                return (
                  <button key={f.id} onClick={() => setArFilter(f.id)}
                    className="flex flex-col items-center gap-1.5 py-2.5 rounded-2xl transition-all"
                    style={{
                      background: isActive ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.05)",
                      border: isActive ? "2px solid rgba(124,58,237,0.9)" : "1.5px solid rgba(255,255,255,0.08)",
                      transform: isActive ? "scale(0.95)" : "scale(1)",
                    }}>
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"
                      style={{ border: isActive ? "1.5px solid rgba(124,58,237,0.7)" : "1px solid rgba(255,255,255,0.1)" }}>
                      {previews[0] ? (
                        isVideo(previews[0]) ? (
                          <video src={previews[0]} className="w-full h-full object-cover" muted playsInline
                            style={{ filter: f.css === "none" ? undefined : f.css }} />
                        ) : (
                          <img loading="lazy" decoding="async" src={previews[0]} alt="" className="w-full h-full object-cover"
                            style={{ filter: f.css === "none" ? undefined : f.css }} />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">{f.emoji}</div>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-center leading-tight px-0.5"
                      style={{ color: isActive ? "#c4b5fd" : "rgba(255,255,255,0.5)" }}>
                      {f.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {arFilter !== "none" && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background:"rgba(124,58,237,0.15)", border:"1px solid rgba(124,58,237,0.4)" }}>
                <span className="text-sm">{AR_FILTERS.find(f=>f.id===arFilter)?.emoji}</span>
                <span className="text-xs font-bold text-purple-300 flex-1">{AR_FILTERS.find(f=>f.id===arFilter)?.label} filtri faol</span>
                <button onClick={() => setArFilter("none")} className="text-white/30 hover:text-white/60">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Voice FX panel ── */}
      <AnimatePresence>
        {panel === "voice" && (
          <motion.div
            initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
            transition={{ type:"spring", stiffness:380, damping:32 }}
            className="flex-shrink-0 px-4 pt-3 pb-8"
            style={{ background:"rgba(6,6,20,0.98)", borderTop:"1px solid rgba(255,255,255,0.08)" }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-xs font-bold text-white/40 mb-3">🎤 Ovoz effektlari — TikTokdan 2x ko'p!</p>
            <div className="grid grid-cols-2 gap-2">
              {VOICE_FX.map(v => {
                const isActive = voiceFx === v.id;
                return (
                  <button key={v.id} onClick={() => setVoiceFx(v.id)}
                    className="flex items-center gap-3 px-3 py-3 rounded-2xl transition-all"
                    style={{
                      background: isActive ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
                      border: isActive ? "2px solid rgba(99,102,241,0.8)" : "1.5px solid rgba(255,255,255,0.08)",
                    }}>
                    <span className="text-2xl leading-none">{v.emoji}</span>
                    <div className="text-left">
                      <p className="text-[12px] font-bold leading-tight"
                        style={{ color: isActive ? "#a5b4fc" : "rgba(255,255,255,0.7)" }}>
                        {v.label}
                      </p>
                      <p className="text-[9px]" style={{ color:"rgba(255,255,255,0.3)" }}>{v.desc}</p>
                    </div>
                    {isActive && (
                      <div className="ml-auto flex items-end gap-0.5">
                        <span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {voiceFx !== "normal" && (
              <p className="text-center text-[11px] text-indigo-400 font-semibold mt-3">
                {VOICE_FX.find(v=>v.id===voiceFx)?.emoji} {VOICE_FX.find(v=>v.id===voiceFx)?.label} ovozi faol ✓
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Beauty / Beautify panel ── */}
      <AnimatePresence>
        {panel === "beauty" && (
          <motion.div
            initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
            transition={{ type:"spring", stiffness:380, damping:32 }}
            className="flex-shrink-0 px-4 pt-3 pb-8"
            style={{ background:"rgba(6,6,20,0.98)", borderTop:"1px solid rgba(255,255,255,0.08)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-white/40">✨ Beautify — Instagramdan 3x yaxshi!</p>
              <button onClick={() => setBeautyVals({smoothing:0,brightness:0,slim:0,eyes:0,teeth:0,blush:0})}
                className="text-[10px] text-purple-400 font-bold">Tozalash</button>
            </div>
            <div className="space-y-3">
              {BEAUTY_OPTIONS.map(opt => {
                const val = beautyVals[opt.id] ?? 0;
                return (
                  <div key={opt.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{opt.emoji}</span>
                        <span className="text-[11px] font-bold text-white/70">{opt.label}</span>
                      </div>
                      <span className="text-[11px] font-bold"
                        style={{ color: val > 0 ? "#a78bfa" : "rgba(255,255,255,0.3)" }}>
                        {val}%
                      </span>
                    </div>
                    <div className="relative h-2 rounded-full" style={{ background:"rgba(255,255,255,0.1)" }}>
                      <div className="absolute left-0 top-0 h-full rounded-full transition-all"
                        style={{ width:`${val}%`, background:"linear-gradient(90deg,#7c3aed,#a855f7)" }} />
                      <input type="range" min={0} max={100} step={5} value={val}
                        onChange={e => setBeautyVals(p => ({...p, [opt.id]: Number(e.target.value)}))}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 px-3 py-2 rounded-xl" style={{ background:"rgba(168,85,247,0.1)", border:"1px solid rgba(168,85,247,0.25)" }}>
              <p className="text-[10px] text-purple-300 font-semibold">
                {Object.values(beautyVals).some(v=>v>0)
                  ? `✨ ${Object.values(beautyVals).filter(v=>v>0).length} ta beauty effekt faol`
                  : "Slayderlarni o'ngga torting ✨"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
