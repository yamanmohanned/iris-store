<?php
/**
 * فريق العمل والصلاحيات — نفس قواعد src/lib/permissions.ts و server/core/auth.ts.
 * المالك من config.php ويملك كل شيء؛ الموظفون في data/users.php بكلمات مرور مشفّرة (password_hash).
 * الموظف يُقرأ من الملف في كل طلب، فتغيير صلاحياته يسري فوراً، وإيقافه أو تغيير كلمة مروره
 * يرفع رقم الإصدار ver فتنتهي جلساته القديمة.
 */

if (!defined('IRIS_API')) {
    http_response_code(403);
    exit;
}

function iris_sections()
{
    return array('orders', 'products', 'categories', 'settings');
}

function iris_clean_permissions($input)
{
    $out = array();
    foreach (iris_sections() as $s) {
        $v = is_array($input) && isset($input[$s]) ? $input[$s] : 'none';
        $out[$s] = ($v === 'view' || $v === 'edit') ? $v : 'none';
    }
    return $out;
}

/** هل تسمح الصلاحيات بهذا المستوى؟ (التعديل يتضمن العرض) */
function iris_allows(array $perms, $section, $level)
{
    $have = isset($perms[$section]) ? $perms[$section] : 'none';
    return $level === 'view' ? $have !== 'none' : $have === 'edit';
}

function iris_owner_profile()
{
    $config = iris_config();
    $full = array();
    foreach (iris_sections() as $s) {
        $full[$s] = 'edit';
    }
    return array(
        'id' => 'owner',
        'username' => strtolower((string) $config['admin_username']),
        'name' => (string) (isset($config['admin_name']) ? $config['admin_name'] : 'مالك المتجر'),
        'title' => 'المالك',
        'role' => 'owner',
        'permissions' => $full,
        // للمالك وحده: نسخة PHP على الاستضافة وهل فيها إصلاح PHP2Shell (تنبيه في لوحة الإدارة)
        'runtime' => array('php' => PHP_VERSION, 'phpFix' => iris_php_fix_status()),
    );
}

function iris_staff_list()
{
    $data = iris_read('users', array('users' => array()));
    return isset($data['users']) && is_array($data['users']) ? $data['users'] : array();
}

function iris_staff_store(array $users)
{
    iris_write('users', array('users' => array_values($users)));
}

function iris_staff_profile(array $u)
{
    return array(
        'id' => $u['id'],
        'username' => $u['username'],
        'name' => $u['name'],
        'title' => $u['title'] !== '' ? $u['title'] : 'موظف',
        'role' => 'staff',
        'permissions' => iris_clean_permissions(isset($u['permissions']) ? $u['permissions'] : array()),
    );
}

/** الموظف كما تعرضه صفحة فريق العمل (بلا كلمة المرور). */
function iris_staff_public(array $u)
{
    unset($u['hash'], $u['ver']);
    $u['active'] = !empty($u['active']);
    $u['permissions'] = iris_clean_permissions(isset($u['permissions']) ? $u['permissions'] : array());
    return $u;
}

function iris_staff_public_list()
{
    return array_map('iris_staff_public', iris_staff_list());
}

/** أقصى عمر للجلسة مهما استُخدمت (يوافق عمر ملف تعريف الارتباط). */
define('IRIS_SESSION_MAX_AGE', 14 * 24 * 3600);

/** إصدار كلمة مرور المالك: يرتفع مع كل تغيير من اللوحة فتنتهي جلساته الأخرى. */
function iris_owner_ver()
{
    $auth = iris_read('auth');
    return is_array($auth) && isset($auth['ver']) ? (int) $auth['ver'] : 0;
}

/**
 * سبب رفض كلمة مرور جديدة أو null — نفس passwordProblem في src/lib/permissions.ts.
 */
