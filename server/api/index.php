<?php
/**
 * واجهة متجر آيريس — ملف واحد يخدم كل المسارات عبر ?r=
 *
 *   GET  ?r=health          فحص جاهزية الخادم (إصدار PHP، صلاحيات الكتابة)
 *   GET  ?r=catalog         الكتالوج (الأقسام + المنتجات + الإعدادات) — عام
 *   POST ?r=catalog/save    حفظ الكتالوج — المالك فقط
 *   POST ?r=upload          رفع صورة — المالك فقط
 *   POST ?r=auth/login      تسجيل دخول المالك
 *   POST ?r=auth/logout     تسجيل الخروج
 *   GET  ?r=auth/me         المالك الحالي أو null
 *   POST ?r=auth/password   تغيير كلمة المرور — المالك فقط
 *   POST ?r=orders          إرسال طلب من المتجر — عام (الأسعار تُحسب هنا من الكتالوج)
 *   GET  ?r=orders          كل الطلبات — المالك فقط
 *   POST ?r=orders/status   تغيير حالة طلب — المالك فقط
 *   GET  ?r=orders/track    تتبع طلب برقمه ورقم الهاتف — عام
 */

define('IRIS_API', true);
require __DIR__ . '/lib.php';

iris_bootstrap();

$route = isset($_GET['r']) ? trim((string) $_GET['r'], '/') : '';
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';

$routes = array(
    'GET health' => 'route_health',
    'GET catalog' => 'route_catalog_get',
    'POST catalog/save' => 'route_catalog_save',
    'POST upload' => 'route_upload',
    'POST auth/login' => 'route_login',
    'POST auth/logout' => 'route_logout',
    'GET auth/me' => 'route_me',
    'POST auth/password' => 'route_password',
    'POST orders' => 'route_order_create',
    'GET orders' => 'route_orders_list',
    'POST orders/status' => 'route_order_status',
    'GET orders/track' => 'route_order_track',
);

$key = $method . ' ' . $route;
if (!isset($routes[$key])) {
    iris_fail('المسار غير موجود.', 404);
}
call_user_func($routes[$key]);

/* ═════════════ الصحة ═════════════ */

function route_health()
{
    iris_ok(array(
        'php' => PHP_VERSION,
        'writable' => is_writable(IRIS_DATA_DIR),
        'uploads' => is_dir(iris_uploads_dir()) ? is_writable(iris_uploads_dir()) : is_writable(dirname(iris_uploads_dir())),
        'catalog' => is_file(iris_data_path('catalog')) ? 'owner' : 'seed',
        'passwordSet' => iris_password_configured(),
    ));
}

/* ═════════════ الكتالوج ═════════════ */

function route_catalog_get()
{
    iris_ok(array('catalog' => iris_catalog()));
}

function route_catalog_save()
{
    iris_require_admin();
    $body = iris_body();
    if (!isset($body['catalog']) || !is_array($body['catalog'])) {
        iris_fail('لم تصل بيانات الكتالوج.');
    }
    $catalog = iris_clean_catalog($body['catalog']);
    iris_locked(function () use (&$catalog) {
        iris_backup('catalog');
        $catalog['updatedAt'] = gmdate('c');
        iris_write('catalog', $catalog);
    });
    iris_ok(array('catalog' => $catalog));
}

