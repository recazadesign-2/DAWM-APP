import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Check } from "lucide-react";
import dawmLogoIcon from "@/assets/dawm-logo-icon.png";

const SECTIONS: { title: string; body: (string | string[])[] }[] = [
  {
    title: "1. قبول الشروط",
    body: [
      "باستخدامك لتطبيق دَاوِمْ، فإنك تقر بموافقتك الكاملة على هذه الشروط. إذا كنت لا توافق على أي جزء منها، يرجى التوقف عن استخدام التطبيق.",
    ],
  },
  {
    title: "2. وصف الخدمة",
    body: [
      "تطبيق دَاوِمْ هو أداة تقنية تهدف لمساعدة المستخدمين على تتبع عاداتهم اليومية، الالتزام بورد القرآن الكريم، والأذكار. نحن نقدم ميزات تشمل عرض النصوص القرآنية، الاستماع للأصوات، وتقديم التفاسير كخدمة تعليمية وتربوية.",
    ],
  },
  {
    title: "3. تتبع التقدم والخصوصية",
    body: [
      [
        "يقوم التطبيق بتحليل تفاعل المستخدم مع الصفحات لضمان دقة \"سلسلة النجاح\" (Streaks) والالتزام الفعلي.",
        "يتم احتساب إتمام قراءة الصفحة وفق معايير داخلية تهدف لتحقيق أقصى فائدة للمستخدم.",
        "يتم الاحتفاظ ببيانات تقدمك (آخر صفحة مقروءة، العادات المكتملة) لضمان استمرارية الخدمة حتى عند إغلاق التطبيق.",
      ],
    ],
  },
  {
    title: "4. إخلاء المسؤولية القانونية",
    body: [
      [
        "الدقة: نبذل قصارى جهدنا لضمان دقة النصوص والتفاسير، ومع ذلك، فإن التطبيق يُقدم \"كما هو\" ولا نتحمل مسؤولية أي خطأ تقني غير مقصود في عرض الآيات أو تشغيل الصوتيات.",
        "المرجعية: التطبيق أداة مساعدة ولا يغني عن المراجع الفقهية المعتمدة أو استشارة أهل العلم في المسائل الدينية.",
      ],
    ],
  },
  {
    title: "5. الاستخدام المقبول",
    body: [
      "يُحظر استخدام التطبيق بأي طريقة قد تؤدي إلى تعطيل الخوادم أو التدخل في تجربة مستخدمين آخرين. كما يُمنع محاولة استخراج الكود المصدري أو إعادة هندسة التطبيق.",
    ],
  },
  {
    title: "6. التعديلات والاشتراكات",
    body: [
      [
        "نحتفظ بالحق في تعديل هذه الشروط أو تحديث ميزات التطبيق في أي وقت.",
        "في حال وجود ميزات مدفوعة، سيتم توضيح شروط الدفع والإلغاء بشكل منفصل داخل واجهة الشراء.",
      ],
    ],
  },
  {
    title: "7. إنهاء الخدمة",
    body: [
      "لنا الحق في تعليق أو إنهاء وصولك للتطبيق في حال مخالفة هذه الشروط أو القيام بأي سلوك يضر بالمنصة.",
    ],
  },
];

export function TermsScreen() {
  const { acceptTerms } = useAuth();
  const [agreed, setAgreed] = useState(false);

  return (
    <main dir="rtl" className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-5 pt-8 pb-4 text-center">
        <img
          src={dawmLogoIcon}
          alt="دَاوِمْ"
          className="w-16 h-16 mx-auto object-contain mb-2 drop-shadow-[0_4px_14px_rgba(0,0,0,0.2)]"
        />
        <h1 className="text-xl font-bold font-display">شروط الخدمة</h1>
        <p className="text-xs text-muted-foreground mt-1">Terms of Service — تطبيق دَاوِمْ</p>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-44">
        <div className="max-w-[480px] mx-auto space-y-5 text-right">
          {SECTIONS.map((s) => (
            <section
              key={s.title}
              className="rounded-2xl border border-border bg-card p-4"
              style={{ boxShadow: "var(--shadow-elegant)" }}
            >
              <h2 className="text-sm font-bold text-primary mb-2 leading-relaxed">{s.title}</h2>
              {s.body.map((b, i) =>
                Array.isArray(b) ? (
                  <ul key={i} className="space-y-2 list-disc pr-5 mt-1">
                    {b.map((item, j) => (
                      <li key={j} className="text-[13px] leading-7 text-foreground/90">{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={i} className="text-[13px] leading-7 text-foreground/90">{b}</p>
                ),
              )}
            </section>
          ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 px-5 pt-3 pb-5 bg-background/95 backdrop-blur border-t border-border">
        <div className="max-w-[480px] mx-auto">
          <label className="flex items-start gap-3 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 accent-primary"
            />
            <span className="text-[13px] text-foreground/90 leading-6">
              لقد قرأت ووافقت على شروط الخدمة الخاصة بتطبيق دَاوِمْ.
            </span>
          </label>
          <button
            onClick={acceptTerms}
            disabled={!agreed}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            <Check size={16} /> أوافق (I Agree)
          </button>
        </div>
      </div>
    </main>
  );
}