function iris_password_problem($password, $username = '')
{
    $len = iris_mb_len($password);
    if ($len < 8) {
        return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.';
    }
    if ($len > 128) {
        return 'كلمة المرور أطول من 128 حرفاً.';
    }
    $lower = function_exists('mb_strtolower') ? mb_strtolower($password, 'UTF-8') : strtolower($password);
    $common = array(
        'password', 'password1', 'password12', 'password123', 'passw0rd', 'p@ssw0rd', 'p@ssword',
        '12345678', '123456789', '1234567890', '0123456789', '11111111', '00000000', '12341234', '12121212',
        '11223344', '12344321', '87654321', 'qwertyui', 'qwerty12', 'qwerty123', 'qwertyuiop', '1q2w3e4r',
        '1q2w3e4r5t', '1qaz2wsx', 'qazwsxedc', 'asdfghjk', 'asdf1234', 'zxcvbnm1', 'iloveyou', 'iloveyou1',
        'admin123', 'admin1234', 'admin12345', 'administrator', 'welcome1', 'welcome123', 'letmein1',
        'changeme', 'change-me', 'demo1234', 'abc12345', 'abcd1234', 'aa123456', 'a1234567', '12345abc',
        'iris1234', 'iris12345', 'irisstore', 'iris-store', 'irisstore1', 'store123', 'store1234', 'shop1234',
        'baghdad1', 'baghdad123', 'iraq1234', 'iraq12345', 'football', 'superman', 'sunshine', 'princess',
        'trustno1', 'dragon123', 'monkey123', 'master123',
    );
    if (in_array($lower, $common, true)) {
        return 'كلمة المرور هذه شائعة ويسهل تخمينها. اختر كلمة أقوى.';
    }
    if (preg_match('/^(.)\1+$/us', $password)) {
        return 'كلمة المرور لا يصح أن تكون حرفاً واحداً مكرراً.';
    }
    if (iris_is_sequence($lower)) {
        return 'كلمة المرور لا يصح أن تكون أرقاماً أو حروفاً متتالية.';
    }
    $user = strtolower(trim((string) $username));
    if (strlen($user) >= 3 && strpos($lower, $user) !== false) {
        return 'كلمة المرور لا يصح أن تحتوي اسم الدخول.';
    }
    return null;
}

/** أرقام أو حروف لاتينية متتالية صعوداً أو نزولاً (12345678، abcdefgh، 98765432). */
function iris_is_sequence($s)
{
    if (!preg_match('/^[a-z0-9]+$/', $s)) {
        return false;
    }
    $step = function ($a, $b) {
        if ($a === '9' && $b === '0') {
            return 1;
        }
        if ($a === '0' && $b === '9') {
            return -1;
        }
        return ord($b) - ord($a);
    };
    $first = $step($s[0], $s[1]);
    if ($first !== 1 && $first !== -1) {
        return false;
    }
    for ($i = 1; $i < strlen($s) - 1; $i++) {
        if ($step($s[$i], $s[$i + 1]) !== $first) {
            return false;
        }
    }
    return true;
}

/** الحساب صاحب الجلسة (المالك أو موظف نشط) أو null. لا يُنشئ جلسة للزوار العاديين. */
function iris_current_user()
{
    if (empty($_COOKIE['IRISADMIN'])) {
        return null;
    }
    iris_session_start();
    if (empty($_SESSION['uid']) || !is_string($_SESSION['uid'])) {
        return null;
    }
    // عمر مطلق للجلسة حتى لو بقي ملفها على الخادم أو سُرق ملف تعريف الارتباط
    if (empty($_SESSION['since']) || time() - (int) $_SESSION['since'] > IRIS_SESSION_MAX_AGE) {
        return null;
    }
    $sessionVer = (int) (isset($_SESSION['ver']) ? $_SESSION['ver'] : -1);
    if ($_SESSION['uid'] === 'owner') {
        return $sessionVer === iris_owner_ver() ? iris_owner_profile() : null;
    }
    foreach (iris_staff_list() as $u) {
        if ($u['id'] === $_SESSION['uid']) {
            if (empty($u['active']) || (int) $u['ver'] !== $sessionVer) {
                return null;
            }
            return iris_staff_profile($u);
        }
    }
    return null;
}

function iris_require_user()
{
    iris_require_same_origin();
    $user = iris_current_user();
    if (!$user) {
        iris_fail('انتهت الجلسة. يرجى تسجيل الدخول من جديد.', 401);
    }
    return $user;
}

function iris_deny()
{
    iris_fail('لا تملك صلاحية لهذا الإجراء. اطلبها من مالك المتجر.', 403);
}

function iris_require_access($section, $level)
{
    $user = iris_require_user();
    if (!iris_allows($user['permissions'], $section, $level)) {
        iris_deny();
    }
    return $user;
}

function iris_require_owner()
{
    $user = iris_require_user();
    if ($user['role'] !== 'owner') {
        iris_deny();
    }
    return $user;
}

