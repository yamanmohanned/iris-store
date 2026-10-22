<?php
/**
 * محركات البحث ومعاينة الروابط: عنوان ووصف وبطاقة مشاركة وبيانات منظمة لكل صفحة، وخريطة الموقع، وrobots.txt.
 *
 *   GET ?r=page      الصفحات العامة (الرئيسية، منتج، قسم، من نحن…) — يكتب .htaccess هذا المسار لها
 *   GET ?r=sitemap   /sitemap.xml من الكتالوج الحي
 *   GET ?r=robots    /robots.txt
 *
 * واتساب وفيسبوك وتيليغرام وبعض الزواحف لا تشغّل JavaScript، فلا تراها من الواجهة وحدها. القيم هنا تقابل
 * src/lib/seo.ts (تُحدّث الصفحة بعد التنقل داخل المتجر)، ويفحص التطابقَ scripts/qa/seo-check.mjs.
 *
 * النطاق المعتمد من site_url في config.php — لا يُؤخذ من ترويسة Host. وما دام site_url فارغاً يمنع الخادم الفهرسة
 * (صفحات noindex وrobots.txt يمنع كل شيء) حتى لا تُفهرس العناوين المؤقتة (cPanel، عنوان IP).
 * أي خطأ هنا يُعيد الصفحة العادية بلا تعديل، فلا يتعطل المتجر.
 */

if (!defined('IRIS_API')) {
    http_response_code(403);
    exit;
}

/** النطاق المعتمد (https://example.com) أو نص فارغ إن لم يُضبط. */
function iris_seo_site_url()
{
    $config = iris_config();
    $url = isset($config['site_url']) ? rtrim(trim((string) $config['site_url']), '/') : '';
    return preg_match('#^https?://[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$#i', $url) ? $url : '';
}

/** النطاق الذي تُبنى به الروابط المطلقة، وهل هو النطاق المعتمد؟ */
function iris_seo_origin(&$configured)
{
    $site = iris_seo_site_url();
    if ($site !== '') {
        $configured = true;
        return $site;
    }
    $configured = false;
    $host = isset($_SERVER['HTTP_HOST']) ? strtolower((string) $_SERVER['HTTP_HOST']) : '';
    if (!preg_match('/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/', $host)) {
        $host = 'localhost';
    }
    return (iris_is_https() ? 'https://' : 'http://') . $host;
}

function iris_seo_pages()
{
    static $pages = null;
    if ($pages === null) {
        $pages = array();
        $file = __DIR__ . '/../seo-pages.json';
        if (is_file($file)) {
            $decoded = json_decode((string) file_get_contents($file), true);
            if (is_array($decoded)) {
                $pages = $decoded;
            }
        }
        $pages += array(
            'siteName' => 'آيريس ستور',
            'defaultTitle' => 'آيريس ستور',
            'defaultDescription' => 'آيريس ستور — إكسسوارات',
            'defaultImage' => '/brand/og-image.jpg',
            'pages' => array(),
            'noindexPrefixes' => array(),
            'noindexTitles' => array(),
        );
    }
    return $pages;
}

