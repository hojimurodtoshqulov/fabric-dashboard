// O'zbekiston — 14 ta qat'iy viloyat/hudud
// keywords: region matnida shu so'zlardan biri bo'lsa, shu viloyatga tushadi (CONTAINS, katta-kichik harf farqsiz)

export interface ProvinceGroup {
  key: string;
  label: string;
  keywords: string[];
}

export const PROVINCE_GROUPS: ProvinceGroup[] = [
  {
    key: "andijon",
    label: "Andijon",
    keywords: [
      "андижон", "andijon",
      "асака", "asaka",
      "баликчи", "балиқчи", "baliqchi",
      "избоскан", "izbaskan",
      "жалалкудук", "jalolquduq",
      "кургантепа", "qo'rg'ontepa",
      "мархамат", "marhamat",
      "олтинкул", "oltinkol", "oltinko'l",
      "пахтаобод", "paxtaobod",
      "улугнор", "ulug'nor",
      "хожаобод", "xo'jaobod",
      "шахрихон", "shahrixon",
      "булокбоши", "bulokboshi",
    ],
  },
  {
    key: "buxoro",
    label: "Buxoro",
    keywords: [
      "бухоро", "бухар", "buxoro", "bukhara",
      "вобкент", "vobkent",
      "гиждувон", "g'ijduvon",
      "жондор", "жандар", "jondar",
      "каракуль", "qorako'l",
      "когон", "kagon", "kogon",
      "олот", "olot",
      "пешку", "peshku",
      "ромитан", "romitan",
      "шофиркон", "shofirkon",
      "галаосие", "галаасия", "galaosiye",
      "каравулбазар", "qorovulbozor",
      "коракол", "коракуль",
    ],
  },
  {
    key: "fargona",
    label: "Farg'ona",
    keywords: [
      "фаргона", "фергана", "фарғона", "farg'ona", "fargona", "fergana",
      "маргилан", "маргилон", "margilan",
      "қўқон", "кокан", "qo'qon", "kokand",
      "риштан", "rishton",
      "бесарик", "besariq",
      "дангара", "данғара", "дангора", "dangara",
      "фурқат", "furqat", "фуркат", "фуркад",
      "ўзбекистон", "uzbekiston",
      "тошлоқ", "toshlok",
      "алтиарик", "oltiariq",
      "қуба", "quba",
      "водил", "vodil",
      "кукдала", "kukdala",
      "кува", "quva",
      "яйпан", "yaypan",
      "боғдот", "богдот",
    ],
  },
  {
    key: "jizzax",
    label: "Jizzax",
    keywords: [
      "жиззах", "джизак", "jizzax",
      "зомин", "zomin",
      "пахтакор", "paxtakor",
      "галляарал", "gallaorol",
      "дустлик", "do'stlik",
      "бахмал", "baxmal",
      "фариш", "forish",
      "зафаробод", "zafarobod",
      "мирзачул", "mirzacho'l",
      "янгиобод", "yangiobod",
      "арнасой", "arnasoy",
    ],
  },
  {
    key: "xorazm",
    label: "Xorazm",
    keywords: [
      "хорезм", "хоразм", "хоразим", "xorazm",
      "урганч", "urganch",
      "хива", "xiva", "khiva",
      "питнак", "pitnak",
      "шовот", "шоввот", "shovot",
      "богот", "bogot",
      "гурлан", "gurlan",
      "хазарасп", "hazorasp",
      "хонка", "xonqa",
      "янгибозор", "yangibozor",
      "кушкупир", "qo'shko'pir",
      "янгиариқ",
    ],
  },
  {
    key: "namangan",
    label: "Namangan",
    keywords: [
      "наманган", "namangan",
      "чуст", "chust",
      "поп", "pop",
      "учкурган", "uchqo'rg'on",
      "тошбулок", "toshbuloq",
      "нарын", "norin",
      "янгиқурган", "yangiqo'rg'on",
      "косонсой", "kosonsoy",
      "мингбулак", "mingbuloq",
      "туракурган", "turakurgan",
    ],
  },
  {
    key: "navoiy",
    label: "Navoiy",
    keywords: [
      "навои", "навой", "navoiy",
      "зарафшон", "zarafshon",
      "учқудук", "учкудук", "uchquduq",
      "кармана", "karmana",
      "конимех", "konimex",
      "нурата", "nurata",
      "хатирчи", "xatirchi",
      "томди", "tomdi",
      "кызылтепа", "кизилтепа", "qiziltepa navoiy",
      "кушробот",
    ],
  },
  {
    key: "qashqadaryo",
    label: "Qashqadaryo",
    keywords: [
      "кашкадарья", "кашкадарьо", "qashqadaryo", "kashkadarya",
      "карши", "qarshi", "karshi",
      "шахрисабз", "shahrisabz",
      "яккабаг", "yakkabog'",
      "камаши", "qamashi",
      "нишан", "nishan",
      "гузар", "g'uzor", "guzar",
      "чиракчи", "chiroqchi",
      "дехканабад", "dehqonobod",
      "касби", "kasbi",
      "мубарак", "мубарек", "muborak",
      "китаб", "kitob",
      "косон", "касан", "koson",
      "миришкор", "mirishkor",
      "бишкент", "bishkent",
    ],
  },
  {
    key: "samarqand",
    label: "Samarqand",
    keywords: [
      "самарканд", "samarqand",
      "катта-курган", "каттакурган", "kattaqo'rg'on",
      "ургут", "urgut",
      "пайарик", "payariq",
      "нурабад", "нарпай", "nurobod",
      "булунгур", "bulung'ur",
      "иштихон", "ishtixon",
      "жомбой", "jomboy",
      "жума", "juma",
      "пастдаргом", "pastdarg'om",
      "тайлак", "тойлок", "toyloq",
      "пахтачи",
    ],
  },
  {
    key: "sirdaryo",
    label: "Sirdaryo",
    keywords: [
      "сырдарья", "сирдарья", "сирдарё", "sirdaryo",
      "гулистан", "гулистон", "guliston",
      "янгиер", "yangiyer",
      "баяут", "боевут", "boyovut",
      "сардоба", "sardoba",
      "акалтин", "oqoltin",
      "мирзаабад", "mirzaobod",
      "сайхунобод", "sayxunobod",
      "ховос", "xovos",
      "ширин", "shirin",
    ],
  },
  {
    key: "surxondaryo",
    label: "Surxondaryo",
    keywords: [
      "сурхандарья", "сурхондарё", "surxondaryo",
      "термез", "термиз", "termez",
      "денау", "денов", "denov",
      "шерабад", "шеробод", "sherobod",
      "байсун", "бойсун", "boysun",
      "кумкурган", "кумкоргон", "qumqo'rg'on",
      "музрабад", "музробод", "muzrabot",
      "сариасия", "сарисой", "сариосиё", "sariosiyo",
      "ангор", "angor",
      "бандихон", "bandixon",
      "джаркурган", "жаркургон", "jarqo'rg'on",
      "кизирик", "qiziriq",
      "ухум", "узун", "uzun",
      "олтинсой", "oltinsoy",
      "шурчи", "sho'rchi",
    ],
  },
  {
    key: "toshkent_vil",
    label: "Toshkent viloyati",
    keywords: [
      "ташкентская", "toshkent viloyati", "toshkent vil", "toshkent obl", "tosh-obl", "тош-обл", "тош обл",
      "алмал", "olmaliq",
      "ангрен", "angren",
      "аккурган", "oqqo'rg'on", "oqqurgon",
      "ахангаран", "охангарон", "ohangaron",
      "бекобод", "бекабад", "bekobod", "bekabad",
      "чирчик", "chirchiq", "чиноз", "чиназ", "chinoz", "chinaz",
      "кибрай", "kibray",
      "бука", "букин", "bo'ka",
      "бостонли", "бостанлык", "bo'stonliq", "bostonliq",
      "занги", "зангиата", "зангиатин", "zangiota",
      "ишонкул", "eshangul",
      "куйичирчик", "quyichirchiq",
      "паркент", "parkent",
      "пскент", "piskent",
      "ташкентский район",
      "уртачирчик", "o'rtachirchiq",
      "юкоричирчик", "yuqorichirchiq",
      "янгию", "янгийул", "yangiyo'l", "yangiyol",
    ],
  },
  {
    key: "toshkent_sh",
    label: "Toshkent shahri",
    keywords: [
      "ташкент", "toshkent", "tashkent",
      "мирзо-улугбек", "мирзо улугбек", "мирзоулугбек", "mirzo ulug'bek",
      "алмазар", "almazar",
      "учтеп", "uchtepa",
      "яшнаб", "яшнобод", "yashnobod",
      "сергели", "sergeli",
      "юнусаб", "юнусобод", "yunusab", "yunusobod",
      "бектемир", "bektemir",
      "мирабад", "мирабодский", "mirobod",

      "хамза", "hamza",
      "шайхант", "шайхонт", "shayxon",
      "яккасарай", "yakkasaroy",
      "чиланзар", "chilonzor",
    ],
  },
  {
    key: "qoraqalp",
    label: "Qoraqalpog'iston",
    keywords: [
      "каракалп", "коракалп", "қорақалп", "qoraqalp",
      "нукус", "nukus",
      "бируни", "беруний", "beruniy",
      "чимбой", "chimboy",
      "кунград", "кунгирот", "qo'ng'irot",
      "тахтакупыр", "тахтакупир", "taxtako'pir",
      "турткуль", "турткул", "turtkul",
      "шуманай", "shumanay",
      "элликкала", "елликкала", "ellikqal'a",
      "аму дарья", "амударё", "amudaryo",
      "кегейли", "kegeyli",
      "мойнак", "mo'ynoq",
      "тахиаташ", "taxiatosh",
      "хужейли", "мангит",
    ],
  },
];

