<?php
/**
 * الملفات: رفع الصور والشعار والخطوط والفيديو، وتنزيل وسائط إنستغرام.
 * النوع يُعرف من أول بايتات الملف لا من اسمه، والأسماء عشوائية تحت uploads/YYYY/MM/ (الخطوط تحت uploads/fonts/).
 * نفس قواعد server/core/uploads.ts.
 */

if (!defined('IRIS_API')) {
    http_response_code(403);
    exit;
}

function iris_uploads_dir()
{
    return dirname(__DIR__, 2) . '/uploads';
}

/** حدود الحجم لكل نوع (بالبايت). */
function iris_upload_limits()
{
    return array('image' => 8 * 1024 * 1024, 'font' => 5 * 1024 * 1024, 'video' => 40 * 1024 * 1024);
}

/** نوع الملف من توقيعه: array(ext, mime, family) أو null. */
function iris_sniff($path)
{
    $h = @fopen($path, 'rb');
    if (!$h) {
        return null;
    }
    $b = fread($h, 16);
    fclose($h);
    if ($b === false || strlen($b) < 12) {
        return null;
    }
    if (substr($b, 0, 3) === "\xFF\xD8\xFF") {
        return array('jpg', 'image/jpeg', 'image');
    }
    if (substr($b, 0, 8) === "\x89PNG\r\n\x1a\n") {
        return array('png', 'image/png', 'image');
    }
    if (substr($b, 0, 4) === 'GIF8') {
        return array('gif', 'image/gif', 'image');
    }
    if (substr($b, 0, 4) === 'RIFF' && substr($b, 8, 4) === 'WEBP') {
        return array('webp', 'image/webp', 'image');
    }
    if (substr($b, 0, 4) === 'wOF2') {
        return array('woff2', 'font/woff2', 'font');
    }
    if (substr($b, 0, 4) === 'wOFF') {
        return array('woff', 'font/woff', 'font');
    }
    if (substr($b, 0, 4) === 'OTTO') {
        return array('otf', 'font/otf', 'font');
    }
    if (substr($b, 0, 4) === "\x00\x01\x00\x00" || substr($b, 0, 4) === 'true') {
        return array('ttf', 'font/ttf', 'font');
    }
    if (substr($b, 4, 4) === 'ftyp') {
        return array('mp4', 'video/mp4', 'video');
    }
    if (substr($b, 0, 4) === "\x1A\x45\xDF\xA3") {
        return array('webm', 'video/webm', 'video');
    }
    return null;
}

function iris_upload_kind($value)
{
    return in_array($value, array('logo', 'font', 'video'), true) ? $value : 'image';
}

/**
 * يتحقق من ملف مؤقت وينقله إلى uploads ويعيد رابطه العام.
 * $uploaded = true للملفات القادمة من نموذج الرفع (move_uploaded_file)، وfalse لما ينزّله الخادم بنفسه.
 */
function iris_store_file($tmp, $kind, $uploaded)
{
    $family = $kind === 'logo' ? 'image' : $kind;
    $messages = array(
        'image' => 'الملف ليس صورة مدعومة (JPG أو PNG أو WEBP).',
        'logo' => 'الشعار يجب أن يكون صورة PNG أو JPG أو WEBP.',
        'font' => 'ملف الخط غير مدعوم. استخدم WOFF2 أو WOFF أو TTF أو OTF.',
        'video' => 'الفيديو غير مدعوم. استخدم ملف MP4 أو WEBM.',
    );
    $found = iris_sniff($tmp);
    if (!$found || $found[2] !== $family) {
        iris_fail($messages[$kind]);
    }
    if ($family === 'image' && !@getimagesize($tmp)) {
        iris_fail($messages[$kind]);
    }
    $limits = iris_upload_limits();
    if (filesize($tmp) > $limits[$family]) {
        iris_fail('حجم الملف أكبر من ' . floor($limits[$family] / 1048576) . ' ميغابايت.');
    }
    $sub = $family === 'font' ? 'fonts' : gmdate('Y/m');
    $dir = iris_uploads_dir() . '/' . $sub;
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
        iris_fail('تعذر إنشاء مجلد uploads. تأكد من صلاحيات الكتابة.', 500);
    }
    $name = bin2hex(random_bytes(10)) . '.' . $found[0];
    $ok = $uploaded ? move_uploaded_file($tmp, $dir . '/' . $name) : @rename($tmp, $dir . '/' . $name);
    if (!$ok) {
        iris_fail('تعذر حفظ الملف على الخادم.', 500);
    }
    @chmod($dir . '/' . $name, 0644);
    return '/uploads/' . $sub . '/' . $name;
}

function route_upload()
{
    $user = iris_require_catalog_edit();
    $kind = iris_upload_kind(isset($_GET['kind']) ? $_GET['kind'] : '');
    $section = ($kind === 'logo' || $kind === 'font') ? 'settings' : 'products';
    $p = $user['permissions'];
    if (!iris_allows($p, $section, 'edit') && !($kind === 'image' && iris_allows($p, 'categories', 'edit'))) {
        iris_fail('لا تملك صلاحية رفع هذا النوع من الملفات.', 403);
    }
    if (empty($_FILES['file']) || !is_array($_FILES['file'])) {
        iris_fail('لم يصل أي ملف. إن كان فيديو كبيراً فقد يتجاوز حد الاستضافة.');
    }
    $file = $_FILES['file'];
    if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE) {
        iris_fail('حجم الملف أكبر مما تسمح به الاستضافة.');
    }
    if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
        iris_fail('تعذر رفع الملف.');
    }
    iris_ok(array('url' => iris_store_file($file['tmp_name'], $kind, true)));
}