function iris_clean_catalog(array $in)
{
    $categories = isset($in['categories']) && is_array($in['categories']) ? $in['categories'] : array();
    $products = isset($in['products']) && is_array($in['products']) ? $in['products'] : array();
    if (count($categories) > 200) {
        iris_fail('عدد الأقسام أكبر من المسموح (200).');
    }
    if (count($products) > 3000) {
        iris_fail('عدد المنتجات أكبر من المسموح (3000).');
    }

    $outCats = array();
    $slugs = array();
    foreach ($categories as $i => $c) {
        if (!is_array($c)) {
            iris_fail('بيانات قسم غير صالحة.');
        }
        $label = 'القسم رقم ' . ($i + 1);
        $slug = iris_slug(isset($c['slug']) ? $c['slug'] : '', 'معرّف ' . $label);
        if (isset($slugs[$slug])) {
            iris_fail('معرّف القسم «' . $slug . '» مكرر.');
        }
        $slugs[$slug] = true;
        $name = iris_str(isset($c['name']) ? $c['name'] : '', 80, true, 'اسم ' . $label);
        $cat = array(
            'slug' => $slug,
            'name' => $name,
            'title' => iris_str(isset($c['title']) && $c['title'] !== '' ? $c['title'] : $name, 120, true, 'عنوان ' . $label),
            'description' => iris_str(isset($c['description']) ? $c['description'] : '', 1500, false, 'وصف ' . $label),
            'image' => iris_image(isset($c['image']) ? $c['image'] : '', 'صورة ' . $label),
        );
        $unit = iris_str(isset($c['unit']) ? $c['unit'] : '', 40);
        if ($unit !== '') {
            $cat['unit'] = $unit;
        }
        if (!empty($c['hidden'])) {
            $cat['hidden'] = true;
        }
        $outCats[] = $cat;
    }

    $badges = array('new', 'sale', 'exclusive', 'bestseller', 'limited', 'soldout');
    $swatchKeys = array('gold', 'white', 'rose', 'silver', 'black');
    $outProducts = array();
    $ids = array();
    $productSlugs = array();
    foreach ($products as $i => $p) {
        if (!is_array($p)) {
            iris_fail('بيانات منتج غير صالحة.');
        }
        $name = iris_str(isset($p['name']) ? $p['name'] : '', 200, true, 'اسم المنتج رقم ' . ($i + 1));
        $label = 'المنتج «' . $name . '»';
        $id = iris_str(isset($p['id']) ? $p['id'] : '', 64, true, 'معرّف ' . $label);
        if (!preg_match('/^[A-Za-z0-9_\-]+$/', $id) || isset($ids[$id])) {
            iris_fail('معرّف ' . $label . ' غير صالح أو مكرر.');
        }
        $ids[$id] = true;
        $slug = iris_slug(isset($p['slug']) ? $p['slug'] : '', 'رابط ' . $label);
        if (isset($productSlugs[$slug])) {
            iris_fail('رابط ' . $label . ' مكرر مع منتج آخر.');
        }
        $productSlugs[$slug] = true;
        $category = iris_str(isset($p['category']) ? $p['category'] : '', 120, true, 'قسم ' . $label);
        if (!isset($slugs[$category])) {
            iris_fail('قسم ' . $label . ' غير موجود.');
        }
        $image = iris_image(isset($p['image']) ? $p['image'] : '', 'صورة ' . $label);
        $gallery = array();
        if (isset($p['gallery']) && is_array($p['gallery'])) {
            foreach (array_slice($p['gallery'], 0, 12) as $g) {
                $g = iris_image($g, 'صورة ' . $label);
                if ($g !== '') {
                    $gallery[] = $g;
                }
            }
        }
        if (!$gallery && $image !== '') {
            $gallery[] = $image;
        }
        $out = array(
            'id' => $id,
            'slug' => $slug,
            'sku' => iris_str(isset($p['sku']) ? $p['sku'] : '', 40, false, 'رمز ' . $label),
            'name' => $name,
            'shortName' => iris_str(isset($p['shortName']) && $p['shortName'] !== '' ? $p['shortName'] : $name, 120, true, 'الاسم المختصر لـ' . $label),
            'category' => $category,
            'summary' => iris_str(isset($p['summary']) ? $p['summary'] : '', 500, false, 'وصف ' . $label),
            'metal' => iris_str(isset($p['metal']) ? $p['metal'] : '', 120, false, 'خامة ' . $label),
            'price' => iris_int(isset($p['price']) ? $p['price'] : 0, 0, 1000000000, 'سعر ' . $label),
            'stock' => iris_int(isset($p['stock']) ? $p['stock'] : 0, 0, 1000000, 'كمية ' . $label),
            'image' => $image,
            'gallery' => $gallery,
        );
        if (isset($p['oldPrice']) && $p['oldPrice'] !== null && $p['oldPrice'] !== '' && (int) $p['oldPrice'] > 0) {
            $out['oldPrice'] = iris_int($p['oldPrice'], 0, 1000000000, 'السعر القديم لـ' . $label);
        }
        if (!empty($p['badge']) && in_array($p['badge'], $badges, true)) {
            $out['badge'] = $p['badge'];
        }
        if (isset($p['swatches']) && is_array($p['swatches'])) {
            $sw = array_values(array_unique(array_intersect($p['swatches'], $swatchKeys)));
            if ($sw) {
                $out['swatches'] = $sw;
            }
        }
        if (isset($p['sizes']) && is_array($p['sizes'])) {
            $sizes = array();
            foreach (array_slice($p['sizes'], 0, 30) as $s) {
                if (!is_array($s)) {
                    continue;
                }
                $size = array('label' => iris_str(isset($s['label']) ? $s['label'] : '', 40, true, 'مقاس ' . $label));
                $note = iris_str(isset($s['note']) ? $s['note'] : '', 80);
                if ($note !== '') {
                    $size['note'] = $note;
                }
                if (!empty($s['soldOut'])) {
                    $size['soldOut'] = true;
                }
                $sizes[] = $size;
            }
            if ($sizes) {
                $out['sizes'] = $sizes;
            }
        }
        if (isset($p['tags']) && is_array($p['tags'])) {
            $tags = array();
            foreach (array_slice($p['tags'], 0, 20) as $t) {
                $t = iris_str($t, 40);
                if ($t !== '') {
                    $tags[] = $t;
                }
            }
            if ($tags) {
                $out['tags'] = $tags;
            }
        }
        if (!empty($p['hidden'])) {
            $out['hidden'] = true;
        }
        if (isset($p['content']) && is_array($p['content'])) {
            $out['content'] = iris_clean_content($p['content'], $label);
        }
        $outProducts[] = $out;
    }

    return array(
        'categories' => $outCats,
        'products' => $outProducts,
        'settings' => iris_clean_settings(isset($in['settings']) && is_array($in['settings']) ? $in['settings'] : array()),
    );
}

