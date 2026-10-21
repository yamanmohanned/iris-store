<?php
/**
 * واجهة متجر آيريس — ملف واحد يخدم كل المسارات عبر ?r=
 *
 *   GET  ?r=health               فحص جاهزية الخادم (إصدار PHP، صلاحيات الكتابة، الاتصال الخارجي)
 *   GET  ?r=catalog              الكتالوج (الأقسام + المنتجات + الإعدادات) — عام
 *   POST ?r=catalog/save         حفظ الكتالوج — كل موظف يحفظ الأجزاء التي يملك تعديلها فقط
 *   POST ?r=upload&kind=…        رفع صورة/شعار/خط/فيديو
 *   POST ?r=auth/login           دخول المالك أو موظف
 *   POST ?r=auth/logout          تسجيل الخروج
 *   GET  ?r=auth/me              الحساب الحالي أو null
 *   POST ?r=auth/password        تغيير كلمة مرور الحساب الحالي
 *   POST ?r=orders               إرسال طلب من المتجر — عام (الأسعار تُحسب هنا من الكتالوج)
 *   GET  ?r=orders               كل الطلبات — صلاحية عرض الطلبات
 *   POST ?r=orders/status        تغيير حالة طلب — صلاحية تعديل الطلبات
 *   GET  ?r=orders/track         تتبع طلب برقمه ورقم الهاتف — عام
 *   GET|POST ?r=users…           فريق العمل — المالك فقط (inc/users.php)
 *   ?r=instagram/…               الاستيراد من إنستغرام (inc/instagram.php)
 *   POST ?r=system/reset         إعادة ضبط المتجر — المالك فقط بكلمة المرور (inc/reset.php)
 */

define('IRIS_API', true);
require __DIR__ . '/lib.php';
require __DIR__ . '/inc/users.php';
require __DIR__ . '/inc/media.php';
require __DIR__ . '/inc/instagram.php';
require __DIR__ . '/inc/reset.php';

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
    'GET users' => 'route_users_list',
    'POST users/save' => 'route_users_save',
    'POST users/delete' => 'route_users_delete',
    'GET instagram/status' => 'route_instagram_status',
    'POST instagram/connect' => 'route_instagram_connect',
    'POST instagram/disconnect' => 'route_instagram_disconnect',
    'GET instagram/media' => 'route_instagram_media',
    'POST instagram/fetch' => 'route_instagram_fetch',
    'POST system/reset' => 'route_system_reset',
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
        'instagram' => iris_http_available(),
        'limits' => iris_upload_limits(),
    ));
}

/* ═════════════ الكتالوج ═════════════ */

function route_catalog_get()
{
    iris_ok(array('catalog' => iris_catalog()));
}

function route_catalog_save()
{
    $user = iris_require_catalog_edit();
    $body = iris_body();
    if (!isset($body['catalog']) || !is_array($body['catalog'])) {
        iris_fail('لم تصل بيانات الكتالوج.');
    }
    $incoming = $body['catalog'];
    $catalog = iris_locked(function () use ($incoming, $user) {
        $catalog = iris_clean_catalog(iris_merge_for_permissions($incoming, iris_catalog(), $user['permissions']));
        iris_backup('catalog');
        $catalog['updatedAt'] = gmdate('c');
        iris_write('catalog', $catalog);
        return $catalog;
    });
    iris_ok(array('catalog' => $catalog));
}

/**
 * الموظف يرسل الكتالوج كاملاً، لكن الأجزاء التي لا يملك تعديلها تؤخذ من النسخة المحفوظة
 * قبل التحقق — فلا يستطيع تغييرها حتى لو أرسلها (أو كانت نسخته قديمة).
 */
