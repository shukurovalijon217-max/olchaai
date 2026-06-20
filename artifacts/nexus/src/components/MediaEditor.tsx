import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Type, Music, Check, Trash2, ChevronLeft, ChevronRight, Smile, Sparkles, Search, Zap, Volume2, Wand2, Mic, Scissors } from "lucide-react";

export type TextOverlay = {
  id: string; text: string; x: number; y: number;
  fontSize: number; color: string;
  animation: "none"|"pulse"|"bounce"|"wave"|"neon"|"slide";
  fontStyle: "regular"|"bold"|"italic"|"shadow"|"outline";
  bgStyle: "none"|"dark"|"blur";
  isSticker?: boolean;
};

interface Props {
  previews: string[];
  files: File[];
  initialOverlays?: TextOverlay[];
  initialAudioName?: string;
  onDone: (overlays: TextOverlay[], audioName: string, filterName: string) => void;
  onClose: () => void;
}

const COLORS = ["#ffffff","#ffee38","#ff6b6b","#a78bfa","#34d399","#06b6d4","#f472b6","#111111"];
const ANIMS: { id: TextOverlay["animation"]; label: string; icon: string }[] = [
  { id:"none",   label:"Statik",    icon:"Aa" },
  { id:"pulse",  label:"Puls",      icon:"◎"  },
  { id:"bounce", label:"Sakrash",   icon:"↕"  },
  { id:"wave",   label:"To'lqin",   icon:"〰" },
  { id:"neon",   label:"Neon",      icon:"✦"  },
  { id:"slide",  label:"Sirpanish", icon:"→"  },
];
const FSTYLES: { id: TextOverlay["fontStyle"]; label: string }[] = [
  { id:"regular",  label:"Aa" }, { id:"bold", label:"𝗔𝗮" },
  { id:"italic",   label:"𝘈𝘢" }, { id:"shadow", label:"A̲a" },
  { id:"outline",  label:"Ao" },
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
  "#OlChaChallenge 🔥", "#DanceOff 💃", "#GlowUp ✨", "#SilhouetteChallenge 🌟",
  "#TrendingNow 📈", "#ViralDance 🎵", "#FoodChallenge 🍔", "#FitnessChallenge 💪",
  "#BeautyHacks 💄", "#LifeHacks 🛠", "#PetChallenge 🐾", "#ArtChallenge 🎨",
  "#Transition 🔄", "#LipSync 🎤", "#CommentChallenge 💬", "#OutfitOfTheDay 👗",
  "#MorningRoutine ☀️", "#NightRoutine 🌙", "#CookingChallenge 👨‍🍳", "#StudyWith 📚",
];

const SPEED_OPTIONS = [
  { label:"0.3×", val:0.3, color:"#38bdf8" },
  { label:"0.5×", val:0.5, color:"#818cf8" },
  { label:"1×",   val:1.0, color:"#a855f7" },
  { label:"1.5×", val:1.5, color:"#f97316" },
  { label:"2×",   val:2.0, color:"#ef4444" },
  { label:"3×",   val:3.0, color:"#e11d48" },
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
  const cls = item.animation === "pulse" ? "txt-anim-pulse"
    : item.animation === "bounce" ? "txt-anim-bounce"
    : item.animation === "neon"   ? "txt-anim-neon"
    : item.animation === "slide"  ? "txt-anim-slide"
    : "";

  const fs: React.CSSProperties = item.fontStyle === "bold"    ? { fontWeight: 900 }
    : item.fontStyle === "italic"   ? { fontStyle: "italic" }
    : item.fontStyle === "shadow"   ? { textShadow: `2px 3px 8px rgba(0,0,0,0.9)` }
    : item.fontStyle === "outline"  ? { WebkitTextStroke: "1.5px rgba(0,0,0,0.85)" }
    : {};

  const bg: React.CSSProperties = item.bgStyle === "dark" ? { background:"rgba(0,0,0,0.5)", padding:"4px 10px", borderRadius: 8 }
    : item.bgStyle === "blur" ? { backdropFilter:"blur(12px)", background:"rgba(0,0,0,0.25)", padding:"4px 10px", borderRadius: 8 }
    : {};

  if (item.isSticker) {
    return <span style={{ fontSize: item.fontSize, lineHeight: 1 }}>{item.text}</span>;
  }

  const inner = item.animation === "wave"
    ? <WaveText text={item.text} color={item.color} fontSize={item.fontSize} />
    : <span style={{ color: item.color, fontSize: item.fontSize }}>{item.text}</span>;

  return (
    <div className={cls} style={{ fontFamily:"system-ui,sans-serif", lineHeight:1.2, ...fs, ...bg }}>
      {inner}
    </div>
  );
}