function iris_clean_content(array $c, $label)
{
    $out = array('description' => array(), 'specs' => array());
    if (isset($c['description']) && is_array($c['description'])) {
        foreach (array_slice($c['description'], 0, 10) as $para) {
            $para = iris_str($para, 3000, false, 'وصف ' . $label);
            if ($para !== '') {
                $out['description'][] = $para;
            }
        }
    }
    if (isset($c['specs']) && is_array($c['specs'])) {
        foreach (array_slice($c['specs'], 0, 40) as $spec) {
            if (!is_array($spec)) {
                continue;
            }
            $l = iris_str(isset($spec['label']) ? $spec['label'] : '', 120);
            $v = iris_str(isset($spec['value']) ? $spec['value'] : '', 300);
            if ($l !== '' && $v !== '') {
                $out['specs'][] = array('label' => $l, 'value' => $v);
            }
        }
    }
    if (isset($c['story']) && is_array($c['story'])) {
        $story = array();
        foreach (array('eyebrow' => 120, 'title' => 200, 'body' => 3000, 'hallmarkTitle' => 120, 'hallmarkNumber' => 60) as $k => $max) {
            $story[$k] = iris_str(isset($c['story'][$k]) ? $c['story'][$k] : '', $max);
        }
        $out['story'] = $story;
    }
    if (isset($c['certificate']) && is_array($c['certificate'])) {
        $cert = array();
        foreach (array('title' => 120, 'note' => 300, 'badge' => 60) as $k => $max) {
            $cert[$k] = iris_str(isset($c['certificate'][$k]) ? $c['certificate'][$k] : '', $max);
        }
        $out['certificate'] = $cert;
    }
    return $out;
}

