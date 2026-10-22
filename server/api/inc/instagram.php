<?php
/**
 * الاستيراد من إنستغرام عبر الواجهة الرسمية (Instagram API with Instagram Login، الإصدار v25.0).
 * الرمز يُحفظ في data/instagram.php فقط ولا يظهر في الكتالوج العام.
 * الواجهة لا ترسل أي رابط وسائط: الخادم يقرأ المنشور من Graph برقمه ثم ينزّل وسائطه بنفسه.
 * نفس منطق server/core/instagram.ts.
 */

if (!defined('IRIS_API')) {
    http_response_code(403);
    exit;
}

define('IRIS_IG_GRAPH', 'https://graph.instagram.com/v25.0');
define('IRIS_IG_FIELDS', 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{id,media_type,media_url,thumbnail_url}');
define('IRIS_IG_EXPIRED', 'انتهت صلاحية ربط إنستغرام أو أُلغي. أعد الربط من الإعدادات ← إنستغرام.');

/** طلب إلى Graph API يعيد JSON مفكوكاً، ويحوّل أخطاءه لرسائل عربية. */
function iris_ig_graph($url)
{
    if (!iris_http_available()) {
        iris_fail('الاستضافة لا تسمح بالاتصال الخارجي (curl أو allow_url_fopen). اطلب تفعيله من الدعم الفني.', 503);
    }
    $res = iris_http_get($url, null, 4 * 1024 * 1024, 20);
    if ($res[0] === 0) {
        iris_fail('تعذر الوصول إلى إنستغرام من الخادم. حاول بعد قليل.', 502);
    }
    $data = json_decode((string) $res[1], true);
    if ($res[0] !== 200 || !is_array($data) || isset($data['error'])) {
        $code = isset($data['error']['code']) ? (int) $data['error']['code'] : 0;
        // 190 = رمز غير صالح أو منتهٍ (لا نستخدم 401 حتى لا تُفهم كانتهاء جلسة اللوحة)
        if ($code === 190 || $res[0] === 401) {
            iris_fail(IRIS_IG_EXPIRED, 409);
        }
        $msg = isset($data['error']['message']) ? (string) $data['error']['message'] : 'خطأ ' . $res[0];
        iris_fail('رد إنستغرام: ' . substr($msg, 0, 200), 502);
    }
    return $data;
}

function iris_ig_with_token($url, $token)
{
    return $url . (strpos($url, '?') === false ? '?' : '&') . 'access_token=' . rawurlencode($token);
}

function iris_ig_status_payload()
{
    $c = iris_read('instagram');
    if (!is_array($c)) {
        return array('connected' => false);
    }
    return array(
        'connected' => true,
        'username' => $c['username'],
        'accountType' => $c['accountType'],
        'connectedAt' => $c['connectedAt'],
        'expiresAt' => $c['expiresAt'],
    );
}

/** الربط الحالي، مع تجديد الرمز الطويل كل أسبوع تقريباً (يجب أن يكون عمره 24 ساعة على الأقل). */
function iris_ig_connection()
{
    $c = iris_read('instagram');
    if (!is_array($c)) {
        iris_fail('لم يُربط حساب إنستغرام بعد. اربطه من الإعدادات ← إنستغرام.', 409);
    }
    if (time() - strtotime($c['refreshedAt']) > 7 * 86400 && iris_http_available()) {
        $res = iris_http_get('https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=' . rawurlencode($c['token']), null, 65536, 20);
        $data = json_decode((string) $res[1], true);
        if ($res[0] === 200 && is_array($data) && !empty($data['access_token'])) {
            $c['token'] = (string) $data['access_token'];
            $c['refreshedAt'] = gmdate('c');
            $c['expiresAt'] = gmdate('c', time() + (isset($data['expires_in']) ? (int) $data['expires_in'] : 60 * 86400));
            iris_locked(function () use ($c) {
                iris_write('instagram', $c);
            });
        } elseif (is_array($data) && isset($data['error']['code']) && (int) $data['error']['code'] === 190) {
            iris_fail(IRIS_IG_EXPIRED, 409);
        }
    }
    return $c;
}

function iris_ig_item(array $x)
{
    $video = isset($x['media_type']) && $x['media_type'] === 'VIDEO';
    $preview = $video ? (isset($x['thumbnail_url']) ? $x['thumbnail_url'] : '') : (isset($x['media_url']) ? $x['media_url'] : '');
    $item = array(
        'id' => (string) $x['id'],
        'type' => $video ? 'VIDEO' : 'IMAGE',
        'preview' => (string) $preview,
        'available' => !empty($x['media_url']),
    );
    if ($video && !empty($x['media_url'])) {
        // ملف الفيديو نفسه (لفحص لقطاته في المتصفح قبل الاستيراد)
        $item['src'] = (string) $x['media_url'];
    }
    return $item;
}

function iris_ig_normalize(array $m)
{
    $type = isset($m['media_type']) ? $m['media_type'] : 'IMAGE';
    $items = array();
    if ($type === 'CAROUSEL_ALBUM') {
        $children = isset($m['children']['data']) && is_array($m['children']['data']) ? $m['children']['data'] : array();
        foreach ($children as $child) {
            $items[] = iris_ig_item($child);
        }
    } else {
        $items[] = iris_ig_item($m);
    }
    return array(
        'id' => (string) $m['id'],
        'type' => in_array($type, array('IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'), true) ? $type : 'IMAGE',
        'caption' => isset($m['caption']) ? (string) $m['caption'] : '',
        'permalink' => isset($m['permalink']) ? (string) $m['permalink'] : '',
        'timestamp' => isset($m['timestamp']) ? (string) $m['timestamp'] : '',
        'items' => $items,
    );
}

function route_instagram_status()
{
    iris_require_access('products', 'edit');
    iris_ok(iris_ig_status_payload());
}

function route_instagram_connect()
{
    iris_require_owner();
    $body = iris_body();
    $token = trim(isset($body['token']) && is_string($body['token']) ? $body['token'] : '');
    if (!preg_match('/^[A-Za-z0-9_\-.|]{40,600}$/', $token)) {
        iris_fail('رمز الوصول غير صالح. انسخه كاملاً من لوحة مطوري Meta.');
    }
    $me = iris_ig_graph(iris_ig_with_token(IRIS_IG_GRAPH . '/me?fields=user_id,username,account_type', $token));
    $now = time();
    $conn = array(
        'token' => $token,
        'userId' => (string) (isset($me['user_id']) ? $me['user_id'] : (isset($me['id']) ? $me['id'] : '')),
        'username' => (string) (isset($me['username']) ? $me['username'] : ''),
        'accountType' => (string) (isset($me['account_type']) ? $me['account_type'] : ''),
        'connectedAt' => gmdate('c', $now),
        // رموز لوحة المطورين صالحة 60 يوماً؛ التجديد الأسبوعي يمدّها تلقائياً
        'refreshedAt' => gmdate('c', $now),
        'expiresAt' => gmdate('c', $now + 60 * 86400),
    );
    iris_locked(function () use ($conn) {
        iris_write('instagram', $conn);
    });
    iris_ok(iris_ig_status_payload());
}

function route_instagram_disconnect()
{
    iris_require_owner();
    iris_locked(function () {
        @unlink(iris_data_path('instagram'));
    });
    iris_ok(array('connected' => false));
}

function route_instagram_media()
{
    iris_require_access('products', 'edit');
    $c = iris_ig_connection();
    $after = isset($_GET['after']) ? (string) $_GET['after'] : '';
    $cursor = ($after !== '' && preg_match('/^[A-Za-z0-9_\-=]{1,400}$/', $after)) ? '&after=' . $after : '';
    $data = iris_ig_graph(iris_ig_with_token(IRIS_IG_GRAPH . '/me/media?fields=' . IRIS_IG_FIELDS . '&limit=24' . $cursor, $c['token']));
    $posts = array();
    foreach (isset($data['data']) && is_array($data['data']) ? $data['data'] : array() as $m) {
        $posts[] = iris_ig_normalize($m);
    }
    $next = !empty($data['paging']['next']) && isset($data['paging']['cursors']['after']) ? $data['paging']['cursors']['after'] : null;
    iris_ok(array('posts' => $posts, 'next' => $next, 'username' => $c['username']));
}

/** ينزّل الوسائط المختارة من منشور واحد إلى uploads (طلب لكل منشور حتى لا تطول المهلة). */
function route_instagram_fetch()
{
    iris_require_access('products', 'edit');
    @set_time_limit(180);
    $body = iris_body();
    $id = isset($body['id']) ? (string) $body['id'] : '';
    if (!preg_match('/^\d{5,30}$/', $id)) {
        iris_fail('رقم المنشور غير صالح.');
    }
    $c = iris_ig_connection();
    $m = iris_ig_graph(iris_ig_with_token(IRIS_IG_GRAPH . '/' . $id . '?fields=' . IRIS_IG_FIELDS, $c['token']));
    $raw = (isset($m['media_type']) && $m['media_type'] === 'CAROUSEL_ALBUM')
        ? (isset($m['children']['data']) ? $m['children']['data'] : array())
        : array($m);
    $wanted = array();
    if (isset($body['childIds']) && is_array($body['childIds'])) {
        foreach ($body['childIds'] as $cid) {
            $wanted[(string) $cid] = true;
        }
    }
    $media = array();
    foreach (array_slice($raw, 0, 12) as $x) {
        if ($wanted && !isset($wanted[(string) $x['id']])) {
            continue;
        }
        $isVideo = isset($x['media_type']) && $x['media_type'] === 'VIDEO';
        if ($isVideo) {
            $poster = !empty($x['thumbnail_url']) ? iris_download_media($x['thumbnail_url'], 'image', 15 * 1024 * 1024) : '';
            if (empty($x['media_url'])) {
                // الفيديو محجوب (حقوق موسيقى مثلاً): نكتفي بغلافه كصورة
                if ($poster !== '') {
                    $media[] = array('id' => (string) $x['id'], 'kind' => 'image', 'url' => $poster);
                }
                continue;
            }
            $item = array('id' => (string) $x['id'], 'kind' => 'video', 'url' => iris_download_media($x['media_url'], 'video', 40 * 1024 * 1024));
            if ($poster !== '') {
                $item['poster'] = $poster;
            }
            $media[] = $item;
        } elseif (!empty($x['media_url'])) {
            $media[] = array('id' => (string) $x['id'], 'kind' => 'image', 'url' => iris_download_media($x['media_url'], 'image', 15 * 1024 * 1024));
        }
    }
    if (!$media) {
        iris_fail($wanted ? 'لم تُختر أي صورة أو فيديو من هذا المنشور.' : 'إنستغرام لم يتح تنزيل وسائط هذا المنشور.', $wanted ? 400 : 502);
    }
    iris_ok(array(
        'media' => $media,
        'permalink' => isset($m['permalink']) ? (string) $m['permalink'] : '',
        'caption' => isset($m['caption']) ? (string) $m['caption'] : '',
    ));
}
