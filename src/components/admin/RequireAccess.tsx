import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import type { Access, Section } from '@/lib/permissions';
import { useAdminAuth } from '@/state/adminAuth';

/**
 * يعرض الصفحة فقط لمن يملك الصلاحية (الخادم يرفض الطلبات أصلاً؛ هذا لتجربة واضحة).
 * owner = للمالك وحده (فريق العمل، ربط إنستغرام، إعادة الضبط).
 */
export function RequireAccess({
  section,
  level = 'view',
  owner,
  children,
}: {
  section?: Section;
  level?: Exclude<Access, 'none'>;
  owner?: boolean;
  children: ReactNode;
}) {
  const { can, isOwner } = useAdminAuth();
  const allowed = owner ? isOwner : section ? can(section, level) : true;
  return allowed ? <>{children}</> : <NoAccess ownerOnly={owner} />;
}

function NoAccess({ ownerOnly }: { ownerOnly?: boolean }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blush-surface text-imperial-burgundy">
        <Icon name="lock" className="text-[32px]" />
      </span>
      <h1 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">لا تملك صلاحية لهذه الصفحة</h1>
      <p className="font-body-sm text-body-sm text-muted-rosewood">
        {ownerOnly ? 'هذه الصفحة لمالك المتجر وحده.' : 'اطلب من مالك المتجر منحك الصلاحية من صفحة «فريق العمل».'}
      </p>
      <Link to="/admin" className="mt-2 font-label-lg text-label-lg text-imperial-burgundy underline underline-offset-4">
        العودة إلى النظرة العامة
      </Link>
    </main>
  );
}