function iris_clean_settings(array $s)
{
    $config = iris_config();
    $coupons = array();
    if (isset($s['coupons']) && is_array($s['coupons'])) {
        foreach (array_slice($s['coupons'], 0, 100, true) as $code => $c) {
            $code = strtoupper(trim((string) $code));
            if (!preg_match('/^[A-Z0-9_\-]{2,24}$/', $code) || !is_array($c)) {
                iris_fail('رمز القسيمة «' . $code . '» غير صالح (حروف إنجليزية وأرقام فقط).');
            }
            $coupons[$code] = array(
                'percent' => iris_int(isset($c['percent']) ? $c['percent'] : 0, 1, 90, 'نسبة القسيمة ' . $code),
                'label' => iris_str(isset($c['label']) ? $c['label'] : '', 80, false, 'وصف القسيمة'),
            );
        }
    }
    $whatsapp = preg_replace('/\D+/', '', isset($s['whatsapp']) ? (string) $s['whatsapp'] : '');
    if (strlen($whatsapp) > 15) {
        iris_fail('رقم واتساب غير صالح.');
    }
    // اسم حساب إنستغرام بلا @ (حروف إنجليزية وأرقام ونقطة وشرطة سفلية)
    $instagram = ltrim(trim(isset($s['instagram']) ? (string) $s['instagram'] : ''), '@');
    if ($instagram !== '' && !preg_match('/^[A-Za-z0-9._]{1,30}$/', $instagram)) {
        iris_fail('اسم حساب إنستغرام غير صالح.');
    }
    return array(
        'shippingFee' => iris_int(isset($s['shippingFee']) ? $s['shippingFee'] : $config['shipping_fee'], 0, 10000000, 'أجور التوصيل'),
        'freeShippingThreshold' => iris_int(isset($s['freeShippingThreshold']) ? $s['freeShippingThreshold'] : $config['free_shipping_threshold'], 0, 1000000000, 'حد التوصيل المجاني'),
        'coupons' => (object) $coupons,
        'whatsapp' => $whatsapp,
        'instagram' => $instagram,
        'heroImage' => iris_image(isset($s['heroImage']) ? $s['heroImage'] : '', 'صورة الغلاف'),
    );
}

/* ═════════════ رفع الصور ═════════════ */

function iris_uploads_dir()
{
    return dirname(__DIR__) . '/uploads';
}

function route_upload()
{
    iris_require_admin();
    if (empty($_FILES['file']) || !is_array($_FILES['file'])) {
        iris_fail('لم يصل أي ملف.');
    }
    $file = $_FILES['file'];
    if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE) {
        iris_fail('حجم الصورة أكبر مما تسمح به الاستضافة.');
    }
    if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
        iris_fail('تعذر رفع الملف.');
    }
    if ($file['size'] > 8 * 1024 * 1024) {
        iris_fail('حجم الصورة يجب ألا يتجاوز 8 ميغابايت.');
    }
    $info = @getimagesize($file['tmp_name']);
    $types = array(IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_GIF => 'gif');
    if (defined('IMAGETYPE_WEBP')) {
        $types[IMAGETYPE_WEBP] = 'webp';
    }
    if (!$info || !isset($types[$info[2]])) {
        iris_fail('الملف ليس صورة مدعومة (JPG أو PNG أو WEBP).');
    }
    $sub = gmdate('Y/m');
    $dir = iris_uploads_dir() . '/' . $sub;
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
        iris_fail('تعذر إنشاء مجلد uploads. تأكد من صلاحيات الكتابة.', 500);
    }
    $name = bin2hex(random_bytes(10)) . '.' . $types[$info[2]];
    if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) {
        iris_fail('تعذر حفظ الصورة على الخادم.', 500);
    }
    @chmod($dir . '/' . $name, 0644);
    iris_ok(array('url' => '/uploads/' . $sub . '/' . $name, 'width' => $info[0], 'height' => $info[1]));
}