/** تهريب نص قبل وضعه في HTML (كل ما يأتي من الكتالوج يمر من هنا). */
function iris_seo_h($s)
{
    return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function iris_seo_len($s)
{
    return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : (int) preg_match_all('/./us', $s);
}

function iris_seo_sub($s, $start, $len)
{
    if (function_exists('mb_substr')) {
        return mb_substr($s, $start, $len, 'UTF-8');
    }
    $chars = preg_split('//u', $s, -1, PREG_SPLIT_NO_EMPTY);
    return implode('', array_slice($chars, $start, $len));
}

/** وصف مناسب لنتيجة البحث: يقتطع عند حد كلمة (يطابق clip في seo.ts). */
function iris_seo_clip($text, $max = 200)
{
    $t = trim(preg_replace('/\s+/u', ' ', (string) $text));
    if (iris_seo_len($t) <= $max) {
        return $t;
    }
    $cut = iris_seo_sub($t, 0, $max);
    $at = function_exists('mb_strrpos') ? mb_strrpos($cut, ' ', 0, 'UTF-8') : strrpos($cut, ' ');
    if ($at !== false && $at > $max * 0.6) {
        $cut = iris_seo_sub($cut, 0, $at);
    }
    return preg_replace('/[\s،,.؛:\-]+$/u', '', $cut) . '…';
}

function iris_seo_abs($origin, $pathOrUrl)
{
    $v = (string) $pathOrUrl;
    if (preg_match('#^https?://#i', $v)) {
        return $v;
    }
    return $origin . ($v !== '' && $v[0] === '/' ? '' : '/') . $v;
}

/** مسار الطلب الحالي (قبل إعادة الكتابة) بلا شرطة أخيرة. */
function iris_seo_request_path()
{
    $uri = isset($_SERVER['REQUEST_URI']) ? (string) $_SERVER['REQUEST_URI'] : '/';
    $path = parse_url($uri, PHP_URL_PATH);
    if (!is_string($path) || $path === '') {
        $path = '/';
    }
    $path = rawurldecode($path);
    // بعض الاستضافات تُظهر في REQUEST_URI العنوان بعد إعادة الكتابة (/api/index.php)؛ REDIRECT_URL يحمل العنوان الأصلي
    if (strpos($path, '/api/') === 0 && !empty($_SERVER['REDIRECT_URL']) && is_string($_SERVER['REDIRECT_URL'])) {
        $path = $_SERVER['REDIRECT_URL'];
    }
    if (!preg_match('//u', $path)) {
        return '/';
    }
    $path = preg_replace('#/{2,}#', '/', $path);
    return strlen($path) > 1 ? rtrim($path, '/') : $path;
}

/** صيغة المسار في الرابط: كل جزء بعد الترميز (حروف عربية → %XX كما يكتبها المتصفح). */
function iris_seo_encode_path($path)
{
    $parts = explode('/', $path);
    foreach ($parts as $i => $p) {
        $parts[$i] = rawurlencode($p);
    }
    $out = implode('/', $parts);
    return $out === '' ? '/' : $out;
}

function iris_seo_visible(array $catalog)
{
    $cats = array();
    $slugs = array();
    foreach (isset($catalog['categories']) && is_array($catalog['categories']) ? $catalog['categories'] : array() as $c) {
        if (is_array($c) && isset($c['slug']) && empty($c['hidden'])) {
            $cats[] = $c;
            $slugs[$c['slug']] = true;
        }
    }
    $products = array();
    foreach (isset($catalog['products']) && is_array($catalog['products']) ? $catalog['products'] : array() as $p) {
        if (is_array($p) && isset($p['slug'], $p['category']) && empty($p['hidden']) && isset($slugs[$p['category']])) {
            $products[] = $p;
        }
    }
    return array($cats, $products);
}

function iris_seo_product_description(array $p, $site)
{
    $base = isset($p['summary']) && $p['summary'] !== '' ? $p['summary'] : '';
    if ($base === '' && isset($p['content']['description'][0])) {
        $base = (string) $p['content']['description'][0];
    }
    if ($base === '') {
        $base = $p['name'] . ' من ' . $site;
    }
    return iris_seo_clip($base . ' السعر ' . number_format((float) round($p['price'])) . ' د.ع.');
}

/**
 * معلومات الصفحة لمسار ما. المصفوفة تقابل Seo في seo.ts مع status وnoscript للصفحة المُرسلة.
 */
function iris_seo_meta($path, $catalog, $origin)
{
    $cfg = iris_seo_pages();
    $site = $cfg['siteName'];
    list($cats, $products) = iris_seo_visible(is_array($catalog) ? $catalog : array());
    $base = array(
        'status' => 200,
        'image' => $cfg['defaultImage'],
        'path' => iris_seo_encode_path($path),
        'type' => 'website',
        'noindex' => false,
        'jsonLd' => array(),
        'title' => $cfg['defaultTitle'],
        'description' => $cfg['defaultDescription'],
        'noscript' => '',
    );

    if ($path === '/') {
        $settings = is_array($catalog) && isset($catalog['settings']) && is_array($catalog['settings']) ? $catalog['settings'] : array();
        $logo = isset($settings['branding']['logo']) && $settings['branding']['logo'] !== '' ? $settings['branding']['logo'] : '/brand/icon-512.png';
        $org = array('@context' => 'https://schema.org', '@type' => 'Organization', 'name' => $site, 'url' => $origin . '/', 'logo' => iris_seo_abs($origin, $logo));
        $handle = isset($settings['instagram']) ? trim(ltrim((string) $settings['instagram'], '@')) : '';
        if ($handle !== '') {
            $org['sameAs'] = array('https://instagram.com/' . $handle);
        }
        $digits = preg_replace('/\D/', '', isset($settings['whatsapp']) ? (string) $settings['whatsapp'] : '');
        if ($digits !== '') {
            $org['contactPoint'] = array('@type' => 'ContactPoint', 'telephone' => '+' . $digits, 'contactType' => 'customer service', 'availableLanguage' => 'Arabic');
        }
        $base['jsonLd'] = array($org, array('@context' => 'https://schema.org', '@type' => 'WebSite', 'name' => $site, 'url' => $origin . '/', 'inLanguage' => 'ar'));
        $links = '';
        foreach ($cats as $c) {
            $links .= '<li><a href="/collections/' . iris_seo_h(rawurlencode($c['slug'])) . '">' . iris_seo_h($c['name']) . '</a></li>';
        }
        $base['noscript'] = '<h1>' . iris_seo_h($site) . '</h1><p>' . iris_seo_h($base['description']) . '</p>' . ($links === '' ? '' : '<ul>' . $links . '</ul>') . iris_seo_product_links($products);
        return $base;
    }

    foreach ($cfg['noindexPrefixes'] as $prefix) {
        if ($path === $prefix || strpos($path, $prefix . '/') === 0) {
            $name = isset($cfg['noindexTitles'][$prefix]) ? $cfg['noindexTitles'][$prefix] : '';
            $base['title'] = $name !== '' ? $name . ' | ' . $site : $site;
            $base['noindex'] = true;
            return $base;
        }
    }

    if (isset($cfg['pages'][$path])) {
        $page = $cfg['pages'][$path];
        $base['title'] = $page['title'] . ' | ' . $site;
        $base['description'] = $page['description'];
        $base['noscript'] = '<h1>' . iris_seo_h($page['title']) . '</h1><p>' . iris_seo_h($page['description']) . '</p>';
        return $base;
    }

    if (preg_match('#^/collections/([^/]+)$#', $path, $m)) {
        foreach ($cats as $c) {
            if ($c['slug'] === $m[1]) {
                $title = isset($c['title']) && $c['title'] !== '' ? $c['title'] : $c['name'];
                $desc = isset($c['description']) && $c['description'] !== '' ? $c['description'] : 'تسوّقي ' . $c['name'] . ' من ' . $site . ': توصيل لجميع محافظات العراق والدفع عند الاستلام.';
                $base['title'] = $title . ' | ' . $site;
                $base['description'] = iris_seo_clip($desc);
                if (!empty($c['image'])) {
                    $base['image'] = $c['image'];
                }
                $inCat = array();
                foreach ($products as $p) {
                    if ($p['category'] === $c['slug']) {
                        $inCat[] = $p;
                    }
                }
                $base['noscript'] = '<h1>' . iris_seo_h($title) . '</h1><p>' . iris_seo_h($base['description']) . '</p>' . iris_seo_product_links($inCat);
                return $base;
            }
        }
    }

    if (preg_match('#^/products/([^/]+)$#', $path, $m)) {
        foreach ($products as $p) {
            if ($p['slug'] !== $m[1]) {
                continue;
            }
            $catName = $site;
            $catUrl = $origin . '/';
            foreach ($cats as $c) {
                if ($c['slug'] === $p['category']) {
                    $catName = $c['name'];
                    $catUrl = $origin . '/collections/' . rawurlencode($c['slug']);
                }
            }
            $url = $origin . $base['path'];
            $desc = iris_seo_product_description($p, $site);
            $images = array();
            foreach (array_merge(array(isset($p['image']) ? $p['image'] : ''), isset($p['gallery']) && is_array($p['gallery']) ? $p['gallery'] : array()) as $img) {
                if ($img !== '' && !in_array($img, $images, true)) {
                    $images[] = $img;
                }
            }
            $abs = array();
            foreach (array_slice($images, 0, 6) as $img) {
                $abs[] = iris_seo_abs($origin, $img);
            }
            $base['title'] = $p['name'] . ' | ' . $site;
            $base['description'] = $desc;
            $base['type'] = 'product';
            if (!empty($p['image'])) {
                $base['image'] = $p['image'];
            }
            $base['jsonLd'] = array(
                array(
                    '@context' => 'https://schema.org',
                    '@type' => 'Product',
                    'name' => $p['name'],
                    'description' => $desc,
                    'sku' => isset($p['sku']) && $p['sku'] !== '' ? $p['sku'] : $p['id'],
                    'image' => $abs,
                    'brand' => array('@type' => 'Brand', 'name' => $site),
                    'offers' => array(
                        '@type' => 'Offer',
                        'url' => $url,
                        'priceCurrency' => 'IQD',
                        'price' => (string) (int) round($p['price']),
                        'availability' => isset($p['stock']) && $p['stock'] > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                        'itemCondition' => 'https://schema.org/NewCondition',
                    ),
                ),
                array(
                    '@context' => 'https://schema.org',
                    '@type' => 'BreadcrumbList',
                    'itemListElement' => array(
                        array('@type' => 'ListItem', 'position' => 1, 'name' => $site, 'item' => $origin . '/'),
                        array('@type' => 'ListItem', 'position' => 2, 'name' => $catName, 'item' => $catUrl),
                        array('@type' => 'ListItem', 'position' => 3, 'name' => $p['name'], 'item' => $url),
                    ),
                ),
            );
            $img = !empty($p['image']) ? '<img src="' . iris_seo_h(iris_seo_abs($origin, $p['image'])) . '" alt="' . iris_seo_h($p['name']) . '" width="320">' : '';
            $base['noscript'] = '<h1>' . iris_seo_h($p['name']) . '</h1>' . $img . '<p>' . iris_seo_h($desc) . '</p>';
            return $base;
        }
    }

    $base['status'] = 404;
    $base['noindex'] = true;
    $base['title'] = 'الصفحة غير موجودة | ' . $site;
    return $base;
}

function iris_seo_product_links(array $products)
{
    $out = '';
    foreach ($products as $p) {
        $out .= '<li><a href="/products/' . iris_seo_h(rawurlencode($p['slug'])) . '">' . iris_seo_h($p['name']) . '</a> — ' . number_format((float) round($p['price'])) . ' د.ع</li>';
    }
    return $out === '' ? '' : '<ul>' . $out . '</ul>';
}

/** صفحة index.html مع وسوم الصفحة مكتوبة في <head> وملخص نصي لمن لا يشغّل JavaScript. */
function iris_seo_render($html, array $m, $origin)
{
    $e = 'iris_seo_h';
    $cfg = iris_seo_pages();
    $url = $origin . $m['path'];
    $image = iris_seo_abs($origin, $m['image']);

    $html = preg_replace('#<title>.*?</title>\s*#su', '', $html, 1);
    $html = preg_replace('#<meta\s+name="(?:description|twitter:[^"]*)"[^>]*>\s*#i', '', $html);
    $html = preg_replace('#<meta\s+property="og:[^"]*"[^>]*>\s*#i', '', $html);

    $block = array(
        '<title>' . $e($m['title']) . '</title>',
        '<meta name="description" content="' . $e($m['description']) . '" />',
        '<meta property="og:type" content="' . ($m['type'] === 'product' ? 'product' : 'website') . '" />',
        '<meta property="og:locale" content="ar_IQ" />',
        '<meta property="og:site_name" content="' . $e($cfg['siteName']) . '" />',
        '<meta property="og:title" content="' . $e($m['title']) . '" />',
        '<meta property="og:description" content="' . $e($m['description']) . '" />',
        '<meta property="og:url" content="' . $e($url) . '" />',
        '<meta property="og:image" content="' . $e($image) . '" />',
        '<meta name="twitter:card" content="summary_large_image" />',
        '<meta name="twitter:title" content="' . $e($m['title']) . '" />',
        '<meta name="twitter:description" content="' . $e($m['description']) . '" />',
        '<meta name="twitter:image" content="' . $e($image) . '" />',
    );
    $block[] = $m['noindex']
        ? '<meta name="robots" content="noindex, nofollow" data-seo' . (empty($m['lock']) ? '' : ' data-seo-lock') . ' />'
        : '<link rel="canonical" href="' . $e($url) . '" data-seo />';
    foreach ($m['jsonLd'] as $data) {
        $block[] = '<script type="application/ld+json" data-seo>' . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) . '</script>';
    }
    $pos = stripos($html, '</head>');
    if ($pos !== false) {
        $html = substr($html, 0, $pos) . '    ' . implode("\n    ", $block) . "\n  " . substr($html, $pos);
    }

    // ملخص نصي داخل <noscript> (الحقول القادمة من الكتالوج تُهرَّب هنا)
    if ($m['noscript'] !== '') {
        $summary = '<div dir="rtl">' . $m['noscript'] . '</div>';
        $html = preg_replace_callback('#<noscript>.*?</noscript>#su', function () use ($summary) {
            return '<noscript>' . $summary . '</noscript>';
        }, $html, 1);
    }
    return $html;
}

