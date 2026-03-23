/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

export type SovereignCountry = {
  code: string;
  code3: string;
  name: string;
  region: string;
  subregion: string;
  population: number;
  borders: string[];
  lang3: string[];
};

export const SOVEREIGN_COUNTRIES: SovereignCountry[] = [
  {
    "code": "AD",
    "code3": "AND",
    "name": "Andorra",
    "region": "Europe",
    "subregion": "Southern Europe",
    "population": 0,
    "borders": [
      "FR",
      "ES"
    ],
    "lang3": [
      "cat"
    ]
  },
  {
    "code": "AE",
    "code3": "ARE",
    "name": "United Arab Emirates",
    "region": "Asia",
    "subregion": "Western Asia",
    "population": 0,
    "borders": [
      "OM",
      "SA"
    ],
    "lang3": [
      "ara"
    ]
  },
  {
    "code": "AF",
    "code3": "AFG",
    "name": "Afghanistan",
    "region": "Asia",
    "subregion": "Southern Asia",
    "population": 0,
    "borders": [
      "IR",
      "PK",
      "TM",
      "UZ",
      "TJ",
      "CN"
    ],
    "lang3": [
      "prs",
      "pus",
      "tuk"
    ]
  },
  {
    "code": "AG",
    "code3": "ATG",
    "name": "Antigua and Barbuda",
    "region": "Americas",
    "subregion": "Caribbean",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "AL",
    "code3": "ALB",
    "name": "Albania",
    "region": "Europe",
    "subregion": "Southeast Europe",
    "population": 0,
    "borders": [
      "ME",
      "GR",
      "MK",
      "XK"
    ],
    "lang3": [
      "sqi"
    ]
  },
  {
    "code": "AM",
    "code3": "ARM",
    "name": "Armenia",
    "region": "Asia",
    "subregion": "Western Asia",
    "population": 0,
    "borders": [
      "AZ",
      "GE",
      "IR",
      "TR"
    ],
    "lang3": [
      "hye"
    ]
  },
  {
    "code": "AO",
    "code3": "AGO",
    "name": "Angola",
    "region": "Africa",
    "subregion": "Middle Africa",
    "population": 0,
    "borders": [
      "CG",
      "CD",
      "ZM",
      "NA"
    ],
    "lang3": [
      "por"
    ]
  },
  {
    "code": "AR",
    "code3": "ARG",
    "name": "Argentina",
    "region": "Americas",
    "subregion": "South America",
    "population": 0,
    "borders": [
      "BO",
      "BR",
      "CL",
      "PY",
      "UY"
    ],
    "lang3": [
      "grn",
      "spa"
    ]
  },
  {
    "code": "AT",
    "code3": "AUT",
    "name": "Austria",
    "region": "Europe",
    "subregion": "Central Europe",
    "population": 0,
    "borders": [
      "CZ",
      "DE",
      "HU",
      "IT",
      "LI",
      "SK",
      "SI",
      "CH"
    ],
    "lang3": [
      "bar"
    ]
  },
  {
    "code": "AU",
    "code3": "AUS",
    "name": "Australia",
    "region": "Oceania",
    "subregion": "Australia and New Zealand",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "AZ",
    "code3": "AZE",
    "name": "Azerbaijan",
    "region": "Asia",
    "subregion": "Western Asia",
    "population": 0,
    "borders": [
      "AM",
      "GE",
      "IR",
      "RU",
      "TR"
    ],
    "lang3": [
      "aze",
      "rus"
    ]
  },
  {
    "code": "BA",
    "code3": "BIH",
    "name": "Bosnia and Herzegovina",
    "region": "Europe",
    "subregion": "Southeast Europe",
    "population": 0,
    "borders": [
      "HR",
      "ME",
      "RS"
    ],
    "lang3": [
      "bos",
      "hrv",
      "srp"
    ]
  },
  {
    "code": "BB",
    "code3": "BRB",
    "name": "Barbados",
    "region": "Americas",
    "subregion": "Caribbean",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "BD",
    "code3": "BGD",
    "name": "Bangladesh",
    "region": "Asia",
    "subregion": "Southern Asia",
    "population": 0,
    "borders": [
      "MM",
      "IN"
    ],
    "lang3": [
      "ben"
    ]
  },
  {
    "code": "BE",
    "code3": "BEL",
    "name": "Belgium",
    "region": "Europe",
    "subregion": "Western Europe",
    "population": 0,
    "borders": [
      "FR",
      "DE",
      "LU",
      "NL"
    ],
    "lang3": [
      "deu",
      "fra",
      "nld"
    ]
  },
  {
    "code": "BF",
    "code3": "BFA",
    "name": "Burkina Faso",
    "region": "Africa",
    "subregion": "Western Africa",
    "population": 0,
    "borders": [
      "BJ",
      "CI",
      "GH",
      "ML",
      "NE",
      "TG"
    ],
    "lang3": [
      "fra"
    ]
  },
  {
    "code": "BG",
    "code3": "BGR",
    "name": "Bulgaria",
    "region": "Europe",
    "subregion": "Southeast Europe",
    "population": 0,
    "borders": [
      "GR",
      "MK",
      "RO",
      "RS",
      "TR"
    ],
    "lang3": [
      "bul"
    ]
  },
  {
    "code": "BH",
    "code3": "BHR",
    "name": "Bahrain",
    "region": "Asia",
    "subregion": "Western Asia",
    "population": 0,
    "borders": [],
    "lang3": [
      "ara"
    ]
  },
  {
    "code": "BI",
    "code3": "BDI",
    "name": "Burundi",
    "region": "Africa",
    "subregion": "Eastern Africa",
    "population": 0,
    "borders": [
      "CD",
      "RW",
      "TZ"
    ],
    "lang3": [
      "fra",
      "run"
    ]
  },
  {
    "code": "BJ",
    "code3": "BEN",
    "name": "Benin",
    "region": "Africa",
    "subregion": "Western Africa",
    "population": 0,
    "borders": [
      "BF",
      "NE",
      "NG",
      "TG"
    ],
    "lang3": [
      "fra"
    ]
  },
  {
    "code": "BN",
    "code3": "BRN",
    "name": "Brunei",
    "region": "Asia",
    "subregion": "South-Eastern Asia",
    "population": 0,
    "borders": [
      "MY"
    ],
    "lang3": [
      "msa"
    ]
  },
  {
    "code": "BO",
    "code3": "BOL",
    "name": "Bolivia",
    "region": "Americas",
    "subregion": "South America",
    "population": 0,
    "borders": [
      "AR",
      "BR",
      "CL",
      "PY",
      "PE"
    ],
    "lang3": [
      "aym",
      "grn",
      "que",
      "spa"
    ]
  },
  {
    "code": "BR",
    "code3": "BRA",
    "name": "Brazil",
    "region": "Americas",
    "subregion": "South America",
    "population": 0,
    "borders": [
      "AR",
      "BO",
      "CO",
      "GF",
      "GY",
      "PY",
      "PE",
      "SR",
      "UY",
      "VE"
    ],
    "lang3": [
      "por"
    ]
  },
  {
    "code": "BS",
    "code3": "BHS",
    "name": "Bahamas",
    "region": "Americas",
    "subregion": "Caribbean",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "BT",
    "code3": "BTN",
    "name": "Bhutan",
    "region": "Asia",
    "subregion": "Southern Asia",
    "population": 0,
    "borders": [
      "CN",
      "IN"
    ],
    "lang3": [
      "dzo"
    ]
  },
  {
    "code": "BW",
    "code3": "BWA",
    "name": "Botswana",
    "region": "Africa",
    "subregion": "Southern Africa",
    "population": 0,
    "borders": [
      "NA",
      "ZA",
      "ZM",
      "ZW"
    ],
    "lang3": [
      "eng",
      "tsn"
    ]
  },
  {
    "code": "BY",
    "code3": "BLR",
    "name": "Belarus",
    "region": "Europe",
    "subregion": "Eastern Europe",
    "population": 0,
    "borders": [
      "LV",
      "LT",
      "PL",
      "RU",
      "UA"
    ],
    "lang3": [
      "bel",
      "rus"
    ]
  },
  {
    "code": "BZ",
    "code3": "BLZ",
    "name": "Belize",
    "region": "Americas",
    "subregion": "Central America",
    "population": 0,
    "borders": [
      "GT",
      "MX"
    ],
    "lang3": [
      "bjz",
      "eng",
      "spa"
    ]
  },
  {
    "code": "CA",
    "code3": "CAN",
    "name": "Canada",
    "region": "Americas",
    "subregion": "North America",
    "population": 0,
    "borders": [
      "US"
    ],
    "lang3": [
      "eng",
      "fra"
    ]
  },
  {
    "code": "CD",
    "code3": "COD",
    "name": "DR Congo",
    "region": "Africa",
    "subregion": "Middle Africa",
    "population": 0,
    "borders": [
      "AO",
      "BI",
      "CF",
      "CG",
      "RW",
      "SS",
      "TZ",
      "UG",
      "ZM"
    ],
    "lang3": [
      "fra",
      "kon",
      "lin",
      "lua",
      "swa"
    ]
  },
  {
    "code": "CF",
    "code3": "CAF",
    "name": "Central African Republic",
    "region": "Africa",
    "subregion": "Middle Africa",
    "population": 0,
    "borders": [
      "CM",
      "TD",
      "CD",
      "CG",
      "SS",
      "SD"
    ],
    "lang3": [
      "fra",
      "sag"
    ]
  },
  {
    "code": "CG",
    "code3": "COG",
    "name": "Republic of the Congo",
    "region": "Africa",
    "subregion": "Middle Africa",
    "population": 0,
    "borders": [
      "AO",
      "CM",
      "CF",
      "CD",
      "GA"
    ],
    "lang3": [
      "fra",
      "kon",
      "lin"
    ]
  },
  {
    "code": "CH",
    "code3": "CHE",
    "name": "Switzerland",
    "region": "Europe",
    "subregion": "Western Europe",
    "population": 0,
    "borders": [
      "AT",
      "FR",
      "IT",
      "LI",
      "DE"
    ],
    "lang3": [
      "fra",
      "gsw",
      "ita",
      "roh"
    ]
  },
  {
    "code": "CI",
    "code3": "CIV",
    "name": "Ivory Coast",
    "region": "Africa",
    "subregion": "Western Africa",
    "population": 0,
    "borders": [
      "BF",
      "GH",
      "GN",
      "LR",
      "ML"
    ],
    "lang3": [
      "fra"
    ]
  },
  {
    "code": "CL",
    "code3": "CHL",
    "name": "Chile",
    "region": "Americas",
    "subregion": "South America",
    "population": 0,
    "borders": [
      "AR",
      "BO",
      "PE"
    ],
    "lang3": [
      "spa"
    ]
  },
  {
    "code": "CM",
    "code3": "CMR",
    "name": "Cameroon",
    "region": "Africa",
    "subregion": "Middle Africa",
    "population": 0,
    "borders": [
      "CF",
      "TD",
      "CG",
      "GQ",
      "GA",
      "NG"
    ],
    "lang3": [
      "eng",
      "fra"
    ]
  },
  {
    "code": "CN",
    "code3": "CHN",
    "name": "China",
    "region": "Asia",
    "subregion": "Eastern Asia",
    "population": 0,
    "borders": [
      "AF",
      "BT",
      "MM",
      "HK",
      "IN",
      "KZ",
      "NP",
      "KP",
      "KG",
      "LA",
      "MO",
      "MN",
      "PK",
      "RU",
      "TJ",
      "VN"
    ],
    "lang3": [
      "zho"
    ]
  },
  {
    "code": "CO",
    "code3": "COL",
    "name": "Colombia",
    "region": "Americas",
    "subregion": "South America",
    "population": 0,
    "borders": [
      "BR",
      "EC",
      "PA",
      "PE",
      "VE"
    ],
    "lang3": [
      "spa"
    ]
  },
  {
    "code": "CR",
    "code3": "CRI",
    "name": "Costa Rica",
    "region": "Americas",
    "subregion": "Central America",
    "population": 0,
    "borders": [
      "NI",
      "PA"
    ],
    "lang3": [
      "spa"
    ]
  },
  {
    "code": "CU",
    "code3": "CUB",
    "name": "Cuba",
    "region": "Americas",
    "subregion": "Caribbean",
    "population": 0,
    "borders": [],
    "lang3": [
      "spa"
    ]
  },
  {
    "code": "CV",
    "code3": "CPV",
    "name": "Cape Verde",
    "region": "Africa",
    "subregion": "Western Africa",
    "population": 0,
    "borders": [],
    "lang3": [
      "por"
    ]
  },
  {
    "code": "CY",
    "code3": "CYP",
    "name": "Cyprus",
    "region": "Europe",
    "subregion": "Southern Europe",
    "population": 0,
    "borders": [],
    "lang3": [
      "ell",
      "tur"
    ]
  },
  {
    "code": "CZ",
    "code3": "CZE",
    "name": "Czechia",
    "region": "Europe",
    "subregion": "Central Europe",
    "population": 0,
    "borders": [
      "AT",
      "DE",
      "PL",
      "SK"
    ],
    "lang3": [
      "ces",
      "slk"
    ]
  },
  {
    "code": "DE",
    "code3": "DEU",
    "name": "Germany",
    "region": "Europe",
    "subregion": "Western Europe",
    "population": 0,
    "borders": [
      "AT",
      "BE",
      "CZ",
      "DK",
      "FR",
      "LU",
      "NL",
      "PL",
      "CH"
    ],
    "lang3": [
      "deu"
    ]
  },
  {
    "code": "DJ",
    "code3": "DJI",
    "name": "Djibouti",
    "region": "Africa",
    "subregion": "Eastern Africa",
    "population": 0,
    "borders": [
      "ER",
      "ET",
      "SO"
    ],
    "lang3": [
      "ara",
      "fra"
    ]
  },
  {
    "code": "DK",
    "code3": "DNK",
    "name": "Denmark",
    "region": "Europe",
    "subregion": "Northern Europe",
    "population": 0,
    "borders": [
      "DE"
    ],
    "lang3": [
      "dan"
    ]
  },
  {
    "code": "DM",
    "code3": "DMA",
    "name": "Dominica",
    "region": "Americas",
    "subregion": "Caribbean",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "DO",
    "code3": "DOM",
    "name": "Dominican Republic",
    "region": "Americas",
    "subregion": "Caribbean",
    "population": 0,
    "borders": [
      "HT"
    ],
    "lang3": [
      "spa"
    ]
  },
  {
    "code": "DZ",
    "code3": "DZA",
    "name": "Algeria",
    "region": "Africa",
    "subregion": "Northern Africa",
    "population": 0,
    "borders": [
      "TN",
      "LY",
      "NE",
      "EH",
      "MR",
      "ML",
      "MA"
    ],
    "lang3": [
      "ara"
    ]
  },
  {
    "code": "EC",
    "code3": "ECU",
    "name": "Ecuador",
    "region": "Americas",
    "subregion": "South America",
    "population": 0,
    "borders": [
      "CO",
      "PE"
    ],
    "lang3": [
      "spa"
    ]
  },
  {
    "code": "EE",
    "code3": "EST",
    "name": "Estonia",
    "region": "Europe",
    "subregion": "Northern Europe",
    "population": 0,
    "borders": [
      "LV",
      "RU"
    ],
    "lang3": [
      "est"
    ]
  },
  {
    "code": "EG",
    "code3": "EGY",
    "name": "Egypt",
    "region": "Africa",
    "subregion": "Northern Africa",
    "population": 0,
    "borders": [
      "IL",
      "LY",
      "PS",
      "SD"
    ],
    "lang3": [
      "ara"
    ]
  },
  {
    "code": "ER",
    "code3": "ERI",
    "name": "Eritrea",
    "region": "Africa",
    "subregion": "Eastern Africa",
    "population": 0,
    "borders": [
      "DJ",
      "ET",
      "SD"
    ],
    "lang3": [
      "ara",
      "eng",
      "tir"
    ]
  },
  {
    "code": "ES",
    "code3": "ESP",
    "name": "Spain",
    "region": "Europe",
    "subregion": "Southern Europe",
    "population": 0,
    "borders": [
      "AD",
      "FR",
      "GI",
      "PT",
      "MA"
    ],
    "lang3": [
      "spa"
    ]
  },
  {
    "code": "ET",
    "code3": "ETH",
    "name": "Ethiopia",
    "region": "Africa",
    "subregion": "Eastern Africa",
    "population": 0,
    "borders": [
      "DJ",
      "ER",
      "KE",
      "SO",
      "SS",
      "SD"
    ],
    "lang3": [
      "amh"
    ]
  },
  {
    "code": "FI",
    "code3": "FIN",
    "name": "Finland",
    "region": "Europe",
    "subregion": "Northern Europe",
    "population": 0,
    "borders": [
      "NO",
      "SE",
      "RU"
    ],
    "lang3": [
      "fin",
      "swe"
    ]
  },
  {
    "code": "FJ",
    "code3": "FJI",
    "name": "Fiji",
    "region": "Oceania",
    "subregion": "Melanesia",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng",
      "fij",
      "hif"
    ]
  },
  {
    "code": "FM",
    "code3": "FSM",
    "name": "Micronesia",
    "region": "Oceania",
    "subregion": "Micronesia",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "FR",
    "code3": "FRA",
    "name": "France",
    "region": "Europe",
    "subregion": "Western Europe",
    "population": 0,
    "borders": [
      "AD",
      "BE",
      "DE",
      "IT",
      "LU",
      "MC",
      "ES",
      "CH"
    ],
    "lang3": [
      "fra"
    ]
  },
  {
    "code": "GA",
    "code3": "GAB",
    "name": "Gabon",
    "region": "Africa",
    "subregion": "Middle Africa",
    "population": 0,
    "borders": [
      "CM",
      "CG",
      "GQ"
    ],
    "lang3": [
      "fra"
    ]
  },
  {
    "code": "GB",
    "code3": "GBR",
    "name": "United Kingdom",
    "region": "Europe",
    "subregion": "Northern Europe",
    "population": 0,
    "borders": [
      "IE"
    ],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "GD",
    "code3": "GRD",
    "name": "Grenada",
    "region": "Americas",
    "subregion": "Caribbean",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "GE",
    "code3": "GEO",
    "name": "Georgia",
    "region": "Asia",
    "subregion": "Western Asia",
    "population": 0,
    "borders": [
      "AM",
      "AZ",
      "RU",
      "TR"
    ],
    "lang3": [
      "kat"
    ]
  },
  {
    "code": "GH",
    "code3": "GHA",
    "name": "Ghana",
    "region": "Africa",
    "subregion": "Western Africa",
    "population": 0,
    "borders": [
      "BF",
      "CI",
      "TG"
    ],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "GM",
    "code3": "GMB",
    "name": "Gambia",
    "region": "Africa",
    "subregion": "Western Africa",
    "population": 0,
    "borders": [
      "SN"
    ],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "GN",
    "code3": "GIN",
    "name": "Guinea",
    "region": "Africa",
    "subregion": "Western Africa",
    "population": 0,
    "borders": [
      "CI",
      "GW",
      "LR",
      "ML",
      "SN",
      "SL"
    ],
    "lang3": [
      "fra"
    ]
  },
  {
    "code": "GQ",
    "code3": "GNQ",
    "name": "Equatorial Guinea",
    "region": "Africa",
    "subregion": "Middle Africa",
    "population": 0,
    "borders": [
      "CM",
      "GA"
    ],
    "lang3": [
      "fra",
      "por",
      "spa"
    ]
  },
  {
    "code": "GR",
    "code3": "GRC",
    "name": "Greece",
    "region": "Europe",
    "subregion": "Southern Europe",
    "population": 0,
    "borders": [
      "AL",
      "BG",
      "TR",
      "MK"
    ],
    "lang3": [
      "ell"
    ]
  },
  {
    "code": "GT",
    "code3": "GTM",
    "name": "Guatemala",
    "region": "Americas",
    "subregion": "Central America",
    "population": 0,
    "borders": [
      "BZ",
      "SV",
      "HN",
      "MX"
    ],
    "lang3": [
      "spa"
    ]
  },
  {
    "code": "GW",
    "code3": "GNB",
    "name": "Guinea-Bissau",
    "region": "Africa",
    "subregion": "Western Africa",
    "population": 0,
    "borders": [
      "GN",
      "SN"
    ],
    "lang3": [
      "por",
      "pov"
    ]
  },
  {
    "code": "GY",
    "code3": "GUY",
    "name": "Guyana",
    "region": "Americas",
    "subregion": "South America",
    "population": 0,
    "borders": [
      "BR",
      "SR",
      "VE"
    ],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "HN",
    "code3": "HND",
    "name": "Honduras",
    "region": "Americas",
    "subregion": "Central America",
    "population": 0,
    "borders": [
      "GT",
      "SV",
      "NI"
    ],
    "lang3": [
      "spa"
    ]
  },
  {
    "code": "HR",
    "code3": "HRV",
    "name": "Croatia",
    "region": "Europe",
    "subregion": "Southeast Europe",
    "population": 0,
    "borders": [
      "BA",
      "HU",
      "ME",
      "RS",
      "SI"
    ],
    "lang3": [
      "hrv"
    ]
  },
  {
    "code": "HT",
    "code3": "HTI",
    "name": "Haiti",
    "region": "Americas",
    "subregion": "Caribbean",
    "population": 0,
    "borders": [
      "DO"
    ],
    "lang3": [
      "fra",
      "hat"
    ]
  },
  {
    "code": "HU",
    "code3": "HUN",
    "name": "Hungary",
    "region": "Europe",
    "subregion": "Central Europe",
    "population": 0,
    "borders": [
      "AT",
      "HR",
      "RO",
      "RS",
      "SK",
      "SI",
      "UA"
    ],
    "lang3": [
      "hun"
    ]
  },
  {
    "code": "ID",
    "code3": "IDN",
    "name": "Indonesia",
    "region": "Asia",
    "subregion": "South-Eastern Asia",
    "population": 0,
    "borders": [
      "TL",
      "MY",
      "PG"
    ],
    "lang3": [
      "ind"
    ]
  },
  {
    "code": "IE",
    "code3": "IRL",
    "name": "Ireland",
    "region": "Europe",
    "subregion": "Northern Europe",
    "population": 0,
    "borders": [
      "GB"
    ],
    "lang3": [
      "eng",
      "gle"
    ]
  },
  {
    "code": "IL",
    "code3": "ISR",
    "name": "Israel",
    "region": "Asia",
    "subregion": "Western Asia",
    "population": 0,
    "borders": [
      "EG",
      "JO",
      "LB",
      "PS",
      "SY"
    ],
    "lang3": [
      "ara",
      "heb"
    ]
  },
  {
    "code": "IN",
    "code3": "IND",
    "name": "India",
    "region": "Asia",
    "subregion": "Southern Asia",
    "population": 0,
    "borders": [
      "BD",
      "BT",
      "MM",
      "CN",
      "NP",
      "PK"
    ],
    "lang3": [
      "eng",
      "hin",
      "tam"
    ]
  },
  {
    "code": "IQ",
    "code3": "IRQ",
    "name": "Iraq",
    "region": "Asia",
    "subregion": "Western Asia",
    "population": 0,
    "borders": [
      "IR",
      "JO",
      "KW",
      "SA",
      "SY",
      "TR"
    ],
    "lang3": [
      "ara",
      "arc",
      "ckb"
    ]
  },
  {
    "code": "IR",
    "code3": "IRN",
    "name": "Iran",
    "region": "Asia",
    "subregion": "Southern Asia",
    "population": 0,
    "borders": [
      "AF",
      "AM",
      "AZ",
      "IQ",
      "PK",
      "TR",
      "TM"
    ],
    "lang3": [
      "fas"
    ]
  },
  {
    "code": "IS",
    "code3": "ISL",
    "name": "Iceland",
    "region": "Europe",
    "subregion": "Northern Europe",
    "population": 0,
    "borders": [],
    "lang3": [
      "isl"
    ]
  },
  {
    "code": "IT",
    "code3": "ITA",
    "name": "Italy",
    "region": "Europe",
    "subregion": "Southern Europe",
    "population": 0,
    "borders": [
      "AT",
      "FR",
      "SM",
      "SI",
      "CH",
      "VA"
    ],
    "lang3": [
      "ita"
    ]
  },
  {
    "code": "JM",
    "code3": "JAM",
    "name": "Jamaica",
    "region": "Americas",
    "subregion": "Caribbean",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng",
      "jam"
    ]
  },
  {
    "code": "JO",
    "code3": "JOR",
    "name": "Jordan",
    "region": "Asia",
    "subregion": "Western Asia",
    "population": 0,
    "borders": [
      "IQ",
      "IL",
      "PS",
      "SA",
      "SY"
    ],
    "lang3": [
      "ara"
    ]
  },
  {
    "code": "JP",
    "code3": "JPN",
    "name": "Japan",
    "region": "Asia",
    "subregion": "Eastern Asia",
    "population": 0,
    "borders": [],
    "lang3": [
      "jpn"
    ]
  },
  {
    "code": "KE",
    "code3": "KEN",
    "name": "Kenya",
    "region": "Africa",
    "subregion": "Eastern Africa",
    "population": 0,
    "borders": [
      "ET",
      "SO",
      "SS",
      "TZ",
      "UG"
    ],
    "lang3": [
      "eng",
      "swa"
    ]
  },
  {
    "code": "KG",
    "code3": "KGZ",
    "name": "Kyrgyzstan",
    "region": "Asia",
    "subregion": "Central Asia",
    "population": 0,
    "borders": [
      "CN",
      "KZ",
      "TJ",
      "UZ"
    ],
    "lang3": [
      "kir",
      "rus"
    ]
  },
  {
    "code": "KH",
    "code3": "KHM",
    "name": "Cambodia",
    "region": "Asia",
    "subregion": "South-Eastern Asia",
    "population": 0,
    "borders": [
      "LA",
      "TH",
      "VN"
    ],
    "lang3": [
      "khm"
    ]
  },
  {
    "code": "KI",
    "code3": "KIR",
    "name": "Kiribati",
    "region": "Oceania",
    "subregion": "Micronesia",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng",
      "gil"
    ]
  },
  {
    "code": "KM",
    "code3": "COM",
    "name": "Comoros",
    "region": "Africa",
    "subregion": "Eastern Africa",
    "population": 0,
    "borders": [],
    "lang3": [
      "ara",
      "fra",
      "zdj"
    ]
  },
  {
    "code": "KN",
    "code3": "KNA",
    "name": "Saint Kitts and Nevis",
    "region": "Americas",
    "subregion": "Caribbean",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "KP",
    "code3": "PRK",
    "name": "North Korea",
    "region": "Asia",
    "subregion": "Eastern Asia",
    "population": 0,
    "borders": [
      "CN",
      "KR",
      "RU"
    ],
    "lang3": [
      "kor"
    ]
  },
  {
    "code": "KR",
    "code3": "KOR",
    "name": "South Korea",
    "region": "Asia",
    "subregion": "Eastern Asia",
    "population": 0,
    "borders": [
      "KP"
    ],
    "lang3": [
      "kor"
    ]
  },
  {
    "code": "KW",
    "code3": "KWT",
    "name": "Kuwait",
    "region": "Asia",
    "subregion": "Western Asia",
    "population": 0,
    "borders": [
      "IQ",
      "SA"
    ],
    "lang3": [
      "ara"
    ]
  },
  {
    "code": "KZ",
    "code3": "KAZ",
    "name": "Kazakhstan",
    "region": "Asia",
    "subregion": "Central Asia",
    "population": 0,
    "borders": [
      "CN",
      "KG",
      "RU",
      "TM",
      "UZ"
    ],
    "lang3": [
      "kaz",
      "rus"
    ]
  },
  {
    "code": "LA",
    "code3": "LAO",
    "name": "Laos",
    "region": "Asia",
    "subregion": "South-Eastern Asia",
    "population": 0,
    "borders": [
      "MM",
      "KH",
      "CN",
      "TH",
      "VN"
    ],
    "lang3": [
      "lao"
    ]
  },
  {
    "code": "LB",
    "code3": "LBN",
    "name": "Lebanon",
    "region": "Asia",
    "subregion": "Western Asia",
    "population": 0,
    "borders": [
      "IL",
      "SY"
    ],
    "lang3": [
      "ara",
      "fra"
    ]
  },
  {
    "code": "LC",
    "code3": "LCA",
    "name": "Saint Lucia",
    "region": "Americas",
    "subregion": "Caribbean",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "LI",
    "code3": "LIE",
    "name": "Liechtenstein",
    "region": "Europe",
    "subregion": "Western Europe",
    "population": 0,
    "borders": [
      "AT",
      "CH"
    ],
    "lang3": [
      "deu"
    ]
  },
  {
    "code": "LK",
    "code3": "LKA",
    "name": "Sri Lanka",
    "region": "Asia",
    "subregion": "Southern Asia",
    "population": 0,
    "borders": [
      "IN"
    ],
    "lang3": [
      "sin",
      "tam"
    ]
  },
  {
    "code": "LR",
    "code3": "LBR",
    "name": "Liberia",
    "region": "Africa",
    "subregion": "Western Africa",
    "population": 0,
    "borders": [
      "GN",
      "CI",
      "SL"
    ],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "LS",
    "code3": "LSO",
    "name": "Lesotho",
    "region": "Africa",
    "subregion": "Southern Africa",
    "population": 0,
    "borders": [
      "ZA"
    ],
    "lang3": [
      "eng",
      "sot"
    ]
  },
  {
    "code": "LT",
    "code3": "LTU",
    "name": "Lithuania",
    "region": "Europe",
    "subregion": "Northern Europe",
    "population": 0,
    "borders": [
      "BY",
      "LV",
      "PL",
      "RU"
    ],
    "lang3": [
      "lit"
    ]
  },
  {
    "code": "LU",
    "code3": "LUX",
    "name": "Luxembourg",
    "region": "Europe",
    "subregion": "Western Europe",
    "population": 0,
    "borders": [
      "BE",
      "FR",
      "DE"
    ],
    "lang3": [
      "deu",
      "fra",
      "ltz"
    ]
  },
  {
    "code": "LV",
    "code3": "LVA",
    "name": "Latvia",
    "region": "Europe",
    "subregion": "Northern Europe",
    "population": 0,
    "borders": [
      "BY",
      "EE",
      "LT",
      "RU"
    ],
    "lang3": [
      "lav"
    ]
  },
  {
    "code": "LY",
    "code3": "LBY",
    "name": "Libya",
    "region": "Africa",
    "subregion": "Northern Africa",
    "population": 0,
    "borders": [
      "DZ",
      "TD",
      "EG",
      "NE",
      "SD",
      "TN"
    ],
    "lang3": [
      "ara"
    ]
  },
  {
    "code": "MA",
    "code3": "MAR",
    "name": "Morocco",
    "region": "Africa",
    "subregion": "Northern Africa",
    "population": 0,
    "borders": [
      "DZ",
      "EH",
      "ES"
    ],
    "lang3": [
      "ara",
      "ber"
    ]
  },
  {
    "code": "MC",
    "code3": "MCO",
    "name": "Monaco",
    "region": "Europe",
    "subregion": "Western Europe",
    "population": 0,
    "borders": [
      "FR"
    ],
    "lang3": [
      "fra"
    ]
  },
  {
    "code": "MD",
    "code3": "MDA",
    "name": "Moldova",
    "region": "Europe",
    "subregion": "Eastern Europe",
    "population": 0,
    "borders": [
      "RO",
      "UA"
    ],
    "lang3": [
      "ron"
    ]
  },
  {
    "code": "ME",
    "code3": "MNE",
    "name": "Montenegro",
    "region": "Europe",
    "subregion": "Southeast Europe",
    "population": 0,
    "borders": [
      "AL",
      "BA",
      "HR",
      "XK",
      "RS"
    ],
    "lang3": [
      "cnr"
    ]
  },
  {
    "code": "MG",
    "code3": "MDG",
    "name": "Madagascar",
    "region": "Africa",
    "subregion": "Eastern Africa",
    "population": 0,
    "borders": [],
    "lang3": [
      "fra",
      "mlg"
    ]
  },
  {
    "code": "MH",
    "code3": "MHL",
    "name": "Marshall Islands",
    "region": "Oceania",
    "subregion": "Micronesia",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng",
      "mah"
    ]
  },
  {
    "code": "MK",
    "code3": "MKD",
    "name": "North Macedonia",
    "region": "Europe",
    "subregion": "Southeast Europe",
    "population": 0,
    "borders": [
      "AL",
      "BG",
      "GR",
      "XK",
      "RS"
    ],
    "lang3": [
      "mkd"
    ]
  },
  {
    "code": "ML",
    "code3": "MLI",
    "name": "Mali",
    "region": "Africa",
    "subregion": "Western Africa",
    "population": 0,
    "borders": [
      "DZ",
      "BF",
      "GN",
      "CI",
      "MR",
      "NE",
      "SN"
    ],
    "lang3": [
      "fra"
    ]
  },
  {
    "code": "MM",
    "code3": "MMR",
    "name": "Myanmar",
    "region": "Asia",
    "subregion": "South-Eastern Asia",
    "population": 0,
    "borders": [
      "BD",
      "CN",
      "IN",
      "LA",
      "TH"
    ],
    "lang3": [
      "mya"
    ]
  },
  {
    "code": "MN",
    "code3": "MNG",
    "name": "Mongolia",
    "region": "Asia",
    "subregion": "Eastern Asia",
    "population": 0,
    "borders": [
      "CN",
      "RU"
    ],
    "lang3": [
      "mon"
    ]
  },
  {
    "code": "MR",
    "code3": "MRT",
    "name": "Mauritania",
    "region": "Africa",
    "subregion": "Western Africa",
    "population": 0,
    "borders": [
      "DZ",
      "ML",
      "SN",
      "EH"
    ],
    "lang3": [
      "ara"
    ]
  },
  {
    "code": "MT",
    "code3": "MLT",
    "name": "Malta",
    "region": "Europe",
    "subregion": "Southern Europe",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng",
      "mlt"
    ]
  },
  {
    "code": "MU",
    "code3": "MUS",
    "name": "Mauritius",
    "region": "Africa",
    "subregion": "Eastern Africa",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng",
      "fra",
      "mfe"
    ]
  },
  {
    "code": "MV",
    "code3": "MDV",
    "name": "Maldives",
    "region": "Asia",
    "subregion": "Southern Asia",
    "population": 0,
    "borders": [],
    "lang3": [
      "div"
    ]
  },
  {
    "code": "MW",
    "code3": "MWI",
    "name": "Malawi",
    "region": "Africa",
    "subregion": "Eastern Africa",
    "population": 0,
    "borders": [
      "MZ",
      "TZ",
      "ZM"
    ],
    "lang3": [
      "eng",
      "nya"
    ]
  },
  {
    "code": "MX",
    "code3": "MEX",
    "name": "Mexico",
    "region": "Americas",
    "subregion": "North America",
    "population": 0,
    "borders": [
      "BZ",
      "GT",
      "US"
    ],
    "lang3": [
      "spa"
    ]
  },
  {
    "code": "MY",
    "code3": "MYS",
    "name": "Malaysia",
    "region": "Asia",
    "subregion": "South-Eastern Asia",
    "population": 0,
    "borders": [
      "BN",
      "ID",
      "TH"
    ],
    "lang3": [
      "eng",
      "msa"
    ]
  },
  {
    "code": "MZ",
    "code3": "MOZ",
    "name": "Mozambique",
    "region": "Africa",
    "subregion": "Eastern Africa",
    "population": 0,
    "borders": [
      "MW",
      "ZA",
      "SZ",
      "TZ",
      "ZM",
      "ZW"
    ],
    "lang3": [
      "por"
    ]
  },
  {
    "code": "NA",
    "code3": "NAM",
    "name": "Namibia",
    "region": "Africa",
    "subregion": "Southern Africa",
    "population": 0,
    "borders": [
      "AO",
      "BW",
      "ZA",
      "ZM"
    ],
    "lang3": [
      "afr",
      "deu",
      "eng",
      "her",
      "hgm",
      "kwn",
      "loz",
      "ndo",
      "tsn"
    ]
  },
  {
    "code": "NE",
    "code3": "NER",
    "name": "Niger",
    "region": "Africa",
    "subregion": "Western Africa",
    "population": 0,
    "borders": [
      "DZ",
      "BJ",
      "BF",
      "TD",
      "LY",
      "ML",
      "NG"
    ],
    "lang3": [
      "fra"
    ]
  },
  {
    "code": "NG",
    "code3": "NGA",
    "name": "Nigeria",
    "region": "Africa",
    "subregion": "Western Africa",
    "population": 0,
    "borders": [
      "BJ",
      "CM",
      "TD",
      "NE"
    ],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "NI",
    "code3": "NIC",
    "name": "Nicaragua",
    "region": "Americas",
    "subregion": "Central America",
    "population": 0,
    "borders": [
      "CR",
      "HN"
    ],
    "lang3": [
      "spa"
    ]
  },
  {
    "code": "NL",
    "code3": "NLD",
    "name": "Netherlands",
    "region": "Europe",
    "subregion": "Western Europe",
    "population": 0,
    "borders": [
      "BE",
      "DE"
    ],
    "lang3": [
      "nld"
    ]
  },
  {
    "code": "NO",
    "code3": "NOR",
    "name": "Norway",
    "region": "Europe",
    "subregion": "Northern Europe",
    "population": 0,
    "borders": [
      "FI",
      "SE",
      "RU"
    ],
    "lang3": [
      "nno",
      "nob",
      "smi"
    ]
  },
  {
    "code": "NP",
    "code3": "NPL",
    "name": "Nepal",
    "region": "Asia",
    "subregion": "Southern Asia",
    "population": 0,
    "borders": [
      "CN",
      "IN"
    ],
    "lang3": [
      "nep"
    ]
  },
  {
    "code": "NR",
    "code3": "NRU",
    "name": "Nauru",
    "region": "Oceania",
    "subregion": "Micronesia",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng",
      "nau"
    ]
  },
  {
    "code": "NZ",
    "code3": "NZL",
    "name": "New Zealand",
    "region": "Oceania",
    "subregion": "Australia and New Zealand",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng",
      "mri",
      "nzs"
    ]
  },
  {
    "code": "OM",
    "code3": "OMN",
    "name": "Oman",
    "region": "Asia",
    "subregion": "Western Asia",
    "population": 0,
    "borders": [
      "SA",
      "AE",
      "YE"
    ],
    "lang3": [
      "ara"
    ]
  },
  {
    "code": "PA",
    "code3": "PAN",
    "name": "Panama",
    "region": "Americas",
    "subregion": "Central America",
    "population": 0,
    "borders": [
      "CO",
      "CR"
    ],
    "lang3": [
      "spa"
    ]
  },
  {
    "code": "PE",
    "code3": "PER",
    "name": "Peru",
    "region": "Americas",
    "subregion": "South America",
    "population": 0,
    "borders": [
      "BO",
      "BR",
      "CL",
      "CO",
      "EC"
    ],
    "lang3": [
      "aym",
      "que",
      "spa"
    ]
  },
  {
    "code": "PG",
    "code3": "PNG",
    "name": "Papua New Guinea",
    "region": "Oceania",
    "subregion": "Melanesia",
    "population": 0,
    "borders": [
      "ID"
    ],
    "lang3": [
      "eng",
      "hmo",
      "tpi"
    ]
  },
  {
    "code": "PH",
    "code3": "PHL",
    "name": "Philippines",
    "region": "Asia",
    "subregion": "South-Eastern Asia",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng",
      "fil"
    ]
  },
  {
    "code": "PK",
    "code3": "PAK",
    "name": "Pakistan",
    "region": "Asia",
    "subregion": "Southern Asia",
    "population": 0,
    "borders": [
      "AF",
      "CN",
      "IN",
      "IR"
    ],
    "lang3": [
      "eng",
      "urd"
    ]
  },
  {
    "code": "PL",
    "code3": "POL",
    "name": "Poland",
    "region": "Europe",
    "subregion": "Central Europe",
    "population": 0,
    "borders": [
      "BY",
      "CZ",
      "DE",
      "LT",
      "RU",
      "SK",
      "UA"
    ],
    "lang3": [
      "pol"
    ]
  },
  {
    "code": "PS",
    "code3": "PSE",
    "name": "Palestine",
    "region": "Asia",
    "subregion": "Western Asia",
    "population": 0,
    "borders": [
      "IL",
      "EG",
      "JO"
    ],
    "lang3": [
      "ara"
    ]
  },
  {
    "code": "PT",
    "code3": "PRT",
    "name": "Portugal",
    "region": "Europe",
    "subregion": "Southern Europe",
    "population": 0,
    "borders": [
      "ES"
    ],
    "lang3": [
      "por"
    ]
  },
  {
    "code": "PW",
    "code3": "PLW",
    "name": "Palau",
    "region": "Oceania",
    "subregion": "Micronesia",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng",
      "pau"
    ]
  },
  {
    "code": "PY",
    "code3": "PRY",
    "name": "Paraguay",
    "region": "Americas",
    "subregion": "South America",
    "population": 0,
    "borders": [
      "AR",
      "BO",
      "BR"
    ],
    "lang3": [
      "grn",
      "spa"
    ]
  },
  {
    "code": "QA",
    "code3": "QAT",
    "name": "Qatar",
    "region": "Asia",
    "subregion": "Western Asia",
    "population": 0,
    "borders": [
      "SA"
    ],
    "lang3": [
      "ara"
    ]
  },
  {
    "code": "RO",
    "code3": "ROU",
    "name": "Romania",
    "region": "Europe",
    "subregion": "Southeast Europe",
    "population": 0,
    "borders": [
      "BG",
      "HU",
      "MD",
      "RS",
      "UA"
    ],
    "lang3": [
      "ron"
    ]
  },
  {
    "code": "RS",
    "code3": "SRB",
    "name": "Serbia",
    "region": "Europe",
    "subregion": "Southeast Europe",
    "population": 0,
    "borders": [
      "BA",
      "BG",
      "HR",
      "HU",
      "XK",
      "MK",
      "ME",
      "RO"
    ],
    "lang3": [
      "srp"
    ]
  },
  {
    "code": "RU",
    "code3": "RUS",
    "name": "Russia",
    "region": "Europe",
    "subregion": "Eastern Europe",
    "population": 0,
    "borders": [
      "AZ",
      "BY",
      "CN",
      "EE",
      "FI",
      "GE",
      "KZ",
      "KP",
      "LV",
      "LT",
      "MN",
      "NO",
      "PL",
      "UA"
    ],
    "lang3": [
      "rus"
    ]
  },
  {
    "code": "RW",
    "code3": "RWA",
    "name": "Rwanda",
    "region": "Africa",
    "subregion": "Eastern Africa",
    "population": 0,
    "borders": [
      "BI",
      "CD",
      "TZ",
      "UG"
    ],
    "lang3": [
      "eng",
      "fra",
      "kin"
    ]
  },
  {
    "code": "SA",
    "code3": "SAU",
    "name": "Saudi Arabia",
    "region": "Asia",
    "subregion": "Western Asia",
    "population": 0,
    "borders": [
      "IQ",
      "JO",
      "KW",
      "OM",
      "QA",
      "AE",
      "YE"
    ],
    "lang3": [
      "ara"
    ]
  },
  {
    "code": "SB",
    "code3": "SLB",
    "name": "Solomon Islands",
    "region": "Oceania",
    "subregion": "Melanesia",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "SC",
    "code3": "SYC",
    "name": "Seychelles",
    "region": "Africa",
    "subregion": "Eastern Africa",
    "population": 0,
    "borders": [],
    "lang3": [
      "crs",
      "eng",
      "fra"
    ]
  },
  {
    "code": "SD",
    "code3": "SDN",
    "name": "Sudan",
    "region": "Africa",
    "subregion": "Northern Africa",
    "population": 0,
    "borders": [
      "CF",
      "TD",
      "EG",
      "ER",
      "ET",
      "LY",
      "SS"
    ],
    "lang3": [
      "ara",
      "eng"
    ]
  },
  {
    "code": "SE",
    "code3": "SWE",
    "name": "Sweden",
    "region": "Europe",
    "subregion": "Northern Europe",
    "population": 0,
    "borders": [
      "FI",
      "NO"
    ],
    "lang3": [
      "swe"
    ]
  },
  {
    "code": "SG",
    "code3": "SGP",
    "name": "Singapore",
    "region": "Asia",
    "subregion": "South-Eastern Asia",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng",
      "msa",
      "tam",
      "zho"
    ]
  },
  {
    "code": "SI",
    "code3": "SVN",
    "name": "Slovenia",
    "region": "Europe",
    "subregion": "Central Europe",
    "population": 0,
    "borders": [
      "AT",
      "HR",
      "IT",
      "HU"
    ],
    "lang3": [
      "slv"
    ]
  },
  {
    "code": "SK",
    "code3": "SVK",
    "name": "Slovakia",
    "region": "Europe",
    "subregion": "Central Europe",
    "population": 0,
    "borders": [
      "AT",
      "CZ",
      "HU",
      "PL",
      "UA"
    ],
    "lang3": [
      "slk"
    ]
  },
  {
    "code": "SL",
    "code3": "SLE",
    "name": "Sierra Leone",
    "region": "Africa",
    "subregion": "Western Africa",
    "population": 0,
    "borders": [
      "GN",
      "LR"
    ],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "SM",
    "code3": "SMR",
    "name": "San Marino",
    "region": "Europe",
    "subregion": "Southern Europe",
    "population": 0,
    "borders": [
      "IT"
    ],
    "lang3": [
      "ita"
    ]
  },
  {
    "code": "SN",
    "code3": "SEN",
    "name": "Senegal",
    "region": "Africa",
    "subregion": "Western Africa",
    "population": 0,
    "borders": [
      "GM",
      "GN",
      "GW",
      "ML",
      "MR"
    ],
    "lang3": [
      "fra"
    ]
  },
  {
    "code": "SO",
    "code3": "SOM",
    "name": "Somalia",
    "region": "Africa",
    "subregion": "Eastern Africa",
    "population": 0,
    "borders": [
      "DJ",
      "ET",
      "KE"
    ],
    "lang3": [
      "ara",
      "som"
    ]
  },
  {
    "code": "SR",
    "code3": "SUR",
    "name": "Suriname",
    "region": "Americas",
    "subregion": "South America",
    "population": 0,
    "borders": [
      "BR",
      "GF",
      "GY"
    ],
    "lang3": [
      "nld"
    ]
  },
  {
    "code": "SS",
    "code3": "SSD",
    "name": "South Sudan",
    "region": "Africa",
    "subregion": "Middle Africa",
    "population": 0,
    "borders": [
      "CF",
      "CD",
      "ET",
      "KE",
      "SD",
      "UG"
    ],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "ST",
    "code3": "STP",
    "name": "São Tomé and Príncipe",
    "region": "Africa",
    "subregion": "Middle Africa",
    "population": 0,
    "borders": [],
    "lang3": [
      "por"
    ]
  },
  {
    "code": "SV",
    "code3": "SLV",
    "name": "El Salvador",
    "region": "Americas",
    "subregion": "Central America",
    "population": 0,
    "borders": [
      "GT",
      "HN"
    ],
    "lang3": [
      "spa"
    ]
  },
  {
    "code": "SY",
    "code3": "SYR",
    "name": "Syria",
    "region": "Asia",
    "subregion": "Western Asia",
    "population": 0,
    "borders": [
      "IQ",
      "IL",
      "JO",
      "LB",
      "TR"
    ],
    "lang3": [
      "ara"
    ]
  },
  {
    "code": "SZ",
    "code3": "SWZ",
    "name": "Eswatini",
    "region": "Africa",
    "subregion": "Southern Africa",
    "population": 0,
    "borders": [
      "MZ",
      "ZA"
    ],
    "lang3": [
      "eng",
      "ssw"
    ]
  },
  {
    "code": "TD",
    "code3": "TCD",
    "name": "Chad",
    "region": "Africa",
    "subregion": "Middle Africa",
    "population": 0,
    "borders": [
      "CM",
      "CF",
      "LY",
      "NE",
      "NG",
      "SD"
    ],
    "lang3": [
      "ara",
      "fra"
    ]
  },
  {
    "code": "TG",
    "code3": "TGO",
    "name": "Togo",
    "region": "Africa",
    "subregion": "Western Africa",
    "population": 0,
    "borders": [
      "BJ",
      "BF",
      "GH"
    ],
    "lang3": [
      "fra"
    ]
  },
  {
    "code": "TH",
    "code3": "THA",
    "name": "Thailand",
    "region": "Asia",
    "subregion": "South-Eastern Asia",
    "population": 0,
    "borders": [
      "MM",
      "KH",
      "LA",
      "MY"
    ],
    "lang3": [
      "tha"
    ]
  },
  {
    "code": "TJ",
    "code3": "TJK",
    "name": "Tajikistan",
    "region": "Asia",
    "subregion": "Central Asia",
    "population": 0,
    "borders": [
      "AF",
      "CN",
      "KG",
      "UZ"
    ],
    "lang3": [
      "rus",
      "tgk"
    ]
  },
  {
    "code": "TL",
    "code3": "TLS",
    "name": "Timor-Leste",
    "region": "Asia",
    "subregion": "South-Eastern Asia",
    "population": 0,
    "borders": [
      "ID"
    ],
    "lang3": [
      "por",
      "tet"
    ]
  },
  {
    "code": "TM",
    "code3": "TKM",
    "name": "Turkmenistan",
    "region": "Asia",
    "subregion": "Central Asia",
    "population": 0,
    "borders": [
      "AF",
      "IR",
      "KZ",
      "UZ"
    ],
    "lang3": [
      "rus",
      "tuk"
    ]
  },
  {
    "code": "TN",
    "code3": "TUN",
    "name": "Tunisia",
    "region": "Africa",
    "subregion": "Northern Africa",
    "population": 0,
    "borders": [
      "DZ",
      "LY"
    ],
    "lang3": [
      "ara"
    ]
  },
  {
    "code": "TO",
    "code3": "TON",
    "name": "Tonga",
    "region": "Oceania",
    "subregion": "Polynesia",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng",
      "ton"
    ]
  },
  {
    "code": "TR",
    "code3": "TUR",
    "name": "Türkiye",
    "region": "Asia",
    "subregion": "Western Asia",
    "population": 0,
    "borders": [
      "AM",
      "AZ",
      "BG",
      "GE",
      "GR",
      "IR",
      "IQ",
      "SY"
    ],
    "lang3": [
      "tur"
    ]
  },
  {
    "code": "TT",
    "code3": "TTO",
    "name": "Trinidad and Tobago",
    "region": "Americas",
    "subregion": "Caribbean",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "TV",
    "code3": "TUV",
    "name": "Tuvalu",
    "region": "Oceania",
    "subregion": "Polynesia",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng",
      "tvl"
    ]
  },
  {
    "code": "TZ",
    "code3": "TZA",
    "name": "Tanzania",
    "region": "Africa",
    "subregion": "Eastern Africa",
    "population": 0,
    "borders": [
      "BI",
      "CD",
      "KE",
      "MW",
      "MZ",
      "RW",
      "UG",
      "ZM"
    ],
    "lang3": [
      "eng",
      "swa"
    ]
  },
  {
    "code": "UA",
    "code3": "UKR",
    "name": "Ukraine",
    "region": "Europe",
    "subregion": "Eastern Europe",
    "population": 0,
    "borders": [
      "BY",
      "HU",
      "MD",
      "PL",
      "RO",
      "RU",
      "SK"
    ],
    "lang3": [
      "ukr"
    ]
  },
  {
    "code": "UG",
    "code3": "UGA",
    "name": "Uganda",
    "region": "Africa",
    "subregion": "Eastern Africa",
    "population": 0,
    "borders": [
      "CD",
      "KE",
      "RW",
      "SS",
      "TZ"
    ],
    "lang3": [
      "eng",
      "swa"
    ]
  },
  {
    "code": "US",
    "code3": "USA",
    "name": "United States",
    "region": "Americas",
    "subregion": "North America",
    "population": 0,
    "borders": [
      "CA",
      "MX"
    ],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "UY",
    "code3": "URY",
    "name": "Uruguay",
    "region": "Americas",
    "subregion": "South America",
    "population": 0,
    "borders": [
      "AR",
      "BR"
    ],
    "lang3": [
      "spa"
    ]
  },
  {
    "code": "UZ",
    "code3": "UZB",
    "name": "Uzbekistan",
    "region": "Asia",
    "subregion": "Central Asia",
    "population": 0,
    "borders": [
      "AF",
      "KZ",
      "KG",
      "TJ",
      "TM"
    ],
    "lang3": [
      "rus",
      "uzb"
    ]
  },
  {
    "code": "VA",
    "code3": "VAT",
    "name": "Vatican City",
    "region": "Europe",
    "subregion": "Southern Europe",
    "population": 0,
    "borders": [
      "IT"
    ],
    "lang3": [
      "ita",
      "lat"
    ]
  },
  {
    "code": "VC",
    "code3": "VCT",
    "name": "Saint Vincent and the Grenadines",
    "region": "Americas",
    "subregion": "Caribbean",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "VE",
    "code3": "VEN",
    "name": "Venezuela",
    "region": "Americas",
    "subregion": "South America",
    "population": 0,
    "borders": [
      "BR",
      "CO",
      "GY"
    ],
    "lang3": [
      "spa"
    ]
  },
  {
    "code": "VN",
    "code3": "VNM",
    "name": "Vietnam",
    "region": "Asia",
    "subregion": "South-Eastern Asia",
    "population": 0,
    "borders": [
      "KH",
      "CN",
      "LA"
    ],
    "lang3": [
      "vie"
    ]
  },
  {
    "code": "VU",
    "code3": "VUT",
    "name": "Vanuatu",
    "region": "Oceania",
    "subregion": "Melanesia",
    "population": 0,
    "borders": [],
    "lang3": [
      "bis",
      "eng",
      "fra"
    ]
  },
  {
    "code": "WS",
    "code3": "WSM",
    "name": "Samoa",
    "region": "Oceania",
    "subregion": "Polynesia",
    "population": 0,
    "borders": [],
    "lang3": [
      "eng",
      "smo"
    ]
  },
  {
    "code": "YE",
    "code3": "YEM",
    "name": "Yemen",
    "region": "Asia",
    "subregion": "Western Asia",
    "population": 0,
    "borders": [
      "OM",
      "SA"
    ],
    "lang3": [
      "ara"
    ]
  },
  {
    "code": "ZA",
    "code3": "ZAF",
    "name": "South Africa",
    "region": "Africa",
    "subregion": "Southern Africa",
    "population": 0,
    "borders": [
      "BW",
      "LS",
      "MZ",
      "NA",
      "SZ",
      "ZW"
    ],
    "lang3": [
      "afr",
      "eng",
      "nbl",
      "nso",
      "sot",
      "ssw",
      "tsn",
      "tso",
      "ven",
      "xho",
      "zul"
    ]
  },
  {
    "code": "ZM",
    "code3": "ZMB",
    "name": "Zambia",
    "region": "Africa",
    "subregion": "Eastern Africa",
    "population": 0,
    "borders": [
      "AO",
      "BW",
      "CD",
      "MW",
      "MZ",
      "NA",
      "TZ",
      "ZW"
    ],
    "lang3": [
      "eng"
    ]
  },
  {
    "code": "ZW",
    "code3": "ZWE",
    "name": "Zimbabwe",
    "region": "Africa",
    "subregion": "Eastern Africa",
    "population": 0,
    "borders": [
      "BW",
      "MZ",
      "ZA",
      "ZM"
    ],
    "lang3": [
      "bwg",
      "eng",
      "kck",
      "khi",
      "ndc",
      "nde",
      "nya",
      "sna",
      "sot",
      "toi",
      "tsn",
      "tso",
      "ven",
      "xho",
      "zib"
    ]
  }
];

export const SOVEREIGN_COUNTRY_CODES = SOVEREIGN_COUNTRIES.map((c) => c.code);

export const COUNTRY_BY_CODE: Record<string, SovereignCountry> = Object.fromEntries(
  SOVEREIGN_COUNTRIES.map((country) => [country.code, country]),
);

export function isSovereignCountryCode(code: string): boolean {
  if (!code || code.length !== 2) return false;
  return Boolean(COUNTRY_BY_CODE[code.toUpperCase()]);
}