/* ═════════════ الدخول ═════════════ */

/** كلمة المرور المعتمدة: المحفوظة من لوحة الإدارة، وإلا الموجودة في config.php. */
function iris_password_record()
{
    $auth = iris_read('auth');
    if (is_array($auth) && !empty($auth['hash'])) {
        return array('hash' => $auth['hash']);
    }
    $config = iris_config();
    $pw = isset($config['admin_password']) ? (string) $config['admin_password'] : '';
    if (preg_match('/^\$(2y|argon2)/', $pw)) {
        return array('hash' => $pw);
    }
    return array('plain' => $pw);
}

function iris_password_configured()
{
    $rec = iris_password_record();
    return isset($rec['hash']) || (isset($rec['plain']) && $rec['plain'] !== '' && $rec['plain'] !== 'CHANGE-ME' && iris_mb_len($rec['plain']) >= 8);
}

function iris_password_matches($password)
{
    $rec = iris_password_record();
    if (isset($rec['hash'])) {
        return password_verify($password, $rec['hash']);
    }
    return hash_equals($rec['plain'], $password);
}

function iris_admin_profile()
{
    $config = iris_config();
    return array(
        'username' => (string) $config['admin_username'],
        'name' => (string) (isset($config['admin_name']) ? $config['admin_name'] : 'مالك المتجر'),
        'role' => 'المالك',
    );
}

function route_login()
{
    iris_require_same_origin();
    if (!iris_password_configured()) {
        iris_fail('لم تُضبط كلمة مرور المالك بعد. افتح الملف api/config.php من مدير الملفات واكتب كلمة مرور قوية (8 أحرف على الأقل) بدل CHANGE-ME.', 503);
    }
    if (!iris_rate_limit('login', 8, 15 * 60, false)) {
        iris_fail('محاولات كثيرة خاطئة. حاول بعد 15 دقيقة.', 429);
    }
    $body = iris_body();
    $username = iris_str(isset($body['username']) ? $body['username'] : '', 120, true, 'اسم المستخدم');
    $password = isset($body['password']) && is_string($body['password']) ? $body['password'] : '';
    $profile = iris_admin_profile();
    $userOk = hash_equals(strtolower($profile['username']), strtolower($username));
    $passOk = iris_password_matches($password);
    if (!$userOk || !$passOk) {
        iris_rate_limit('login', 8, 15 * 60, true);
        usleep(400000);
        iris_fail('اسم المستخدم أو كلمة المرور غير صحيحة.', 401);
    }
    iris_rate_reset('login');
    iris_session_start();
    session_regenerate_id(true);
    $_SESSION['admin'] = $profile;
    $_SESSION['since'] = time();
    iris_ok(array('admin' => $profile));
}

function route_logout()
{
    iris_require_same_origin();
    if (!empty($_COOKIE['IRISADMIN'])) {
        iris_session_start();
        $_SESSION = array();
        session_destroy();
        $params = session_get_cookie_params();
        setcookie('IRISADMIN', '', time() - 3600, '/', '', $params['secure'], true);
    }
    iris_ok();
}

function route_me()
{
    iris_ok(array('admin' => iris_current_admin()));
}

function route_password()
{
    iris_require_admin();
    $body = iris_body();
    $current = isset($body['current']) && is_string($body['current']) ? $body['current'] : '';
    $next = isset($body['next']) && is_string($body['next']) ? $body['next'] : '';
    if (!iris_password_matches($current)) {
        iris_fail('كلمة المرور الحالية غير صحيحة.', 400);
    }
    if (iris_mb_len($next) < 8) {
        iris_fail('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.');
    }
    iris_locked(function () use ($next) {
        iris_write('auth', array('hash' => password_hash($next, PASSWORD_DEFAULT), 'changedAt' => gmdate('c')));
    });
    iris_ok();
}

/* ═════════════ الطلبات ═════════════ */

