'use client'

import { ShieldCheck, FileText, RotateCcw, Truck } from 'lucide-react'
import { useLocale } from '@/components/geo/GeoLocaleProvider'
import type { Lang } from '@/lib/currencies'

type Section = { h: string; b: string }
type PolicyContent = { title: string; updated: string; intro: string; sections: Section[] }

type PolicyKey = 'privacy' | 'terms' | 'refund' | 'delivery'

const ICONS: Record<PolicyKey, React.ReactNode> = {
  privacy: <ShieldCheck className="h-6 w-6" />,
  terms: <FileText className="h-6 w-6" />,
  refund: <RotateCcw className="h-6 w-6" />,
  delivery: <Truck className="h-6 w-6" />,
}

const CONTENT: Record<PolicyKey, Partial<Record<Lang, PolicyContent>>> = {
  privacy: {
    ar: {
      title: 'سياسة الخصوصية',
      updated: 'آخر تحديث: 1 كانون الثاني 2026',
      intro: 'نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.',
      sections: [
        { h: 'المعلومات التي نجمعها', b: 'نجمع فقط البيانات اللازمة لتنفيذ طلبك، مثل معرف اللاعب (UID) ورقم الطلب وبيانات الدفع الأساسية.' },
        { h: 'كيف نستخدم بياناتك', b: 'نستخدم بياناتك لمعالجة الطلبات وتسليم الماس وتقديم الدعم الفني.' },
        { h: 'مشاركة البيانات', b: 'لا نبيع بياناتك ولا نشاركها مع أطراف ثالثة إلا للجهات الضرورية لمعالجة الدفع.' },
        { h: 'الأمان', b: 'نستخدم تشفيرًا قياسيًا لحماية بياناتك أثناء النقل والتخزين.' },
        { h: 'حقوقك', b: 'يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو حذفها في أي وقت.' },
        { h: 'ملفات تعريف الارتباط', b: 'قد نستخدم ملفات تعريف الارتباط لتحسين تجربة التصفح وتذكّر تفضيلاتك.' },
        { h: 'التواصل', b: 'لأي استفسار حول هذه السياسة، تواصل معنا عبر تيليجرام.' },
      ],
    },
    en: {
      title: 'Privacy Policy',
      updated: 'Last updated: January 1, 2026',
      intro: 'FF Diamond LLC, an independent top-up service based in the United States, collects and processes only the information needed to provide support, process orders, and protect the service. We are not affiliated with or endorsed by Garena unless expressly stated in a separate written notice.',
      sections: [
        { h: 'Information we collect', b: 'We collect the Player ID, order details, selected payment method, and optional contact details you submit. We do not ask for your Free Fire password or account credentials.' },
        { h: 'How we use your data', b: 'We use your data to process orders, deliver diamonds, provide support and improve your experience.' },
        { h: 'Data sharing', b: 'We never sell your data. We only share it with parties strictly necessary to process payments.' },
        { h: 'Security', b: 'We use HTTPS, server-side validation, restricted administrative access, and payment-provider controls. No online service can guarantee absolute security.' },
        { h: 'Your rights', b: 'You may request access to, correction or deletion of your data at any time.' },
        { h: 'Cookies', b: 'We may use cookies to improve browsing and remember your language and currency preferences.' },
        { h: 'Contact', b: 'For any questions about this policy, reach out via Telegram or our official support email.' },
      ],
    },
    fr: {
      title: 'Politique de confidentialité',
      updated: 'Dernière mise à jour: 1 janvier 2026',
      intro: 'Nous respectons votre vie privée et nous engageons à protéger vos données personnelles.',
      sections: [
        { h: 'Informations collectées', b: 'Nous collectons uniquement les données nécessaires à votre commande : ID joueur, numéro de commande et informations de paiement.' },
        { h: 'Utilisation des données', b: 'Nous utilisons vos données pour traiter les commandes, livrer les diamants et fournir le support.' },
        { h: 'Partage des données', b: 'Nous ne vendons jamais vos données. Elles sont partagées uniquement avec les parties nécessaires au traitement.' },
        { h: 'Sécurité', b: 'Nous utilisons un chiffrement standard pour protéger vos données en transit et au repos.' },
        { h: 'Vos droits', b: 'Vous pouvez demander l\'accès, la correction ou la suppression de vos données à tout moment.' },
        { h: 'Cookies', b: 'Nous utilisons des cookies pour améliorer la navigation et mémoriser vos préférences.' },
        { h: 'Contact', b: 'Pour toute question, contactez-nous via Telegram ou notre email de support.' },
      ],
    },
    es: {
      title: 'Política de privacidad',
      updated: 'Última actualización: 1 enero 2026',
      intro: 'Respetamos tu privacidad y nos comprometemos a proteger tus datos personales.',
      sections: [
        { h: 'Información recopilada', b: 'Solo recopilamos los datos necesarios para tu pedido: ID de jugador, número de pedido e información de pago.' },
        { h: 'Uso de los datos', b: 'Usamos tus datos para procesar pedidos, entregar diamantes y proporcionar soporte.' },
        { h: 'Compartir datos', b: 'Nunca vendemos tus datos. Solo se comparten con las partes necesarias para el procesamiento.' },
        { h: 'Seguridad', b: 'Usamos cifrado estándar para proteger tus datos en tránsito y en reposo.' },
        { h: 'Tus derechos', b: 'Puedes solicitar acceso, corrección o eliminación de tus datos en cualquier momento.' },
        { h: 'Cookies', b: 'Podemos usar cookies para mejorar la navegación y recordar tus preferencias.' },
        { h: 'Contacto', b: 'Para cualquier pregunta, contáctanos via Telegram o nuestro email de soporte.' },
      ],
    },
  },
  terms: {
    ar: {
      title: 'شروط الاستخدام',
      updated: 'آخر تحديث: 1 كانون 2026',
      intro: 'باستخدامك متجرنا فإنك توافق على هذه الشروط.',
      sections: [
        { h: 'قبول الشروط', b: 'باستخدامك الموقع فإنك تقر بأنك اطلعت على هذه الشروط وتوافق عليها.' },
        { h: 'المستخدمون', b: 'يجب أن يكون عمرك 13 عامًا على الأقل لاستخدام هذا المتجر.' },
        { h: 'الطلبات الصحيحة', b: 'يلتزم العميل بإدخال أرقام معرّف اللاعب (UID) بشكل صحيح.' },
        { h: 'سوء الاستخدام', b: 'يحظر استخدام الموقع بطريقة غير قانونية أو محاولة التلاعب بالأسعار.' },
        { h: 'الملكية الفكرية', b: 'جميع محتويات الموقع مملوكة لنا ولا يجوز استخدامها دون إذن.' },
        { h: 'تعديل الخدمة', b: 'نحتفظ بالحق في تعديل الأسعار أو الباقات في أي وقت.' },
        { h: 'إخلاء المسؤولية', b: 'نقدم الخدمة "كما هي" ونسعى دائمًا لضمان الدقة والجودة.' },
      ],
    },
    en: {
      title: 'Terms of Use',
      updated: 'Last updated: January 1, 2026',
      intro: 'By using our store you agree to these terms. Please read them carefully before making any purchase.',
      sections: [
        { h: 'Acceptance of terms', b: 'By using the site you confirm you have read and agree to these terms.' },
        { h: 'Eligibility', b: 'You must be at least 13 years old to use the store, or have your parent or guardian permission.' },
        { h: 'Accurate orders', b: 'You are responsible for entering correct Player ID and server details.' },
        { h: 'Acceptable use', b: 'Any illegal or unauthorized use of the site is prohibited.' },
        { h: 'Intellectual property', b: 'All content on the site is owned by us and may not be used without permission.' },
        { h: 'Changes to the service', b: 'We may update prices, packages or site terms at any time.' },
        { h: 'Disclaimer', b: 'We provide the service "as is" and always strive for accuracy and quality.' },
      ],
    },
    fr: {
      title: 'Conditions d\'utilisation',
      updated: 'Dernière mise à jour: 1 janvier 2026',
      intro: 'En utilisant notre boutique, vous acceptez ces conditions.',
      sections: [
        { h: 'Acceptation', b: 'En utilisant le site, vous confirmez avoir lu et accepté ces conditions.' },
        { h: 'Éligibilité', b: 'Vous devez avoir au moins 13 ans pour utiliser la boutique.' },
        { h: 'Commandes exactes', b: 'Vous êtes responsable de l\'exactitude de l\'ID joueur saisi.' },
        { h: 'Usage acceptable', b: 'Tout usage illégal ou non autorisé du site est interdit.' },
        { h: 'Propriété intellectuelle', b: 'Tout le contenu du site nous appartient et ne peut être utilisé sans permission.' },
        { h: 'Modifications', b: 'Nous pouvons mettre à jour les prix, packs ou conditions à tout moment.' },
        { h: 'Avertissement', b: 'Nous fournissons le service "tel quel" et visons toujours la qualité.' },
      ],
    },
    es: {
      title: 'Términos de uso',
      updated: 'Última actualización: 1 enero 2026',
      intro: 'Al usar nuestra tienda aceptas estos términos.',
      sections: [
        { h: 'Aceptación', b: 'Al usar el sitio confirmas haber leído y aceptado estos términos.' },
        { h: 'Elegibilidad', b: 'Debes tener al menos 13 años para usar la tienda.' },
        { h: 'Pedidos correctos', b: 'Eres responsable de ingresar el ID de jugador correcto.' },
        { h: 'Uso aceptable', b: 'Cualquier uso ilegal o no autorizado del sitio está prohibido.' },
        { h: 'Propiedad intelectual', b: 'Todo el contenido del sitio nos pertenece y no puede usarse sin permiso.' },
        { h: 'Cambios', b: 'Podemos actualizar precios, paquetes o términos en cualquier momento.' },
        { h: 'Aviso legal', b: 'Proporcionamos el servicio "tal cual" y siempre buscamos la calidad.' },
      ],
    },
  },
  refund: {
    ar: {
      title: 'سياسة الاسترداد',
      updated: 'آخر تحديث: 1 كانون 2026',
      intro: 'نهدف إلى رضاك الكامل. إذا واجهت أي مشكلة في طلبك، فإن استردادك معنا وفق الشروط التالية.',
      sections: [
        { h: 'التوصيل الفاشل', b: 'إذا لم تصل الماس خلال الوقت الموعود، يحق لك الاسترداد الكامل أو إعادة الإرسال.' },
        { h: 'معرّف خاطئ', b: 'إذا أدخلت معرّفًا خاطئًا، يجب أن تبلغنا فورًا قبل بدء التوصيل.' },
        { h: 'المسؤولية عن الأخطاء', b: 'لا نتحمل مسؤولية الأخطاء الناتجة عن إدخال معرّفات خاطئة.' },
        { h: 'عدم قابلية الاسترداد', b: 'بمجرد اكتمال توصيل الماس بنجاح لا يمكن استردادها.' },
        { h: 'رفض الطلبات', b: 'نحتفظ بحق رفض طلبات الاسترداد التي تخالف الشروط العامة.' },
        { h: 'كيف تطلب استردادًا', b: 'تواصل معنا عبر تيليجرام خلال 7 أيام من الطلب مع رقم الطلب.' },
      ],
    },
    en: {
      title: 'Refund Policy',
      updated: 'Last updated: January 1, 2026',
      intro: 'These rules apply to FF Diamond LLC orders and are subject to applicable consumer-protection laws in the jurisdictions where we operate.',
      sections: [
        { h: 'Failed delivery', b: 'If payment is received but the diamonds are not successfully delivered, you may request a full refund.' },
        { h: 'Wrong identifier', b: 'If you entered the wrong Player ID, notify us immediately before delivery begins. No refund is available after a successful top-up to the incorrect UID supplied by the customer.' },
        { h: 'Cancellation', b: 'You may request cancellation before the top-up is executed. Payment confirmation does not by itself mean the top-up has been executed.' },
        { h: 'User mistakes', b: 'We are not responsible for errors caused by incorrect details entered after the order is processed.' },
        { h: 'Non-refundable orders', b: 'Once diamonds are successfully delivered, orders are non-refundable due to their digital nature.' },
        { h: 'Rejected claims', b: 'We reserve the right to refuse refund claims that violate our general terms.' },
        { h: 'How to request a refund', b: 'Contact support with your order number and payment evidence. We review the request and initiate an approved refund; processing time varies by payment provider and no fixed timeframe is promised.' },
      ],
    },
    fr: {
      title: 'Politique de remboursement',
      updated: 'Dernière mise à jour: 1 janvier 2026',
      intro: 'Nous visons votre entière satisfaction. Voici comment fonctionnent les remboursements.',
      sections: [
        { h: 'Livraison échouée', b: 'Si les diamants n\'arrivent pas dans les délais promis, vous avez droit à un remboursement complet.' },
        { h: 'Identifiant incorrect', b: 'Si vous avez entré le mauvais ID joueur, contactez-nous immédiatement.' },
        { h: 'Erreurs utilisateur', b: 'Nous ne sommes pas responsables des erreurs dues à des informations incorrectes.' },
        { h: 'Non-remboursable', b: 'Une fois les diamants livrés avec succès, les commandes ne sont pas remboursables.' },
        { h: 'Demandes rejetées', b: 'Nous nous réservons le droit de refuser les demandes qui violent nos conditions.' },
        { h: 'Comment demander un remboursement', b: 'Contactez-nous sur Telegram dans les 7 jours avec votre numéro de commande.' },
      ],
    },
    es: {
      title: 'Política de reembolso',
      updated: 'Última actualización: 1 enero 2026',
      intro: 'Buscamos tu total satisfacción. Así funcionan los reembolsos.',
      sections: [
        { h: 'Entrega fallida', b: 'Si los diamantes no llegan en el plazo prometido, tienes derecho a un reembolso completo.' },
        { h: 'Identificador incorrecto', b: 'Si ingresaste el ID de jugador incorrecto, notifícanos inmediatamente.' },
        { h: 'Errores del usuario', b: 'No somos responsables de errores causados por información incorrecta.' },
        { h: 'No reembolsable', b: 'Una vez entregados los diamantes exitosamente, los pedidos no son reembolsables.' },
        { h: 'Solicitudes rechazadas', b: 'Nos reservamos el derecho de rechazar solicitudes que violen nuestros términos.' },
        { h: 'Cómo solicitar reembolso', b: 'Contáctanos en Telegram dentro de 7 días con tu número de pedido.' },
      ],
    },
  },
  delivery: {
    ar: {
      title: 'سياسة التوصيل',
      updated: 'آخر تحديث: 1 كانون 2026',
      intro: 'نوفر توصيلًا فوريًا تلقائيًا لمعرف اللاعب.',
      sections: [
        { h: 'وقت التوصيل', b: 'معظم الطلبات تستغرق 2-30 دقيقة.' },
        { h: 'طريقة التوصيل', b: 'تُرسل الماس مباشرة إلى معرّف اللاعب (UID) الذي أدخلته.' },
        { h: 'متطلبات الحساب', b: 'تأكد من إدخال معرّف اللاعب الصحيح وأن الحساب يسمح باستقبال الشحنات.' },
        { h: 'الماس الإضافية', b: 'تشمل بعض الباقات ماسات إضافية (Bonus) تُضاف تلقائيًا.' },
        { h: 'التأخيرات', b: 'في حالات نادرة قد يتأخر التوصيل. تواصل مع الدعم للمتابعة.' },
        { h: 'متابعة الطلب', b: 'استخدم صفحة تتبع الطلب وأدخل رقم طلبك لعرض الحالة.' },
      ],
    },
    en: {
      title: 'Delivery Policy',
      updated: 'Last updated: January 1, 2026',
      intro: 'We provide fast, automated delivery to your game ID.',
      sections: [
        { h: 'Delivery time', b: 'Normal delivery is usually completed within 1–5 minutes after payment confirmation and validation. Occasional provider or network delays may occur.' },
        { h: 'Delivery method', b: 'Diamonds are sent instantly to the Player ID (UID) you entered at checkout.' },
        { h: 'Account requirements', b: 'Make sure your Player ID is correct and your account allows incoming shipments.' },
        { h: 'Bonus diamonds', b: 'Some packages include bonus diamonds that are added automatically.' },
        { h: 'Delays', b: 'In rare cases delivery may be delayed. Contact support for updates.' },
        { h: 'Order tracking', b: 'Use the Track Order page with your order number or Player ID to see the live status.' },
      ],
    },
    fr: {
      title: 'Politique de livraison',
      updated: 'Dernière mise à jour: 1 janvier 2026',
      intro: 'Nous fournissons une livraison rapide et automatisée à votre ID de jeu.',
      sections: [
        { h: 'Délai de livraison', b: 'La plupart des commandes sont livrées en 2 à 30 minutes.' },
        { h: 'Méthode de livraison', b: 'Les diamants sont envoyés instantanément à l\'ID joueur saisi.' },
        { h: 'Conditions du compte', b: 'Assurez-vous que votre ID joueur est correct et que votre compte accepte les envois.' },
        { h: 'Diamants bonus', b: 'Certains packs incluent des diamants bonus ajoutés automatiquement.' },
        { h: 'Retards', b: 'Dans de rares cas, la livraison peut être retardée. Contactez le support.' },
        { h: 'Suivi de commande', b: 'Utilisez la page de suivi avec votre numéro de commande pour voir le statut.' },
      ],
    },
    es: {
      title: 'Política de entrega',
      updated: 'Última actualización: 1 enero 2026',
      intro: 'Proporcionamos entrega rápida y automatizada a tu ID de juego.',
      sections: [
        { h: 'Tiempo de entrega', b: 'La mayoría de los pedidos se entregan en 2-30 minutos.' },
        { h: 'Método de entrega', b: 'Los diamantes se envían instantáneamente al ID de jugador ingresado.' },
        { h: 'Requisitos de cuenta', b: 'Asegúrate de que tu ID de jugador sea correcto y tu cuenta acepte envíos.' },
        { h: 'Diamantes bonus', b: 'Algunos paquetes incluyen diamantes bonus que se agregan automáticamente.' },
        { h: 'Retrasos', b: 'En casos raros puede haber retrasos. Contacta al soporte.' },
        { h: 'Seguimiento', b: 'Usa la página de rastreo con tu número de pedido para ver el estado.' },
      ],
    },
  },
}

export function PolicyPage({ policy }: { policy: PolicyKey }) {
  const { lang } = useLocale()
  const c = (CONTENT[policy][lang] ?? CONTENT[policy].en ?? CONTENT[policy].ar)!
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-gold/25 to-primary/25 ring-1 ring-inset ring-white/10 text-gold">
          {ICONS[policy]}
        </span>
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">{c.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{c.updated}</p>
        </div>
      </div>

      <p className="mb-8 rounded-2xl border border-border bg-secondary/30 p-4 text-sm leading-relaxed text-muted-foreground">
        {c.intro}
      </p>

      <div className="space-y-6">
        {c.sections.map((s, i) => (
          <section key={i}>
            <h2 className="mb-1.5 flex items-baseline gap-2 text-lg font-bold">
              <span className="text-gold" translate="no">{String(i + 1).padStart(2, '0')}</span>
              {s.h}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{s.b}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
