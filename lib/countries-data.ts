// Comprehensive list of countries with ISO codes and phone country codes

export interface CountryData {
  name: string;
  alpha2: string;
  alpha3: string;
  numeric: string;
  phoneCode: string;
}

export const COUNTRIES_DATA: CountryData[] = [
  { name: "Afghanistan", alpha2: "AF", alpha3: "AFG", numeric: "004", phoneCode: "+93" },
  { name: "Albania", alpha2: "AL", alpha3: "ALB", numeric: "008", phoneCode: "+355" },
  { name: "Algeria", alpha2: "DZ", alpha3: "DZA", numeric: "012", phoneCode: "+213" },
  { name: "American Samoa", alpha2: "AS", alpha3: "ASM", numeric: "016", phoneCode: "+1" },
  { name: "Andorra", alpha2: "AD", alpha3: "AND", numeric: "020", phoneCode: "+376" },
  { name: "Angola", alpha2: "AO", alpha3: "AGO", numeric: "024", phoneCode: "+244" },
  { name: "Anguilla", alpha2: "AI", alpha3: "AIA", numeric: "660", phoneCode: "+1" },
  { name: "Antarctica", alpha2: "AQ", alpha3: "ATA", numeric: "010", phoneCode: "+672" },
  { name: "Antigua and Barbuda", alpha2: "AG", alpha3: "ATG", numeric: "028", phoneCode: "+1" },
  { name: "Argentina", alpha2: "AR", alpha3: "ARG", numeric: "032", phoneCode: "+54" },
  { name: "Armenia", alpha2: "AM", alpha3: "ARM", numeric: "051", phoneCode: "+374" },
  { name: "Aruba", alpha2: "AW", alpha3: "ABW", numeric: "533", phoneCode: "+297" },
  { name: "Australia", alpha2: "AU", alpha3: "AUS", numeric: "036", phoneCode: "+61" },
  { name: "Austria", alpha2: "AT", alpha3: "AUT", numeric: "040", phoneCode: "+43" },
  { name: "Azerbaijan", alpha2: "AZ", alpha3: "AZE", numeric: "031", phoneCode: "+994" },
  { name: "Bahamas", alpha2: "BS", alpha3: "BHS", numeric: "044", phoneCode: "+1" },
  { name: "Bahrain", alpha2: "BH", alpha3: "BHR", numeric: "048", phoneCode: "+973" },
  { name: "Bangladesh", alpha2: "BD", alpha3: "BGD", numeric: "050", phoneCode: "+880" },
  { name: "Barbados", alpha2: "BB", alpha3: "BRB", numeric: "052", phoneCode: "+1" },
  { name: "Belarus", alpha2: "BY", alpha3: "BLR", numeric: "112", phoneCode: "+375" },
  { name: "Belgium", alpha2: "BE", alpha3: "BEL", numeric: "056", phoneCode: "+32" },
  { name: "Belize", alpha2: "BZ", alpha3: "BLZ", numeric: "084", phoneCode: "+501" },
  { name: "Benin", alpha2: "BJ", alpha3: "BEN", numeric: "204", phoneCode: "+229" },
  { name: "Bermuda", alpha2: "BM", alpha3: "BMU", numeric: "060", phoneCode: "+1" },
  { name: "Bhutan", alpha2: "BT", alpha3: "BTN", numeric: "064", phoneCode: "+975" },
  { name: "Bolivia", alpha2: "BO", alpha3: "BOL", numeric: "068", phoneCode: "+591" },
  { name: "Bonaire, Sint Eustatius and Saba", alpha2: "BQ", alpha3: "BES", numeric: "535", phoneCode: "+599" },
  { name: "Bosnia and Herzegovina", alpha2: "BA", alpha3: "BIH", numeric: "070", phoneCode: "+387" },
  { name: "Botswana", alpha2: "BW", alpha3: "BWA", numeric: "072", phoneCode: "+267" },
  { name: "Bouvet Island", alpha2: "BV", alpha3: "BVT", numeric: "074", phoneCode: "+47" },
  { name: "Brazil", alpha2: "BR", alpha3: "BRA", numeric: "076", phoneCode: "+55" },
  { name: "British Indian Ocean Territory", alpha2: "IO", alpha3: "IOT", numeric: "086", phoneCode: "+246" },
  { name: "Brunei Darussalam", alpha2: "BN", alpha3: "BRN", numeric: "096", phoneCode: "+673" },
  { name: "Bulgaria", alpha2: "BG", alpha3: "BGR", numeric: "100", phoneCode: "+359" },
  { name: "Burkina Faso", alpha2: "BF", alpha3: "BFA", numeric: "854", phoneCode: "+226" },
  { name: "Burundi", alpha2: "BI", alpha3: "BDI", numeric: "108", phoneCode: "+257" },
  { name: "Cabo Verde", alpha2: "CV", alpha3: "CPV", numeric: "132", phoneCode: "+238" },
  { name: "Cambodia", alpha2: "KH", alpha3: "KHM", numeric: "116", phoneCode: "+855" },
  { name: "Cameroon", alpha2: "CM", alpha3: "CMR", numeric: "120", phoneCode: "+237" },
  { name: "Canada", alpha2: "CA", alpha3: "CAN", numeric: "124", phoneCode: "+1" },
  { name: "Cayman Islands", alpha2: "KY", alpha3: "CYM", numeric: "136", phoneCode: "+1" },
  { name: "Central African Republic", alpha2: "CF", alpha3: "CAF", numeric: "140", phoneCode: "+236" },
  { name: "Chad", alpha2: "TD", alpha3: "TCD", numeric: "148", phoneCode: "+235" },
  { name: "Chile", alpha2: "CL", alpha3: "CHL", numeric: "152", phoneCode: "+56" },
  { name: "China", alpha2: "CN", alpha3: "CHN", numeric: "156", phoneCode: "+86" },
  { name: "Christmas Island", alpha2: "CX", alpha3: "CXR", numeric: "162", phoneCode: "+61" },
  { name: "Cocos (Keeling) Islands", alpha2: "CC", alpha3: "CCK", numeric: "166", phoneCode: "+61" },
  { name: "Colombia", alpha2: "CO", alpha3: "COL", numeric: "170", phoneCode: "+57" },
  { name: "Comoros", alpha2: "KM", alpha3: "COM", numeric: "174", phoneCode: "+269" },
  { name: "Congo (Democratic Republic)", alpha2: "CD", alpha3: "COD", numeric: "180", phoneCode: "+243" },
  { name: "Congo", alpha2: "CG", alpha3: "COG", numeric: "178", phoneCode: "+242" },
  { name: "Cook Islands", alpha2: "CK", alpha3: "COK", numeric: "184", phoneCode: "+682" },
  { name: "Costa Rica", alpha2: "CR", alpha3: "CRI", numeric: "188", phoneCode: "+506" },
  { name: "Croatia", alpha2: "HR", alpha3: "HRV", numeric: "191", phoneCode: "+385" },
  { name: "Cuba", alpha2: "CU", alpha3: "CUB", numeric: "192", phoneCode: "+53" },
  { name: "Curaçao", alpha2: "CW", alpha3: "CUW", numeric: "531", phoneCode: "+599" },
  { name: "Cyprus", alpha2: "CY", alpha3: "CYP", numeric: "196", phoneCode: "+357" },
  { name: "Czechia", alpha2: "CZ", alpha3: "CZE", numeric: "203", phoneCode: "+420" },
  { name: "Côte d'Ivoire", alpha2: "CI", alpha3: "CIV", numeric: "384", phoneCode: "+225" },
  { name: "Denmark", alpha2: "DK", alpha3: "DNK", numeric: "208", phoneCode: "+45" },
  { name: "Djibouti", alpha2: "DJ", alpha3: "DJI", numeric: "262", phoneCode: "+253" },
  { name: "Dominica", alpha2: "DM", alpha3: "DMA", numeric: "212", phoneCode: "+1" },
  { name: "Dominican Republic", alpha2: "DO", alpha3: "DOM", numeric: "214", phoneCode: "+1" },
  { name: "Ecuador", alpha2: "EC", alpha3: "ECU", numeric: "218", phoneCode: "+593" },
  { name: "Egypt", alpha2: "EG", alpha3: "EGY", numeric: "818", phoneCode: "+20" },
  { name: "El Salvador", alpha2: "SV", alpha3: "SLV", numeric: "222", phoneCode: "+503" },
  { name: "Equatorial Guinea", alpha2: "GQ", alpha3: "GNQ", numeric: "226", phoneCode: "+240" },
  { name: "Eritrea", alpha2: "ER", alpha3: "ERI", numeric: "232", phoneCode: "+291" },
  { name: "Estonia", alpha2: "EE", alpha3: "EST", numeric: "233", phoneCode: "+372" },
  { name: "Eswatini", alpha2: "SZ", alpha3: "SWZ", numeric: "748", phoneCode: "+268" },
  { name: "Ethiopia", alpha2: "ET", alpha3: "ETH", numeric: "231", phoneCode: "+251" },
  { name: "Falkland Islands", alpha2: "FK", alpha3: "FLK", numeric: "238", phoneCode: "+500" },
  { name: "Faroe Islands", alpha2: "FO", alpha3: "FRO", numeric: "234", phoneCode: "+298" },
  { name: "Fiji", alpha2: "FJ", alpha3: "FJI", numeric: "242", phoneCode: "+679" },
  { name: "Finland", alpha2: "FI", alpha3: "FIN", numeric: "246", phoneCode: "+358" },
  { name: "France", alpha2: "FR", alpha3: "FRA", numeric: "250", phoneCode: "+33" },
  { name: "French Guiana", alpha2: "GF", alpha3: "GUF", numeric: "254", phoneCode: "+594" },
  { name: "French Polynesia", alpha2: "PF", alpha3: "PYF", numeric: "258", phoneCode: "+689" },
  { name: "French Southern Territories", alpha2: "TF", alpha3: "ATF", numeric: "260", phoneCode: "+262" },
  { name: "Gabon", alpha2: "GA", alpha3: "GAB", numeric: "266", phoneCode: "+241" },
  { name: "Gambia", alpha2: "GM", alpha3: "GMB", numeric: "270", phoneCode: "+220" },
  { name: "Georgia", alpha2: "GE", alpha3: "GEO", numeric: "268", phoneCode: "+995" },
  { name: "Germany", alpha2: "DE", alpha3: "DEU", numeric: "276", phoneCode: "+49" },
  { name: "Ghana", alpha2: "GH", alpha3: "GHA", numeric: "288", phoneCode: "+233" },
  { name: "Gibraltar", alpha2: "GI", alpha3: "GIB", numeric: "292", phoneCode: "+350" },
  { name: "Greece", alpha2: "GR", alpha3: "GRC", numeric: "300", phoneCode: "+30" },
  { name: "Greenland", alpha2: "GL", alpha3: "GRL", numeric: "304", phoneCode: "+299" },
  { name: "Grenada", alpha2: "GD", alpha3: "GRD", numeric: "308", phoneCode: "+1" },
  { name: "Guadeloupe", alpha2: "GP", alpha3: "GLP", numeric: "312", phoneCode: "+590" },
  { name: "Guam", alpha2: "GU", alpha3: "GUM", numeric: "316", phoneCode: "+1" },
  { name: "Guatemala", alpha2: "GT", alpha3: "GTM", numeric: "320", phoneCode: "+502" },
  { name: "Guernsey", alpha2: "GG", alpha3: "GGY", numeric: "831", phoneCode: "+44" },
  { name: "Guinea", alpha2: "GN", alpha3: "GIN", numeric: "324", phoneCode: "+224" },
  { name: "Guinea-Bissau", alpha2: "GW", alpha3: "GNB", numeric: "624", phoneCode: "+245" },
  { name: "Guyana", alpha2: "GY", alpha3: "GUY", numeric: "328", phoneCode: "+592" },
  { name: "Haiti", alpha2: "HT", alpha3: "HTI", numeric: "332", phoneCode: "+509" },
  { name: "Heard Island and McDonald Islands", alpha2: "HM", alpha3: "HMD", numeric: "334", phoneCode: "+672" },
  { name: "Holy See", alpha2: "VA", alpha3: "VAT", numeric: "336", phoneCode: "+39" },
  { name: "Honduras", alpha2: "HN", alpha3: "HND", numeric: "340", phoneCode: "+504" },
  { name: "Hong Kong", alpha2: "HK", alpha3: "HKG", numeric: "344", phoneCode: "+852" },
  { name: "Hungary", alpha2: "HU", alpha3: "HUN", numeric: "348", phoneCode: "+36" },
  { name: "Iceland", alpha2: "IS", alpha3: "ISL", numeric: "352", phoneCode: "+354" },
  { name: "India", alpha2: "IN", alpha3: "IND", numeric: "356", phoneCode: "+91" },
  { name: "Indonesia", alpha2: "ID", alpha3: "IDN", numeric: "360", phoneCode: "+62" },
  { name: "Iran", alpha2: "IR", alpha3: "IRN", numeric: "364", phoneCode: "+98" },
  { name: "Iraq", alpha2: "IQ", alpha3: "IRQ", numeric: "368", phoneCode: "+964" },
  { name: "Ireland", alpha2: "IE", alpha3: "IRL", numeric: "372", phoneCode: "+353" },
  { name: "Isle of Man", alpha2: "IM", alpha3: "IMN", numeric: "833", phoneCode: "+44" },
  { name: "Israel", alpha2: "IL", alpha3: "ISR", numeric: "376", phoneCode: "+972" },
  { name: "Italy", alpha2: "IT", alpha3: "ITA", numeric: "380", phoneCode: "+39" },
  { name: "Jamaica", alpha2: "JM", alpha3: "JAM", numeric: "388", phoneCode: "+1" },
  { name: "Japan", alpha2: "JP", alpha3: "JPN", numeric: "392", phoneCode: "+81" },
  { name: "Jersey", alpha2: "JE", alpha3: "JEY", numeric: "832", phoneCode: "+44" },
  { name: "Jordan", alpha2: "JO", alpha3: "JOR", numeric: "400", phoneCode: "+962" },
  { name: "Kazakhstan", alpha2: "KZ", alpha3: "KAZ", numeric: "398", phoneCode: "+7" },
  { name: "Kenya", alpha2: "KE", alpha3: "KEN", numeric: "404", phoneCode: "+254" },
  { name: "Kiribati", alpha2: "KI", alpha3: "KIR", numeric: "296", phoneCode: "+686" },
  { name: "Korea (North)", alpha2: "KP", alpha3: "PRK", numeric: "408", phoneCode: "+850" },
  { name: "Korea (South)", alpha2: "KR", alpha3: "KOR", numeric: "410", phoneCode: "+82" },
  { name: "Kuwait", alpha2: "KW", alpha3: "KWT", numeric: "414", phoneCode: "+965" },
  { name: "Kyrgyzstan", alpha2: "KG", alpha3: "KGZ", numeric: "417", phoneCode: "+996" },
  { name: "Lao People's Democratic Republic", alpha2: "LA", alpha3: "LAO", numeric: "418", phoneCode: "+856" },
  { name: "Latvia", alpha2: "LV", alpha3: "LVA", numeric: "428", phoneCode: "+371" },
  { name: "Lebanon", alpha2: "LB", alpha3: "LBN", numeric: "422", phoneCode: "+961" },
  { name: "Lesotho", alpha2: "LS", alpha3: "LSO", numeric: "426", phoneCode: "+266" },
  { name: "Liberia", alpha2: "LR", alpha3: "LBR", numeric: "430", phoneCode: "+231" },
  { name: "Libya", alpha2: "LY", alpha3: "LBY", numeric: "434", phoneCode: "+218" },
  { name: "Liechtenstein", alpha2: "LI", alpha3: "LIE", numeric: "438", phoneCode: "+423" },
  { name: "Lithuania", alpha2: "LT", alpha3: "LTU", numeric: "440", phoneCode: "+370" },
  { name: "Luxembourg", alpha2: "LU", alpha3: "LUX", numeric: "442", phoneCode: "+352" },
  { name: "Macao", alpha2: "MO", alpha3: "MAC", numeric: "446", phoneCode: "+853" },
  { name: "Madagascar", alpha2: "MG", alpha3: "MDG", numeric: "450", phoneCode: "+261" },
  { name: "Malawi", alpha2: "MW", alpha3: "MWI", numeric: "454", phoneCode: "+265" },
  { name: "Malaysia", alpha2: "MY", alpha3: "MYS", numeric: "458", phoneCode: "+60" },
  { name: "Maldives", alpha2: "MV", alpha3: "MDV", numeric: "462", phoneCode: "+960" },
  { name: "Mali", alpha2: "ML", alpha3: "MLI", numeric: "466", phoneCode: "+223" },
  { name: "Malta", alpha2: "MT", alpha3: "MLT", numeric: "470", phoneCode: "+356" },
  { name: "Marshall Islands", alpha2: "MH", alpha3: "MHL", numeric: "584", phoneCode: "+692" },
  { name: "Martinique", alpha2: "MQ", alpha3: "MTQ", numeric: "474", phoneCode: "+596" },
  { name: "Mauritania", alpha2: "MR", alpha3: "MRT", numeric: "478", phoneCode: "+222" },
  { name: "Mauritius", alpha2: "MU", alpha3: "MUS", numeric: "480", phoneCode: "+230" },
  { name: "Mayotte", alpha2: "YT", alpha3: "MYT", numeric: "175", phoneCode: "+262" },
  { name: "Mexico", alpha2: "MX", alpha3: "MEX", numeric: "484", phoneCode: "+52" },
  { name: "Micronesia", alpha2: "FM", alpha3: "FSM", numeric: "583", phoneCode: "+691" },
  { name: "Moldova", alpha2: "MD", alpha3: "MDA", numeric: "498", phoneCode: "+373" },
  { name: "Monaco", alpha2: "MC", alpha3: "MCO", numeric: "492", phoneCode: "+377" },
  { name: "Mongolia", alpha2: "MN", alpha3: "MNG", numeric: "496", phoneCode: "+976" },
  { name: "Montenegro", alpha2: "ME", alpha3: "MNE", numeric: "499", phoneCode: "+382" },
  { name: "Montserrat", alpha2: "MS", alpha3: "MSR", numeric: "500", phoneCode: "+1" },
  { name: "Morocco", alpha2: "MA", alpha3: "MAR", numeric: "504", phoneCode: "+212" },
  { name: "Mozambique", alpha2: "MZ", alpha3: "MOZ", numeric: "508", phoneCode: "+258" },
  { name: "Myanmar", alpha2: "MM", alpha3: "MMR", numeric: "104", phoneCode: "+95" },
  { name: "Namibia", alpha2: "NA", alpha3: "NAM", numeric: "516", phoneCode: "+264" },
  { name: "Nauru", alpha2: "NR", alpha3: "NRU", numeric: "520", phoneCode: "+674" },
  { name: "Nepal", alpha2: "NP", alpha3: "NPL", numeric: "524", phoneCode: "+977" },
  { name: "Netherlands", alpha2: "NL", alpha3: "NLD", numeric: "528", phoneCode: "+31" },
  { name: "New Caledonia", alpha2: "NC", alpha3: "NCL", numeric: "540", phoneCode: "+687" },
  { name: "New Zealand", alpha2: "NZ", alpha3: "NZL", numeric: "554", phoneCode: "+64" },
  { name: "Nicaragua", alpha2: "NI", alpha3: "NIC", numeric: "558", phoneCode: "+505" },
  { name: "Niger", alpha2: "NE", alpha3: "NER", numeric: "562", phoneCode: "+227" },
  { name: "Nigeria", alpha2: "NG", alpha3: "NGA", numeric: "566", phoneCode: "+234" },
  { name: "Niue", alpha2: "NU", alpha3: "NIU", numeric: "570", phoneCode: "+683" },
  { name: "Norfolk Island", alpha2: "NF", alpha3: "NFK", numeric: "574", phoneCode: "+672" },
  { name: "Northern Mariana Islands", alpha2: "MP", alpha3: "MNP", numeric: "580", phoneCode: "+1" },
  { name: "Norway", alpha2: "NO", alpha3: "NOR", numeric: "578", phoneCode: "+47" },
  { name: "Oman", alpha2: "OM", alpha3: "OMN", numeric: "512", phoneCode: "+968" },
  { name: "Pakistan", alpha2: "PK", alpha3: "PAK", numeric: "586", phoneCode: "+92" },
  { name: "Palau", alpha2: "PW", alpha3: "PLW", numeric: "585", phoneCode: "+680" },
  { name: "Palestine", alpha2: "PS", alpha3: "PSE", numeric: "275", phoneCode: "+970" },
  { name: "Panama", alpha2: "PA", alpha3: "PAN", numeric: "591", phoneCode: "+507" },
  { name: "Papua New Guinea", alpha2: "PG", alpha3: "PNG", numeric: "598", phoneCode: "+675" },
  { name: "Paraguay", alpha2: "PY", alpha3: "PRY", numeric: "600", phoneCode: "+595" },
  { name: "Peru", alpha2: "PE", alpha3: "PER", numeric: "604", phoneCode: "+51" },
  { name: "Philippines", alpha2: "PH", alpha3: "PHL", numeric: "608", phoneCode: "+63" },
  { name: "Pitcairn", alpha2: "PN", alpha3: "PCN", numeric: "612", phoneCode: "+64" },
  { name: "Poland", alpha2: "PL", alpha3: "POL", numeric: "616", phoneCode: "+48" },
  { name: "Portugal", alpha2: "PT", alpha3: "PRT", numeric: "620", phoneCode: "+351" },
  { name: "Puerto Rico", alpha2: "PR", alpha3: "PRI", numeric: "630", phoneCode: "+1" },
  { name: "Qatar", alpha2: "QA", alpha3: "QAT", numeric: "634", phoneCode: "+974" },
  { name: "Republic of North Macedonia", alpha2: "MK", alpha3: "MKD", numeric: "807", phoneCode: "+389" },
  { name: "Romania", alpha2: "RO", alpha3: "ROU", numeric: "642", phoneCode: "+40" },
  { name: "Russian Federation", alpha2: "RU", alpha3: "RUS", numeric: "643", phoneCode: "+7" },
  { name: "Rwanda", alpha2: "RW", alpha3: "RWA", numeric: "646", phoneCode: "+250" },
  { name: "Réunion", alpha2: "RE", alpha3: "REU", numeric: "638", phoneCode: "+262" },
  { name: "Saint Barthélemy", alpha2: "BL", alpha3: "BLM", numeric: "652", phoneCode: "+590" },
  { name: "Saint Helena, Ascension and Tristan da Cunha", alpha2: "SH", alpha3: "SHN", numeric: "654", phoneCode: "+290" },
  { name: "Saint Kitts and Nevis", alpha2: "KN", alpha3: "KNA", numeric: "659", phoneCode: "+1" },
  { name: "Saint Lucia", alpha2: "LC", alpha3: "LCA", numeric: "662", phoneCode: "+1" },
  { name: "Saint Martin (French part)", alpha2: "MF", alpha3: "MAF", numeric: "663", phoneCode: "+590" },
  { name: "Saint Pierre and Miquelon", alpha2: "PM", alpha3: "SPM", numeric: "666", phoneCode: "+508" },
  { name: "Saint Vincent and the Grenadines", alpha2: "VC", alpha3: "VCT", numeric: "670", phoneCode: "+1" },
  { name: "Samoa", alpha2: "WS", alpha3: "WSM", numeric: "882", phoneCode: "+685" },
  { name: "San Marino", alpha2: "SM", alpha3: "SMR", numeric: "674", phoneCode: "+378" },
  { name: "Sao Tome and Principe", alpha2: "ST", alpha3: "STP", numeric: "678", phoneCode: "+239" },
  { name: "Saudi Arabia", alpha2: "SA", alpha3: "SAU", numeric: "682", phoneCode: "+966" },
  { name: "Senegal", alpha2: "SN", alpha3: "SEN", numeric: "686", phoneCode: "+221" },
  { name: "Serbia", alpha2: "RS", alpha3: "SRB", numeric: "688", phoneCode: "+381" },
  { name: "Seychelles", alpha2: "SC", alpha3: "SYC", numeric: "690", phoneCode: "+248" },
  { name: "Sierra Leone", alpha2: "SL", alpha3: "SLE", numeric: "694", phoneCode: "+232" },
  { name: "Singapore", alpha2: "SG", alpha3: "SGP", numeric: "702", phoneCode: "+65" },
  { name: "Sint Maarten (Dutch part)", alpha2: "SX", alpha3: "SXM", numeric: "534", phoneCode: "+1" },
  { name: "Slovakia", alpha2: "SK", alpha3: "SVK", numeric: "703", phoneCode: "+421" },
  { name: "Slovenia", alpha2: "SI", alpha3: "SVN", numeric: "705", phoneCode: "+386" },
  { name: "Solomon Islands", alpha2: "SB", alpha3: "SLB", numeric: "090", phoneCode: "+677" },
  { name: "Somalia", alpha2: "SO", alpha3: "SOM", numeric: "706", phoneCode: "+252" },
  { name: "South Africa", alpha2: "ZA", alpha3: "ZAF", numeric: "710", phoneCode: "+27" },
  { name: "South Georgia and the South Sandwich Islands", alpha2: "GS", alpha3: "SGS", numeric: "239", phoneCode: "+500" },
  { name: "South Sudan", alpha2: "SS", alpha3: "SSD", numeric: "728", phoneCode: "+211" },
  { name: "Spain", alpha2: "ES", alpha3: "ESP", numeric: "724", phoneCode: "+34" },
  { name: "Sri Lanka", alpha2: "LK", alpha3: "LKA", numeric: "144", phoneCode: "+94" },
  { name: "Sudan", alpha2: "SD", alpha3: "SDN", numeric: "729", phoneCode: "+249" },
  { name: "Suriname", alpha2: "SR", alpha3: "SUR", numeric: "740", phoneCode: "+597" },
  { name: "Svalbard and Jan Mayen", alpha2: "SJ", alpha3: "SJM", numeric: "744", phoneCode: "+47" },
  { name: "Sweden", alpha2: "SE", alpha3: "SWE", numeric: "752", phoneCode: "+46" },
  { name: "Switzerland", alpha2: "CH", alpha3: "CHE", numeric: "756", phoneCode: "+41" },
  { name: "Syrian Arab Republic", alpha2: "SY", alpha3: "SYR", numeric: "760", phoneCode: "+963" },
  { name: "Taiwan", alpha2: "TW", alpha3: "TWN", numeric: "158", phoneCode: "+886" },
  { name: "Tajikistan", alpha2: "TJ", alpha3: "TJK", numeric: "762", phoneCode: "+992" },
  { name: "Tanzania", alpha2: "TZ", alpha3: "TZA", numeric: "834", phoneCode: "+255" },
  { name: "Thailand", alpha2: "TH", alpha3: "THA", numeric: "764", phoneCode: "+66" },
  { name: "Timor-Leste", alpha2: "TL", alpha3: "TLS", numeric: "626", phoneCode: "+670" },
  { name: "Togo", alpha2: "TG", alpha3: "TGO", numeric: "768", phoneCode: "+228" },
  { name: "Tokelau", alpha2: "TK", alpha3: "TKL", numeric: "772", phoneCode: "+690" },
  { name: "Tonga", alpha2: "TO", alpha3: "TON", numeric: "776", phoneCode: "+676" },
  { name: "Trinidad and Tobago", alpha2: "TT", alpha3: "TTO", numeric: "780", phoneCode: "+1" },
  { name: "Tunisia", alpha2: "TN", alpha3: "TUN", numeric: "788", phoneCode: "+216" },
  { name: "Turkey", alpha2: "TR", alpha3: "TUR", numeric: "792", phoneCode: "+90" },
  { name: "Turkmenistan", alpha2: "TM", alpha3: "TKM", numeric: "795", phoneCode: "+993" },
  { name: "Turks and Caicos Islands", alpha2: "TC", alpha3: "TCA", numeric: "796", phoneCode: "+1" },
  { name: "Tuvalu", alpha2: "TV", alpha3: "TUV", numeric: "798", phoneCode: "+688" },
  { name: "Uganda", alpha2: "UG", alpha3: "UGA", numeric: "800", phoneCode: "+256" },
  { name: "Ukraine", alpha2: "UA", alpha3: "UKR", numeric: "804", phoneCode: "+380" },
  { name: "United Arab Emirates", alpha2: "AE", alpha3: "ARE", numeric: "784", phoneCode: "+971" },
  { name: "United Kingdom", alpha2: "GB", alpha3: "GBR", numeric: "826", phoneCode: "+44" },
  { name: "United States Minor Outlying Islands", alpha2: "UM", alpha3: "UMI", numeric: "581", phoneCode: "+1" },
  { name: "United States", alpha2: "US", alpha3: "USA", numeric: "840", phoneCode: "+1" },
  { name: "Uruguay", alpha2: "UY", alpha3: "URY", numeric: "858", phoneCode: "+598" },
  { name: "Uzbekistan", alpha2: "UZ", alpha3: "UZB", numeric: "860", phoneCode: "+998" },
  { name: "Vanuatu", alpha2: "VU", alpha3: "VUT", numeric: "548", phoneCode: "+678" },
  { name: "Venezuela", alpha2: "VE", alpha3: "VEN", numeric: "862", phoneCode: "+58" },
  { name: "Viet Nam", alpha2: "VN", alpha3: "VNM", numeric: "704", phoneCode: "+84" },
  { name: "Virgin Islands (British)", alpha2: "VG", alpha3: "VGB", numeric: "092", phoneCode: "+1" },
  { name: "Virgin Islands (U.S.)", alpha2: "VI", alpha3: "VIR", numeric: "850", phoneCode: "+1" },
  { name: "Wallis and Futuna", alpha2: "WF", alpha3: "WLF", numeric: "876", phoneCode: "+681" },
  { name: "Western Sahara", alpha2: "EH", alpha3: "ESH", numeric: "732", phoneCode: "+212" },
  { name: "Yemen", alpha2: "YE", alpha3: "YEM", numeric: "887", phoneCode: "+967" },
  { name: "Zambia", alpha2: "ZM", alpha3: "ZMB", numeric: "894", phoneCode: "+260" },
  { name: "Zimbabwe", alpha2: "ZW", alpha3: "ZWE", numeric: "716", phoneCode: "+263" },
  { name: "Åland Islands", alpha2: "AX", alpha3: "ALA", numeric: "248", phoneCode: "+358" },
];