function iris_order_statuses()
{
    return array('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled', 'returned');
}

function route_order_create()
{
    iris_require_same_origin();
    if (!iris_rate_limit('order', 12, 3600)) {
        iris_fail('تم إرسال طلبات كثيرة من هذا الجهاز. حاول لاحقاً أو تواصل معنا هاتفياً.', 429);
    }
    $body = iris_body();
    $c = isset($body['customer']) && is_array($body['customer']) ? $body['customer'] : array();
    $d = isset($body['delivery']) && is_array($body['delivery']) ? $body['delivery'] : array();

    $name = iris_str(isset($c['name']) ? $c['name'] : '', 80, true, 'اسم المستلم');
    if (iris_mb_len($name) < 2) {
        iris_fail('يرجى إدخال الاسم الكامل للمستلم.');
    }
    $phone = iris_phone(isset($c['phone']) ? $c['phone'] : '');
    if (!$phone) {
        iris_fail('رقم الهاتف غير صحيح (مثال: 07701234567).');
    }
    $email = iris_str(isset($c['email']) ? $c['email'] : '', 120);
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        iris_fail('صيغة البريد الإلكتروني غير صحيحة.');
    }
    $customer = array('name' => $name, 'phone' => $phone);
    if ($email !== '') {
        $customer['email'] = $email;
    }

    $delivery = array(
        'governorate' => iris_str(isset($d['governorate']) ? $d['governorate'] : '', 40, true, 'المحافظة'),
        'district' => iris_str(isset($d['district']) ? $d['district'] : '', 80, true, 'المدينة أو القضاء'),
        'neighborhood' => iris_str(isset($d['neighborhood']) ? $d['neighborhood'] : '', 120, false, 'الحي'),
        'landmark' => iris_str(isset($d['landmark']) ? $d['landmark'] : '', 200, true, 'أقرب نقطة دالة'),
    );
    foreach (array('details' => 300, 'notes' => 500) as $k => $max) {
        $v = iris_str(isset($d[$k]) ? $d[$k] : '', $max);
        if ($v !== '') {
            $delivery[$k] = $v;
        }
    }

    $payment = isset($body['payment']) ? (string) $body['payment'] : 'cod';
    if (!in_array($payment, array('cod', 'zaincash', 'card'), true)) {
        iris_fail('طريقة الدفع غير مدعومة.');
    }
    $lines = isset($body['lines']) && is_array($body['lines']) ? $body['lines'] : array();
    if (!$lines || count($lines) > 30) {
        iris_fail('السلة فارغة أو تحتوي قطعاً أكثر من المسموح.');
    }
    $couponCode = strtoupper(iris_str(isset($body['couponCode']) ? $body['couponCode'] : '', 24));

    $order = iris_locked(function () use ($customer, $delivery, $payment, $lines, $couponCode) {
        $catalog = iris_catalog();
        if (!$catalog) {
            iris_fail('المتجر غير جاهز لاستقبال الطلبات بعد.', 503);
        }
        $byId = array();
        foreach ($catalog['products'] as $idx => $p) {
            $byId[$p['id']] = $idx;
        }
        $visibleCats = array();
        foreach ($catalog['categories'] as $cat) {
            if (empty($cat['hidden'])) {
                $visibleCats[$cat['slug']] = true;
            }
        }

        $outLines = array();
        $wanted = array();
        foreach ($lines as $line) {
            if (!is_array($line)) {
                iris_fail('بيانات السلة غير صالحة.');
            }
            $pid = isset($line['productId']) ? (string) $line['productId'] : '';
            if (!isset($byId[$pid])) {
                iris_fail('إحدى القطع لم تعد متوفرة في المتجر. حدّث السلة وحاول مجدداً.', 409);
            }
            $p = $catalog['products'][$byId[$pid]];
            if (!empty($p['hidden']) || !isset($visibleCats[$p['category']])) {
                iris_fail('القطعة «' . $p['shortName'] . '» لم تعد معروضة للبيع.', 409);
            }
            $qty = iris_int(isset($line['qty']) ? $line['qty'] : 1, 1, 10, 'الكمية');
            $wanted[$pid] = (isset($wanted[$pid]) ? $wanted[$pid] : 0) + $qty;
            if ($wanted[$pid] > (int) $p['stock']) {
                iris_fail('الكمية المطلوبة من «' . $p['shortName'] . '» غير متوفرة حالياً (المتوفر: ' . (int) $p['stock'] . ').', 409);
            }
            $options = array();
            if (isset($line['options']) && is_array($line['options'])) {
                foreach (array('metal', 'size') as $k) {
                    $v = iris_str(isset($line['options'][$k]) ? $line['options'][$k] : '', 80);
                    if ($v !== '') {
                        $options[$k] = $v;
                    }
                }
            }
            $outLine = array(
                'productId' => $pid,
                'name' => $p['shortName'],
                'sku' => isset($p['sku']) ? $p['sku'] : '',
                'image' => $p['image'],
                'qty' => $qty,
                'price' => (int) $p['price'],
            );
            if ($options) {
                $outLine['options'] = $options;
            }
            $outLines[] = $outLine;
        }

        $settings = isset($catalog['settings']) && is_array($catalog['settings']) ? $catalog['settings'] : array();
        $config = iris_config();
        $fee = isset($settings['shippingFee']) ? (int) $settings['shippingFee'] : (int) $config['shipping_fee'];
        $threshold = isset($settings['freeShippingThreshold']) ? (int) $settings['freeShippingThreshold'] : (int) $config['free_shipping_threshold'];
        $coupons = isset($settings['coupons']) && is_array($settings['coupons']) ? $settings['coupons'] : array();

        $subtotal = 0;
        foreach ($outLines as $l) {
            $subtotal += $l['price'] * $l['qty'];
        }
        $discount = 0;
        if ($couponCode !== '') {
            if (!isset($coupons[$couponCode])) {
                iris_fail('القسيمة ' . $couponCode . ' لم تعد صالحة. أزلها من السلة وحاول مجدداً.', 409);
            }
            $discount = (int) round($subtotal * (int) $coupons[$couponCode]['percent'] / 100);
        }
        $after = $subtotal - $discount;
        $shipping = ($threshold > 0 && $after >= $threshold) ? 0 : $fee;

        $store = iris_read('orders', array('next' => 1055, 'orders' => array()));
        $id = (int) $store['next'];
        $order = array(
            'id' => $id,
            'createdAt' => gmdate('c'),
            'status' => 'pending',
            'customer' => $customer,
            'delivery' => $delivery,
            'payment' => $payment,
            'lines' => $outLines,
            'subtotal' => $subtotal,
            'discount' => $discount,
            'shipping' => $shipping,
            'total' => $after + $shipping,
        );
        if ($couponCode !== '') {
            $order['couponCode'] = $couponCode;
        }
        array_unshift($store['orders'], $order);
        $store['next'] = $id + 1;
        iris_write('orders', $store);

        // حجز الكمية من المخزون
        foreach ($wanted as $pid => $qty) {
            $catalog['products'][$byId[$pid]]['stock'] = max(0, (int) $catalog['products'][$byId[$pid]]['stock'] - $qty);
        }
        iris_write('catalog', $catalog);
        return $order;
    });

    iris_notify_owner($order);
    iris_ok(array('order' => $order));
}