export default function MediaEditor({ previews, files, initialOverlays = [], initialAudioName = "", onDone, onClose }: Props) {
  const [slide, setSlide]               = useState(0);
  const [items, setItems]               = useState<TextOverlay[]>(initialOverlays);
  const [selectedId, setSelectedId]     = useState<string|null>(null);
  const [panel, setPanel]               = useState<"none"|"text"|"music"|"sticker"|"filter"|"speed"|"soundfx"|"ar"|"voice"|"beauty">("none");
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
  const videoRef = useRef<HTMLVideoElement>(null);

  /* ── Internet music search state ── */
  type ApiSong = { name: string; artist: string; title: string; album: string; artwork: string };
  const [musicApiResults, setMusicApiResults] = useState<ApiSong[]>([]);
  const [musicApiLoading, setMusicApiLoading] = useState(false);
  const musicDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [draftText, setDraftText]       = useState("");
  const [draftColor, setDraftColor]     = useState("#ffffff");
  const [draftAnim, setDraftAnim]       = useState<TextOverlay["animation"]>("none");
  const [draftFStyle, setDraftFStyle]   = useState<TextOverlay["fontStyle"]>("bold");
  const [draftBg, setDraftBg]           = useState<TextOverlay["bgStyle"]>("none");
  const [draftSize, setDraftSize]       = useState(28);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{id:string;sx:number;sy:number;ox:number;oy:number}|null>(null);

  const isVideo = (url: string) => /\.(mp4|webm|mov|avi)(\?|$)/i.test(url);

  const addText = () => {
    if (!draftText.trim()) return;
    const id = `${Date.now()}`;
    setItems(p => [...p, { id, text: draftText.trim(), x:50, y:45, fontSize:draftSize, color:draftColor, animation:draftAnim, fontStyle:draftFStyle, bgStyle:draftBg }]);
    setDraftText(""); setPanel("none"); setSelectedId(id);
  };

  const addSticker = (emoji: string) => {
    const id = `sticker_${Date.now()}`;
    setItems(p => [...p, { id, text: emoji, x: 30 + Math.random() * 40, y: 30 + Math.random() * 40, fontSize: 52, color:"#fff", animation:"none", fontStyle:"regular", bgStyle:"none", isSticker: true }]);
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
    if (!dragRef.current || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.sx) / r.width) * 100;
    const dy = ((e.clientY - dragRef.current.sy) / r.height) * 100;
    setItems(p => p.map(i => i.id === dragRef.current!.id
      ? { ...i, x: Math.max(4,Math.min(96,dragRef.current!.ox+dx)), y: Math.max(4,Math.min(96,dragRef.current!.oy+dy)) }
      : i));
  }, []);
  const onPointerUp = () => { dragRef.current = null; };

  const selected = items.find(i => i.id === selectedId);
  const activeFilter = FILTERS.find(f => f.id === filterName) ?? FILTERS[0];

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
      style={{ zIndex:200, background:"#000", touchAction:"none" }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={() => { setSelectedId(null); setPanel("none"); }}
    >
      {/* ── Preview area ── */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        {/* Media with filter */}
        {isVideo(previews[slide]) ? (
          <video ref={videoRef} src={previews[slide]} className="w-full h-full object-cover" muted loop playsInline autoPlay
            style={{ filter: activeFilter.css === "none" ? undefined : activeFilter.css }} />
        ) : (
          <img src={previews[slide]} alt="" className="w-full h-full object-cover"
            style={{ filter: activeFilter.css === "none" ? undefined : activeFilter.css }} />
        )}

        {/* Text/Sticker overlays */}
        {items.map(item => (
          <div
            key={item.id}
            onPointerDown={e => onPointerDown(e, item.id)}
            style={{
              position:"absolute",
              left:`${item.x}%`, top:`${item.y}%`,
              transform:"translate(-50%,-50%)",
              cursor:"grab", userSelect:"none", touchAction:"none",
            }}
            onClick={e => { e.stopPropagation(); setSelectedId(item.id); }}
          >
            <OverlayText item={item} />
            {selectedId === item.id && (
              <div
                className="absolute inset-0 rounded-lg"
                style={{ border:"1.5px dashed rgba(255,255,255,0.7)", pointerEvents:"none", margin:-4 }}
              />
            )}
          </div>
        ))}

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
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-10 pb-3"
          style={{ background:"linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)" }}>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background:"rgba(0,0,0,0.4)" }}>
            <X className="w-5 h-5 text-white" />
          </button>
          <span className="text-white font-bold text-sm opacity-75">Redaktor</span>
          <button onClick={() => onDone(items, audioName, filterName)}
            className="px-4 py-1.5 rounded-full text-sm font-bold text-white"
            style={{ background:"linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
            Tayyor
          </button>
        </div>

        {/* Right tool strip */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
          {[
            { id:"text",    Icon:Type,     label:"Matn"    },
            { id:"sticker", Icon:Smile,    label:"Stiker"  },
            { id:"filter",  Icon:Sparkles, label:"Filtr"   },
            { id:"ar",      Icon:Wand2,    label:"AR"      },
            { id:"music",   Icon:Music,    label:"Musiqa"  },
            { id:"speed",   Icon:Zap,      label:"Tezlik"  },
            { id:"soundfx", Icon:Volume2,  label:"FX Ovoz" },
            { id:"voice",   Icon:Mic,      label:"Ovoz FX" },
            { id:"beauty",  Icon:Scissors, label:"Beautify"},
          ].map(({ id, Icon, label }) => (
            <button key={id} onClick={e => { e.stopPropagation(); setPanel(p => p===id ? "none" : id as any); setSelectedId(null); }}
              className="w-11 h-11 rounded-2xl flex flex-col items-center justify-center gap-0.5"
              style={{
                background: panel===id ? "rgba(124,58,237,0.85)" : "rgba(0,0,0,0.5)",
                backdropFilter:"blur(10px)",
                border:"1px solid rgba(255,255,255,0.18)",
              }}>
              <Icon className="w-4.5 h-4.5 text-white" style={{ width:18, height:18 }} />
              <span className="text-[9px] text-white/80 font-bold leading-none">{label}</span>
            </button>
          ))}

          {/* Selected item delete */}
          {selected && (
            <motion.button initial={{scale:0}} animate={{scale:1}}
              onClick={e => { e.stopPropagation(); removeSelected(); }}
              className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background:"rgba(239,68,68,0.7)", backdropFilter:"blur(10px)" }}>
              <Trash2 className="text-white" style={{ width:18, height:18 }} />
            </motion.button>
          )}
        </div>

        {/* Filter badge (shown when active) */}
        {filterName !== "none" && (
          <div className="absolute bottom-8 left-4 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ background:"rgba(124,58,237,0.8)", color:"#fff", backdropFilter:"blur(8px)" }}>
            ✦ {activeFilter.label}
          </div>
        )}
      </div>

      {/* ── Text panel ── */}
      <AnimatePresence>
        {panel === "text" && (
          <motion.div
            initial={{ y: "100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
            transition={{ type:"spring", stiffness:380, damping:32 }}
            className="flex-shrink-0 px-4 pt-3 pb-8 space-y-3"
            style={{ background:"rgba(8,8,22,0.97)", borderTop:"1px solid rgba(255,255,255,0.08)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex gap-2">
              <input
                autoFocus
                value={draftText}
                onChange={e => setDraftText(e.target.value)}
                placeholder="Matn kiriting…"
                className="flex-1 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
                style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.1)" }}
                onKeyDown={e => e.key==="Enter" && addText()}
              />
              <button onClick={addText}
                className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: draftText.trim() ? "rgba(124,58,237,0.9)" : "rgba(255,255,255,0.07)" }}>
                <Check className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              {COLORS.map(c => (
                <button key={c} onClick={() => setDraftColor(c)}
                  className="w-8 h-8 rounded-full flex-shrink-0 transition-transform"
                  style={{ background:c, border: c===draftColor ? "2.5px solid white" : "2px solid transparent",
                    transform: c===draftColor ? "scale(1.2)" : "scale(1)",
                    boxShadow: c===draftColor ? "0 0 0 2px rgba(124,58,237,0.7)" : "none" }} />
              ))}
              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                <button onClick={() => setDraftSize(s=>Math.max(14,s-4))}
                  className="w-7 h-7 rounded-full text-white/60 text-sm font-bold flex items-center justify-center"
                  style={{ background:"rgba(255,255,255,0.08)" }}>−</button>
                <span className="text-xs text-white/50 w-6 text-center">{draftSize}</span>
                <button onClick={() => setDraftSize(s=>Math.min(72,s+4))}
                  className="w-7 h-7 rounded-full text-white/60 text-sm font-bold flex items-center justify-center"
                  style={{ background:"rgba(255,255,255,0.08)" }}>+</button>
              </div>
            </div>

            <div className="flex gap-2">
              {FSTYLES.map(st => (
                <button key={st.id} onClick={() => setDraftFStyle(st.id)}
                  className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: draftFStyle===st.id ? "rgba(124,58,237,0.7)" : "rgba(255,255,255,0.06)",
                    color: draftFStyle===st.id ? "white" : "rgba(255,255,255,0.5)",
                    border: draftFStyle===st.id ? "1px solid rgba(124,58,237,0.8)" : "1px solid transparent",
                  }}>
                  {st.label}
                </button>
              ))}
              {(["none","dark","blur"] as TextOverlay["bgStyle"][]).map(b => (
                <button key={b} onClick={() => setDraftBg(b)}
                  className="flex-1 py-2 rounded-xl text-[10px] font-bold transition-all"
                  style={{
                    background: draftBg===b ? "rgba(6,182,212,0.4)" : "rgba(255,255,255,0.06)",
                    color: draftBg===b ? "white" : "rgba(255,255,255,0.4)",
                  }}>
                  {b==="none" ? "Yo'q" : b==="dark" ? "Qora" : "Blur"}
                </button>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
              {ANIMS.map(an => (
                <button key={an.id} onClick={() => setDraftAnim(an.id)}
                  className="flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all"
                  style={{
                    background: draftAnim===an.id ? "rgba(124,58,237,0.7)" : "rgba(255,255,255,0.06)",
                    border: draftAnim===an.id ? "1px solid rgba(124,58,237,0.8)" : "1px solid transparent",
                  }}>
                  <span className="text-base leading-none" style={{ color: draftAnim===an.id ? "white" : "rgba(255,255,255,0.5)" }}>
                    {an.icon}
                  </span>
                  <span className="text-[9px] font-bold" style={{ color: draftAnim===an.id ? "white" : "rgba(255,255,255,0.4)" }}>
                    {an.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
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
                        <img src={previews[0]} alt={f.label} className="w-full h-full object-cover"
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

      {/* ── Music panel ── */}
      <AnimatePresence>
        {panel === "music" && (
          <motion.div
            initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
            transition={{ type:"spring", stiffness:380, damping:32 }}
            className="flex-shrink-0 pb-6"
            style={{ background:"rgba(6,6,20,0.98)", borderTop:"1px solid rgba(255,255,255,0.08)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Selected song bar */}
            {audioName && (
              <div className="flex items-center gap-2 mx-4 mt-3 px-3 py-2 rounded-2xl"
                style={{ background:"rgba(124,58,237,0.18)", border:"1px solid rgba(124,58,237,0.5)" }}>
                <div className="flex items-end gap-0.5 w-6 h-5 flex-shrink-0">
                  <span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" />
                </div>
                <span className="flex-1 text-[13px] text-white font-bold truncate">{audioName}</span>
                <button onClick={() => { setAudioName(""); setMusicQuery(""); }}
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background:"rgba(255,255,255,0.18)" }}>
                  <X className="w-3 h-3 text-white/70" />
                </button>
              </div>
            )}

            {/* Search bar */}
            <div className="flex gap-2 mx-4 mt-2.5">
              <div className="flex-1 flex items-center gap-2 rounded-2xl px-3"
                style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)" }}>
                <Search className="w-4 h-4 text-white/35 flex-shrink-0" />
                <input
                  autoFocus
                  value={musicQuery}
                  onChange={e => { setMusicQuery(e.target.value); setMusicApiResults([]); }}
                  placeholder="🌐 Internetdan qidiring — har qanday qo'shiq…"
                  className="flex-1 bg-transparent py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none"
                />
                {musicApiLoading && <div className="w-3.5 h-3.5 rounded-full border-2 border-purple-400 border-t-transparent animate-spin flex-shrink-0" />}
                {musicQuery && !musicApiLoading && (
                  <button onClick={() => { setMusicQuery(""); setMusicApiResults([]); }}>
                    <X className="w-3.5 h-3.5 text-white/30" />
                  </button>
                )}
              </div>
              <button onClick={() => setPanel("none")}
                className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: audioName ? "rgba(124,58,237,0.9)" : "rgba(255,255,255,0.08)" }}>
                <Check className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Search mode hint */}
            {musicQuery.length >= 1 && musicQuery.length < 2 && (
              <p className="text-[10px] text-white/30 px-4 mt-1">Kamida 2 harf kiriting…</p>
            )}
            {musicQuery.length >= 2 && !musicApiLoading && musicApiResults.length === 0 && (
              <p className="text-[10px] text-amber-400/60 px-4 mt-1">⚠️ iTunes API natija bermadi — pastdagi lokal qo'shiqlardan tanlang</p>
            )}

            {/* Country category tabs with waving flags */}
            {!musicQuery && (
              <div className="flex gap-2 px-4 mt-3 overflow-x-auto scrollbar-none pb-0.5">
                {SONGS_BY_COUNTRY.map((cat, i) => (
                  <button key={i} onClick={() => setMusicCat(i)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
                    style={{
                      background: musicCat===i ? "rgba(124,58,237,0.85)" : "rgba(255,255,255,0.08)",
                      border: musicCat===i ? "1px solid rgba(124,58,237,0.9)" : "1px solid rgba(255,255,255,0.1)",
                      color: musicCat===i ? "white" : "rgba(255,255,255,0.55)",
                    }}>
                    <span className={musicCat===i ? "flag-wave" : ""} style={{ fontSize:14, lineHeight:1 }}>{cat.flag}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* ── INTERNET search results (iTunes API) ── */}
            {musicQuery.length >= 2 && musicApiResults.length > 0 && (
              <div className="mt-1 max-h-52 overflow-y-auto" style={{ scrollbarWidth:"none" }}>
                <div className="flex items-center gap-1.5 px-4 py-1">
                  <span className="text-[10px] font-bold text-purple-400">🌐 iTunes</span>
                  <span className="text-[10px] text-white/30">{musicApiResults.length} natija</span>
                </div>
                {musicApiResults.map((song, i) => {
                  const name = `${song.artist} — ${song.title}`;
                  const isSelected = audioName === name;
                  return (
                    <button key={i}
                      onClick={() => { setAudioName(name); setMusicQuery(name); setMusicApiResults([]); }}
                      className="w-full flex items-center gap-3 px-4 py-2 transition-all"
                      style={{
                        background: isSelected ? "rgba(124,58,237,0.18)" : "transparent",
                        borderLeft: isSelected ? "2.5px solid #7c3aed" : "2.5px solid transparent",
                      }}>
                      {song.artwork ? (
                        <img src={song.artwork} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                          style={{ border:"1px solid rgba(255,255,255,0.1)" }} />
                      ) : (
                        <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center"
                          style={{ background:"rgba(124,58,237,0.3)" }}>
                          <Music className="w-4 h-4 text-purple-300" />
                        </div>
                      )}
                      <div className="flex flex-col items-start flex-1 min-w-0">
                        <span className="text-[13px] font-semibold text-white truncate w-full text-left leading-tight">{song.title}</span>
                        <span className="text-[10px] text-white/40 truncate w-full text-left">{song.artist}</span>
                        {song.album && <span className="text-[9px] text-white/25 truncate w-full text-left">{song.album}</span>}
                      </div>
                      {isSelected ? (
                        <div className="flex items-end gap-0.5 flex-shrink-0">
                          <span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" />
                        </div>
                      ) : (
                        <span className="text-white/20 flex-shrink-0 text-xs">▶</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Local songs list (always shown below internet results) ── */}
            <div className="mt-1 max-h-48 overflow-y-auto" style={{ scrollbarWidth:"none" }}>
              {musicQuery && musicApiResults.length === 0 && (
                <p className="text-[10px] text-white/30 px-4 py-1">
                  📁 Lokal: {musicSuggestions.length} natija
                </p>
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
                      onClick={() => { setAudioName(song); setMusicQuery(song); setMusicApiResults([]); }}
                      className="w-full flex items-center gap-3 px-4 py-2 transition-all"
                      style={{
                        background: isSelected ? "rgba(124,58,237,0.18)" : "transparent",
                        borderLeft: isSelected ? "2.5px solid #7c3aed" : "2.5px solid transparent",
                      }}>
                      <span className="flex-shrink-0 text-base leading-none">{countryFlag}</span>
                      <div className="flex flex-col items-start flex-1 min-w-0">
                        <span className="text-[13px] font-semibold text-white truncate w-full text-left leading-tight">{title}</span>
                        <span className="text-[10px] text-white/40 truncate w-full text-left">{artist}</span>
                      </div>
                      {isSelected ? (
                        <div className="flex items-end gap-0.5 flex-shrink-0">
                          <span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" />
                        </div>
                      ) : (
                        <span className="text-white/20 flex-shrink-0 text-xs">▶</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <p className="text-center text-white/20 text-[10px] pt-1">
              🌐 Internet + 📁 {allSongs.length}+ lokal qo'shiq · {SONGS_BY_COUNTRY.length} mamlakat
            </p>
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
                          <img src={previews[0]} alt="" className="w-full h-full object-cover"
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
