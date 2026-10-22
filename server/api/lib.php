<?php
/**
 * أدوات مشتركة لواجهة متجر آيريس: الاستجابات، التخزين الآمن للملفات، الجلسات، الحد من المحاولات.
 * متوافق مع PHP 7.2 فما فوق (أغلب الاستضافات المشتركة / cPanel).
 */

if (!defined('IRIS_API')) {
    http_response_code(403);
    exit;
}

define('IRIS_DATA_DIR', __DIR__ . '/data');
/** كل ملف بيانات يبدأ بهذا السطر حتى لا يُقرأ من المتصفح حتى لو تجاهل الخادم ملف .htaccess */
define('IRIS_GUARD', "<?php http_response_code(404); exit; ?>\n");
/** جسم طلب JSON: 4 ميغابايت لمسارات اللوحة (حفظ الكتالوج)، و64 كيلوبايت للمسارات العامة (دخول، طلب، تتبع) */
define('IRIS_BODY_MAX', 4 * 1024 * 1024);
define('IRIS_PUBLIC_BODY_MAX', 64 * 1024);

/**
 * هل في نسخة PHP على هذه الاستضافة إصلاح ثغرتي PHP2Shell (CVE-2026-109618 وCVE-2026-109619، الخلل في محرك PHP نفسه)؟
 *   ok          نسخة مُصلَحة (8.2.35 / 8.3.36 / 8.4.27 / 8.5.12 أو أحدث)
 *   outdated    فرع مدعوم لكن أقدم من نسخة الإصلاح
 *   unsupported 8.1 أو أقدم: لا تحديثات رسمية، ولا يصلح إلا ما تُرقّعه الاستضافة بنفسها
 * توزيعات لينكس وبعض الاستضافات تُصلح دون تغيير رقم النسخة، لذلك النتيجة تقدير يُؤكَّد مع دعم الاستضافة.
 */
function iris_php_fix_status($version = PHP_VERSION)
{
    $fixed = array('8.2' => '8.2.35', '8.3' => '8.3.36', '8.4' => '8.4.27', '8.5' => '8.5.12', '8.6' => '8.6.0RC4');
    $parts = explode('.', (string) $version);
    $branch = $parts[0] . '.' . (isset($parts[1]) ? $parts[1] : '0');
    if (isset($fixed[$branch])) {
        return version_compare($version, $fixed[$branch], '>=') ? 'ok' : 'outdated';
    }
    return version_compare($branch, '8.6', '>') ? 'ok' : 'unsupported';
}

/* ───────────── الاستجابات ───────────── */

function iris_json($data, $status = 200)
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function iris_ok(array $data = array())
{
    iris_json(array('ok' => true) + $data);
}

function iris_fail($message, $status = 400)
{
    iris_json(array('ok' => false, 'error' => $message), $status);
}

function iris_config()
{
    static $config = null;
    if ($config === null) {
        $config = require __DIR__ . '/config.php';
    }
    return $config;
}