/** إشعار بريدي للمالك بالطلب الجديد (إن ضُبط notify_email في config.php). */
function iris_notify_owner(array $order)
{
    $config = iris_config();
    $to = isset($config['notify_email']) ? trim((string) $config['notify_email']) : '';
    if ($to === '' || !function_exists('mail')) {
        return;
    }
    $lines = array();
    foreach ($order['lines'] as $l) {
        $lines[] = '- ' . $l['name'] . ' × ' . $l['qty'] . ' = ' . number_format($l['price'] * $l['qty']) . ' د.ع';
    }
    $d = $order['delivery'];
    $text = "طلب جديد #{$order['id']}\n\n"
        . "الزبون: {$order['customer']['name']}\nالهاتف: {$order['customer']['phone']}\n"
        . "العنوان: {$d['governorate']} - {$d['district']} - {$d['neighborhood']} ({$d['landmark']})\n\n"
        . implode("\n", $lines) . "\n\nالإجمالي: " . number_format($order['total']) . " د.ع\n";
    $host = isset($_SERVER['HTTP_HOST']) ? preg_replace('/[^A-Za-z0-9.\-]/', '', $_SERVER['HTTP_HOST']) : 'localhost';
    $headers = "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nFrom: IRIS Store <no-reply@" . $host . ">";
    @mail($to, '=?UTF-8?B?' . base64_encode('طلب جديد #' . $order['id'] . ' — آيريس') . '?=', $text, $headers);
}

