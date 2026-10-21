<?php
/**
 * إعادة ضبط المتجر (للمالك فقط): كلمة المرور + العبارة المكتوبة حرفياً + حد للمحاولات.
 * قبل الحذف تُحفظ نسخة نصية (الكتالوج والطلبات والفريق) في data/backups/ للطوارئ فقط.
 * حساب المالك وكلمة مروره لا يُمسّان. نفس منطق server/core/reset.ts.
 */

if (!defined('IRIS_API')) {
    http_response_code(403);
    exit;
}

define('IRIS_RESET_PHRASE', 'إعادة ضبط المتجر');

/** متجر فارغ تماماً جاهز لإدخال البيانات. */
function iris_blank_catalog()
{
    $config = iris_config();
    return array(
        'categories' => array(),
        'products' => array(),
        'settings' => array(
            'shippingFee' => (int) $config['shipping_fee'],
            'freeShippingThreshold' => (int) $config['free_shipping_threshold'],
            'coupons' => (object) array(),
            'whatsapp' => '',
            'instagram' => '',
            'heroImage' => '',
        ),
        'updatedAt' => gmdate('c'),
    );
}

function route_system_reset()
{
    iris_require_owner();
    if (!iris_rate_limit('reset', 5, 15 * 60, false)) {
        iris_fail('محاولات كثيرة. حاول بعد 15 دقيقة.', 429);
    }
    $body = iris_body();
    $mode = isset($body['mode']) && $body['mode'] === 'starter' ? 'starter' : 'empty';
    $confirm = trim(isset($body['confirm']) && is_string($body['confirm']) ? $body['confirm'] : '');
    if ($confirm !== IRIS_RESET_PHRASE) {
        iris_rate_limit('reset', 5, 15 * 60, true);
        iris_fail('اكتب العبارة «' . IRIS_RESET_PHRASE . '» كما هي للتأكيد.');
    }
    $password = isset($body['password']) && is_string($body['password']) ? $body['password'] : '';
    if (!iris_password_matches($password)) {
        iris_rate_limit('reset', 5, 15 * 60, true);
        usleep(400000);
        // 403 لا 401: الجلسة ما زالت صالحة، الخطأ في كلمة المرور المكتوبة فقط
        iris_fail('كلمة المرور غير صحيحة.', 403);
    }
    iris_rate_reset('reset');

    iris_locked(function () use ($mode) {
        $dir = IRIS_DATA_DIR . '/backups';
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        iris_write('backups/reset-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(2)), array(
            'at' => gmdate('c'),
            'mode' => $mode,
            'catalog' => iris_read('catalog'),
            'orders' => iris_read('orders'),
            'users' => iris_read('users'),
        ));
        foreach (array('orders', 'users', 'instagram') as $name) {
            @unlink(iris_data_path($name));
        }
        iris_delete_uploads();
        if ($mode === 'empty') {
            iris_write('catalog', iris_blank_catalog());
        } else {
            @unlink(iris_data_path('catalog'));
        }
    });
    iris_ok(array('catalog' => iris_catalog(), 'mode' => $mode));
}