function iris_bootstrap()
{
    ini_set('display_errors', '0');
    error_reporting(E_ALL);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    header('Cache-Control: no-store, max-age=0');
    // استجابات الواجهة بيانات فقط: لا تُعرض داخل صفحة أخرى ولا تُقرأ من موقع آخر
    header('X-Frame-Options: DENY');
    header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
    header('Cross-Origin-Resource-Policy: same-origin');
    header('X-Robots-Tag: noindex, nofollow');
    header_remove('X-Powered-By');
    set_exception_handler(function ($e) {
        error_log('[iris-api] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
        iris_fail('حدث خطأ غير متوقع في الخادم.', 500);
    });
    set_error_handler(function ($severity, $message, $file, $line) {
        // التحذيرات تُعامل كأخطاء؛ الملاحظات والتنبيهات المستقبلية (deprecated) تُسجَّل فقط
        if (!(error_reporting() & $severity) || !($severity & (E_WARNING | E_USER_WARNING | E_USER_ERROR | E_RECOVERABLE_ERROR))) {
            return false;
        }
        throw new ErrorException($message, 0, $severity, $file, $line);
    });
    if (!is_dir(IRIS_DATA_DIR)) {
        @mkdir(IRIS_DATA_DIR, 0755, true);
    }
    if (!is_dir(IRIS_DATA_DIR) || !is_writable(IRIS_DATA_DIR)) {
        iris_fail('مجلد البيانات api/data غير قابل للكتابة. اضبط صلاحياته على 755 من مدير الملفات.', 500);
    }
}

/**
 * جسم الطلب كـ JSON. المسارات التي يصلها الزائر بلا دخول تمرّر IRIS_PUBLIC_BODY_MAX: لا طلب عام يحتاج أكثر من بضعة
 * كيلوبايت، وحدّ صغير يقلل ما يستطيع مجهول أن يستهلكه من ذاكرة العامل (انظر ثغرتي PHP2Shell في docs/SECURITY-REPORT.md).
 * العمق 32 يكفي الكتالوج ويمنع الأجسام المتداخلة بعمق.
 */
function iris_body($max = IRIS_BODY_MAX)
{
    $raw = file_get_contents('php://input', false, null, 0, $max + 1);
    if ($raw === false || strlen($raw) > $max) {
        iris_fail('حجم البيانات المرسلة كبير جداً.', 413);
    }
    $data = json_decode($raw, true, 32);
    if (!is_array($data)) {
        iris_fail('صيغة البيانات غير صحيحة.');
    }
    return $data;
}

/**
 * حماية من الطلبات المزوّرة عبر المواقع (CSRF): المتصفح لا يسمح لموقع آخر بإرسال ترويسة مخصصة
 * دون إذن CORS (لا نمنحه)، وملف الجلسة SameSite=Strict.
 */
function iris_require_same_origin()
{
    $xrw = isset($_SERVER['HTTP_X_REQUESTED_WITH']) ? $_SERVER['HTTP_X_REQUESTED_WITH'] : '';
    if ($xrw !== 'iris') {
        iris_fail('طلب غير مسموح.', 403);
    }
    if (!empty($_SERVER['HTTP_ORIGIN']) && !empty($_SERVER['HTTP_HOST'])) {
        $host = parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_HOST);
        $self = preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST']);
        if ($host !== $self) {
            iris_fail('طلب غير مسموح.', 403);
        }
    }
}

/* ───────────── التخزين ───────────── */

function iris_data_path($name)
{
    return IRIS_DATA_DIR . '/' . $name . '.php';
}

function iris_read($name, $default = null)
{
    $file = iris_data_path($name);
    if (!is_file($file)) {
        return $default;
    }
    $raw = file_get_contents($file);
    if ($raw === false) {
        return $default;
    }
    if (strpos($raw, IRIS_GUARD) === 0) {
        $raw = substr($raw, strlen(IRIS_GUARD));
    }
    $value = json_decode($raw, true);
    return $value === null ? $default : $value;
}

/** كتابة ذرية: ملف مؤقت ثم إعادة تسمية، حتى لا يتلف الملف إن انقطع التنفيذ. */
function iris_write($name, $value)
{
    $file = iris_data_path($name);
    $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($json === false) {
        throw new RuntimeException('json_encode failed for ' . $name);
    }
    $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (file_put_contents($tmp, IRIS_GUARD . $json, LOCK_EX) === false) {
        throw new RuntimeException('cannot write ' . $tmp);
    }
    if (!@rename($tmp, $file)) {
        // ويندوز/بعض الأنظمة لا تستبدل ملفاً موجوداً بإعادة التسمية
        @unlink($file);
        if (!rename($tmp, $file)) {
            @unlink($tmp);
            throw new RuntimeException('cannot replace ' . $file);
        }
    }
}