function route_orders_list()
{
    iris_require_admin();
    $store = iris_read('orders', array('next' => 1055, 'orders' => array()));
    iris_ok(array('orders' => $store['orders']));
}

function route_order_status()
{
    iris_require_admin();
    $body = iris_body();
    $id = iris_int(isset($body['id']) ? $body['id'] : 0, 1, PHP_INT_MAX, 'رقم الطلب');
    $status = isset($body['status']) ? (string) $body['status'] : '';
    if (!in_array($status, iris_order_statuses(), true)) {
        iris_fail('حالة الطلب غير معروفة.');
    }
    $order = iris_locked(function () use ($id, $status) {
        $store = iris_read('orders', array('next' => 1055, 'orders' => array()));
        foreach ($store['orders'] as $i => $o) {
            if ((int) $o['id'] !== $id) {
                continue;
            }
            $was = $o['status'];
            $store['orders'][$i]['status'] = $status;
            $store['orders'][$i]['updatedAt'] = gmdate('c');
            iris_write('orders', $store);
            // الإلغاء/الإرجاع يعيد الكمية للمخزون، والتراجع عنه يحجزها من جديد
            $released = array('cancelled', 'returned');
            $wasReleased = in_array($was, $released, true);
            $isReleased = in_array($status, $released, true);
            if ($wasReleased !== $isReleased) {
                iris_adjust_stock($o['lines'], $isReleased ? 1 : -1);
            }
            return $store['orders'][$i];
        }
        iris_fail('الطلب غير موجود.', 404);
        return null;
    });
    iris_ok(array('order' => $order));
}

function iris_adjust_stock(array $lines, $sign)
{
    $catalog = iris_catalog();
    if (!$catalog) {
        return;
    }
    foreach ($catalog['products'] as $i => $p) {
        foreach ($lines as $l) {
            if ($l['productId'] === $p['id']) {
                $catalog['products'][$i]['stock'] = max(0, (int) $catalog['products'][$i]['stock'] + $sign * (int) $l['qty']);
            }
        }
    }
    iris_write('catalog', $catalog);
}

function route_order_track()
{
    if (!iris_rate_limit('track', 40, 600)) {
        iris_fail('محاولات كثيرة. حاول بعد قليل.', 429);
    }
    $id = isset($_GET['id']) ? (int) preg_replace('/\D+/', '', (string) $_GET['id']) : 0;
    $phone = iris_phone(isset($_GET['phone']) ? $_GET['phone'] : '');
    if (!$id || !$phone) {
        iris_fail('يرجى إدخال رقم الطلب ورقم الهاتف المستخدم فيه.');
    }
    $store = iris_read('orders', array('next' => 1055, 'orders' => array()));
    foreach ($store['orders'] as $o) {
        if ((int) $o['id'] === $id && $o['customer']['phone'] === $phone) {
            iris_ok(array('order' => $o));
        }
    }
    iris_fail('لم نجد طلباً بهذا الرقم وهذا الهاتف.', 404);
}
