export interface Country {
  code: string;
  name: string;
  nameEn: string;
  timezones: string[];
}

export function countryFlag(code: string): string {
  return [...code.toUpperCase()].map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join("");
}

export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code.toUpperCase());
}

export function getCountryByTimezone(tz: string): Country | undefined {
  return COUNTRIES.find(c => c.timezones.includes(tz));
}

export const COUNTRIES: Country[] = [
  { code: "UZ", name: "O'zbekiston",    nameEn: "Uzbekistan",           timezones: ["Asia/Tashkent","Asia/Samarkand"] },
  { code: "RU", name: "Rossiya",         nameEn: "Russia",               timezones: ["Europe/Moscow","Europe/Kaliningrad","Europe/Samara","Asia/Yekaterinburg","Asia/Omsk","Asia/Krasnoyarsk","Asia/Irkutsk","Asia/Yakutsk","Asia/Vladivostok","Asia/Magadan","Asia/Kamchatka"] },
  { code: "KZ", name: "Qozog'iston",    nameEn: "Kazakhstan",           timezones: ["Asia/Almaty","Asia/Aqtau","Asia/Aqtobe","Asia/Atyrau","Asia/Oral","Asia/Qostanay","Asia/Qyzylorda"] },
  { code: "KG", name: "Qirg'iziston",   nameEn: "Kyrgyzstan",           timezones: ["Asia/Bishkek"] },
  { code: "TJ", name: "Tojikiston",     nameEn: "Tajikistan",           timezones: ["Asia/Dushanbe"] },
  { code: "TM", name: "Turkmaniston",   nameEn: "Turkmenistan",         timezones: ["Asia/Ashgabat"] },
  { code: "AZ", name: "Ozarbayjon",     nameEn: "Azerbaijan",           timezones: ["Asia/Baku"] },
  { code: "GE", name: "Gruziya",        nameEn: "Georgia",              timezones: ["Asia/Tbilisi"] },
  { code: "AM", name: "Armaniston",     nameEn: "Armenia",              timezones: ["Asia/Yerevan"] },
  { code: "TR", name: "Turkiya",        nameEn: "Turkey",               timezones: ["Europe/Istanbul"] },
  { code: "UA", name: "Ukraina",        nameEn: "Ukraine",              timezones: ["Europe/Kyiv"] },
  { code: "BY", name: "Belarus",        nameEn: "Belarus",              timezones: ["Europe/Minsk"] },
  { code: "AF", name: "Afg'oniston",    nameEn: "Afghanistan",          timezones: ["Asia/Kabul"] },
  { code: "IR", name: "Eron",           nameEn: "Iran",                 timezones: ["Asia/Tehran"] },
  { code: "PK", name: "Pokiston",       nameEn: "Pakistan",             timezones: ["Asia/Karachi"] },
  { code: "IN", name: "Hindiston",      nameEn: "India",                timezones: ["Asia/Kolkata"] },
  { code: "CN", name: "Xitoy",          nameEn: "China",                timezones: ["Asia/Shanghai","Asia/Urumqi"] },
  { code: "JP", name: "Yaponiya",       nameEn: "Japan",                timezones: ["Asia/Tokyo"] },
  { code: "KR", name: "Janubiy Koreya", nameEn: "South Korea",          timezones: ["Asia/Seoul"] },
  { code: "MN", name: "Mo'g'uliston",  nameEn: "Mongolia",             timezones: ["Asia/Ulaanbaatar"] },
  { code: "SA", name: "Saudiya Arabistoni", nameEn: "Saudi Arabia",     timezones: ["Asia/Riyadh"] },
  { code: "AE", name: "BAA",            nameEn: "UAE",                  timezones: ["Asia/Dubai"] },
  { code: "IL", name: "Isroil",         nameEn: "Israel",               timezones: ["Asia/Jerusalem"] },
  { code: "JO", name: "Iordaniya",      nameEn: "Jordan",               timezones: ["Asia/Amman"] },
  { code: "IQ", name: "Iroq",           nameEn: "Iraq",                 timezones: ["Asia/Baghdad"] },
  { code: "SY", name: "Suriya",         nameEn: "Syria",                timezones: ["Asia/Damascus"] },
  { code: "LB", name: "Livan",          nameEn: "Lebanon",              timezones: ["Asia/Beirut"] },
  { code: "EG", name: "Misr",           nameEn: "Egypt",                timezones: ["Africa/Cairo"] },
  { code: "MA", name: "Marokash",       nameEn: "Morocco",              timezones: ["Africa/Casablanca"] },
  { code: "TN", name: "Tunis",          nameEn: "Tunisia",              timezones: ["Africa/Tunis"] },
  { code: "DZ", name: "Jazoir",         nameEn: "Algeria",              timezones: ["Africa/Algiers"] },
  { code: "LY", name: "Liviya",         nameEn: "Libya",                timezones: ["Africa/Tripoli"] },
  { code: "NG", name: "Nigeriya",       nameEn: "Nigeria",              timezones: ["Africa/Lagos"] },
  { code: "ET", name: "Efiopiya",       nameEn: "Ethiopia",             timezones: ["Africa/Addis_Ababa"] },
  { code: "KE", name: "Keniya",         nameEn: "Kenya",                timezones: ["Africa/Nairobi"] },
  { code: "ZA", name: "Janubiy Afrika", nameEn: "South Africa",         timezones: ["Africa/Johannesburg"] },
  { code: "GB", name: "Buyuk Britaniya",nameEn: "United Kingdom",       timezones: ["Europe/London"] },
  { code: "DE", name: "Germaniya",      nameEn: "Germany",              timezones: ["Europe/Berlin"] },
  { code: "FR", name: "Fransiya",       nameEn: "France",               timezones: ["Europe/Paris"] },
  { code: "IT", name: "Italiya",        nameEn: "Italy",                timezones: ["Europe/Rome"] },
  { code: "ES", name: "Ispaniya",       nameEn: "Spain",                timezones: ["Europe/Madrid"] },
  { code: "PT", name: "Portugaliya",    nameEn: "Portugal",             timezones: ["Europe/Lisbon"] },
  { code: "NL", name: "Niderlandiya",   nameEn: "Netherlands",          timezones: ["Europe/Amsterdam"] },
  { code: "SE", name: "Shvetsiya",      nameEn: "Sweden",               timezones: ["Europe/Stockholm"] },
  { code: "NO", name: "Norvegiya",      nameEn: "Norway",               timezones: ["Europe/Oslo"] },
  { code: "DK", name: "Daniya",         nameEn: "Denmark",              timezones: ["Europe/Copenhagen"] },
  { code: "FI", name: "Finlandiya",     nameEn: "Finland",              timezones: ["Europe/Helsinki"] },
  { code: "PL", name: "Polsha",         nameEn: "Poland",               timezones: ["Europe/Warsaw"] },
  { code: "CZ", name: "Chexiya",        nameEn: "Czech Republic",       timezones: ["Europe/Prague"] },
  { code: "HU", name: "Vengriya",       nameEn: "Hungary",              timezones: ["Europe/Budapest"] },
  { code: "RO", name: "Ruminiya",       nameEn: "Romania",              timezones: ["Europe/Bucharest"] },
  { code: "BG", name: "Bolgariya",      nameEn: "Bulgaria",             timezones: ["Europe/Sofia"] },
  { code: "GR", name: "Gretsiya",       nameEn: "Greece",               timezones: ["Europe/Athens"] },
  { code: "AT", name: "Avstriya",       nameEn: "Austria",              timezones: ["Europe/Vienna"] },
  { code: "CH", name: "Shveytsariya",   nameEn: "Switzerland",          timezones: ["Europe/Zurich"] },
  { code: "US", name: "AQSh",           nameEn: "United States",        timezones: ["America/New_York","America/Chicago","America/Denver","America/Los_Angeles","America/Anchorage","Pacific/Honolulu"] },
  { code: "CA", name: "Kanada",         nameEn: "Canada",               timezones: ["America/Toronto","America/Vancouver","America/Winnipeg","America/Halifax"] },
  { code: "MX", name: "Meksika",        nameEn: "Mexico",               timezones: ["America/Mexico_City","America/Cancun","America/Monterrey"] },
  { code: "BR", name: "Braziliya",      nameEn: "Brazil",               timezones: ["America/Sao_Paulo","America/Fortaleza","America/Manaus"] },
  { code: "AR", name: "Argentina",      nameEn: "Argentina",            timezones: ["America/Argentina/Buenos_Aires"] },
  { code: "AU", name: "Avstraliya",     nameEn: "Australia",            timezones: ["Australia/Sydney","Australia/Melbourne","Australia/Brisbane","Australia/Perth"] },
  { code: "NZ", name: "Yangi Zelandiya",nameEn: "New Zealand",          timezones: ["Pacific/Auckland"] },
  { code: "ID", name: "Indoneziya",     nameEn: "Indonesia",            timezones: ["Asia/Jakarta","Asia/Makassar","Asia/Jayapura"] },
  { code: "MY", name: "Malayziya",      nameEn: "Malaysia",             timezones: ["Asia/Kuala_Lumpur"] },
  { code: "SG", name: "Singapur",       nameEn: "Singapore",            timezones: ["Asia/Singapore"] },
  { code: "TH", name: "Tailand",        nameEn: "Thailand",             timezones: ["Asia/Bangkok"] },
  { code: "VN", name: "Vyetnam",        nameEn: "Vietnam",              timezones: ["Asia/Ho_Chi_Minh"] },
  { code: "PH", name: "Filippin",       nameEn: "Philippines",          timezones: ["Asia/Manila"] },
  { code: "BD", name: "Bangladesh",     nameEn: "Bangladesh",           timezones: ["Asia/Dhaka"] },
  { code: "LK", name: "Shri-Lanka",     nameEn: "Sri Lanka",            timezones: ["Asia/Colombo"] },
  { code: "NP", name: "Nepal",          nameEn: "Nepal",                timezones: ["Asia/Kathmandu"] },
  { code: "MM", name: "Myanma",         nameEn: "Myanmar",              timezones: ["Asia/Rangoon"] },
  { code: "KH", name: "Kambodja",       nameEn: "Cambodia",             timezones: ["Asia/Phnom_Penh"] },
];