/** ينفّذ دالة تحت قفل حصري واحد لكل البيانات (طلبان متزامنان لا يتداخلان). */
function iris_locked($fn)
{
    $handle = fopen(IRIS_DATA_DIR . '/.lock', 'c');
    if (!$handle) {
        throw new RuntimeException('cannot open lock');
    }
    flock($handle, LOCK_EX);
    try {
        return $fn();
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

/** نسخة احتياطية مؤرخة قبل الكتابة فوق ملف مهم (يُحتفظ بآخر $keep نسخة). */
function iris_backup($name, $keep = 30)
{
    $src = iris_data_path($name);
    if (!is_file($src)) {
        return;
    }
    $dir = IRIS_DATA_DIR . '/backups';
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    @copy($src, $dir . '/' . $name . '-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(2)) . '.php');
    $files = glob($dir . '/' . $name . '-*.php');
    if ($files && count($files) > $keep) {
        sort($files);
        foreach (array_slice($files, 0, count($files) - $keep) as $old) {
            @unlink($old);
        }
    }
}

/* ───────────── الكتالوج ───────────── */

/** كتالوج المالك، أو الكتالوج الأولي المرفق بالحزمة إن لم يحفظ المالك شيئاً بعد. */
function iris_catalog()
{
    $catalog = iris_read('catalog');
    if (is_array($catalog)) {
        return $catalog;
    }
    $seed = __DIR__ . '/data/catalog.seed.json';
    if (is_file($seed)) {
        $value = json_decode(file_get_contents($seed), true);
        if (is_array($value)) {
            return $value;
        }
    }
    return null;
}

/* ───────────── الجلسات والدخول ───────────── */

function iris_is_https()
{
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        return true;
    }
    return isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https';
}

function iris_session_start()
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $lifetime = 14 * 24 * 3600;
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.gc_maxlifetime', (string) $lifetime);
    session_name('IRISADMIN');
    if (PHP_VERSION_ID >= 70300) {
        session_set_cookie_params(array(
            'lifetime' => $lifetime,
            'path' => '/',
            'secure' => iris_is_https(),
            'httponly' => true,
            'samesite' => 'Strict',
        ));
    } else {
        session_set_cookie_params($lifetime, '/; samesite=Strict', '', iris_is_https(), true);
    }
    $path = session_save_path();
    if ($path === '' || !is_writable($path)) {
        $own = IRIS_DATA_DIR . '/sessions';
        if (!is_dir($own)) {
            @mkdir($own, 0700, true);
        }
        session_save_path($own);
        ini_set('session.gc_probability', '1');
        ini_set('session.gc_divisor', '50');
    }
    session_start();
}

/* الحساب الحالي وفحص الصلاحيات: iris_current_user و iris_require_access في inc/users.php */

/**
 * عنوان الزائر لحدود المحاولات. الأصل REMOTE_ADDR. خلف وسيط (Cloudflare أو شبكة توصيل المحتوى) يظهر عنوان الوسيط لكل الزوار
 * فيتشاركون الحدود نفسها؛ عندها يضبط المالك trusted_ip_header في config.php (مثل HTTP_CF_CONNECTING_IP).
 * لا يُقرأ إلا الاسم المضبوط هناك، فلا يستطيع الزائر انتحال عنوان بترويسة من اختياره.
 */
function iris_client_ip()
{
    $config = iris_config();
    $header = isset($config['trusted_ip_header']) ? trim((string) $config['trusted_ip_header']) : '';
    if ($header !== '' && preg_match('/^HTTP_[A-Z0-9_]+$/', $header) && !empty($_SERVER[$header])) {
        $parts = explode(',', (string) $_SERVER[$header]);
        $first = trim($parts[0]);
        if (filter_var($first, FILTER_VALIDATE_IP)) {
            return $first;
        }
    }
    return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '0.0.0.0';
}

/**
 * حد بسيط للمحاولات (ملف واحد، يُنظف تلقائياً). يعيد false عند تجاوز الحد.
 * $subject صاحب العدّاد: عنوان IP افتراضياً، أو مثل 'u:<اسم>' لعدّاد حساب واحد.
 */
function iris_rate_limit($bucket, $max, $windowSeconds, $count = true, $subject = null)
{
    return iris_locked(function () use ($bucket, $max, $windowSeconds, $count, $subject) {
        $now = time();
        $all = iris_read('ratelimit', array());
        $key = $bucket . ':' . hash('sha256', $subject === null ? iris_client_ip() : $subject);
        $hits = isset($all[$key]) ? $all[$key] : array();
        $hits = array_values(array_filter($hits, function ($t) use ($now, $windowSeconds) {
            return $t > $now - $windowSeconds;
        }));
        if (count($hits) >= $max) {
            return false;
        }
        if ($count) {
            $hits[] = $now;
        }
        $all[$key] = $hits;
        // تنظيف المفاتيح القديمة
        foreach ($all as $k => $list) {
            if (!$list || max($list) < $now - 86400) {
                unset($all[$k]);
            }
        }
        iris_write('ratelimit', $all);
        return true;
    });
}

function iris_rate_reset($bucket, $subject = null)
{
    iris_locked(function () use ($bucket, $subject) {
        $all = iris_read('ratelimit', array());
        unset($all[$bucket . ':' . hash('sha256', $subject === null ? iris_client_ip() : $subject)]);
        iris_write('ratelimit', $all);
    });
}

/* ───────────── التحقق من المدخلات ───────────── */

function iris_mb_len($s)
{
    return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : (int) preg_match_all('/./us', $s);
}

/** نص مقصوص بلا محارف تحكم. */
function iris_str($value, $max, $required = false, $label = 'الحقل')
{
    if (!is_string($value) && !is_numeric($value)) {
        $value = '';
    }
    $value = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string) $value));
    if ($required && $value === '') {
        iris_fail($label . ' مطلوب.');
    }
    if (iris_mb_len($value) > $max) {
        iris_fail($label . ' أطول من المسموح (' . $max . ' حرفاً).');
    }
    return $value;
}

