import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Eye, EyeOff, AlertCircle, Search, Check, X, Globe } from "lucide-react";
import NexusLogo from "@/components/NexusLogo";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { LANGUAGES, type LangCode, applyRTL } from "@/lib/i18n";
import SafetyConsentModal from "@/components/SafetyConsentModal";

/* ─── Popular languages shown first ──────────────────────────── */
const POPULAR = ["uz", "en", "ru", "zh", "ar", "es", "fr", "hi", "tr", "de", "ja", "ko"];

/* ─── All country dial codes (249 countries & territories) ──── */
const COUNTRIES = [
  /* ── Prioritized ── */
  { iso:"UZ", flag:"🇺🇿", name:"O'zbekiston",              dial:"+998" },
  { iso:"RU", flag:"🇷🇺", name:"Rossiya",                  dial:"+7"   },
  { iso:"KZ", flag:"🇰🇿", name:"Qozog'iston",              dial:"+7"   },
  { iso:"KG", flag:"🇰🇬", name:"Qirg'iziston",             dial:"+996" },
  { iso:"TJ", flag:"🇹🇯", name:"Tojikiston",               dial:"+992" },
  { iso:"TM", flag:"🇹🇲", name:"Turkmaniston",             dial:"+993" },
  { iso:"AZ", flag:"🇦🇿", name:"Ozarbayjon",               dial:"+994" },
  { iso:"TR", flag:"🇹🇷", name:"Turkiya",                  dial:"+90"  },
  { iso:"US", flag:"🇺🇸", name:"AQSh",                     dial:"+1"   },
  { iso:"GB", flag:"🇬🇧", name:"Britaniya",                dial:"+44"  },
  { iso:"CN", flag:"🇨🇳", name:"Xitoy",                    dial:"+86"  },
  { iso:"IN", flag:"🇮🇳", name:"Hindiston",                dial:"+91"  },
  { iso:"DE", flag:"🇩🇪", name:"Germaniya",                dial:"+49"  },
  { iso:"FR", flag:"🇫🇷", name:"Fransiya",                 dial:"+33"  },
  /* ── Europe ── */
  { iso:"AL", flag:"🇦🇱", name:"Albaniya",                 dial:"+355" },
  { iso:"AD", flag:"🇦🇩", name:"Andorra",                  dial:"+376" },
  { iso:"AT", flag:"🇦🇹", name:"Avstriya",                 dial:"+43"  },
  { iso:"BY", flag:"🇧🇾", name:"Belarus",                  dial:"+375" },
  { iso:"BE", flag:"🇧🇪", name:"Belgiya",                  dial:"+32"  },
  { iso:"BA", flag:"🇧🇦", name:"Bosniya va Gersegovina",   dial:"+387" },
  { iso:"BG", flag:"🇧🇬", name:"Bolgariya",                dial:"+359" },
  { iso:"HR", flag:"🇭🇷", name:"Xorvatiya",                dial:"+385" },
  { iso:"CY", flag:"🇨🇾", name:"Kipr",                     dial:"+357" },
  { iso:"CZ", flag:"🇨🇿", name:"Chexiya",                  dial:"+420" },
  { iso:"DK", flag:"🇩🇰", name:"Daniya",                   dial:"+45"  },
  { iso:"EE", flag:"🇪🇪", name:"Estoniya",                 dial:"+372" },
  { iso:"FI", flag:"🇫🇮", name:"Finlandiya",               dial:"+358" },
  { iso:"GE", flag:"🇬🇪", name:"Gruziya",                  dial:"+995" },
  { iso:"GR", flag:"🇬🇷", name:"Gretsiya",                 dial:"+30"  },
  { iso:"HU", flag:"🇭🇺", name:"Vengriya",                 dial:"+36"  },
  { iso:"IS", flag:"🇮🇸", name:"Islandiya",                dial:"+354" },
  { iso:"IE", flag:"🇮🇪", name:"Irlandiya",                dial:"+353" },
  { iso:"IT", flag:"🇮🇹", name:"Italiya",                  dial:"+39"  },
  { iso:"XK", flag:"🇽🇰", name:"Kosovo",                   dial:"+383" },
  { iso:"LV", flag:"🇱🇻", name:"Latviya",                  dial:"+371" },
  { iso:"LI", flag:"🇱🇮", name:"Lixtenshtayn",            dial:"+423" },
  { iso:"LT", flag:"🇱🇹", name:"Litva",                    dial:"+370" },
  { iso:"LU", flag:"🇱🇺", name:"Lyuksemburg",              dial:"+352" },
  { iso:"MT", flag:"🇲🇹", name:"Malta",                    dial:"+356" },
  { iso:"MD", flag:"🇲🇩", name:"Moldova",                  dial:"+373" },
  { iso:"MC", flag:"🇲🇨", name:"Monako",                   dial:"+377" },
  { iso:"ME", flag:"🇲🇪", name:"Chernogoriya",             dial:"+382" },
  { iso:"NL", flag:"🇳🇱", name:"Niderlandiya",             dial:"+31"  },
  { iso:"MK", flag:"🇲🇰", name:"Shimoliy Makedoniya",      dial:"+389" },
  { iso:"NO", flag:"🇳🇴", name:"Norvegiya",                dial:"+47"  },
  { iso:"PL", flag:"🇵🇱", name:"Polsha",                   dial:"+48"  },
  { iso:"PT", flag:"🇵🇹", name:"Portugaliya",              dial:"+351" },
  { iso:"RO", flag:"🇷🇴", name:"Ruminiya",                 dial:"+40"  },
  { iso:"SM", flag:"🇸🇲", name:"San-Marino",               dial:"+378" },
  { iso:"RS", flag:"🇷🇸", name:"Serbiya",                  dial:"+381" },
  { iso:"SK", flag:"🇸🇰", name:"Slovakiya",                dial:"+421" },
  { iso:"SI", flag:"🇸🇮", name:"Sloveniya",                dial:"+386" },
  { iso:"ES", flag:"🇪🇸", name:"Ispaniya",                 dial:"+34"  },
  { iso:"SE", flag:"🇸🇪", name:"Shvetsiya",                dial:"+46"  },
  { iso:"CH", flag:"🇨🇭", name:"Shveytsariya",             dial:"+41"  },
  { iso:"UA", flag:"🇺🇦", name:"Ukraina",                  dial:"+380" },
  { iso:"VA", flag:"🇻🇦", name:"Vatikan",                  dial:"+39"  },
  { iso:"AM", flag:"🇦🇲", name:"Armaniston",               dial:"+374" },
  /* ── Asia ── */
  { iso:"AF", flag:"🇦🇫", name:"Afg'oniston",              dial:"+93"  },
  { iso:"BH", flag:"🇧🇭", name:"Bahrayn",                  dial:"+973" },
  { iso:"BD", flag:"🇧🇩", name:"Bangladesh",               dial:"+880" },
  { iso:"BT", flag:"🇧🇹", name:"Butan",                    dial:"+975" },
  { iso:"BN", flag:"🇧🇳", name:"Bruney",                   dial:"+673" },
  { iso:"KH", flag:"🇰🇭", name:"Kambodja",                 dial:"+855" },
  { iso:"TL", flag:"🇹🇱", name:"Sharqiy Timor",            dial:"+670" },
  { iso:"HK", flag:"🇭🇰", name:"Gonkong",                  dial:"+852" },
  { iso:"ID", flag:"🇮🇩", name:"Indoneziya",               dial:"+62"  },
  { iso:"IR", flag:"🇮🇷", name:"Eron",                     dial:"+98"  },
  { iso:"IQ", flag:"🇮🇶", name:"Iroq",                     dial:"+964" },
  { iso:"IL", flag:"🇮🇱", name:"Isroil",                   dial:"+972" },
  { iso:"JP", flag:"🇯🇵", name:"Yaponiya",                 dial:"+81"  },
  { iso:"JO", flag:"🇯🇴", name:"Iordaniya",                dial:"+962" },
  { iso:"KW", flag:"🇰🇼", name:"Quvayt",                   dial:"+965" },
  { iso:"LA", flag:"🇱🇦", name:"Laos",                     dial:"+856" },
  { iso:"LB", flag:"🇱🇧", name:"Livan",                    dial:"+961" },
  { iso:"MO", flag:"🇲🇴", name:"Makao",                    dial:"+853" },
  { iso:"MY", flag:"🇲🇾", name:"Malayziya",                dial:"+60"  },
  { iso:"MV", flag:"🇲🇻", name:"Maldivlar",                dial:"+960" },
  { iso:"MN", flag:"🇲🇳", name:"Mo'g'uliston",             dial:"+976" },
  { iso:"MM", flag:"🇲🇲", name:"Myanma",                   dial:"+95"  },
  { iso:"NP", flag:"🇳🇵", name:"Nepal",                    dial:"+977" },
  { iso:"KP", flag:"🇰🇵", name:"Shimoliy Koreya",          dial:"+850" },
  { iso:"OM", flag:"🇴🇲", name:"Ummon",                    dial:"+968" },
  { iso:"PK", flag:"🇵🇰", name:"Pokiston",                 dial:"+92"  },
  { iso:"PS", flag:"🇵🇸", name:"Falastin",                 dial:"+970" },
  { iso:"PH", flag:"🇵🇭", name:"Filippin",                 dial:"+63"  },
  { iso:"QA", flag:"🇶🇦", name:"Qatar",                    dial:"+974" },
  { iso:"SA", flag:"🇸🇦", name:"Saudiya Arabistoni",       dial:"+966" },
  { iso:"SG", flag:"🇸🇬", name:"Singapur",                 dial:"+65"  },
  { iso:"KR", flag:"🇰🇷", name:"Janubiy Koreya",           dial:"+82"  },
  { iso:"LK", flag:"🇱🇰", name:"Shri-Lanka",               dial:"+94"  },
  { iso:"SY", flag:"🇸🇾", name:"Suriya",                   dial:"+963" },
  { iso:"TW", flag:"🇹🇼", name:"Tayvan",                   dial:"+886" },
  { iso:"TH", flag:"🇹🇭", name:"Tailand",                  dial:"+66"  },
  { iso:"AE", flag:"🇦🇪", name:"BAA",                      dial:"+971" },
  { iso:"VN", flag:"🇻🇳", name:"Vyetnam",                  dial:"+84"  },
  { iso:"YE", flag:"🇾🇪", name:"Yaman",                    dial:"+967" },
  /* ── Africa ── */
  { iso:"DZ", flag:"🇩🇿", name:"Jazoir",                   dial:"+213" },
  { iso:"AO", flag:"🇦🇴", name:"Angola",                   dial:"+244" },
  { iso:"BJ", flag:"🇧🇯", name:"Benin",                    dial:"+229" },
  { iso:"BW", flag:"🇧🇼", name:"Botsvana",                 dial:"+267" },
  { iso:"BF", flag:"🇧🇫", name:"Burkina-Faso",             dial:"+226" },
  { iso:"BI", flag:"🇧🇮", name:"Burundi",                  dial:"+257" },
  { iso:"CV", flag:"🇨🇻", name:"Kabo-Verde",               dial:"+238" },
  { iso:"CM", flag:"🇨🇲", name:"Kamerun",                  dial:"+237" },
  { iso:"CF", flag:"🇨🇫", name:"Markaziy Afrika Resp.",    dial:"+236" },
  { iso:"TD", flag:"🇹🇩", name:"Chad",                     dial:"+235" },
  { iso:"KM", flag:"🇰🇲", name:"Komor orollari",           dial:"+269" },
  { iso:"CG", flag:"🇨🇬", name:"Kongo Resp.",              dial:"+242" },
  { iso:"CD", flag:"🇨🇩", name:"Kongo DR",                 dial:"+243" },
  { iso:"CI", flag:"🇨🇮", name:"Kot-d'Ivuar",              dial:"+225" },
  { iso:"DJ", flag:"🇩🇯", name:"Jibuti",                   dial:"+253" },
  { iso:"EG", flag:"🇪🇬", name:"Misr",                     dial:"+20"  },
  { iso:"GQ", flag:"🇬🇶", name:"Ekvatorial Gvineya",       dial:"+240" },
  { iso:"ER", flag:"🇪🇷", name:"Eritreya",                 dial:"+291" },
  { iso:"SZ", flag:"🇸🇿", name:"Esvatini",                 dial:"+268" },
  { iso:"ET", flag:"🇪🇹", name:"Efiopiya",                 dial:"+251" },
  { iso:"GA", flag:"🇬🇦", name:"Gabon",                    dial:"+241" },
  { iso:"GM", flag:"🇬🇲", name:"Gambiya",                  dial:"+220" },
  { iso:"GH", flag:"🇬🇭", name:"Gana",                     dial:"+233" },
  { iso:"GN", flag:"🇬🇳", name:"Gvineya",                  dial:"+224" },
  { iso:"GW", flag:"🇬🇼", name:"Gvineya-Bisau",            dial:"+245" },
  { iso:"KE", flag:"🇰🇪", name:"Keniya",                   dial:"+254" },
  { iso:"LS", flag:"🇱🇸", name:"Lesoto",                   dial:"+266" },
  { iso:"LR", flag:"🇱🇷", name:"Liberiya",                 dial:"+231" },
  { iso:"LY", flag:"🇱🇾", name:"Liviya",                   dial:"+218" },
  { iso:"MG", flag:"🇲🇬", name:"Madagaskar",               dial:"+261" },
  { iso:"MW", flag:"🇲🇼", name:"Malavi",                   dial:"+265" },
  { iso:"ML", flag:"🇲🇱", name:"Mali",                     dial:"+223" },
  { iso:"MR", flag:"🇲🇷", name:"Mavritaniya",              dial:"+222" },
  { iso:"MU", flag:"🇲🇺", name:"Mavrikiy",                 dial:"+230" },
  { iso:"MA", flag:"🇲🇦", name:"Marokash",                 dial:"+212" },
  { iso:"MZ", flag:"🇲🇿", name:"Mozambik",                 dial:"+258" },
  { iso:"NA", flag:"🇳🇦", name:"Namibiya",                 dial:"+264" },
  { iso:"NE", flag:"🇳🇪", name:"Niger",                    dial:"+227" },
  { iso:"NG", flag:"🇳🇬", name:"Nigeriya",                 dial:"+234" },
  { iso:"RW", flag:"🇷🇼", name:"Ruanda",                   dial:"+250" },
  { iso:"ST", flag:"🇸🇹", name:"San-Tome va Prinsipi",     dial:"+239" },
  { iso:"SN", flag:"🇸🇳", name:"Senegal",                  dial:"+221" },
  { iso:"SC", flag:"🇸🇨", name:"Seyshel",                  dial:"+248" },
  { iso:"SL", flag:"🇸🇱", name:"Syerra-Leone",             dial:"+232" },
  { iso:"SO", flag:"🇸🇴", name:"Somali",                   dial:"+252" },
  { iso:"ZA", flag:"🇿🇦", name:"Janubiy Afrika",           dial:"+27"  },
  { iso:"SS", flag:"🇸🇸", name:"Janubiy Sudan",            dial:"+211" },
  { iso:"SD", flag:"🇸🇩", name:"Sudan",                    dial:"+249" },
  { iso:"TZ", flag:"🇹🇿", name:"Tanzaniya",                dial:"+255" },
  { iso:"TG", flag:"🇹🇬", name:"Togo",                     dial:"+228" },
  { iso:"TN", flag:"🇹🇳", name:"Tunis",                    dial:"+216" },
  { iso:"UG", flag:"🇺🇬", name:"Uganda",                   dial:"+256" },
  { iso:"ZM", flag:"🇿🇲", name:"Zambiya",                  dial:"+260" },
  { iso:"ZW", flag:"🇿🇼", name:"Zimbabve",                 dial:"+263" },
  /* ── Americas ── */
  { iso:"AG", flag:"🇦🇬", name:"Antigua va Barbuda",       dial:"+1268"},
  { iso:"AR", flag:"🇦🇷", name:"Argentina",                dial:"+54"  },
  { iso:"BS", flag:"🇧🇸", name:"Bagama orollari",          dial:"+1242"},
  { iso:"BB", flag:"🇧🇧", name:"Barbados",                 dial:"+1246"},
  { iso:"BZ", flag:"🇧🇿", name:"Beliz",                    dial:"+501" },
  { iso:"BO", flag:"🇧🇴", name:"Boliviya",                 dial:"+591" },
  { iso:"BR", flag:"🇧🇷", name:"Braziliya",                dial:"+55"  },
  { iso:"CA", flag:"🇨🇦", name:"Kanada",                   dial:"+1"   },
  { iso:"CL", flag:"🇨🇱", name:"Chili",                    dial:"+56"  },
  { iso:"CO", flag:"🇨🇴", name:"Kolumbiya",                dial:"+57"  },
  { iso:"CR", flag:"🇨🇷", name:"Kosta-Rika",               dial:"+506" },
  { iso:"CU", flag:"🇨🇺", name:"Kuba",                     dial:"+53"  },
  { iso:"DM", flag:"🇩🇲", name:"Dominika",                 dial:"+1767"},
  { iso:"DO", flag:"🇩🇴", name:"Dominikan Respublikasi",   dial:"+1809"},
  { iso:"EC", flag:"🇪🇨", name:"Ekvador",                  dial:"+593" },
  { iso:"SV", flag:"🇸🇻", name:"Salvador",                 dial:"+503" },
  { iso:"GD", flag:"🇬🇩", name:"Grenada",                  dial:"+1473"},
  { iso:"GT", flag:"🇬🇹", name:"Gvatemala",                dial:"+502" },
  { iso:"GY", flag:"🇬🇾", name:"Gayana",                   dial:"+592" },
  { iso:"HT", flag:"🇭🇹", name:"Gaiti",                    dial:"+509" },
  { iso:"HN", flag:"🇭🇳", name:"Gonduras",                 dial:"+504" },
  { iso:"JM", flag:"🇯🇲", name:"Yamayka",                  dial:"+1876"},
  { iso:"MX", flag:"🇲🇽", name:"Meksika",                  dial:"+52"  },
  { iso:"NI", flag:"🇳🇮", name:"Nikaragua",                dial:"+505" },
  { iso:"PA", flag:"🇵🇦", name:"Panama",                   dial:"+507" },
  { iso:"PY", flag:"🇵🇾", name:"Paragvay",                 dial:"+595" },
  { iso:"PE", flag:"🇵🇪", name:"Peru",                     dial:"+51"  },
  { iso:"KN", flag:"🇰🇳", name:"Sent-Kits va Nevis",       dial:"+1869"},
  { iso:"LC", flag:"🇱🇨", name:"Sent-Lusiya",              dial:"+1758"},
  { iso:"VC", flag:"🇻🇨", name:"Sent-Vinsent va Grenadiny",dial:"+1784"},
  { iso:"SR", flag:"🇸🇷", name:"Surinam",                  dial:"+597" },
  { iso:"TT", flag:"🇹🇹", name:"Trinidad va Tobago",       dial:"+1868"},
  { iso:"UY", flag:"🇺🇾", name:"Urugvay",                  dial:"+598" },
  { iso:"VE", flag:"🇻🇪", name:"Venesuela",                dial:"+58"  },
  /* ── Oceania ── */
  { iso:"AU", flag:"🇦🇺", name:"Avstraliya",               dial:"+61"  },
  { iso:"FJ", flag:"🇫🇯", name:"Fiji",                     dial:"+679" },
  { iso:"KI", flag:"🇰🇮", name:"Kiribati",                 dial:"+686" },
  { iso:"MH", flag:"🇲🇭", name:"Marshall orollari",        dial:"+692" },
  { iso:"FM", flag:"🇫🇲", name:"Mikroneziya",              dial:"+691" },
  { iso:"NR", flag:"🇳🇷", name:"Nauru",                    dial:"+674" },
  { iso:"NZ", flag:"🇳🇿", name:"Yangi Zelandiya",          dial:"+64"  },
  { iso:"PW", flag:"🇵🇼", name:"Palau",                    dial:"+680" },
  { iso:"PG", flag:"🇵🇬", name:"Papua Yangi Gvineya",      dial:"+675" },
  { iso:"WS", flag:"🇼🇸", name:"Samoa",                    dial:"+685" },
  { iso:"SB", flag:"🇸🇧", name:"Solomon orollari",         dial:"+677" },
  { iso:"TO", flag:"🇹🇴", name:"Tonga",                    dial:"+676" },
  { iso:"TV", flag:"🇹🇻", name:"Tuvalu",                   dial:"+688" },
  { iso:"VU", flag:"🇻🇺", name:"Vanuatu",                  dial:"+678" },
  /* ── Territories & Special ── */
  { iso:"GI", flag:"🇬🇮", name:"Gibraltar",                dial:"+350" },
  { iso:"GP", flag:"🇬🇵", name:"Gvadelupa",                dial:"+590" },
  { iso:"GU", flag:"🇬🇺", name:"Guam",                     dial:"+1671"},
  { iso:"MQ", flag:"🇲🇶", name:"Martinika",                dial:"+596" },
  { iso:"YT", flag:"🇾🇹", name:"Mayotta",                  dial:"+262" },
  { iso:"RE", flag:"🇷🇪", name:"Reyunyon",                 dial:"+262" },
  { iso:"PR", flag:"🇵🇷", name:"Puerto-Riko",              dial:"+1787"},
  { iso:"VI", flag:"🇻🇮", name:"AQSh Virgin orollari",     dial:"+1340"},
  { iso:"PM", flag:"🇵🇲", name:"Sen-Pyer va Mikelon",      dial:"+508" },
  { iso:"NC", flag:"🇳🇨", name:"Yangi Kaledoniya",         dial:"+687" },
  { iso:"PF", flag:"🇵🇫", name:"Fransuz Polineziyasi",     dial:"+689" },
  { iso:"FK", flag:"🇫🇰", name:"Folklend orollari",        dial:"+500" },
  { iso:"FO", flag:"🇫🇴", name:"Farerlar",                 dial:"+298" },
  { iso:"GL", flag:"🇬🇱", name:"Grenlandiya",              dial:"+299" },
  { iso:"JE", flag:"🇯🇪", name:"Jersi",                    dial:"+44"  },
  { iso:"GG", flag:"🇬🇬", name:"Gernsi",                   dial:"+44"  },
  { iso:"IM", flag:"🇮🇲", name:"Men oroli",                dial:"+44"  },
  { iso:"TC", flag:"🇹🇨", name:"Turks va Kaykos",          dial:"+1649"},
  { iso:"KY", flag:"🇰🇾", name:"Kayman orollari",          dial:"+1345"},
  { iso:"VG", flag:"🇻🇬", name:"Britaniya Virgin orollari",dial:"+1284"},
  { iso:"BM", flag:"🇧🇲", name:"Bermuda",                  dial:"+1441"},
  { iso:"AW", flag:"🇦🇼", name:"Aruba",                    dial:"+297" },
  { iso:"CW", flag:"🇨🇼", name:"Kyurasao",                 dial:"+599" },
  { iso:"SX", flag:"🇸🇽", name:"Sint-Marten",              dial:"+1721"},
  { iso:"BQ", flag:"🇧🇶", name:"Karib Niderlandiyasi",     dial:"+599" },
  { iso:"MF", flag:"🇲🇫", name:"Sen-Marten",               dial:"+590" },
  { iso:"MS", flag:"🇲🇸", name:"Montserrat",               dial:"+1664"},
  { iso:"AI", flag:"🇦🇮", name:"Angilya",                  dial:"+1264"},
  { iso:"CX", flag:"🇨🇽", name:"Rojdestvo oroli",          dial:"+61"  },
  { iso:"CC", flag:"🇨🇨", name:"Kokos orollari",           dial:"+61"  },
  { iso:"NF", flag:"🇳🇫", name:"Norfolk oroli",            dial:"+672" },
  { iso:"CK", flag:"🇨🇰", name:"Kuk orollari",             dial:"+682" },
  { iso:"NU", flag:"🇳🇺", name:"Niue",                     dial:"+683" },
  { iso:"TK", flag:"🇹🇰", name:"Tokelau",                  dial:"+690" },
  { iso:"WF", flag:"🇼🇫", name:"Uollis va Futuna",         dial:"+681" },
  { iso:"IO", flag:"🇮🇴", name:"Britaniya Hindiston okeani hududi", dial:"+246" },
  { iso:"SH", flag:"🇸🇭", name:"Muqaddas Yelena",          dial:"+290" },
  { iso:"AC", flag:"🇦🇨", name:"Vознесения oroli",         dial:"+247" },
  { iso:"TA", flag:"🇹🇦", name:"Tristan-da-Kunya",         dial:"+290" },
  { iso:"EH", flag:"🇪🇭", name:"G'arbiy Saxara",           dial:"+212" },
  { iso:"PM", flag:"🇵🇲", name:"Sen-Batelmemi",            dial:"+590" },
] as const;