/** Convert ISO 3166-1 alpha-2 code (e.g. "US") to flag emoji 🇺🇸 */
export function getFlagEmoji(alpha2: string): string {
  if (!alpha2 || alpha2.length !== 2) return "🌐";
  const a = alpha2.toUpperCase().charCodeAt(0) - 0x41;
  const b = alpha2.toUpperCase().charCodeAt(1) - 0x41;
  if (a < 0 || a > 25 || b < 0 || b > 25) return "🌐";
  return String.fromCodePoint(0x1f1e6 + a, 0x1f1e6 + b);
}

/** Phone code option for picker: code, flag, and display label */
export interface PhoneCodeOption {
  code: string;
  flag: string;
  label: string;
}

/** Priority codes to show first; preferred display country when code is shared */
const PRIORITY_DISPLAY: Record<string, string> = {
  "+1": "United States",
  "+44": "United Kingdom",
  "+61": "Australia",
  "+64": "New Zealand",
};

/** All unique phone codes with flag and label for dropdown (uses first country's flag per code) */
export function getCountriesForPhonePicker(): PhoneCodeOption[] {
  const codeMap = new Map<
    string,
    { countries: string[]; alpha2: string }
  >();
  COUNTRIES_DATA.forEach((country) => {
    if (!codeMap.has(country.phoneCode)) {
      codeMap.set(country.phoneCode, {
        countries: [],
        alpha2: country.alpha2,
      });
    }
    const entry = codeMap.get(country.phoneCode)!;
    entry.countries.push(country.name);
  });
  const priorityCodes = ["+1", "+44", "+81", "+86", "+91", "+49", "+33", "+61", "+55", "+52", "+82", "+39", "+34", "+31", "+971", "+966", "+20"];
  const options = Array.from(codeMap.entries()).map(([code, { countries, alpha2 }]) => {
    const preferred = PRIORITY_DISPLAY[code];
    const displayCountry = preferred && countries.includes(preferred) ? preferred : countries[0];
    const displayAlpha2 = COUNTRIES_DATA.find((c) => c.name === displayCountry)?.alpha2 ?? alpha2;
    return {
      code,
      flag: getFlagEmoji(displayAlpha2),
      label:
        countries.length > 1
          ? `${code} ${displayCountry} (+${countries.length - 1} more)`
          : `${code} ${displayCountry}`,
    };
  });
  return options.sort((a, b) => {
    const aPri = priorityCodes.indexOf(a.code);
    const bPri = priorityCodes.indexOf(b.code);
    if (aPri >= 0 && bPri >= 0) return aPri - bPri;
    if (aPri >= 0) return -1;
    if (bPri >= 0) return 1;
    if (a.code.length !== b.code.length) return a.code.length - b.code.length;
    return a.code.localeCompare(b.code);
  });
}

// Get unique phone codes (some countries share codes like +1)
export function getUniquePhoneCodes(): Array<{ code: string; countries: string[] }> {
  const codeMap = new Map<string, string[]>();
  COUNTRIES_DATA.forEach((country) => {
    if (!codeMap.has(country.phoneCode)) {
      codeMap.set(country.phoneCode, []);
    }
    codeMap.get(country.phoneCode)!.push(country.name);
  });
  return Array.from(codeMap.entries())
    .map(([code, countries]) => ({
      code,
      countries: countries.sort(),
    }))
    .sort((a, b) => {
      if (a.code.length !== b.code.length) return a.code.length - b.code.length;
      return a.code.localeCompare(b.code);
    });
}

// Get countries sorted alphabetically
export function getCountriesSorted(): string[] {
  return COUNTRIES_DATA.map((c) => c.name).sort();
}

// Get phone code for a country name
export function getPhoneCodeForCountry(countryName: string): string | null {
  const country = COUNTRIES_DATA.find((c) => c.name === countryName);
  return country ? country.phoneCode : null;
}