/** حفظ الكتالوج ورفع الملفات: يكفي تعديل المنتجات أو الأقسام أو الإعدادات. */
function iris_require_catalog_edit()
{
    $user = iris_require_user();
    foreach (array('products', 'categories', 'settings') as $s) {
        if (iris_allows($user['permissions'], $s, 'edit')) {
            return $user;
        }
    }
    iris_deny();
    return null;
}

/* ═════════════ مسارات فريق العمل (للمالك فقط) ═════════════ */

function route_users_list()
{
    iris_require_owner();
    $owner = iris_owner_profile();
    iris_ok(array('users' => iris_staff_public_list(), 'owner' => array('username' => $owner['username'])));
}

function route_users_save()
{
    iris_require_owner();
    $body = iris_body();
    $in = isset($body['user']) && is_array($body['user']) ? $body['user'] : array();
    $users = iris_locked(function () use ($in) {
        $users = iris_staff_list();
        $id = isset($in['id']) && is_string($in['id']) ? $in['id'] : '';
        $index = -1;
        if ($id !== '') {
            foreach ($users as $i => $u) {
                if ($u['id'] === $id) {
                    $index = $i;
                }
            }
            if ($index < 0) {
                iris_fail('الموظف غير موجود.', 404);
            }
        }

        $username = strtolower(trim(isset($in['username']) && is_string($in['username']) ? $in['username'] : ''));
        if (!preg_match('/^[a-z0-9._-]{3,32}$/', $username)) {
            iris_fail('اسم الدخول من 3 إلى 32 حرفاً إنجليزياً صغيراً أو رقماً أو (. _ -).');
        }
        $owner = iris_owner_profile();
        if ($username === $owner['username']) {
            iris_fail('اسم الدخول هذا محجوز لحساب المالك.');
        }
        foreach ($users as $u) {
            if ($u['username'] === $username && $u['id'] !== $id) {
                iris_fail('اسم الدخول مستخدم لموظف آخر.');
            }
        }
        $name = iris_str(isset($in['name']) ? $in['name'] : '', 60, false);
        if (iris_mb_len($name) < 2) {
            iris_fail('اسم الموظف مطلوب (حتى 60 حرفاً).');
        }
        $title = iris_str(isset($in['title']) ? $in['title'] : '', 40, false, 'المسمى الوظيفي');
        $password = isset($in['password']) && is_string($in['password']) ? $in['password'] : '';
        if ($index < 0 || $password !== '') {
            $problem = iris_password_problem($password, $username);
            if ($problem !== null) {
                iris_fail($problem);
            }
        }
        $active = !(isset($in['active']) && $in['active'] === false);
        $permissions = iris_clean_permissions(isset($in['permissions']) ? $in['permissions'] : array());
        $now = gmdate('c');

        if ($index >= 0) {
            $u = $users[$index];
            $kick = $password !== '' || (!empty($u['active']) && !$active);
            $u['username'] = $username;
            $u['name'] = $name;
            $u['title'] = $title;
            $u['permissions'] = $permissions;
            $u['active'] = $active;
            $u['updatedAt'] = $now;
            if ($password !== '') {
                $u['hash'] = password_hash($password, PASSWORD_DEFAULT);
            }
            if ($kick) {
                $u['ver'] = (int) $u['ver'] + 1;
            }
            $users[$index] = $u;
        } else {
            if (count($users) >= 50) {
                iris_fail('وصلت للحد الأقصى لفريق العمل (50 حساباً).');
            }
            $users[] = array(
                'id' => 'u-' . bin2hex(random_bytes(6)),
                'username' => $username,
                'name' => $name,
                'title' => $title,
                'permissions' => $permissions,
                'active' => $active,
                'createdAt' => $now,
                'ver' => 1,
                'hash' => password_hash($password, PASSWORD_DEFAULT),
            );
        }
        iris_staff_store($users);
        return array_map('iris_staff_public', $users);
    });
    iris_ok(array('users' => $users));
}

function route_users_delete()
{
    iris_require_owner();
    $body = iris_body();
    $id = isset($body['id']) && is_string($body['id']) ? $body['id'] : '';
    $users = iris_locked(function () use ($id) {
        $users = iris_staff_list();
        $rest = array_values(array_filter($users, function ($u) use ($id) {
            return $u['id'] !== $id;
        }));
        if (count($rest) === count($users)) {
            iris_fail('الموظف غير موجود.', 404);
        }
        iris_staff_store($rest);
        return array_map('iris_staff_public', $rest);
    });
    iris_ok(array('users' => $users));
}
