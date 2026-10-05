import type { PageSystemKey } from "@/server/db/schema";

/**
 * Starter content for the store's standard pages. `{{storeName}}` is replaced at seed time.
 * Owners should review these texts (especially returns/shipping terms) before launch.
 */
export const DEFAULT_PAGES: {
  systemKey: PageSystemKey;
  slug: string;
  sortOrder: number;
  title: { ar: string; en: string };
  content: { ar: string; en: string };
}[] = [
  {
    systemKey: "about",
    slug: "about",
    sortOrder: 1,
    title: { ar: "من نحن", en: "About us" },
    content: {
      ar: `<p>مرحباً بك في <strong>{{storeName}}</strong>. نؤمن أن التسوّق يجب أن يكون سهلاً وممتعاً وآمناً، لذلك نختار منتجاتنا بعناية ونتأكد من جودتها قبل أن تصل إليك.</p>
<h2>لماذا تتسوّق معنا؟</h2>
<ul>
<li>منتجات مختارة بعناية وبجودة مضمونة.</li>
<li>توصيل سريع إلى جميع المناطق مع إمكانية الدفع عند الاستلام.</li>
<li>خدمة عملاء جاهزة لمساعدتك قبل الشراء وبعده.</li>
<li>سياسة استبدال واسترجاع واضحة وعادلة.</li>
</ul>
<p>شكراً لثقتك بنا، ونتطلّع لخدمتك دائماً.</p>`,
      en: `<p>Welcome to <strong>{{storeName}}</strong>. We believe shopping should be easy, enjoyable and safe, so we carefully select our products and check their quality before they reach you.</p>
<h2>Why shop with us?</h2>
<ul>
<li>Carefully selected products with guaranteed quality.</li>
<li>Fast delivery to every area, with cash on delivery available.</li>
<li>A customer service team ready to help before and after you buy.</li>
<li>A clear and fair returns &amp; exchange policy.</li>
</ul>
<p>Thank you for your trust — we look forward to serving you.</p>`,
    },
  },
  {
    systemKey: "shipping",
    slug: "shipping",
    sortOrder: 2,
    title: { ar: "الشحن والتوصيل", en: "Shipping & delivery" },
    content: {
      ar: `<ul>
<li>نوصل إلى جميع المناطق الظاهرة في صفحة إتمام الطلب، وتظهر أجور التوصيل بوضوح قبل تأكيد طلبك.</li>
<li>مدة التوصيل المعتادة من يوم إلى 4 أيام عمل حسب المنطقة.</li>
<li>يتواصل معك المندوب قبل الوصول، لذا يُرجى التأكد من صحة رقم هاتفك.</li>
<li>يمكنك تتبّع طلبك في أي وقت من صفحة «تتبّع الطلب» باستخدام رقم الطلب ورقم الهاتف.</li>
<li>افحص طلبك عند الاستلام، وإذا وجدت أي مشكلة أبلغ المندوب أو تواصل معنا فوراً.</li>
</ul>`,
      en: `<ul>
<li>We deliver to every area listed at checkout; the delivery fee is shown clearly before you confirm.</li>
<li>Delivery usually takes 1–4 business days depending on the area.</li>
<li>The courier will call you before arriving, so please make sure your phone number is correct.</li>
<li>Track your order any time from the “Track order” page using your order number and phone.</li>
<li>Please inspect your order on delivery and tell the courier or contact us right away about any issue.</li>
</ul>`,
    },
  },
  {
    systemKey: "returns",
    slug: "returns",
    sortOrder: 3,
    title: { ar: "الاستبدال والاسترجاع", en: "Returns & exchanges" },
    content: {
      ar: `<p>رضاك يهمّنا. إذا لم تكن راضياً عن مشترياتك يمكنك الاستبدال أو الاسترجاع وفق الشروط التالية:</p>
<ul>
<li>يحق لك طلب الاستبدال أو الاسترجاع خلال <strong>7 أيام</strong> من تاريخ الاستلام.</li>
<li>يجب أن يكون المنتج بحالته الأصلية، غير مستخدم، مع تغليفه وملصقاته.</li>
<li>لا تُسترجع المنتجات الشخصية (مثل مستحضرات التجميل المفتوحة) حفاظاً على الصحة العامة.</li>
<li>إذا وصلك منتج تالف أو مختلف عمّا طلبت، نتحمّل كامل تكاليف الاستبدال.</li>
</ul>
<h2>كيف أطلب الاستبدال؟</h2>
<p>تواصل معنا مع رقم طلبك وسنرتّب استلام المنتج. يُعاد المبلغ بطريقة الدفع نفسها أو كرصيد للشراء خلال 7 أيام عمل من استلامنا للمنتج.</p>`,
      en: `<p>Your satisfaction matters. If you are not happy with your purchase you can exchange or return it under these terms:</p>
<ul>
<li>Request an exchange or return within <strong>7 days</strong> of delivery.</li>
<li>Items must be in original condition, unused, with packaging and tags.</li>
<li>Personal-care items (such as opened cosmetics) cannot be returned for hygiene reasons.</li>
<li>If an item arrives damaged or different from what you ordered, we cover all exchange costs.</li>
</ul>
<h2>How do I request a return?</h2>
<p>Contact us with your order number and we will arrange the pickup. Refunds are issued to the original payment method or as store credit within 7 business days of receiving the item.</p>`,
    },
  },
  {
    systemKey: "privacy",
    slug: "privacy",
    sortOrder: 4,
    title: { ar: "سياسة الخصوصية", en: "Privacy policy" },
    content: {
      ar: `<p>نحترم في <strong>{{storeName}}</strong> خصوصيتك ونلتزم بحماية بياناتك الشخصية. توضّح هذه السياسة البيانات التي نجمعها وكيف نستخدمها ونحميها.</p>
<h2>البيانات التي نجمعها</h2>
<ul>
<li><strong>بيانات الطلب:</strong> الاسم ورقم الهاتف وعنوان التوصيل والبريد الإلكتروني (اختياري) — لتنفيذ طلبك والتواصل معك بشأنه.</li>
<li><strong>بيانات الحساب:</strong> عند إنشاء حساب نحفظ اسمك وبريدك الإلكتروني، أما كلمة المرور فتُحفظ مشفّرة بطريقة لا يمكن قراءتها.</li>
<li><strong>بيانات تقنية:</strong> عنوان IP ونوع المتصفح، ونستخدمها فقط لحماية المتجر من الاحتيال والهجمات.</li>
</ul>
<h2>ملفات تعريف الارتباط (Cookies)</h2>
<p>نستخدم ملفات تعريف ارتباط ضرورية فقط لتشغيل المتجر: حفظ سلة التسوّق وإبقاؤك مسجّلاً الدخول بأمان. لا نستخدم ملفات تتبّع إعلانية.</p>
<h2>كيف نحمي بياناتك</h2>
<p>جميع الاتصالات مشفّرة (HTTPS)، وكلمات المرور محفوظة بتشفير قوي، والوصول إلى بياناتك مقتصر على الموظفين المخوّلين ضمن صلاحيات محددة ومراقَبة.</p>
<h2>مشاركة البيانات</h2>
<p>لا نبيع بياناتك ولا نؤجّرها. نشارك فقط ما يلزم مع شركة التوصيل لإيصال طلبك.</p>
<h2>حقوقك</h2>
<p>يمكنك طلب الاطلاع على بياناتك أو تصحيحها أو حذف حسابك في أي وقت بالتواصل معنا.</p>`,
      en: `<p>At <strong>{{storeName}}</strong> we respect your privacy and are committed to protecting your personal data. This policy explains what we collect and how we use and protect it.</p>
<h2>What we collect</h2>
<ul>
<li><strong>Order details:</strong> name, phone number, delivery address and (optionally) email — to fulfil your order and contact you about it.</li>
<li><strong>Account details:</strong> if you create an account we store your name and email; your password is stored with strong one-way hashing.</li>
<li><strong>Technical data:</strong> IP address and browser type, used only to protect the store against fraud and attacks.</li>
</ul>
<h2>Cookies</h2>
<p>We only use cookies that are essential to run the store: remembering your cart and keeping you securely signed in. We do not use advertising trackers.</p>
<h2>How we protect your data</h2>
<p>All connections are encrypted (HTTPS), passwords are strongly hashed, and access to your data is limited to authorised staff with specific, monitored permissions.</p>
<h2>Sharing</h2>
<p>We never sell or rent your data. We only share what the delivery company needs to deliver your order.</p>
<h2>Your rights</h2>
<p>You can ask to access or correct your data, or delete your account, at any time by contacting us.</p>`,
    },
  },
  {
    systemKey: "terms",
    slug: "terms",
    sortOrder: 5,
    title: { ar: "الشروط والأحكام", en: "Terms & conditions" },
    content: {
      ar: `<p>باستخدامك متجر <strong>{{storeName}}</strong> فإنك توافق على الشروط التالية:</p>
<h2>الطلبات والأسعار</h2>
<ul>
<li>الأسعار معروضة بعملة المتجر وقد تتغير دون إشعار مسبق، لكن سعر طلبك يُثبَّت لحظة إتمامه.</li>
<li>نحتفظ بحق إلغاء أي طلب عند نفاد الكمية أو وجود خطأ واضح في السعر، مع إبلاغك فوراً.</li>
<li>قد نتواصل معك هاتفياً لتأكيد الطلب قبل شحنه.</li>
</ul>
<h2>الدفع</h2>
<p>يتوفر الدفع نقداً عند الاستلام، إضافة إلى أي طرق أخرى تظهر عند إتمام الطلب.</p>
<h2>الحساب</h2>
<p>أنت مسؤول عن سرية بيانات دخولك، وأبلغنا فوراً عند الاشتباه بأي استخدام غير مصرّح به.</p>
<h2>الاستخدام المقبول</h2>
<p>يُمنع إساءة استخدام المتجر أو محاولة اختراقه أو تقديم طلبات وهمية، ويحق لنا إيقاف أي حساب يخالف ذلك.</p>`,
      en: `<p>By using <strong>{{storeName}}</strong> you agree to the following terms:</p>
<h2>Orders &amp; prices</h2>
<ul>
<li>Prices are shown in the store currency and may change without notice; your order price is locked when you place it.</li>
<li>We may cancel an order if an item runs out of stock or a price is clearly wrong, and we will tell you right away.</li>
<li>We may call you to confirm your order before shipping.</li>
</ul>
<h2>Payment</h2>
<p>Cash on delivery is available, along with any other methods shown at checkout.</p>
<h2>Your account</h2>
<p>You are responsible for keeping your sign-in details secret. Tell us immediately if you suspect unauthorised use.</p>
<h2>Acceptable use</h2>
<p>Abusing the store, attempting to break into it or placing fake orders is prohibited, and we may suspend accounts that do so.</p>`,
    },
  },
];
