// Countries and governorates with coordinates + timezone.
// Coords approximate to governorate capital city center.
export type City = { name: string; lat: number; lng: number };
export type Country = { code: string; name: string; timezone: string; cities: City[] };

export const COUNTRIES: Country[] = [
  {
    code: "EG", name: "مصر", timezone: "Africa/Cairo",
    cities: [
      { name: "القاهرة", lat: 30.0444, lng: 31.2357 },
      { name: "الجيزة", lat: 30.0131, lng: 31.2089 },
      { name: "الإسكندرية", lat: 31.2001, lng: 29.9187 },
      { name: "القليوبية", lat: 30.1761, lng: 31.2056 },
      { name: "الشرقية (الزقازيق)", lat: 30.5877, lng: 31.5020 },
      { name: "الدقهلية (المنصورة)", lat: 31.0364, lng: 31.3807 },
      { name: "البحيرة (دمنهور)", lat: 31.0341, lng: 30.4682 },
      { name: "كفر الشيخ", lat: 31.1107, lng: 30.9388 },
      { name: "الغربية (طنطا)", lat: 30.7865, lng: 31.0004 },
      { name: "المنوفية (شبين الكوم)", lat: 30.5526, lng: 30.9982 },
      { name: "دمياط", lat: 31.4165, lng: 31.8133 },
      { name: "بورسعيد", lat: 31.2653, lng: 32.3019 },
      { name: "الإسماعيلية", lat: 30.5965, lng: 32.2715 },
      { name: "السويس", lat: 29.9668, lng: 32.5498 },
      { name: "شمال سيناء (العريش)", lat: 31.1313, lng: 33.8033 },
      { name: "جنوب سيناء (الطور)", lat: 28.2416, lng: 33.6225 },
      { name: "الفيوم", lat: 29.3084, lng: 30.8428 },
      { name: "بني سويف", lat: 29.0744, lng: 31.0978 },
      { name: "المنيا", lat: 28.1099, lng: 30.7503 },
      { name: "أسيوط", lat: 27.1809, lng: 31.1837 },
      { name: "سوهاج", lat: 26.5569, lng: 31.6948 },
      { name: "قنا", lat: 26.1551, lng: 32.7160 },
      { name: "الأقصر", lat: 25.6872, lng: 32.6396 },
      { name: "أسوان", lat: 24.0889, lng: 32.8998 },
      { name: "البحر الأحمر (الغردقة)", lat: 27.2579, lng: 33.8116 },
      { name: "الوادي الجديد (الخارجة)", lat: 25.4514, lng: 30.5464 },
      { name: "مطروح", lat: 31.3543, lng: 27.2373 },
    ],
  },
  {
    code: "SA", name: "السعودية", timezone: "Asia/Riyadh",
    cities: [
      { name: "الرياض", lat: 24.7136, lng: 46.6753 },
      { name: "مكة المكرمة", lat: 21.3891, lng: 39.8579 },
      { name: "المدينة المنورة", lat: 24.4709, lng: 39.6122 },
      { name: "جدة", lat: 21.4858, lng: 39.1925 },
      { name: "الدمام", lat: 26.4207, lng: 50.0888 },
      { name: "الطائف", lat: 21.2854, lng: 40.4183 },
      { name: "تبوك", lat: 28.3838, lng: 36.5550 },
      { name: "أبها", lat: 18.2164, lng: 42.5053 },
      { name: "حائل", lat: 27.5114, lng: 41.7208 },
      { name: "جازان", lat: 16.8892, lng: 42.5511 },
      { name: "نجران", lat: 17.4924, lng: 44.1277 },
      { name: "الباحة", lat: 20.0129, lng: 41.4677 },
      { name: "عرعر", lat: 30.9753, lng: 41.0381 },
      { name: "سكاكا", lat: 29.9697, lng: 40.2064 },
      { name: "بريدة", lat: 26.3260, lng: 43.9750 },
    ],
  },
  {
    code: "AE", name: "الإمارات", timezone: "Asia/Dubai",
    cities: [
      { name: "أبوظبي", lat: 24.4539, lng: 54.3773 },
      { name: "دبي", lat: 25.2048, lng: 55.2708 },
      { name: "الشارقة", lat: 25.3463, lng: 55.4209 },
      { name: "عجمان", lat: 25.4052, lng: 55.5136 },
      { name: "أم القيوين", lat: 25.5648, lng: 55.5533 },
      { name: "رأس الخيمة", lat: 25.7895, lng: 55.9432 },
      { name: "الفجيرة", lat: 25.1288, lng: 56.3265 },
    ],
  },
  {
    code: "JO", name: "الأردن", timezone: "Asia/Amman",
    cities: [
      { name: "عمّان", lat: 31.9454, lng: 35.9284 },
      { name: "إربد", lat: 32.5556, lng: 35.8500 },
      { name: "الزرقاء", lat: 32.0728, lng: 36.0880 },
      { name: "العقبة", lat: 29.5320, lng: 35.0063 },
      { name: "الكرك", lat: 31.1854, lng: 35.7047 },
      { name: "معان", lat: 30.1962, lng: 35.7340 },
      { name: "المفرق", lat: 32.3408, lng: 36.2089 },
      { name: "البلقاء (السلط)", lat: 32.0392, lng: 35.7272 },
      { name: "مادبا", lat: 31.7195, lng: 35.7950 },
      { name: "جرش", lat: 32.2811, lng: 35.8998 },
      { name: "عجلون", lat: 32.3326, lng: 35.7517 },
      { name: "الطفيلة", lat: 30.8372, lng: 35.6045 },
    ],
  },
  {
    code: "MA", name: "المغرب", timezone: "Africa/Casablanca",
    cities: [
      { name: "الرباط", lat: 34.0209, lng: -6.8416 },
      { name: "الدار البيضاء", lat: 33.5731, lng: -7.5898 },
      { name: "فاس", lat: 34.0181, lng: -5.0078 },
      { name: "مراكش", lat: 31.6295, lng: -7.9811 },
      { name: "طنجة", lat: 35.7595, lng: -5.8340 },
      { name: "أكادير", lat: 30.4278, lng: -9.5981 },
      { name: "مكناس", lat: 33.8935, lng: -5.5473 },
      { name: "وجدة", lat: 34.6814, lng: -1.9086 },
      { name: "تطوان", lat: 35.5785, lng: -5.3684 },
      { name: "العيون", lat: 27.1536, lng: -13.2033 },
    ],
  },
  {
    code: "DZ", name: "الجزائر", timezone: "Africa/Algiers",
    cities: [
      { name: "الجزائر", lat: 36.7538, lng: 3.0588 },
      { name: "وهران", lat: 35.6969, lng: -0.6331 },
      { name: "قسنطينة", lat: 36.3650, lng: 6.6147 },
      { name: "عنابة", lat: 36.9000, lng: 7.7667 },
      { name: "باتنة", lat: 35.5559, lng: 6.1741 },
      { name: "سطيف", lat: 36.1898, lng: 5.4108 },
      { name: "بليدة", lat: 36.4700, lng: 2.8300 },
      { name: "تلمسان", lat: 34.8884, lng: -1.3158 },
      { name: "ورقلة", lat: 31.9539, lng: 5.3289 },
      { name: "تمنراست", lat: 22.7850, lng: 5.5228 },
    ],
  },
  {
    code: "TN", name: "تونس", timezone: "Africa/Tunis",
    cities: [
      { name: "تونس", lat: 36.8065, lng: 10.1815 },
      { name: "صفاقس", lat: 34.7406, lng: 10.7603 },
      { name: "سوسة", lat: 35.8254, lng: 10.6360 },
      { name: "القيروان", lat: 35.6781, lng: 10.0963 },
      { name: "بنزرت", lat: 37.2744, lng: 9.8739 },
      { name: "قابس", lat: 33.8815, lng: 10.0982 },
      { name: "نابل", lat: 36.4513, lng: 10.7357 },
      { name: "المنستير", lat: 35.7780, lng: 10.8260 },
    ],
  },
  {
    code: "LY", name: "ليبيا", timezone: "Africa/Tripoli",
    cities: [
      { name: "طرابلس", lat: 32.8872, lng: 13.1913 },
      { name: "بنغازي", lat: 32.1167, lng: 20.0667 },
      { name: "مصراتة", lat: 32.3754, lng: 15.0925 },
      { name: "سبها", lat: 27.0377, lng: 14.4286 },
      { name: "البيضاء", lat: 32.7627, lng: 21.7551 },
      { name: "طبرق", lat: 32.0836, lng: 23.9763 },
    ],
  },
  {
    code: "SD", name: "السودان", timezone: "Africa/Khartoum",
    cities: [
      { name: "الخرطوم", lat: 15.5007, lng: 32.5599 },
      { name: "أم درمان", lat: 15.6440, lng: 32.4773 },
      { name: "بورتسودان", lat: 19.6158, lng: 37.2164 },
      { name: "كسلا", lat: 15.4510, lng: 36.4030 },
      { name: "نيالا", lat: 12.0500, lng: 24.8800 },
      { name: "مدني", lat: 14.4012, lng: 33.5199 },
    ],
  },
  {
    code: "IQ", name: "العراق", timezone: "Asia/Baghdad",
    cities: [
      { name: "بغداد", lat: 33.3152, lng: 44.3661 },
      { name: "البصرة", lat: 30.5085, lng: 47.7804 },
      { name: "الموصل", lat: 36.3450, lng: 43.1450 },
      { name: "أربيل", lat: 36.1911, lng: 44.0093 },
      { name: "النجف", lat: 32.0000, lng: 44.3333 },
      { name: "كربلاء", lat: 32.6160, lng: 44.0247 },
      { name: "كركوك", lat: 35.4681, lng: 44.3922 },
      { name: "السليمانية", lat: 35.5650, lng: 45.4329 },
    ],
  },
  {
    code: "SY", name: "سوريا", timezone: "Asia/Damascus",
    cities: [
      { name: "دمشق", lat: 33.5138, lng: 36.2765 },
      { name: "حلب", lat: 36.2021, lng: 37.1343 },
      { name: "حمص", lat: 34.7324, lng: 36.7137 },
      { name: "حماة", lat: 35.1318, lng: 36.7578 },
      { name: "اللاذقية", lat: 35.5407, lng: 35.7900 },
      { name: "طرطوس", lat: 34.8959, lng: 35.8867 },
      { name: "دير الزور", lat: 35.3338, lng: 40.1467 },
    ],
  },
  {
    code: "LB", name: "لبنان", timezone: "Asia/Beirut",
    cities: [
      { name: "بيروت", lat: 33.8938, lng: 35.5018 },
      { name: "طرابلس", lat: 34.4367, lng: 35.8497 },
      { name: "صيدا", lat: 33.5634, lng: 35.3711 },
      { name: "صور", lat: 33.2705, lng: 35.2038 },
      { name: "زحلة", lat: 33.8463, lng: 35.9019 },
      { name: "بعلبك", lat: 34.0058, lng: 36.2181 },
    ],
  },
  {
    code: "PS", name: "فلسطين", timezone: "Asia/Hebron",
    cities: [
      { name: "القدس", lat: 31.7683, lng: 35.2137 },
      { name: "غزة", lat: 31.5018, lng: 34.4668 },
      { name: "رام الله", lat: 31.9038, lng: 35.2034 },
      { name: "نابلس", lat: 32.2211, lng: 35.2544 },
      { name: "الخليل", lat: 31.5326, lng: 35.0998 },
      { name: "بيت لحم", lat: 31.7054, lng: 35.2024 },
      { name: "جنين", lat: 32.4614, lng: 35.3000 },
      { name: "خان يونس", lat: 31.3469, lng: 34.3060 },
    ],
  },
  {
    code: "KW", name: "الكويت", timezone: "Asia/Kuwait",
    cities: [
      { name: "مدينة الكويت", lat: 29.3759, lng: 47.9774 },
      { name: "حولي", lat: 29.3326, lng: 48.0289 },
      { name: "الفروانية", lat: 29.2775, lng: 47.9589 },
      { name: "الأحمدي", lat: 29.0769, lng: 48.0838 },
      { name: "الجهراء", lat: 29.3375, lng: 47.6581 },
      { name: "مبارك الكبير", lat: 29.2356, lng: 48.0808 },
    ],
  },
  {
    code: "QA", name: "قطر", timezone: "Asia/Qatar",
    cities: [
      { name: "الدوحة", lat: 25.2854, lng: 51.5310 },
      { name: "الريان", lat: 25.2919, lng: 51.4244 },
      { name: "الوكرة", lat: 25.1715, lng: 51.6034 },
      { name: "الخور", lat: 25.6845, lng: 51.5050 },
    ],
  },
  {
    code: "BH", name: "البحرين", timezone: "Asia/Bahrain",
    cities: [
      { name: "المنامة", lat: 26.2285, lng: 50.5860 },
      { name: "المحرق", lat: 26.2572, lng: 50.6111 },
      { name: "الرفاع", lat: 26.1300, lng: 50.5550 },
    ],
  },
  {
    code: "OM", name: "عُمان", timezone: "Asia/Muscat",
    cities: [
      { name: "مسقط", lat: 23.5880, lng: 58.3829 },
      { name: "صلالة", lat: 17.0151, lng: 54.0924 },
      { name: "صحار", lat: 24.3643, lng: 56.7468 },
      { name: "نزوى", lat: 22.9333, lng: 57.5333 },
      { name: "صور", lat: 22.5667, lng: 59.5289 },
    ],
  },
  {
    code: "YE", name: "اليمن", timezone: "Asia/Aden",
    cities: [
      { name: "صنعاء", lat: 15.3694, lng: 44.1910 },
      { name: "عدن", lat: 12.7855, lng: 45.0187 },
      { name: "تعز", lat: 13.5795, lng: 44.0209 },
      { name: "الحديدة", lat: 14.7978, lng: 42.9545 },
      { name: "إب", lat: 13.9667, lng: 44.1833 },
      { name: "المكلا", lat: 14.5426, lng: 49.1242 },
    ],
  },
  {
    code: "TR", name: "تركيا", timezone: "Europe/Istanbul",
    cities: [
      { name: "إسطنبول", lat: 41.0082, lng: 28.9784 },
      { name: "أنقرة", lat: 39.9334, lng: 32.8597 },
      { name: "إزمير", lat: 38.4192, lng: 27.1287 },
      { name: "بورصة", lat: 40.1956, lng: 29.0610 },
      { name: "أنطاليا", lat: 36.8969, lng: 30.7133 },
      { name: "غازي عنتاب", lat: 37.0662, lng: 37.3833 },
    ],
  },
];

export const KAABA = { lat: 21.4225, lng: 39.8262 };

export function qiblaBearing(lat: number, lng: number): number {
  const φ1 = (lat * Math.PI) / 180;
  const φ2 = (KAABA.lat * Math.PI) / 180;
  const Δλ = ((KAABA.lng - lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}
