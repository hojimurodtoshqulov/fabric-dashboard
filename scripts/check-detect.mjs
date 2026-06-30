// detectProvince funksiyasini to'g'ridan-to'g'ri test qilamiz
// provinces.ts ni o'qib, mantiqni takrorlaymiz

const TOSHKENT_SH_KEYWORDS = [
  "ташкент", "toshkent", "tashkent",
  "мирзо-улугбек", "мирзо улугбек", "мирзоулугбек", "mirzo ulug'bek",
  "алмазар", "almazar",
  "учтеп", "uchtepa",
  "яшнаб", "яшнобод", "yashnobod",
  "сергели", "sergeli",
  "юнусобод", "yunusobod", "yunusabad",
  "бектемир", "bektemir",
  "мирабад", "мирабодский", "mirobod",
  "хамза", "hamza",
  "шайхант", "шайхонт", "shayxon",
  "яккасарай", "yakkasaroy",
  "чиланзар", "chilonzor",
];

const testValues = [
  "юнусобод",
  "Юнусобод",
  "Юнусабадский район",
  "ЮНУСОБОД",
];

for (const v of testValues) {
  const r = v.toLowerCase();
  const matched = TOSHKENT_SH_KEYWORDS.filter(k => r.includes(k));
  console.log(`"${v}" → ${matched.length ? `mos: ${matched.join(", ")}` : "MOS KELMADI"}`);
}