function iris_merge_for_permissions(array $incoming, $stored, array $perms)
{
    $stored = is_array($stored) ? $stored : array('categories' => array(), 'products' => array(), 'settings' => array());
    $pick = function ($section, $key) use ($incoming, $stored, $perms) {
        $src = iris_allows($perms, $section, 'edit') ? $incoming : $stored;
        return isset($src[$key]) ? $src[$key] : array();
    };
    $merged = array(
        'categories' => $pick('categories', 'categories'),
        'products' => $pick('products', 'products'),
        'settings' => $pick('settings', 'settings'),
    );
    if (!iris_allows($perms, 'products', 'edit')) {
        $slugs = array();
        foreach ((array) $merged['categories'] as $c) {
            if (is_array($c) && isset($c['slug'])) {
                $slugs[$c['slug']] = true;
            }
        }
        foreach ((array) $merged['products'] as $p) {
            if (is_array($p) && isset($p['category']) && !isset($slugs[$p['category']])) {
                iris_fail('لا يمكن حذف قسم فيه منتجات دون صلاحية تعديل المنتجات. انقل منتجاته أولاً أو اطلب ذلك من المالك.', 403);
            }
        }
    }
    return $merged;
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
        if (isset($p['videos']) && is_array($p['videos'])) {
            $videos = array();
            foreach (array_slice($p['videos'], 0, 3) as $v) {
                $v = iris_image($v, 'فيديو ' . $label);
                if ($v !== '') {
                    $videos[] = $v;
                }
            }
            if ($videos) {
                $out['videos'] = $videos;
            }
        }
        $source = iris_str(isset($p['source']) ? $p['source'] : '', 80);
        if ($source !== '') {
            if (!preg_match('/^ig:[A-Za-z0-9_]+$/', $source)) {
                iris_fail('مصدر ' . $label . ' غير صالح.');
            }
            $out['source'] = $source;
            $sourceUrl = iris_image(isset($p['sourceUrl']) ? $p['sourceUrl'] : '', 'رابط مصدر ' . $label);
            if ($sourceUrl !== '') {
                $out['sourceUrl'] = $sourceUrl;
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
    $out = array(
        'shippingFee' => iris_int(isset($s['shippingFee']) ? $s['shippingFee'] : $config['shipping_fee'], 0, 10000000, 'أجور التوصيل'),
        'freeShippingThreshold' => iris_int(isset($s['freeShippingThreshold']) ? $s['freeShippingThreshold'] : $config['free_shipping_threshold'], 0, 1000000000, 'حد التوصيل المجاني'),
        'coupons' => (object) $coupons,
        'whatsapp' => $whatsapp,
        'instagram' => $instagram,
        'heroImage' => iris_image(isset($s['heroImage']) ? $s['heroImage'] : '', 'صورة الغلاف'),
    );
    $branding = iris_clean_branding(isset($s['branding']) ? $s['branding'] : null);
    if ($branding) {
        $out['branding'] = $branding;
    }
    return $out;
}

/** هوية المتجر: الشعار والخطوط (نفس قواعد server/core/catalog.ts). */
function iris_clean_branding($b)
{
    if (!is_array($b)) {
        return null;
    }
    $out = array();
    $logo = iris_image(isset($b['logo']) ? $b['logo'] : '', 'الشعار');
    if ($logo !== '') {
        $out['logo'] = $logo;
    }
    $logoDark = iris_image(isset($b['logoDark']) ? $b['logoDark'] : '', 'شعار الخلفيات الداكنة');
    if ($logoDark !== '') {
        $out['logoDark'] = $logoDark;
    }
    if (!empty($b['logoTint'])) {
        $out['logoTint'] = true;
    }
    if (isset($b['showWordmark']) && $b['showWordmark'] === false) {
        $out['showWordmark'] = false;
    }
    foreach (array('bodyFont' => 'خط النصوص', 'headingFont' => 'خط العناوين') as $key => $label) {
        $font = iris_clean_font(isset($b[$key]) ? $b[$key] : null, $label);
        if ($font) {
            $out[$key] = $font;
        }
    }
    return $out ? $out : null;
}

function iris_clean_font($f, $label)
{
    if (!is_array($f)) {
        return null;
    }
    if (array_key_exists('preset', $f)) {
        if (!in_array($f['preset'], array('plex', 'messiri', 'cairo', 'tajawal', 'almarai'), true)) {
            iris_fail($label . ': الخط غير معروف.');
        }
        return array('preset' => $f['preset']);
    }
    $pattern = '#^/uploads/fonts/[a-f0-9]{20}\.(woff2|woff|ttf|otf)$#';
    $out = array(
        'name' => iris_str(isset($f['name']) ? $f['name'] : '', 60, true, 'اسم ' . $label),
        'regular' => iris_str(isset($f['regular']) ? $f['regular'] : '', 200, true, 'ملف ' . $label),
    );
    if (!preg_match($pattern, $out['regular'])) {
        iris_fail($label . ': ملف الخط غير صالح. ارفعه من صفحة الهوية.');
    }
    $bold = iris_str(isset($f['bold']) ? $f['bold'] : '', 200);
    if ($bold !== '') {
        if (!preg_match($pattern, $bold)) {
            iris_fail($label . ': ملف الخط العريض غير صالح.');
        }
        $out['bold'] = $bold;
    }
    return $out;
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
    $username = strtolower(iris_str(isset($body['username']) ? $body['username'] : '', 120, true, 'اسم المستخدم'));
    $password = isset($body['password']) && is_string($body['password']) ? $body['password'] : '';
    $owner = iris_owner_profile();
    $profile = null;
    $ver = 0;
    if (hash_equals($owner['username'], $username)) {
        if (iris_password_matches($password)) {
            $profile = $owner;
        }
    } else {
        $profile = iris_locked(function () use ($username, $password, &$ver) {
            $users = iris_staff_list();
            foreach ($users as $i => $u) {
                if ($u['username'] !== $username) {
                    continue;
                }
                if (!password_verify($password, $u['hash'])) {
                    return null;
                }
                if (empty($u['active'])) {
                    iris_fail('هذا الحساب موقوف. تواصل مع مالك المتجر.', 403);
                }
                $users[$i]['lastLoginAt'] = gmdate('c');
                iris_staff_store($users);
                $ver = (int) $u['ver'];
                return iris_staff_profile($u);
            }
            // نفس زمن التحقق تقريباً حتى لا يُعرف وجود الاسم من سرعة الرد
            password_hash($password, PASSWORD_DEFAULT);
            return null;
        });
    }
    if (!$profile) {
        iris_rate_limit('login', 8, 15 * 60, true);
        usleep(400000);
        iris_fail('اسم المستخدم أو كلمة المرور غير صحيحة.', 401);
    }
    iris_rate_reset('login');
    iris_session_start();
    session_regenerate_id(true);
    $_SESSION = array('uid' => $profile['id'], 'ver' => $ver, 'since' => time());
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
    iris_ok(array('admin' => iris_current_user()));
}

function route_password()
{
    $user = iris_require_user();
    $body = iris_body();
    $current = isset($body['current']) && is_string($body['current']) ? $body['current'] : '';
    $next = isset($body['next']) && is_string($body['next']) ? $body['next'] : '';
    if (iris_mb_len($next) < 8) {
        iris_fail('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.');
    }
    if ($user['role'] === 'owner') {
        if (!iris_password_matches($current)) {
            iris_fail('كلمة المرور الحالية غير صحيحة.', 400);
        }
        iris_locked(function () use ($next) {
            iris_write('auth', array('hash' => password_hash($next, PASSWORD_DEFAULT), 'changedAt' => gmdate('c')));
        });
        iris_ok();
    }
    $ver = iris_locked(function () use ($user, $current, $next) {
        $users = iris_staff_list();
        foreach ($users as $i => $u) {
            if ($u['id'] !== $user['id']) {
                continue;
            }
            if (!password_verify($current, $u['hash'])) {
                iris_fail('كلمة المرور الحالية غير صحيحة.', 400);
            }
            $users[$i]['hash'] = password_hash($next, PASSWORD_DEFAULT);
            $users[$i]['ver'] = (int) $u['ver'] + 1;
            $users[$i]['updatedAt'] = gmdate('c');
            iris_staff_store($users);
            return $users[$i]['ver'];
        }
        iris_fail('الحساب غير موجود.', 404);
        return 0;
    });
    // الجلسات الأخرى تنتهي، والجلسة الحالية تبقى
    $_SESSION['ver'] = $ver;
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
    iris_require_access('orders', 'view');
    $store = iris_read('orders', array('next' => 1055, 'orders' => array()));
    iris_ok(array('orders' => $store['orders']));
}

function route_order_status()
{
    iris_require_access('orders', 'edit');
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