type Country = typeof COUNTRIES[number];

/* ─── Phone Input with Country Picker ───────────────────────── */
function PhoneInput({ value, dialCode, onChangeValue, onChangeDialCode }:{
  value: string;
  dialCode: string;
  onChangeValue: (v:string)=>void;
  onChangeDialCode: (d:string, flag:string)=>void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = COUNTRIES.find(c => c.dial === dialCode) ?? COUNTRIES[0];

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const q = search.toLowerCase();
  const filtered = COUNTRIES.filter(c =>
    !q || c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.iso.toLowerCase().includes(q)
  );

  return (
    <div ref={ref} className="relative">
      <div className="flex gap-2">
        {/* Country selector button */}
        <button type="button" onClick={()=>setOpen(o=>!o)}
          className="flex items-center gap-1.5 px-3 py-3 rounded-xl text-sm font-semibold shrink-0 transition-all"
          style={{
            background:"rgba(30,12,4,0.9)", border:`1px solid ${open?"rgba(160,90,30,0.7)":"#2a1408"}`,
            color:"#c8a060", minWidth:80,
            boxShadow: open ? "0 0 12px rgba(180,90,20,0.2)" : "none",
          }}>
          <span style={{fontSize:18,lineHeight:1}}>{selected.flag}</span>
          <span style={{fontSize:11,color:"#a07040"}}>{selected.dial}</span>
          <motion.span
            animate={{rotate:open?180:0}} transition={{duration:0.2}}
            style={{fontSize:8,color:"rgba(160,90,30,0.6)",marginLeft:1}}>▼</motion.span>
        </button>
        {/* Number input */}
        <input
          type="tel"
          value={value}
          onChange={e=>onChangeValue(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
          style={{background:"rgba(30,12,4,0.9)", border:"1px solid #2a1408", color:"#c8a060"}}
          placeholder="90 123 45 67"
          autoComplete="tel-national"
        />
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{opacity:0,y:-6,scale:0.97}}
            animate={{opacity:1,y:0,scale:1}}
            exit={{opacity:0,y:-4,scale:0.97}}
            transition={{duration:0.15}}
            style={{
              position:"absolute",top:"calc(100% + 6px)",left:0,right:0,zIndex:200,
              background:"rgba(10,5,2,0.98)", border:"1px solid rgba(100,50,15,0.5)",
              borderRadius:14, overflow:"hidden",
              boxShadow:"0 20px 50px rgba(0,0,0,0.85)",
              backdropFilter:"blur(20px)",
            }}>
            {/* Search */}
            <div style={{padding:"10px 10px 6px", borderBottom:"1px solid rgba(80,35,8,0.4)"}}>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{color:"#7a4820"}}/>
                <input
                  autoFocus
                  value={search}
                  onChange={e=>setSearch(e.target.value)}
                  placeholder={t("auth.phone_search")}
                  className="w-full pl-8 pr-7 py-2 rounded-lg text-xs focus:outline-none"
                  style={{background:"rgba(25,10,3,0.9)", border:"1px solid rgba(80,35,8,0.5)", color:"#c8a060"}}
                />
                {search && (
                  <button onClick={()=>setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2" style={{color:"#7a4820"}}>
                    <X className="w-3 h-3"/>
                  </button>
                )}
              </div>
            </div>
            {/* List */}
            <div style={{maxHeight:220,overflowY:"auto",scrollbarWidth:"none"}}>
              {filtered.length === 0 && (
                <div style={{padding:"16px",textAlign:"center",fontSize:11,color:"rgba(160,90,30,0.5)"}}>{t("settings.lt_not_found")}</div>
              )}
              {filtered.map(c=>{
                const active = c.dial === dialCode && c.iso === selected.iso;
                return (
                  <button key={c.iso} type="button"
                    onClick={()=>{ onChangeDialCode(c.dial, c.flag); setOpen(false); setSearch(""); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                    style={{
                      background: active?"rgba(100,50,10,0.35)":"transparent",
                      borderLeft: active?"2px solid rgba(200,120,40,0.7)":"2px solid transparent",
                    }}>
                    <span style={{fontSize:16,width:22,textAlign:"center",lineHeight:1}}>{c.flag}</span>
                    <span style={{fontSize:11,color:active?"#d4a960":"rgba(160,90,30,0.8)",flex:1,textAlign:"left"}}>{c.name}</span>
                    <span style={{fontSize:10,color:active?"#c89040":"rgba(120,60,20,0.6)",fontFamily:"monospace",fontWeight:700}}>{c.dial}</span>
                    {active && <Check className="w-3 h-3 shrink-0" style={{color:"#c8a040"}}/>}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── 3D Animated Language Switcher ─────────────────────────── */
function LangSwitcher() {
  const { i18n: i18nInst } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLDivElement>(null);

  const currentCode = i18nInst.language.split("-")[0] as LangCode;
  const currentLang = LANGUAGES.find(l => l.code === currentCode) ?? LANGUAGES[0];

  /* Close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* 3D tilt on hover */
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotX = useSpring(useTransform(mouseY, [-20, 20], [12, -12]), { stiffness: 300, damping: 20 });
  const rotY = useSpring(useTransform(mouseX, [-20, 20], [-12, 12]), { stiffness: 300, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };
  const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0); };

  const handleSelect = (code: LangCode) => {
    localStorage.setItem("olcha_lang", code);
    i18nInst.changeLanguage(code);
    applyRTL(code);
    setOpen(false);
    setSearch("");
  };

  const filtered = LANGUAGES.filter(l => {
    const q = search.toLowerCase();
    return !q || l.name.toLowerCase().includes(q) || l.native.toLowerCase().includes(q) || l.code.includes(q);
  });
  const popular = filtered.filter(l => POPULAR.includes(l.code));
  const others = filtered.filter(l => !POPULAR.includes(l.code));

  return (
    <div ref={ref} className="relative" style={{ zIndex: 100 }}>
      {/* 3D Globe Button */}
      <motion.div
        ref={btnRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ perspective: 600, transformStyle: "preserve-3d" }}
        whileTap={{ scale: 0.94 }}
      >
        <motion.button
          onClick={() => setOpen(v => !v)}
          style={{
            rotateX: rotX,
            rotateY: rotY,
            transformStyle: "preserve-3d",
            background: "linear-gradient(135deg, rgba(40,18,6,0.95) 0%, rgba(70,30,10,0.9) 100%)",
            border: "1px solid rgba(180,100,30,0.4)",
            boxShadow: open
              ? "0 0 22px rgba(200,120,40,0.5), inset 0 1px 0 rgba(255,200,100,0.15)"
              : "0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,200,100,0.08)",
            color: "#d4a96a",
          }}
          className="relative flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-semibold select-none overflow-hidden"
        >
          {/* Spinning ring behind the globe (CSS animation) */}
          <div className="relative w-7 h-7 flex-shrink-0" style={{ transformStyle: "preserve-3d" }}>
            {/* Globe orb */}
            <motion.div
              animate={{ rotateY: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{
                background: "radial-gradient(circle at 35% 35%, rgba(220,140,50,0.3), rgba(120,60,20,0.6))",
                boxShadow: "0 0 12px rgba(200,120,40,0.4), inset 0 0 8px rgba(0,0,0,0.5)",
                border: "1px solid rgba(200,140,60,0.3)",
                transformStyle: "preserve-3d",
              }}
            >
              <Globe className="w-3.5 h-3.5 text-amber-400/70" />
            </motion.div>
            {/* Flag overlay */}
            <div className="absolute inset-0 flex items-center justify-center text-base" style={{ lineHeight: 1 }}>
              {currentLang.flag}
            </div>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#c8a050" }}>
            {currentCode}
          </span>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            className="w-3 h-3 border-r-2 border-b-2 rounded-sm"
            style={{ borderColor: "rgba(200,160,80,0.6)", transform: open ? "rotate(225deg)" : "rotate(45deg)" }}
          />
        </motion.button>
      </motion.div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 mt-2 w-72 rounded-2xl overflow-hidden"
            style={{
              background: "rgba(12,6,2,0.97)",
              border: "1px solid rgba(120,60,20,0.5)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(180,100,30,0.15)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Search */}
            <div className="p-3 border-b" style={{ borderColor: "rgba(100,50,15,0.4)" }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#7a4820" }} />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search language..."
                  className="w-full pl-8 pr-8 py-2 rounded-xl text-xs focus:outline-none"
                  style={{
                    background: "rgba(30,12,4,0.9)",
                    border: "1px solid rgba(100,50,15,0.5)",
                    color: "#c8a060",
                  }}
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "#7a4820" }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Language list */}
            <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
              {!search && (
                <p className="px-3 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#5a3010" }}>
                  Popular
                </p>
              )}
              {popular.map(lang => (
                <LangOption key={lang.code} lang={lang} current={currentCode} onSelect={handleSelect} />
              ))}
              {others.length > 0 && (
                <>
                  {!search && (
                    <p className="px-3 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#5a3010" }}>
                      All languages
                    </p>
                  )}
                  {others.map(lang => (
                    <LangOption key={lang.code} lang={lang} current={currentCode} onSelect={handleSelect} />
                  ))}
                </>
              )}
              {filtered.length === 0 && (
                <div className="py-8 text-center text-xs" style={{ color: "#7a4820" }}>No results</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LangOption({ lang, current, onSelect }: {
  lang: (typeof LANGUAGES)[number]; current: string; onSelect: (c: LangCode) => void;
}) {
  const isCurrent = lang.code === current;
  return (
    <motion.button
      whileHover={{ x: 2 }}
      onClick={() => onSelect(lang.code)}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
      style={{
        background: isCurrent ? "rgba(120,60,15,0.3)" : "transparent",
        borderLeft: isCurrent ? "2px solid rgba(200,120,40,0.7)" : "2px solid transparent",
      }}
    >
      <span className="text-lg">{lang.flag}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: isCurrent ? "#d4a960" : "#8a5530" }}>{lang.native}</p>
        <p className="text-[10px] truncate" style={{ color: "#5a3010" }}>{lang.name}</p>
      </div>
      {lang.rtl && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: "rgba(120,60,15,0.4)", color: "#7a4820" }}>RTL</span>}
      {isCurrent && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#c8a040" }} />}
    </motion.button>
  );
}

/* ─── Main Login Page ────────────────────────────────────────── */
export default function LoginPage() {
  const { t } = useTranslation();
  const { i18n: i18nInst } = useTranslation();
  const [show, setShow] = useState(false);
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConsent, setShowConsent] = useState(false);
  const [, setLocation] = useLocation();
  const { login, register } = useAuth();

  const [form, setForm] = useState({
    username: "", displayName: "", email: "", phone: "", password: ""
  });
  const [dialCode, setDialCode] = useState("+998");

  // OTP state
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setError("");
    if (k === "email") { setEmailVerified(false); setOtpStep(false); }
  };

  const startCountdown = () => {
    setCountdown(60);
    const iv = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(iv); return 0; } return c - 1; });
    }, 1000);
  };

  const sendOtp = async () => {
    if (!form.email.includes("@")) { setError("Email manzil noto'g'ri"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) { setError(data.error || "Server xatosi. Keyinroq urinib ko'ring."); return; }
      setOtpStep(true);
      setOtpCode("");
      startCountdown();
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (otpCode.length !== 6) { setError("6 raqamli kodni kiriting"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp: otpCode }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) { setError(data.error || "Kod noto'g'ri"); return; }
      setEmailVerified(true);
      setOtpStep(false);
    } finally { setLoading(false); }
  };

  const doRegister = async () => {
    if (!emailVerified) { setError("Avval email ni tasdiqlang"); return; }
    if (!form.phone.trim()) { setError(t("auth.phone_req")); return; }
    const fullPhone = dialCode + form.phone.replace(/[^\d]/g, "");
    setLoading(true);
    setError("");
    try {
      const res = await register(form.username, form.displayName, form.email, fullPhone, form.password);
      if (res.error) { setError(res.error); return; }
      setLocation("/");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (tab === "login") {
      setLoading(true);
      try {
        const res = await login(form.email, form.password);
        if (res.error) { setError(res.error); return; }
        setLocation("/");
      } finally {
        setLoading(false);
      }
    } else {
      if (!form.username.trim()) { setError(t("auth.username_req")); return; }
      if (!form.displayName.trim()) { setError(t("auth.name_req")); return; }
      setShowConsent(true);
    }
  };

  return (
    <div className="min-h-screen flex relative" style={{ background: "#0a0604" }}>

      {/* ── Language switcher (absolute top-right) ── */}
      <div className="absolute right-4 z-50" style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
        <LangSwitcher />
      </div>

      {/* ── Left panel ── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center">
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 60% 50% at 50% 42%, rgba(180,10,0,0.13) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div className="relative z-10 text-center flex flex-col items-center gap-6">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <NexusLogo ringSize={130} showText={false} />
          </motion.div>
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <span style={{
              display: "block",
              fontFamily: "'Georgia', 'Times New Roman', serif",
              letterSpacing: "0.35em",
              fontWeight: 400,
              fontSize: "2.6rem",
              background: "linear-gradient(180deg, #d4a96a 0%, #f0c060 28%, #a06030 62%, #6a3a18 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              OlCha
            </span>
          </motion.div>
          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{ color: "#6b5040", maxWidth: 320, lineHeight: 1.6, fontSize: "0.95rem" }}
          >
            {t("auth.tagline")}
          </motion.p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center px-6" style={{ background: "rgba(10,6,4,0.5)" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <NexusLogo ringSize={38} showText={true} fontSize="1.1rem" letterSpacing="0.2em" />
          </div>

          {/* Tab */}
          <div className="flex rounded-xl p-1 mb-7" style={{ background: "rgba(40,20,8,0.8)", border: "1px solid #2a1408" }}>
            {(["login", "signup"] as const).map(tabKey => (
              <motion.button
                key={tabKey}
                type="button"
                onClick={() => { setTab(tabKey); setError(""); }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="flex-1 py-2 rounded-lg text-sm font-semibold relative overflow-hidden"
                style={tab === tabKey
                  ? {
                      background: "linear-gradient(135deg, rgba(100,48,16,0.95) 0%, rgba(80,38,12,0.9) 100%)",
                      color: "#d4a96a",
                      border: "1px solid rgba(160,90,30,0.5)",
                      boxShadow: "0 0 14px rgba(180,90,20,0.25), inset 0 1px 0 rgba(255,180,80,0.1)",
                    }
                  : {
                      color: "#5a3a20",
                      border: "1px solid transparent",
                    }
                }
              >
                {tab === tabKey && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(90deg, transparent 0%, rgba(255,200,100,0.18) 50%, transparent 100%)",
                    }}
                    animate={{ x: ["-110%", "210%"] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }}
                  />
                )}
                <span style={{ position: "relative", zIndex: 1 }}>
                  {tabKey === "login" ? t("auth.login") : t("auth.register")}
                </span>
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={tab}
              initial={{ opacity: 0, x: tab === "login" ? -12 : 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tab === "login" ? 12 : -12 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {tab === "signup" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#6a4020" }}>
                      {t("auth.username")}
                    </label>
                    <input
                      value={form.username}
                      onChange={set("username")}
                      required
                      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                      style={{ background: "rgba(30,12,4,0.9)", border: "1px solid #2a1408", color: "#c8a060" }}
                      placeholder="asilbek_dev"
                      autoComplete="username"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#6a4020" }}>
                      {t("auth.full_name")}
                    </label>
                    <input
                      value={form.displayName}
                      onChange={set("displayName")}
                      required
                      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                      style={{ background: "rgba(30,12,4,0.9)", border: "1px solid #2a1408", color: "#c8a060" }}
                      placeholder="Asilbek Karimov"
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#6a4020" }}>
                      {t("auth.phone")}
                    </label>
                    <PhoneInput
                      value={form.phone}
                      dialCode={dialCode}
                      onChangeValue={v => { setForm(f=>({...f, phone:v})); setError(""); }}
                      onChangeDialCode={(d) => setDialCode(d)}
                    />
                    <p className="text-[10px] mt-1" style={{ color: "#4a2810" }}>
                      {t("auth.phone_hint")}
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#6a4020" }}>
                  {t("auth.email")}
                  {tab === "signup" && emailVerified && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: "#5cb85c" }}>
                      <Check className="w-3 h-3" /> Tasdiqlandi
                    </span>
                  )}
                </label>

                {/* Email input + Send OTP button (signup only) */}
                {tab === "signup" ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={form.email}
                        onChange={set("email")}
                        required
                        disabled={emailVerified}
                        className="flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                        style={{
                          background: emailVerified ? "rgba(20,8,2,0.9)" : "rgba(30,12,4,0.9)",
                          border: emailVerified ? "1px solid rgba(92,184,92,0.3)" : "1px solid #2a1408",
                          color: emailVerified ? "#5cb85c" : "#c8a060",
                          opacity: emailVerified ? 0.8 : 1,
                        }}
                        placeholder="siz@olcha.uz"
                        autoComplete="email"
                      />
                      {!emailVerified && (
                        <button
                          type="button"
                          onClick={sendOtp}
                          disabled={loading || !form.email.includes("@")}
                          className="shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                          style={{
                            background: form.email.includes("@") ? "rgba(180,80,20,0.8)" : "rgba(60,25,8,0.5)",
                            color: form.email.includes("@") ? "#e8c080" : "#5a3a20",
                            border: "1px solid rgba(120,50,10,0.4)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {loading ? "..." : otpStep ? (countdown > 0 ? `${countdown}s` : "Qayta") : "Kod yuborish"}
                        </button>
                      )}
                      {emailVerified && (
                        <button
                          type="button"
                          onClick={() => { setEmailVerified(false); setOtpStep(false); setOtpCode(""); }}
                          className="shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                          style={{ background: "rgba(30,12,4,0.9)", color: "#7a4820", border: "1px solid #2a1408" }}
                        >
                          O'zgartir
                        </button>
                      )}
                    </div>

                    {/* OTP input step */}
                    <AnimatePresence>
                      {otpStep && !emailVerified && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(20,8,2,0.95)", border: "1px solid rgba(100,45,10,0.4)" }}>
                            <p className="text-[10px]" style={{ color: "#7a5030" }}>
                              📧 <strong style={{ color: "#c8a060" }}>{form.email}</strong> ga 6 raqamli kod yuborildi
                            </p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={otpCode}
                                onChange={e => { setOtpCode(e.target.value.replace(/\D/g, "")); setError(""); }}
                                className="flex-1 px-4 py-2.5 rounded-lg text-sm text-center font-mono font-bold tracking-widest focus:outline-none"
                                style={{
                                  background: "rgba(30,12,4,0.9)", border: "1px solid rgba(120,55,15,0.5)",
                                  color: "#e8b060", fontSize: 18, letterSpacing: 8,
                                }}
                                placeholder="• • • • • •"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={verifyOtp}
                                disabled={loading || otpCode.length !== 6}
                                className="shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                                style={{
                                  background: otpCode.length === 6 ? "rgba(92,184,92,0.2)" : "rgba(30,12,4,0.5)",
                                  color: otpCode.length === 6 ? "#5cb85c" : "#4a2810",
                                  border: `1px solid ${otpCode.length === 6 ? "rgba(92,184,92,0.4)" : "rgba(40,15,5,0.5)"}`,
                                }}
                              >
                                {loading ? "..." : "Tasdiqlash"}
                              </button>
                            </div>
                            {countdown > 0 && (
                              <p className="text-[10px]" style={{ color: "#4a2810" }}>Qayta yuborish: {countdown}s</p>
                            )}
                            {countdown === 0 && (
                              <button type="button" onClick={sendOtp} disabled={loading}
                                className="text-[10px] underline" style={{ color: "#7a4820" }}>
                                Kodni qayta yuborish
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    required
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                    style={{ background: "rgba(30,12,4,0.9)", border: "1px solid #2a1408", color: "#c8a060" }}
                    placeholder="siz@olcha.uz"
                    autoComplete="email"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#6a4020" }}>
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={form.password}
                    onChange={set("password")}
                    required
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none pr-10 transition-all"
                    style={{ background: "rgba(30,12,4,0.9)", border: "1px solid #2a1408", color: "#c8a060" }}
                    placeholder="••••••••"
                    autoComplete={tab === "login" ? "current-password" : "new-password"}
                  />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#5a3a20" }}>
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: "rgba(180,20,0,0.15)", border: "1px solid rgba(180,20,0,0.3)" }}
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#e05030" }} />
                    <span className="text-xs" style={{ color: "#e05030" }}>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Floating sparkle particles above button */}
              <div style={{ position: "relative", marginTop: 8 }}>
                {!loading && [0, 1, 2, 3, 4].map(i => (
                  <motion.div
                    key={i}
                    style={{
                      position: "absolute",
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: i % 2 === 0 ? "#ffc850" : "#ff9040",
                      boxShadow: `0 0 7px 4px ${i % 2 === 0 ? "rgba(255,190,60,0.75)" : "rgba(255,130,40,0.7)"}`,
                      left: `${12 + i * 18}%`,
                      bottom: "90%",
                      pointerEvents: "none",
                      zIndex: 10,
                    }}
                    animate={{
                      y: [0, -22, -5],
                      opacity: [0, 1, 0],
                      scale: [0.4, 1.3, 0.4],
                      x: [0, i % 2 === 0 ? -7 : 7, 0],
                    }}
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      delay: i * 0.38,
                      ease: "easeOut",
                    }}
                  />
                ))}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={loading ? {} : {
                    scale: 1.018,
                    boxShadow: "0 0 32px rgba(210,40,0,0.65), 0 0 70px rgba(180,20,0,0.22), inset 0 1px 0 rgba(255,160,100,0.2)",
                  }}
                  whileTap={loading ? {} : { scale: 0.972 }}
                  className="w-full py-3 rounded-xl font-bold text-sm relative overflow-hidden"
                  style={{
                    background: loading
                      ? "rgba(70,18,0,0.55)"
                      : "linear-gradient(135deg, #7a1400 0%, #bf1e00 32%, #e83500 54%, #bf1e00 76%, #7a1400 100%)",
                    color: "#ffcca0",
                    border: loading ? "1px solid rgba(100,30,0,0.4)" : "1px solid rgba(190,70,20,0.55)",
                    boxShadow: loading
                      ? "none"
                      : "0 0 22px rgba(190,25,0,0.42), inset 0 1px 0 rgba(255,140,90,0.12)",
                    letterSpacing: "0.07em",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {/* Continuous shimmer sweep */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(90deg, transparent 0%, rgba(255,210,130,0.22) 50%, transparent 100%)",
                    }}
                    animate={{ x: ["-110%", "210%"] }}
                    transition={{
                      duration: loading ? 1.2 : 1.9,
                      repeat: Infinity,
                      ease: "easeInOut",
                      repeatDelay: loading ? 0 : 0.25,
                    }}
                  />

                  {/* Radial glow pulse */}
                  {!loading && (
                    <motion.div
                      className="absolute inset-0 pointer-events-none rounded-xl"
                      style={{
                        background: "radial-gradient(ellipse at 50% 50%, rgba(255,110,50,0.18) 0%, transparent 65%)",
                      }}
                      animate={{ opacity: [0.25, 0.85, 0.25] }}
                      transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}

                  <span style={{ position: "relative", zIndex: 1 }}>
                    {loading ? t("common.loading") : tab === "login" ? t("auth.enter") : t("auth.join")}
                  </span>
                </motion.button>
              </div>
            </motion.form>
          </AnimatePresence>

          <p className="text-center text-xs mt-6" style={{ color: "#4a2810" }}>
            {tab === "login" ? t("auth.no_account") + " " : t("auth.have_account") + " "}
            <button
              type="button"
              onClick={() => { setTab(tab === "login" ? "signup" : "login"); setError(""); }}
              style={{ color: "#c07030" }}
              className="hover:underline font-semibold"
            >
              {tab === "login" ? t("auth.register") : t("auth.login")}
            </button>
          </p>
        </motion.div>
      </div>

      <SafetyConsentModal
        open={showConsent}
        lang={i18nInst.language}
        onAgree={() => { setShowConsent(false); doRegister(); }}
        onCancel={() => setShowConsent(false)}
      />
    </div>
  );
}