function iris_seo_serve($route)
{
    ini_set('display_errors', '0');
    $method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
    if ($method !== 'GET' && $method !== 'HEAD') {
        http_response_code(405);
        header('Allow: GET, HEAD');
        exit;
    }
    // ترويسات الأمان (nosniff، CSP…) يضيفها .htaccess لكل استجابة؛ تكرارها هنا يرسلها مرتين
    header('Cache-Control: no-cache');
    header_remove('X-Powered-By');

    if ($route === 'robots') {
        iris_seo_robots();
    }
    if ($route === 'sitemap') {
        iris_seo_sitemap();
    }
    iris_seo_page();
}

function iris_seo_robots()
{
    header('Content-Type: text/plain; charset=utf-8');
    $site = iris_seo_site_url();
    if ($site === '') {
        // النطاق الحقيقي لم يُضبط بعد (api/config.php ← site_url): لا فهرسة للعناوين المؤقتة
        echo "# site_url غير مضبوط في api/config.php — الفهرسة متوقفة عمداً حتى يُضبط النطاق\nUser-agent: *\nDisallow: /\n";
        exit;
    }
    // /api/ ممنوع على الزواحف عدا الكتالوج: Googlebot يحتاجه ليعرض الصفحة كما يراها الزائر
    echo "User-agent: *\nDisallow: /admin\nDisallow: /api/\nAllow: /api/index.php?r=catalog$\n\nSitemap: " . $site . "/sitemap.xml\n";
    exit;
}

