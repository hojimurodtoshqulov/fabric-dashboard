// Barcha mavjud clientlarning region maydonidan province ni aniqlaydi va saqlaydi
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// provinces.ts dan kopi (import qilolmaymiz chunki ESM + paths alias muammo)
const PROVINCE_GROUPS = [
  { key: "andijon",       keywords: ["андижон","andijon","асака","asaka","баликчи","балиқчи","baliqchi","избоскан","izbaskan","жалалкудук","jalolquduq","кургантепа","qo'rg'ontepa","мархамат","marhamat","олтинкул","oltinkol","oltinko'l","пахтаобод","paxtaobod","улугнор","ulug'nor","хожаобод","xo'jaobod","шахрихон","shahrixon","булокбоши","bulokboshi"] },
  { key: "buxoro",        keywords: ["бухоро","бухар","buxoro","bukhara","вобкент","vobkent","гиждувон","g'ijduvon","жондор","жандар","jondar","каракуль","qorako'l","когон","kagon","kogon","олот","olot","пешку","peshku","ромитан","romitan","шофиркон","shofirkon","галаосие","галаасия","galaosiye","каравулбазар","qorovulbozor","коракол","коракуль"] },
  { key: "fargona",       keywords: ["фаргона","фергана","фарғона","farg'ona","fargona","fergana","маргилан","маргилон","margilan","қўқон","кокан","qo'qon","kokand","риштан","rishton","бесарик","besariq","дангара","данғара","дангора","dangara","фурқат","furqat","фуркат","фуркад","ўзбекистон","uzbekiston","тошлоқ","toshlok","алтиарик","oltiariq","қуба","quba","водил","vodil","кукдала","kukdala","кува","quva","яйпан","yaypan","боғдот","богдот"] },
  { key: "jizzax",        keywords: ["жиззах","джизак","jizzax","зомин","zomin","пахтакор","paxtakor","галляарал","gallaorol","дустлик","do'stlik","бахмал","baxmal","фариш","forish","зафаробод","zafarobod","мирзачул","mirzacho'l","янгиобод","yangiobod","арнасой","arnasoy"] },
  { key: "xorazm",        keywords: ["хорезм","хоразм","хоразим","xorazm","урганч","urganch","хива","xiva","khiva","питнак","pitnak","шовот","шоввот","shovot","богот","bogot","гурлан","gurlan","хазарасп","hazorasp","хонка","xonqa","янгибозор","yangibozor","кушкупир","qo'shko'pir","янгиариқ"] },
  { key: "namangan",      keywords: ["наманган","namangan","чуст","chust","поп","pop","учкурган","uchqo'rg'on","тошбулок","toshbuloq","нарын","norin","янгиқурган","yangiqo'rg'on","косонсой","kosonsoy","мингбулак","mingbuloq","туракурган","turakurgan"] },
  { key: "navoiy",        keywords: ["навои","навой","navoiy","зарафшон","zarafshon","учқудук","учкудук","uchquduq","кармана","karmana","конимех","konimex","нурата","nurata","хатирчи","xatirchi","томди","tomdi","кызылтепа","кизилтепа","qiziltepa navoiy","кушробот"] },
  { key: "qashqadaryo",   keywords: ["кашкадарья","кашкадарьо","qashqadaryo","kashkadarya","карши","qarshi","karshi","шахрисабз","shahrisabz","яккабаг","yakkabog'","камаши","qamashi","нишан","nishan","гузар","g'uzor","guzar","чиракчи","chiroqchi","дехканабад","dehqonobod","касби","kasbi","мубарак","мубарек","muborak","китаб","kitob","косон","касан","koson","миришкор","mirishkor","бишкент","bishkent"] },
  { key: "samarqand",     keywords: ["самарканд","samarqand","катта-курган","каттакурган","kattaqo'rg'on","ургут","urgut","пайарик","payariq","нурабад","нарпай","nurobod","булунгур","bulung'ur","иштихон","ishtixon","жомбой","jomboy","жума","juma","пастдаргом","pastdarg'om","тайлак","тойлок","toyloq","пахтачи"] },
  { key: "sirdaryo",      keywords: ["сырдарья","сирдарья","сирдарё","sirdaryo","гулистан","гулистон","guliston","янгиер","yangiyer","баяут","боевут","boyovut","сардоба","sardoba","акалтин","oqoltin","мирзаабад","mirzaobod","сайхунобод","sayxunobod","ховос","xovos","ширин","shirin"] },
  { key: "surxondaryo",   keywords: ["сурхандарья","сурхондарё","surxondaryo","термез","термиз","termez","денау","денов","denov","шерабад","шеробод","sherobod","байсун","бойсун","boysun","кумкурган","кумкоргон","qumqo'rg'on","музрабад","музробод","muzrabot","сариасия","сарисой","сариосиё","sariosiyo","ангор","angor","бандихон","bandixon","джаркурган","жаркургон","jarqo'rg'on","кизирик","qiziriq","ухум","узун","uzun","олтинсой","oltinsoy","шурчи","sho'rchi"] },
  { key: "toshkent_vil",  keywords: ["ташкентская","toshkent viloyati","toshkent vil","toshkent obl","tosh-obl","тош-обл","тош обл","алмал","olmaliq","ангрен","angren","аккурган","oqqo'rg'on","oqqurgon","ахангаран","охангарон","ohangaron","бекобод","бекабад","bekobod","bekabad","чирчик","chirchiq","чиноз","чиназ","chinoz","chinaz","кибрай","kibray","бука","букин","bo'ka","бостонли","бостанлык","bo'stonliq","bostonliq","занги","зангиата","зангиатин","zangiota","ишонкул","eshangul","куйичирчик","quyichirchiq","паркент","parkent","пскент","piskent","ташкентский район","уртачирчик","o'rtachirchiq","юкоричирчик","yuqorichirchiq","янгию","янгийул","yangiyo'l","yangiyol"] },
  { key: "toshkent_sh",   keywords: ["ташкент","toshkent","tashkent","мирзо-улугбек","мирзо улугбек","мирзоулугбек","mirzo ulug'bek","алмазар","almazar","учтеп","uchtepa","яшнаб","яшнобод","yashnobod","сергели","sergeli","юнусаб","юнусобод","yunusab","yunusobod","бектемир","bektemir","мирабад","мирабодский","mirobod","хамза","hamza","шайхант","шайхонт","shayxon","яккасарай","yakkasaroy","чиланзар","chilonzor"] },
  { key: "qoraqalp",      keywords: ["каракалп","коракалп","қорақалп","qoraqalp","нукус","nukus","бируни","беруний","beruniy","чимбой","chimboy","кунград","кунгирот","qo'ng'irot","тахтакупыр","тахтакупир","taxtako'pir","турткуль","турткул","turtkul","шуманай","shumanay","элликкала","елликкала","ellikqal'a","аму дарья","амударё","amudaryo","кегейли","kegeyli","мойнак","mo'ynoq","тахиаташ","taxiatosh","хужейли","мангит"] },
];

