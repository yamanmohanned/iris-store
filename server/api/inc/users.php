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
    if ($_SESSION['uid'] === 'owner') {
        return iris_owner_profile();
    }
    foreach (iris_staff_list() as $u) {
        if ($u['id'] === $_SESSION['uid']) {
            if (empty($u['active']) || (int) $u['ver'] !== (int) (isset($_SESSION['ver']) ? $_SESSION['ver'] : -1)) {
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
        if (($index < 0 || $password !== '') && iris_mb_len($password) < 8) {
            iris_fail('كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
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