function iris_seo_xml($s)
{
    return htmlspecialchars((string) $s, ENT_XML1 | ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function iris_seo_sitemap()
{
    $configured = false;
    $origin = iris_seo_origin($configured);
    $catalog = iris_catalog();
    list($cats, $products) = iris_seo_visible(is_array($catalog) ? $catalog : array());
    $cfg = iris_seo_pages();
    $lastmod = '';
    if (is_array($catalog) && !empty($catalog['updatedAt']) && preg_match('/^\d{4}-\d{2}-\d{2}/', (string) $catalog['updatedAt'], $d)) {
        $lastmod = '<lastmod>' . $d[0] . '</lastmod>';
    }
    header('Content-Type: application/xml; charset=utf-8');
    if (!$configured) {
        header('X-Robots-Tag: noindex');
    }
    $urls = array('<url><loc>' . iris_seo_xml($origin . '/') . '</loc>' . $lastmod . '</url>');
    foreach (array_keys($cfg['pages']) as $p) {
        $urls[] = '<url><loc>' . iris_seo_xml($origin . $p) . '</loc></url>';
    }
    foreach ($cats as $c) {
        $img = !empty($c['image']) ? '<image:image><image:loc>' . iris_seo_xml(iris_seo_abs($origin, $c['image'])) . '</image:loc></image:image>' : '';
        $urls[] = '<url><loc>' . iris_seo_xml($origin . '/collections/' . rawurlencode($c['slug'])) . '</loc>' . $lastmod . $img . '</url>';
    }
    foreach ($products as $p) {
        $img = '';
        $imgs = array_merge(array(isset($p['image']) ? $p['image'] : ''), isset($p['gallery']) && is_array($p['gallery']) ? $p['gallery'] : array());
        $seen = array();
        foreach ($imgs as $i) {
            if ($i !== '' && !isset($seen[$i]) && count($seen) < 5) {
                $seen[$i] = true;
                $img .= '<image:image><image:loc>' . iris_seo_xml(iris_seo_abs($origin, $i)) . '</image:loc></image:image>';
            }
        }
        $urls[] = '<url><loc>' . iris_seo_xml($origin . '/products/' . rawurlencode($p['slug'])) . '</loc>' . $lastmod . $img . '</url>';
    }
    echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
        . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' . "\n"
        . implode("\n", $urls) . "\n</urlset>\n";
    exit;
}

function iris_seo_page()
{
    $index = dirname(__DIR__, 2) . '/index.html';
    if (!is_file($index)) {
        http_response_code(500);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'index.html not found';
        exit;
    }
    $html = (string) file_get_contents($index);
    header('Content-Type: text/html; charset=utf-8');
    try {
        $path = iris_seo_request_path();
        $site = iris_seo_site_url();
        // النطاق المعتمد وحده: www أو العنوان المؤقت يحوّل إليه بدل تكرار المحتوى
        if ($site !== '' && isset($_SERVER['HTTP_HOST'])) {
            $want = strtolower((string) parse_url($site, PHP_URL_HOST));
            $have = strtolower(preg_replace('/:\d+$/', '', (string) $_SERVER['HTTP_HOST']));
            if ($want !== '' && $have !== $want) {
                header('Location: ' . $site . iris_seo_encode_path($path), true, 301);
                exit;
            }
        }
        $configured = false;
        $origin = iris_seo_origin($configured);
        $meta = iris_seo_meta($path, iris_catalog(), $origin);
        if (!$configured) {
            // النطاق غير مضبوط: كل الصفحات noindex، و data-seo-lock يمنع الواجهة من رفعه عند التنقل
            $meta['noindex'] = true;
            $meta['lock'] = true;
        }
        $out = iris_seo_render($html, $meta, $origin);
        if ($meta['status'] !== 200) {
            http_response_code($meta['status']);
        }
        if ($meta['noindex']) {
            header('X-Robots-Tag: noindex, nofollow');
        }
        echo $out;
    } catch (Exception $e) {
        error_log('[iris-seo] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
        echo $html;
    } catch (Throwable $e) {
        error_log('[iris-seo] ' . $e->getMessage());
        echo $html;
    }
    exit;
}