/* ═════════════ طلبات HTTP خارجية (إنستغرام) ═════════════ */

function iris_http_available()
{
    return function_exists('curl_init') || filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOLEAN);
}

/**
 * طلب GET واحد بلا تتبع تحويلات. يكتب الجسم في $sink (مسار ملف) أو يعيده نصاً.
 * يعيد array(status, body|null, location|null).
 */
function iris_http_get($url, $sink, $maxBytes, $timeout)
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        $fh = $sink ? fopen($sink, 'wb') : null;
        $size = 0;
        $body = '';
        curl_setopt_array($ch, array(
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT => 'IrisStore/1.0',
            CURLOPT_WRITEFUNCTION => function ($ch, $chunk) use ($fh, &$size, &$body, $maxBytes) {
                $size += strlen($chunk);
                if ($size > $maxBytes) {
                    return 0; // يوقف التنزيل
                }
                if ($fh) {
                    fwrite($fh, $chunk);
                } else {
                    $body .= $chunk;
                }
                return strlen($chunk);
            },
        ));
        $ok = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $location = curl_getinfo($ch, CURLINFO_REDIRECT_URL);
        curl_close($ch);
        if ($fh) {
            fclose($fh);
        }
        if ($size > $maxBytes) {
            iris_fail('ملف الوسائط أكبر من المسموح.', 413);
        }
        if ($ok === false && $status === 0) {
            return array(0, null, null);
        }
        return array($status, $sink ? null : $body, $location ? $location : null);
    }

    $ctx = stream_context_create(array(
        'http' => array('follow_location' => 0, 'timeout' => $timeout, 'ignore_errors' => true, 'user_agent' => 'IrisStore/1.0'),
        'ssl' => array('verify_peer' => true, 'verify_peer_name' => true),
    ));
    $in = @fopen($url, 'rb', false, $ctx);
    if (!$in) {
        return array(0, null, null);
    }
    $meta = stream_get_meta_data($in);
    $headers = isset($meta['wrapper_data']) ? $meta['wrapper_data'] : array();
    $status = 0;
    $location = null;
    foreach ($headers as $line) {
        if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $m)) {
            $status = (int) $m[1];
        } elseif (stripos($line, 'Location:') === 0) {
            $location = trim(substr($line, 9));
        }
    }
    $out = $sink ? fopen($sink, 'wb') : null;
    $body = '';
    $size = 0;
    while (!feof($in)) {
        $chunk = fread($in, 65536);
        if ($chunk === false) {
            break;
        }
        $size += strlen($chunk);
        if ($size > $maxBytes) {
            fclose($in);
            if ($out) {
                fclose($out);
            }
            iris_fail('ملف الوسائط أكبر من المسموح.', 413);
        }
        if ($out) {
            fwrite($out, $chunk);
        } else {
            $body .= $chunk;
        }
    }
    fclose($in);
    if ($out) {
        fclose($out);
    }
    return array($status, $sink ? null : $body, $location);
}

/** نطاقات تنزيل الوسائط المسموحة (خوادم صور إنستغرام وفيسبوك فقط). */
function iris_media_host_allowed($url)
{
    $parts = parse_url($url);
    if (!$parts || !isset($parts['scheme'], $parts['host']) || strtolower($parts['scheme']) !== 'https') {
        return false;
    }
    $host = strtolower($parts['host']);
    foreach (array('.cdninstagram.com', '.fbcdn.net') as $suffix) {
        if (substr($host, -strlen($suffix)) === $suffix) {
            return true;
        }
    }
    return false;
}

/** ينزّل ملف وسائط من إنستغرام (مع فحص كل تحويل) ويحفظه في uploads. */
function iris_download_media($url, $kind, $maxBytes)
{
    // iris_fail ينهي التنفيذ قبل finally، فننظف بقايا التنزيلات الفاشلة القديمة هنا
    foreach ((array) glob(IRIS_DATA_DIR . '/dl-*.tmp') as $old) {
        if ($old && filemtime($old) < time() - 3600) {
            @unlink($old);
        }
    }
    $tmp = IRIS_DATA_DIR . '/dl-' . bin2hex(random_bytes(6)) . '.tmp';
    try {
        for ($hop = 0; $hop < 4; $hop++) {
            if (!iris_media_host_allowed($url)) {
                iris_fail('رابط وسائط من خارج إنستغرام — رُفض لأسباب أمنية.', 502);
            }
            $res = iris_http_get($url, $tmp, $maxBytes, 45);
            if ($res[0] >= 300 && $res[0] < 400 && $res[2]) {
                $url = $res[2];
                continue;
            }
            if ($res[0] !== 200) {
                iris_fail('تعذر تنزيل الوسائط من إنستغرام (' . $res[0] . ').', 502);
            }
            return iris_store_file($tmp, $kind, false);
        }
        iris_fail('تحويلات كثيرة عند تنزيل الوسائط.', 502);
    } finally {
        if (is_file($tmp)) {
            @unlink($tmp);
        }
    }
    return '';
}

/** يحذف كل ما رفعه المالك (يُبقي ملفات الحماية في جذر uploads). */
function iris_delete_uploads($dir = null)
{
    $root = iris_uploads_dir();
    $dir = $dir === null ? $root : $dir;
    if (!is_dir($dir)) {
        return;
    }
    foreach (scandir($dir) as $name) {
        if ($name === '.' || $name === '..') {
            continue;
        }
        $path = $dir . '/' . $name;
        if ($dir === $root && ($name === '.htaccess' || $name === 'index.html')) {
            continue;
        }
        if (is_dir($path) && !is_link($path)) {
            iris_delete_uploads($path);
            @rmdir($path);
        } else {
            @unlink($path);
        }
    }
}
