export type ProductVisual = {
  src: string;
  alt: string;
  position: string;
};

const RULES: Array<{ terms: string[]; visual: ProductVisual }> = [
  {
    terms: ["internet", "mobilfunk", "glasfaser", "telekom", "dsl", "router", "tv"],
    visual: {
      src: "https://images.pexels.com/photos/28348054/pexels-photo-28348054.jpeg?auto=compress&cs=tinysrgb&w=1400",
      alt: "Moderner WLAN-Router als Symbol für Konnektivität und Telekommunikation",
      position: "center",
    },
  },
  {
    terms: ["strom", "gas", "energie", "utility"],
    visual: {
      src: "https://images.pexels.com/photos/13785838/pexels-photo-13785838.jpeg?auto=compress&cs=tinysrgb&w=1400",
      alt: "Digitaler Stromzähler als Symbol für Energieprodukte und Verbrauch",
      position: "center",
    },
  },
  {
    terms: ["versicherung", "vorsorge", "absicherung"],
    visual: {
      src: "https://images.pexels.com/photos/7433848/pexels-photo-7433848.jpeg?auto=compress&cs=tinysrgb&w=1400",
      alt: "Professionelles Beratungsgespräch mit Vertragsunterlagen",
      position: "center",
    },
  },
  {
    terms: ["sicherheit", "alarm", "kamera", "security", "smart home"],
    visual: {
      src: "https://images.pexels.com/photos/27662922/pexels-photo-27662922.jpeg?auto=compress&cs=tinysrgb&w=1400",
      alt: "Moderne Smart-Home-Sicherheitskamera und Sensoren",
      position: "center",
    },
  },
  {
    terms: ["klima", "klimaanlage", "hvac"],
    visual: {
      src: "https://images.pexels.com/photos/7587368/pexels-photo-7587368.jpeg?auto=compress&cs=tinysrgb&w=1400",
      alt: "Moderne Klimaanlage in einem hellen Wohnraum",
      position: "center",
    },
  },
  {
    terms: ["solar", "photovoltaik", "pv", "wärmepumpe", "waermepumpe"],
    visual: {
      src: "https://images.pexels.com/photos/16427010/pexels-photo-16427010.jpeg?auto=compress&cs=tinysrgb&w=1400",
      alt: "Wohnhäuser mit Photovoltaikanlagen als Symbol für Solar und Wärmelösungen",
      position: "center",
    },
  },
  {
    terms: ["edelmetall", "gold", "silber"],
    visual: {
      src: "/assets/metals.webp",
      alt: "Gold- und Silberbarren als Symbol für Edelmetallprodukte",
      position: "center",
    },
  },
  {
    terms: ["immobilie", "immobilien", "eigenheim", "wohnung", "haus"],
    visual: {
      src: "https://images.pexels.com/photos/8134821/pexels-photo-8134821.jpeg?auto=compress&cs=tinysrgb&w=1400",
      alt: "Modernes Wohnhaus als Symbol für Immobilienprodukte",
      position: "center",
    },
  },
];

export function getProductVisual(...values: Array<string | null | undefined>): ProductVisual | null {
  const haystack = values.filter(Boolean).join(" ").toLocaleLowerCase("de-DE");
  return RULES.find((rule) => rule.terms.some((term) => haystack.includes(term)))?.visual ?? null;
}
