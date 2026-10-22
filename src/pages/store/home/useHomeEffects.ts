import { useEffect, type RefObject } from 'react';
import { findProductByName } from '@/data/catalog';
import { useLegacy } from '@/hooks/useLegacy';
import { useCart } from '@/state/cart';
import { useToast } from '@/state/toast';

/**
 * سلوكيات الصفحة الرئيسية المنقولة من سكربت Stitch الأصلي:
 * ken-burns، parallax، رف المنتجات (أسهم + سحب + مؤشر تقدّم)،
 * أكورديون الأسئلة، وإضافة القطع إلى السلة بحركة الجسيم الطائر.
 */
export function useHomeEffects(root: RefObject<HTMLElement | null>): void {
  const cart = useCart();
  const { show } = useToast();

  // أكورديون الأسئلة الشائعة: يُفتح عنصر واحد فقط
  useLegacy({
    toggleFaq(btn) {
      const parent = btn.parentElement;
      const body = parent?.querySelector('.faq-body');
      const icon = parent?.querySelector('.faq-icon');
      if (!parent || !body) return;
      const wasHidden = body.classList.contains('hidden');
      const accordion = document.getElementById('faq-accordion');
      accordion?.querySelectorAll('.faq-body').forEach((el) => el.classList.add('hidden'));
      accordion?.querySelectorAll('.faq-icon').forEach((el) => el.classList.remove('rotate-180'));
      if (wasHidden) {
        body.classList.remove('hidden');
        icon?.classList.add('rotate-180');
      }
    },
  });

  // Ken-Burns + parallax
  useEffect(() => {
    const kb = document.getElementById('hero-kenburns-img');
    const raf = requestAnimationFrame(() => {
      if (kb) kb.style.transform = 'scale(1)';
    });

    const lattice = document.getElementById('parallax-lattice');
    const imageZone = document.getElementById('hero-image-zone');
    const textZone = document.getElementById('hero-text-zone');
    const onScroll = () => {
      const y = window.scrollY;
      if (y >= 1200) return;
      if (lattice) lattice.style.transform = `translateY(${y * 0.2}px)`;
      if (window.innerWidth >= 1024) {
        if (imageZone) imageZone.style.transform = `translateY(${y * -0.12}px)`;
        if (textZone) textZone.style.transform = `translateY(${y * -0.04}px)`;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // رف المنتجات
  useEffect(() => {
    const rail = document.getElementById('product-rail');
    if (!rail) return;
    const left = document.getElementById('scroll-left');
    const right = document.getElementById('scroll-right');
    const progress = document.getElementById('rail-progress-indicator');

    const update = () => {
      if (!progress) return;
      const max = rail.scrollWidth - rail.clientWidth;
      if (max <= 0) return;
      const pct = Math.min(100, Math.max(12, (Math.abs(rail.scrollLeft) / max) * 100));
      progress.style.width = `${pct}%`;
    };
    const goLeft = () => rail.scrollBy({ left: -310, behavior: 'smooth' });
    const goRight = () => rail.scrollBy({ left: 310, behavior: 'smooth' });

    let down = false;
    let startX = 0;
    let startScroll = 0;
    const onDown = (e: MouseEvent) => {
      down = true;
      startX = e.pageX - rail.offsetLeft;
      startScroll = rail.scrollLeft;
    };
    const onUp = () => {
      down = false;
    };
    const onMove = (e: MouseEvent) => {
      if (!down) return;
      e.preventDefault();
      rail.scrollLeft = startScroll - (e.pageX - rail.offsetLeft - startX) * 1.5;
    };

    rail.addEventListener('scroll', update, { passive: true });
    left?.addEventListener('click', goLeft);
    right?.addEventListener('click', goRight);
    rail.addEventListener('mousedown', onDown);
    rail.addEventListener('mouseleave', onUp);
    rail.addEventListener('mouseup', onUp);
    rail.addEventListener('mousemove', onMove);
    update();
    return () => {
      rail.removeEventListener('scroll', update);
      left?.removeEventListener('click', goLeft);
      right?.removeEventListener('click', goRight);
      rail.removeEventListener('mousedown', onDown);
      rail.removeEventListener('mouseleave', onUp);
      rail.removeEventListener('mouseup', onUp);
      rail.removeEventListener('mousemove', onMove);
    };
  }, []);

  // إضافة إلى السلة (تفويض أحداث على الصفحة)
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as Element).closest<HTMLElement>('.add-to-cart-trigger');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const product = findProductByName(btn.dataset.name);
      if (!product) {
        show('هذه القطعة غير متاحة حالياً', 'error');
        return;
      }
      if (product.stock <= 0) {
        show('نفدت هذه القطعة مؤقتاً', 'error');
        return;
      }

      // جسيم طائر نحو أيقونة الحقيبة
      const cartBtn = document.querySelector<HTMLElement>('header button[aria-label="حقيبة التسوق"]');
      const from = btn.getBoundingClientRect();
      const to = cartBtn?.getBoundingClientRect() ?? { left: 40, top: 40, width: 24, height: 24 };
      const flyer = document.createElement('div');
      flyer.className = 'flying-particle';
      Object.assign(flyer.style, {
        width: '44px',
        height: '44px',
        left: `${from.left + from.width / 2 - 22}px`,
        top: `${from.top + from.height / 2 - 22}px`,
        backgroundImage: `url(${product.image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '2px solid #C9A24B',
        opacity: '1',
      });
      document.body.appendChild(flyer);
      requestAnimationFrame(() => {
        flyer.style.left = `${to.left + to.width / 2 - 14}px`;
        flyer.style.top = `${to.top + to.height / 2 - 14}px`;
        flyer.style.transform = 'scale(0.3) rotate(360deg)';
        flyer.style.opacity = '0.7';
      });
      window.setTimeout(() => {
        flyer.remove();
        cart.add(product.id, 1, { metal: product.metal });
        cart.openDrawer();
      }, 750);
    };
    host.addEventListener('click', onClick, true);
    return () => host.removeEventListener('click', onClick, true);
  }, [root, cart, show]);
}
