// 30 short ayahs that cycle every 30 days based on day of year.
// Source: القرآن الكريم (public domain).

export interface DailyAyah {
  arabic_text: string;
  reference: string;
}

export const DAILY_AYAHS_30: DailyAyah[] = [
  { arabic_text: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", reference: "الشرح: 6" },
  { arabic_text: "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا", reference: "الطلاق: 2" },
  { arabic_text: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ", reference: "البقرة: 153" },
  { arabic_text: "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ", reference: "البقرة: 152" },
  { arabic_text: "وَبَشِّرِ الصَّابِرِينَ", reference: "البقرة: 155" },
  { arabic_text: "إِنَّ اللَّهَ يُحِبُّ الْمُتَوَكِّلِينَ", reference: "آل عمران: 159" },
  { arabic_text: "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ ۚ عَلَيْهِ تَوَكَّلْتُ وَإِلَيْهِ أُنِيبُ", reference: "هود: 88" },
  { arabic_text: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ", reference: "آل عمران: 173" },
  { arabic_text: "وَأَن لَّيْسَ لِلْإِنسَانِ إِلَّا مَا سَعَىٰ", reference: "النجم: 39" },
  { arabic_text: "إِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ", reference: "التوبة: 120" },
  { arabic_text: "وَقُل رَّبِّ زِدْنِي عِلْمًا", reference: "طه: 114" },
  { arabic_text: "وَلَا تَيْأَسُوا مِن رَّوْحِ اللَّهِ", reference: "يوسف: 87" },
  { arabic_text: "إِنَّ اللَّهَ غَفُورٌ رَّحِيمٌ", reference: "البقرة: 173" },
  { arabic_text: "وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ", reference: "الأنبياء: 107" },
  { arabic_text: "وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ", reference: "البقرة: 45" },
  { arabic_text: "قُلْ إِنَّ صَلَاتِي وَنُسُكِي وَمَحْيَايَ وَمَمَاتِي لِلَّهِ رَبِّ الْعَالَمِينَ", reference: "الأنعام: 162" },
  { arabic_text: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا", reference: "الشرح: 5" },
  { arabic_text: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", reference: "البقرة: 201" },
  { arabic_text: "وَاللَّهُ خَيْرُ الرَّازِقِينَ", reference: "الجمعة: 11" },
  { arabic_text: "وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ", reference: "الحديد: 4" },
  { arabic_text: "وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ", reference: "البقرة: 186" },
  { arabic_text: "إِنَّ رَحْمَتَ اللَّهِ قَرِيبٌ مِّنَ الْمُحْسِنِينَ", reference: "الأعراف: 56" },
  { arabic_text: "وَكَفَىٰ بِاللَّهِ وَكِيلًا", reference: "النساء: 81" },
  { arabic_text: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", reference: "الرعد: 28" },
  { arabic_text: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ", reference: "الطلاق: 3" },
  { arabic_text: "إِنَّ اللَّهَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ", reference: "البقرة: 20" },
  { arabic_text: "وَلَنَجْزِيَنَّ الَّذِينَ صَبَرُوا أَجْرَهُم بِأَحْسَنِ مَا كَانُوا يَعْمَلُونَ", reference: "النحل: 96" },
  { arabic_text: "إِنَّ اللَّهَ يَأْمُرُ بِالْعَدْلِ وَالْإِحْسَانِ وَإِيتَاءِ ذِي الْقُرْبَىٰ", reference: "النحل: 90" },
  { arabic_text: "وَاصْبِرْ وَمَا صَبْرُكَ إِلَّا بِاللَّهِ", reference: "النحل: 127" },
  { arabic_text: "وَتَوَكَّلْ عَلَى اللَّهِ ۚ وَكَفَىٰ بِاللَّهِ وَكِيلًا", reference: "الأحزاب: 3" },
];

export function getTodayAyah(): DailyAyah {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  return DAILY_AYAHS_30[dayOfYear % DAILY_AYAHS_30.length];
}
