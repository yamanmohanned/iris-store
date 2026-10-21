import { formatIQD } from '@/lib/format';
import { normalizeArabic } from './catalog';
import type { StoreSettings } from './types';

/**
 * الأسئلة الشائعة — مصدر واحد لصفحة الأسئلة (ديسكتوب وهاتف) و«تواصل معنا».
 * كل إجابة تصف ما يفعله المتجر فعلاً (الدفع عند الاستلام، الاستبدال 7 أيام…)؛ أجور التوصيل من إعدادات المالك.
 */
export interface FaqItem {
  q: string;
  a: string;
  /** رابط مساعد يظهر تحت الإجابة */
  link?: { to: string; label: string };
}

export interface FaqGroup {
  id: string;
  title: string;
  icon: string;
  items: FaqItem[];
}

export function faqGroups(settings: Pick<StoreSettings, 'shippingFee' | 'freeShippingThreshold'>): FaqGroup[] {
  const fee =
    settings.shippingFee > 0
      ? `أجور التوصيل ${formatIQD(settings.shippingFee)}` +
        (settings.freeShippingThreshold > 0 ? `، والتوصيل مجاني للطلبات فوق ${formatIQD(settings.freeShippingThreshold)}.` : '.')
      : 'التوصيل مجاني لكل الطلبات.';

  return [
    {
      id: 'orders',
      title: 'الطلب والتوصيل',
      icon: 'local_shipping',
      items: [
        {
          q: 'كيف أطلب قطعة؟',
          a: 'اختاري القطعة واللون والمقاس ثم أضيفيها إلى السلة، وأكملي «إتمام الطلب» بالاسم ورقم الهاتف والعنوان. نتصل بكِ بعدها لتأكيد الطلب وموعد التوصيل. ويمكنكِ أيضاً الطلب برسالة على إنستغرام.',
        },
        {
          q: 'كم يستغرق التوصيل؟',
          a: 'نوصل إلى جميع المحافظات: داخل بغداد خلال يوم إلى يومين، وباقي المحافظات خلال 2–4 أيام عمل.',
        },
        { q: 'كم أجور التوصيل؟', a: fee },
        {
          q: 'كيف أتابع طلبي؟',
          a: 'من صفحة «تتبع طلبك» برقم الطلب ورقم الهاتف الذي استخدمتِه عند الطلب.',
          link: { to: '/track-order', label: 'تتبع طلبك' },
        },
      ],
    },
    {
      id: 'payment',
      title: 'الدفع',
      icon: 'payments',
      items: [
        {
          q: 'ما طرق الدفع المتاحة؟',
          a: 'حالياً الدفع نقداً عند الاستلام في جميع المحافظات. الدفع الإلكتروني (زين كاش والبطاقات المصرفية) سيُضاف قريباً.',
        },
        {
          q: 'هل يمكنني معاينة القطعة قبل الدفع؟',
          a: 'نعم، تأكدي من مطابقة القطعة لطلبكِ قبل الدفع للمندوب.',
        },
        {
          q: 'كيف أستخدم قسيمة الخصم؟',
          a: 'أدخلي رمز القسيمة في السلة قبل إتمام الطلب، ويظهر الخصم مباشرة في ملخص الطلب.',
        },
      ],
    },
    {
      id: 'returns',
      title: 'الاستبدال والاسترجاع',
      icon: 'autorenew',
      items: [
        {
          q: 'ما سياسة الاستبدال؟',
          a: 'الاستبدال متاح خلال 7 أيام من الاستلام، بشرط بقاء القطعة بحالتها الأصلية غير المستخدمة ومع تغليفها.',
          link: { to: '/policies/shipping', label: 'سياسة الشحن والاستبدال' },
        },
        {
          q: 'كيف أطلب استبدالاً أو استرجاعاً؟',
          a: 'تواصلي معنا مع ذكر رقم الطلب، وسنرتّب معكِ موعد الاستلام والبديل المناسب.',
          link: { to: '/contact', label: 'تواصلي معنا' },
        },
      ],
    },
    {
      id: 'pieces',
      title: 'القطع والمقاسات',
      icon: 'diamond',
      items: [
        {
          q: 'ما خامة القطع؟',
          a: 'قطعنا من الستانلس ستيل أو من معادن بطلاء ثابت باللونين الذهبي والفضي، والخامة مذكورة في صفحة كل منتج.',
          link: { to: '/policies/authenticity', label: 'الخامات والجودة' },
        },
        {
          q: 'هل يتغير لون القطع؟',
          a: 'الطلاء الثابت يحافظ على لونه مع الاستخدام العادي. لتبقى القطعة جميلة أطول مدة أبعديها عن العطور والماء والمنظفات، واحفظيها جافة.',
        },
        {
          q: 'كيف أعرف مقاسي؟',
          a: 'دليل المقاسات يشرح قياس الخاتم والقلادة والسوار في دقيقة، ويمكنكِ سؤالنا قبل الطلب إن احترتِ بين مقاسين.',
          link: { to: '/policies/size-guide', label: 'دليل المقاسات' },
        },
        {
          q: 'هل القطع مغلّفة للإهداء؟',
          a: 'إن كان طلبكِ هدية اكتبي ذلك في ملاحظات الطلب، ونجهّزه بشكل يليق بالإهداء.',
        },
        {
          q: 'كيف أعتني بالإكسسوارات؟',
          a: 'احفظي كل قطعة جافة ومنفصلة، وارتديها بعد العطور، وامسحيها بقماش ناعم جاف بعد الاستخدام.',
          link: { to: '/policies/care', label: 'دليل العناية' },
        },
      ],
    },
  ];
}

/** الأسئلة الأكثر طرحاً (تظهر في «تواصل معنا»). */
export function topFaq(groups: FaqGroup[]): FaqItem[] {
  const all = groups.flatMap((g) => g.items);
  return ['كم يستغرق التوصيل؟', 'ما طرق الدفع المتاحة؟', 'ما سياسة الاستبدال؟']
    .map((q) => all.find((i) => i.q === q))
    .filter((i): i is FaqItem => Boolean(i));
}

/** تصفية بالبحث (السؤال أو الإجابة) مع توحيد الكتابة العربية؛ تُحذف الأقسام الفارغة. */
export function filterFaq(groups: FaqGroup[], query: string): FaqGroup[] {
  const q = normalizeArabic(query);
  if (!q) return groups;
  return groups
    .map((g) => ({ ...g, items: g.items.filter((i) => normalizeArabic(`${i.q} ${i.a}`).includes(q)) }))
    .filter((g) => g.items.length > 0);
}