// toshkent_vil ni avval tekshiramiz
function detectProvince(region) {
  if (!region) return null;
  const r = region.toLowerCase();
  const tVil = PROVINCE_GROUPS.find(p => p.key === "toshkent_vil");
  if (tVil && tVil.keywords.some(k => r.includes(k))) return tVil;
  for (const p of PROVINCE_GROUPS) {
    if (p.key === "toshkent_vil") continue;
    if (p.keywords.some(k => r.includes(k))) return p;
  }
  return null;
}

console.log("Barcha clientlarni backfill qilamiz...");

// Hamma clientlarni o'qiymiz
const clients = await db.client.findMany({
  select: { id: true, region: true, province: true },
});

console.log(`Jami ${clients.length} ta client topildi.`);

let updated = 0;
let skipped = 0;
let unmatched = 0;

const byProvince = new Map();

for (const client of clients) {
  const detected = detectProvince(client.region);
  if (!detected) {
    unmatched++;
    continue;
  }
  if (!byProvince.has(detected.key)) byProvince.set(detected.key, []);
  byProvince.get(detected.key).push(client.id);
}

// Har bir viloyat uchun updateMany
for (const [key, ids] of byProvince) {
  await db.client.updateMany({
    where: { id: { in: ids } },
    data: { province: key },
  });
  console.log(`  ${key}: ${ids.length} ta yangilandi`);
  updated += ids.length;
}

console.log(`\nNatija:`);
console.log(`  Yangilandi: ${updated}`);
console.log(`  Mos kelmadi (region yo'q yoki noaniq): ${unmatched}`);
console.log(`  Jami: ${clients.length}`);

await db.$disconnect();