/** Region stringi qaysi viloyatga tegishli ekanini aniqlaydi (CONTAINS, case-insensitive) */
export function detectProvince(region: string): ProvinceGroup | null {
  const r = region.toLowerCase();

  // Toshkent viloyatini avval tekshiramiz (Toshkent shahridан avval)
  const tVil = PROVINCE_GROUPS.find(p => p.key === "toshkent_vil");
  if (tVil && tVil.keywords.some(k => r.includes(k))) return tVil;

  for (const p of PROVINCE_GROUPS) {
    if (p.key === "toshkent_vil") continue;
    if (p.keywords.some(k => r.includes(k))) return p;
  }
  return null;
}

/** Prisma where sharti — viloyat bo'yicha filter (CONTAINS) */
export function buildProvinceWhere(key: string) {
  const p = PROVINCE_GROUPS.find(g => g.key === key);
  if (!p) return undefined;

  const orConditions = p.keywords.map(k => ({
    region: { contains: k, mode: "insensitive" as const },
  }));

  // Toshkent shahri — toshkent_vil keywordslarini istisno qilamiz
  if (key === "toshkent_sh") {
    const tVil = PROVINCE_GROUPS.find(g => g.key === "toshkent_vil");
    if (tVil) {
      const notConditions = tVil.keywords.map(k => ({
        region: { contains: k, mode: "insensitive" as const },
      }));
      return {
        AND: [
          { OR: orConditions },
          { NOT: { OR: notConditions } },
        ],
      };
    }
  }

  return { OR: orConditions };
}