function iris_int($value, $min, $max, $label = 'الرقم')
{
    if (!is_numeric($value)) {
        iris_fail($label . ' يجب أن يكون رقماً.');
    }
    $n = (int) round((float) $value);
    if ($n < $min || $n > $max) {
        iris_fail($label . ' خارج النطاق المسموح.');
    }
    return $n;
}

/** رابط صورة: مسار داخلي يبدأ بـ / أو رابط https. */
function iris_image($value, $label = 'رابط الصورة')
{
    $url = iris_str($value, 500, false, $label);
    if ($url === '') {
        return '';
    }
    // «/\evil.com» يعامله المتصفح كـ //evil.com، فلا شرطة مائلة عكسية إطلاقاً
    if (strpos($url, '..') !== false || strpos($url, '\\') !== false) {
        iris_fail($label . ': الرابط غير صالح.');
    }
    if ($url[0] === '/' && (strlen($url) === 1 || $url[1] !== '/')) {
        return $url;
    }
    if (preg_match('#^https://[^\s"\'<>]+$#i', $url)) {
        return $url;
    }
    iris_fail($label . ': الرابط غير صالح.');
    return '';
}

/** معرّف رابط (slug): حروف عربية/لاتينية وأرقام وشرطات. */
function iris_slug($value, $label = 'المعرّف')
{
    $slug = iris_str($value, 120, true, $label);
    if (!preg_match('/^[\p{L}\p{N}][\p{L}\p{N}\-]*$/u', $slug)) {
        iris_fail($label . ' يجب أن يحتوي حروفاً وأرقاماً وشرطات فقط.');
    }
    return $slug;
}

/** يحوّل رقم الهاتف العراقي إلى الصيغة 07XXXXXXXXX أو يعيد null. */
function iris_phone($value)
{
    $digits = preg_replace('/\D+/', '', (string) $value);
    if (strpos($digits, '00964') === 0) {
        $digits = substr($digits, 5);
    } elseif (strpos($digits, '964') === 0) {
        $digits = substr($digits, 3);
    }
    if (strlen($digits) === 10 && $digits[0] === '7') {
        $digits = '0' . $digits;
    }
    return preg_match('/^07\d{9}$/', $digits) ? $digits : null;
}
