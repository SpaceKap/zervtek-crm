const b = $json.body ?? $json.raw?.body ?? $json;

const event = (b.event || "").toString();
const instance = (b.instance || "").toString();

const data = b.data || {};
const key = data.key || {};

const fromMe = key.fromMe ?? false;
const remoteJid = (key.remoteJid || key.remoteJidAlt || "").toString();
const waMessageId = (key.id || "").toString();

// Skip groups/broadcasts if you only want 1:1 chats
if (remoteJid.endsWith("@g.us") || remoteJid.endsWith("@broadcast")) {
  return [];
}

const customerPhone = remoteJid ? remoteJid.split("@")[0].replace(/\D/g, "") : "";
const customerName = (data.pushName || "").toString();

const msg = data.message || {};
const firstMessage =
  msg.conversation ||
  msg.extendedTextMessage?.text ||
  msg.imageMessage?.caption ||
  msg.videoMessage?.caption ||
  msg.documentMessage?.caption ||
  "(non-text message)";

const messageType = (data.messageType || "").toString();
const messageTimestamp = data.messageTimestamp ?? null;

// --- Country detect from calling code (prefix match) - FULL list from countries-data.ts ---
const callingCodeMap = {
  "93": "Afghanistan",
  "355": "Albania",
  "213": "Algeria",
  "1": "United States/Canada",
  "376": "Andorra",
  "244": "Angola",
  "672": "Antarctica",
  "54": "Argentina",
  "374": "Armenia",
  "297": "Aruba",
  "61": "Australia",
  "43": "Austria",
  "994": "Azerbaijan",
  "973": "Bahrain",
  "880": "Bangladesh",
  "501": "Belize",
  "229": "Benin",
  "975": "Bhutan",
  "591": "Bolivia",
  "599": "Bonaire",
  "387": "Bosnia and Herzegovina",
  "267": "Botswana",
  "47": "Norway",
  "55": "Brazil",
  "246": "British Indian Ocean Territory",
  "673": "Brunei Darussalam",
  "359": "Bulgaria",
  "226": "Burkina Faso",
  "257": "Burundi",
  "238": "Cabo Verde",
  "855": "Cambodia",
  "237": "Cameroon",
  "56": "Chile",
  "86": "China",
  "57": "Colombia",
  "269": "Comoros",
  "243": "Congo (Democratic Republic)",
  "242": "Congo",
  "682": "Cook Islands",
  "506": "Costa Rica",
  "507": "Panama",
  "508": "Saint Pierre and Miquelon",
  "509": "Haiti",
  "590": "Guadeloupe",
  "385": "Croatia",
  "53": "Cuba",
  "357": "Cyprus",
  "420": "Czechia",
  "225": "Côte d'Ivoire",
  "45": "Denmark",
  "253": "Djibouti",
  "593": "Ecuador",
  "20": "Egypt",
  "503": "El Salvador",
  "240": "Equatorial Guinea",
  "291": "Eritrea",
  "372": "Estonia",
  "268": "Eswatini",
  "251": "Ethiopia",
  "500": "Falkland Islands",
  "298": "Faroe Islands",
  "679": "Fiji",
  "358": "Finland",
  "33": "France",
  "594": "French Guiana",
  "689": "French Polynesia",
  "262": "Réunion",
  "241": "Gabon",
  "220": "Gambia",
  "995": "Georgia",
  "49": "Germany",
  "233": "Ghana",
  "350": "Gibraltar",
  "30": "Greece",
  "299": "Greenland",
  "502": "Guatemala",
  "590": "Guadeloupe",
  "224": "Guinea",
  "245": "Guinea-Bissau",
  "592": "Guyana",
  "509": "Haiti",
  "504": "Honduras",
  "852": "Hong Kong",
  "36": "Hungary",
  "354": "Iceland",
  "91": "India",
  "62": "Indonesia",
  "98": "Iran",
  "964": "Iraq",
  "353": "Ireland",
  "44": "United Kingdom",
  "972": "Israel",
  "39": "Italy",
  "81": "Japan",
  "962": "Jordan",
  "7": "Russia/Kazakhstan",
  "254": "Kenya",
  "686": "Kiribati",
  "850": "Korea (North)",
  "82": "South Korea",
  "965": "Kuwait",
  "996": "Kyrgyzstan",
  "856": "Lao People's Democratic Republic",
  "371": "Latvia",
  "961": "Lebanon",
  "266": "Lesotho",
  "231": "Liberia",
  "218": "Libya",
  "423": "Liechtenstein",
  "370": "Lithuania",
  "352": "Luxembourg",
  "853": "Macao",
  "261": "Madagascar",
  "265": "Malawi",
  "60": "Malaysia",
  "960": "Maldives",
  "223": "Mali",
  "356": "Malta",
  "692": "Marshall Islands",
  "596": "Martinique",
  "222": "Mauritania",
  "230": "Mauritius",
  "52": "Mexico",
  "691": "Micronesia",
  "373": "Moldova",
  "377": "Monaco",
  "976": "Mongolia",
  "382": "Montenegro",
  "212": "Morocco",
  "258": "Mozambique",
  "95": "Myanmar",
  "264": "Namibia",
  "674": "Nauru",
  "977": "Nepal",
  "31": "Netherlands",
  "687": "New Caledonia",
  "64": "New Zealand",
  "505": "Nicaragua",
  "227": "Niger",
  "234": "Nigeria",
  "683": "Niue",
  "968": "Oman",
  "92": "Pakistan",
  "680": "Palau",
  "970": "Palestine",
  "507": "Panama",
  "675": "Papua New Guinea",
  "595": "Paraguay",
  "51": "Peru",
  "63": "Philippines",
  "48": "Poland",
  "351": "Portugal",
  "974": "Qatar",
  "389": "Republic of North Macedonia",
  "40": "Romania",
  "250": "Rwanda",
  "290": "Saint Helena, Ascension and Tristan da Cunha",
  "685": "Samoa",
  "378": "San Marino",
  "239": "Sao Tome and Principe",
  "966": "Saudi Arabia",
  "221": "Senegal",
  "381": "Serbia",
  "248": "Seychelles",
  "232": "Sierra Leone",
  "65": "Singapore",
  "421": "Slovakia",
  "386": "Slovenia",
  "677": "Solomon Islands",
  "252": "Somalia",
  "27": "South Africa",
  "211": "South Sudan",
  "34": "Spain",
  "94": "Sri Lanka",
  "249": "Sudan",
  "597": "Suriname",
  "46": "Sweden",
  "41": "Switzerland",
  "963": "Syrian Arab Republic",
  "886": "Taiwan",
  "992": "Tajikistan",
  "255": "Tanzania",
  "66": "Thailand",
  "670": "Timor-Leste",
  "228": "Togo",
  "676": "Tonga",
  "216": "Tunisia",
  "90": "Turkey",
  "993": "Turkmenistan",
  "688": "Tuvalu",
  "256": "Uganda",
  "380": "Ukraine",
  "971": "United Arab Emirates",
  "598": "Uruguay",
  "998": "Uzbekistan",
  "678": "Vanuatu",
  "58": "Venezuela",
  "84": "Viet Nam",
  "681": "Wallis and Futuna",
  "967": "Yemen",
  "260": "Zambia",
  "263": "Zimbabwe",
};

function detectCountryFromE164Digits(digits) {
  // WhatsApp gives you digits without '+', so match longest prefix (1–4)
  for (let len = 4; len >= 1; len--) {
    const prefix = digits.slice(0, len);
    if (callingCodeMap[prefix]) return { callingCode: prefix, country: callingCodeMap[prefix] };
  }
  return { callingCode: null, country: null };
}

const { callingCode, country } = detectCountryFromE164Digits(customerPhone);

// Owner mapping (keep your existing logic)
const owner =
  instance.toLowerCase().includes("viswas") ? "Viswas" :
  instance.toLowerCase().includes("dilshan") ? "Dilshan" :
  instance.toLowerCase().includes("official") ? "Official" :
  "Unknown";

// IMPORTANT: no Meta logic anymore
const source = "website_whatsapp"; // constant label for this new flow

return [{
  json: {
    instance,
    owner,
    event,
    fromMe,

    customerPhone,
    customerName,
    firstMessage,

    waMessageId,
    remoteJid,
    messageType,
    messageTimestamp,

    // new fields
    country,
    callingCode,

    // keep these so DB Insert doesn't break, but set to null
    source,
    ctwaClid: null,

    createdAt: new Date().toISOString(),
    raw: b,
  }
}];
