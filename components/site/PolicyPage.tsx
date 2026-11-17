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
      intro: 'تقوم شركة FF Diamond LLC، وهي خدمة شحن رقمية مستقلة مقرها الولايات المتحدة، بجمع ومعالجة المعلومات اللازمة فقط لتنفيذ الطلبات وتقديم الدعم وحماية الخدمة. لسنا تابعين لشركة Garena أو معتمدين منها ما لم يُنص على ذلك صراحةً.',
      sections: [
        { h: 'المعلومات التي نجمعها', b: 'نجمع معرّف اللاعب (UID) وتفاصيل الطلب وطريقة الدفع المختارة وبيانات التواصل الاختيارية التي ترسلها. لا نطلب كلمة مرور حساب Free Fire أو بيانات تسجيل الدخول.' },
        { h: 'كيف نستخدم بياناتك', b: 'نستخدم بياناتك لمعالجة الطلبات وتسليم الماس وتقديم الدعم الفني ومنع إساءة الاستخدام.' },
        { h: 'مشاركة البيانات', b: 'لا نبيع بياناتك الشخصية ولا نشاركها إلا مع مزودي الدفع والبنية التقنية الضرورية لتنفيذ الطلب.' },
        { h: 'الأمان', b: 'نستخدم اتصال HTTPS والتحقق من جانب الخادم وضوابط مزودي الدفع، مع العلم أنه لا توجد خدمة إلكترونية تضمن أماناً مطلقاً.' },
        { h: 'حقوقك', b: 'يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو حذفها في أي وقت عبر بريد الدعم.' },
        { h: 'ملفات تعريف الارتباط وبكسلات الإعلانات', b: 'نستخدم ملفات تعريف ارتباط أساسية لحفظ اللغة والعملة والأمان، وقد يتم تفعيل أدوات تحليل أو بكسلات إعلانية (مثل Meta وGoogle Ads وTikTok) لقياس الأداء والحملات. يمكنك إدارة ملفات تعريف الارتباط أو تعطيلها من إعدادات المتصفح.' },
        { h: 'التواصل', b: 'لأي استفسار حول الخصوصية، تواصل معنا عبر البريد support@ff-diamond.rest أو عبر تيليجرام خلال ساعات العمل المعلنة.' },
      ],
    },
    en: {
      title: 'Privacy Policy',
      updated: 'Last updated: January 1, 2026',
      intro: 'FF Diamond LLC, an independent top-up service based in the United States, collects and processes only the information needed to provide support, process orders, and protect the service. We are not affiliated with or endorsed by Garena unless expressly stated in a separate written notice.',
      sections: [
        { h: 'Information we collect', b: 'We collect the Player ID, order details, selected payment method, and optional contact details you submit. We do not ask for your Free Fire password or account credentials.' },
        { h: 'How we use your data', b: 'We use your data to process orders, deliver diamonds, provide support, and prevent abuse.' },
        { h: 'Data sharing', b: 'We never sell your data. We only share it with payment providers and service infrastructure strictly necessary to process orders.' },
        { h: 'Security', b: 'We use HTTPS, server-side validation, restricted administrative access, and payment-provider controls. No online service can guarantee absolute security.' },
        { h: 'Your rights', b: 'You may request access to, correction, or deletion of your data at any time by contacting support.' },
        { h: 'Cookies and advertising pixels', b: 'We use essential cookies for language, currency, and security, and may enable analytics or advertising pixels (such as Meta, Google Ads, and TikTok) to measure performance and campaigns. You can manage or disable cookies through your browser settings.' },
        { h: 'Contact', b: 'For privacy questions, contact support@ff-diamond.rest or reach out via Telegram during listed support hours.' },
      ],
    },
    fr: {
      title: 'Politique de confidentialité',
      updated: 'Dernière mise à jour : 1 janvier 2026',
      intro: 'FF Diamond LLC, service numérique indépendant basé aux États-Unis, collecte uniquement les informations nécessaires pour traiter les commandes, assurer le support et sécuriser le service. Nous ne sommes ni affiliés ni approuvés par Garena.',
      sections: [
        { h: 'Informations collectées', b: 'Nous collectons votre ID joueur (UID), les détails de la commande, le mode de paiement choisi et les coordonnées facultatives saisies. Nous ne demandons jamais votre mot de passe Free Fire.' },
        { h: 'Utilisation des données', b: 'Nous utilisons vos données pour traiter les commandes, livrer les diamants, fournir le support et prévenir les abus.' },
        { h: 'Partage des données', b: 'Nous ne vendons jamais vos données. Elles sont partagées uniquement avec les prestataires nécessaires au traitement du paiement.' },
        { h: 'Sécurité', b: 'Nous utilisons HTTPS, une validation côté serveur et les contrôles des prestataires de paiement. Aucun service en ligne ne peut garantir une sécurité absolue.' },
        { h: 'Vos droits', b: 'Vous pouvez demander l\'accès, la correction ou la suppression de vos données à tout moment.' },
        { h: 'Cookies et pixels publicitaires', b: 'Nous utilisons des cookies essentiels pour la langue, la devise et la sécurité, et pouvons activer des outils d\'analyse ou pixels publicitaires (Meta, Google Ads, TikTok) pour mesurer les campagnes. Vous pouvez gérer vos préférences dans votre navigateur.' },
        { h: 'Contact', b: 'Pour toute question, contactez support@ff-diamond.rest ou notre canal Telegram pendant les horaires indiqués.' },
      ],
    },
    es: {
      title: 'Política de privacidad',
      updated: 'Última actualización: 1 enero 2026',
      intro: 'FF Diamond LLC, un servicio digital independiente con sede en Estados Unidos, recopila únicamente la información necesaria para procesar pedidos, brindar soporte y proteger el servicio. No estamos afiliados ni respaldados por Garena.',
      sections: [
        { h: 'Información recopilada', b: 'Recopilamos el ID de jugador (UID), detalles del pedido, método de pago seleccionado y datos de contacto opcionales. Nunca solicitamos tu contraseña de Free Fire.' },
        { h: 'Uso de los datos', b: 'Usamos tus datos para procesar pedidos, entregar diamantes, brindar soporte y prevenir abusos.' },
        { h: 'Compartir datos', b: 'Nunca vendemos tus datos. Solo se comparten con proveedores de pago e infraestructura necesarios para procesar el pedido.' },
        { h: 'Seguridad', b: 'Usamos HTTPS, validación del lado del servidor y controles del proveedor de pagos. Ningún servicio en línea puede garantizar seguridad absoluta.' },
        { h: 'Tus derechos', b: 'Puedes solicitar acceso, corrección o eliminación de tus datos en cualquier momento.' },
        { h: 'Cookies y píxeles publicitarios', b: 'Usamos cookies esenciales para idioma, moneda y seguridad, y podemos habilitar herramientas de análisis o píxeles publicitarios (Meta, Google Ads, TikTok) para medir campañas. Puedes gestionar las cookies en tu navegador.' },
        { h: 'Contacto', b: 'Para consultas de privacidad, escribe a support@ff-diamond.rest o por Telegram durante el horario de soporte.' },
      ],
    },
  },
  terms: {
    ar: {
      title: 'شروط الاستخدام',
      updated: 'آخر تحديث: 1 كانون الثاني 2026',
      intro: 'تنظم هذه الشروط استخدامك لخدمات FF Diamond LLC، وهي خدمة شحن رقمية مستقلة غير تابعة لشركة Garena أو Free Fire.',
      sections: [
        { h: 'قبول الشروط', b: 'باستخدامك الموقع فإنك تقر بأنك اطلعت على هذه الشروط وتوافق عليها قبل تقديم أي طلب.' },
        { h: 'الأهلية', b: 'يجب أن يكون عمرك 13 عامًا على الأقل أو أن تحصل على موافقة ولي الأمر لاستخدام الخدمة وفق القوانين المحلية.' },
        { h: 'دقة بيانات الطلب', b: 'يتحمل العميل مسؤولية إدخال معرّف اللاعب (UID) وتفاصيل الخادم بشكل صحيح قبل الدفع.' },
        { h: 'الاستخدام المقبول', b: 'يُحظر أي استخدام غير قانوني أو احتيالي أو محاولة التلاعب بالأسعار أو بوابات الدفع.' },
        { h: 'الملكية الفكرية والعلامات', b: 'جميع العلامات التجارية للألعاب مملوكة لأصحابها وتُذكر فقط لتحديد المنتج الرقمي المطلوب.' },
        { h: 'تعديل الخدمة', b: 'نحتفظ بالحق في تحديث الأسعار أو الباقات أو وسائل الدفع المتاحة قبل تأكيد الطلب.' },
        { h: 'إخلاء المسؤولية', b: 'تُقدم الخدمة "كما هي" ولا نقدم ضمانات مطلقة بشأن أوقات الشبكة أو سياسات ناشر اللعبة.' },
      ],
    },
    en: {
      title: 'Terms of Use',
      updated: 'Last updated: January 1, 2026',
      intro: 'These terms govern your use of FF Diamond LLC, an independent digital top-up service not affiliated with or endorsed by Garena or Free Fire. Please read them carefully before placing an order.',
      sections: [
        { h: 'Acceptance of terms', b: 'By using the site you confirm you have read and agree to these terms.' },
        { h: 'Eligibility', b: 'You must be at least 13 years old to use the store, or have your parent or guardian permission.' },
        { h: 'Accurate orders', b: 'You are responsible for entering the correct Player ID and server details before completing payment.' },
        { h: 'Acceptable use', b: 'Any illegal, fraudulent, or unauthorized use of the site is prohibited.' },
        { h: 'Intellectual property', b: 'Site content belongs to FF Diamond LLC. Third-party game names and trademarks belong to their respective owners and are used only to identify the product.' },
        { h: 'Changes to the service', b: 'We may update prices, packages, supported payment methods, or site terms at any time.' },
        { h: 'Disclaimer', b: 'We provide the service "as is" without absolute guarantees regarding network timing or game-publisher account policies.' },
      ],
    },
    fr: {
      title: 'Conditions d\'utilisation',
      updated: 'Dernière mise à jour : 1 janvier 2026',
      intro: 'Ces conditions régissent l\'utilisation de FF Diamond LLC, un service indépendant non affilié ni approuvé par Garena ou Free Fire.',
      sections: [
        { h: 'Acceptation', b: 'En utilisant le site, vous confirmez avoir lu et accepté ces conditions.' },
        { h: 'Éligibilité', b: 'Vous devez avoir au moins 13 ans ou l\'autorisation d\'un parent ou tuteur.' },
        { h: 'Commandes exactes', b: 'Vous êtes responsable de l\'exactitude de l\'ID joueur (UID) saisi avant le paiement.' },
        { h: 'Usage acceptable', b: 'Tout usage illégal, frauduleux ou non autorisé du site est interdit.' },
        { h: 'Propriété intellectuelle', b: 'Les marques tierces appartiennent à leurs propriétaires respectifs et sont citées uniquement pour identifier le produit.' },
        { h: 'Modifications', b: 'Nous pouvons mettre à jour les prix, packs, moyens de paiement ou conditions à tout moment.' },
        { h: 'Avertissement', b: 'Le service est fourni "tel quel" sans garantie absolue sur les délais réseau ou les règles de l\'éditeur.' },
      ],
    },
    es: {
      title: 'Términos de uso',
      updated: 'Última actualización: 1 enero 2026',
      intro: 'Estos términos rigen el uso de FF Diamond LLC, un servicio independiente no afiliado ni respaldado por Garena o Free Fire.',
      sections: [
        { h: 'Aceptación', b: 'Al usar el sitio confirmas haber leído y aceptado estos términos.' },
        { h: 'Elegibilidad', b: 'Debes tener al menos 13 años o contar con permiso de un padre o tutor.' },
        { h: 'Pedidos correctos', b: 'Eres responsable de ingresar el ID de jugador (UID) correcto antes de pagar.' },
        { h: 'Uso aceptable', b: 'Cualquier uso ilegal, fraudulento o no autorizado del sitio está prohibido.' },
        { h: 'Propiedad intelectual', b: 'Las marcas de terceros pertenecen a sus respectivos propietarios y se mencionan solo para identificar el producto.' },
        { h: 'Cambios', b: 'Podemos actualizar precios, paquetes, métodos de pago o términos en cualquier momento.' },
        { h: 'Aviso legal', b: 'El servicio se ofrece "tal cual" sin garantías absolutas sobre tiempos de red o políticas del editor del juego.' },
      ],
    },
  },
  refund: {
    ar: {
      title: 'سياسة الاسترداد',
      updated: 'آخر تحديث: 1 كانون الثاني 2026',
      intro: 'تنطبق هذه القواعد على طلبات FF Diamond LLC وتخضع لقوانين حماية المستهلك المعمول بها في نطاق عملنا.',
      sections: [
        { h: 'فشل التوصيل', b: 'إذا تم استلام الدفع ولم يتم تسليم الماس بنجاح، يمكنك طلب استرداد كامل المبلغ.' },
        { h: 'معرّف لاعب خاطئ', b: 'إذا أدخلت معرّفًا خاطئًا، تواصل معنا فورًا قبل تنفيذ الشحن. لا يتاح الاسترداد بعد إتمام الشحن بنجاح إلى المعرّف الخاطئ الذي أدخله العميل.' },
        { h: 'الإلغاء قبل التنفيذ', b: 'يمكنك طلب الإلغاء قبل تنفيذ عملية الشحن. تأكيد الدفع وحده لا يعني بالضرورة اكتمال التنفيذ.' },
        { h: 'عدم قابلية الاسترداد بعد التسليم', b: 'بمجرد اكتمال تسليم الماس الرقمية بنجاح إلى الحساب، تصبح الطلبات غير قابلة للاسترداد لطبيعتها الرقمية.' },
        { h: 'مراجعة الطلبات', b: 'نحتفظ بحق مراجعة أو رفض طلبات الاسترداد التي تخالف الشروط العامة أو تنطوي على سوء استخدام.' },
        { h: 'كيف تطلب استردادًا', b: 'تواصل مع الدعم عبر support@ff-diamond.rest أو تيليجرام مع رقم الطلب وإثبات الدفع؛ يختلف وقت معالجة الاسترداد حسب مزود الدفع.' },
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
      updated: 'Dernière mise à jour : 1 janvier 2026',
      intro: 'Ces règles s\'appliquent aux commandes FF Diamond LLC sous réserve des lois applicables en matière de protection des consommateurs.',
      sections: [
        { h: 'Livraison échouée', b: 'Si le paiement est reçu mais que les diamants ne sont pas livrés avec succès, vous pouvez demander un remboursement complet.' },
        { h: 'Identifiant incorrect', b: 'Si vous avez saisi un mauvais ID joueur, contactez-nous immédiatement avant l\'exécution. Aucun remboursement n\'est possible après une recharge réussie sur l\'UID fourni.' },
        { h: 'Annulation', b: 'Vous pouvez demander l\'annulation avant l\'exécution de la recharge.' },
        { h: 'Non-remboursable après livraison', b: 'Une fois les diamants livrés avec succès, la commande numérique n\'est plus remboursable.' },
        { h: 'Demandes refusées', b: 'Nous nous réservons le droit de refuser les demandes contraires à nos conditions générales.' },
        { h: 'Comment demander un remboursement', b: 'Contactez support@ff-diamond.rest ou Telegram avec votre numéro de commande et la preuve de paiement ; le délai de traitement dépend du prestataire.' },
      ],
    },
    es: {
      title: 'Política de reembolso',
      updated: 'Última actualización: 1 enero 2026',
      intro: 'Estas reglas aplican a los pedidos de FF Diamond LLC y están sujetas a las leyes de protección al consumidor vigentes.',
      sections: [
        { h: 'Entrega fallida', b: 'Si se recibe el pago pero los diamantes no se entregan correctamente, puedes solicitar un reembolso completo.' },
        { h: 'Identificador incorrecto', b: 'Si ingresaste un ID de jugador incorrecto, contáctanos de inmediato antes de la ejecución. No hay reembolso tras una recarga exitosa al UID proporcionado.' },
        { h: 'Cancelación', b: 'Puedes solicitar la cancelación antes de que se ejecute la recarga.' },
        { h: 'No reembolsable tras la entrega', b: 'Una vez entregados los diamantes correctamente, los pedidos digitales no son reembolsables.' },
        { h: 'Solicitudes rechazadas', b: 'Nos reservamos el derecho de rechazar solicitudes que incumplan nuestros términos generales.' },
        { h: 'Cómo solicitar reembolso', b: 'Contacta a support@ff-diamond.rest o Telegram con tu número de pedido y comprobante de pago; el tiempo de procesamiento depende del proveedor.' },
      ],
    },
  },
  delivery: {
    ar: {
      title: 'سياسة التوصيل',
      updated: 'آخر تحديث: 1 كانون الثاني 2026',
      intro: 'توفر FF Diamond LLC تسليم الشحن الرقمي إلى معرّف اللاعب (UID) المدخل عند الطلب. نحن خدمة مستقلة ولا نطلب كلمات مرور الحساب.',
      sections: [
        { h: 'وقت التوصيل المتوقع', b: 'يتم إتمام التسليم المعتاد خلال 1–5 دقائق بعد تأكيد الدفع والتحقق. قد تحدث أحياناً تأخيرات من مزود الدفع أو الشبكة.' },
        { h: 'طريقة التوصيل', b: 'تُرسل الماس إلى معرّف اللاعب (UID) الذي أدخلته عند إتمام الطلب بعد التحقق من الدفع.' },
        { h: 'متطلبات الحساب', b: 'تأكد من إدخال معرّف اللاعب الصحيح ومن أن الحساب يسمح باستقبال الشحنات.' },
        { h: 'الماس الإضافية', b: 'تشمل بعض الباقات كمية إضافية موضحة ضمن إجمالي الباقة قبل الدفع.' },
        { h: 'التأخيرات', b: 'في حالات نادرة قد يتأخر التوصيل. تواصل مع الدعم خلال ساعات العمل للمتابعة.' },
        { h: 'متابعة الطلب', b: 'استخدم صفحة تتبع الطلب وأدخل رقم الطلب ورمز التتبع الخاص؛ لا يمكن استخدام معرّف اللاعب وحده لعرض الطلبات.' },
      ],
    },
    en: {
      title: 'Delivery Policy',
      updated: 'Last updated: January 1, 2026',
      intro: 'FF Diamond LLC provides top-up delivery to the Player UID submitted at checkout. We are an independent service and do not request account passwords.',
      sections: [
        { h: 'Delivery time', b: 'Normal delivery is usually completed within 1–5 minutes after payment confirmation and validation. Occasional provider or network delays may occur.' },
        { h: 'Delivery method', b: 'Diamonds are sent to the Player ID (UID) you entered at checkout once payment is confirmed and validated.' },
        { h: 'Account requirements', b: 'Make sure your Player ID is correct and your account allows incoming shipments.' },
        { h: 'Bonus diamonds', b: 'Some packages include bonus diamonds that are clearly listed in the package total before checkout.' },
        { h: 'Delays', b: 'In rare cases delivery may be delayed. Contact support during listed hours for updates.' },
        { h: 'Order tracking', b: 'Use the Track Order page with both your order number and private tracking token. Player UID alone cannot be used to view orders.' },
      ],
    },
    fr: {
      title: 'Politique de livraison',
      updated: 'Dernière mise à jour : 1 janvier 2026',
      intro: 'FF Diamond LLC assure la livraison numérique vers l\'ID joueur (UID) indiqué lors de la commande. Nous sommes un service indépendant et ne demandons jamais votre mot de passe.',
      sections: [
        { h: 'Délai de livraison estimé', b: 'La livraison habituelle est effectuée en 1 à 5 minutes après confirmation et validation du paiement. Des retards occasionnels liés au réseau ou au prestataire peuvent survenir.' },
        { h: 'Méthode de livraison', b: 'Les diamants sont envoyés vers l\'ID joueur (UID) saisi après confirmation du paiement.' },
        { h: 'Conditions du compte', b: 'Assurez-vous que votre ID joueur est exact et que votre compte accepte les réceptions.' },
        { h: 'Diamants bonus', b: 'Certains packs incluent des diamants bonus clairement affichés dans le total avant le paiement.' },
        { h: 'Retards', b: 'En cas de retard inhabituel, contactez le support pendant les horaires indiqués.' },
        { h: 'Suivi de commande', b: 'Utilisez la page de suivi avec votre numéro de commande et votre jeton de suivi privé.' },
      ],
    },
    es: {
      title: 'Política de entrega',
      updated: 'Última actualización: 1 enero 2026',
      intro: 'FF Diamond LLC entrega recargas al UID de jugador enviado en el pedido. Somos un servicio independiente y no solicitamos contraseñas de cuenta.',
      sections: [
        { h: 'Tiempo de entrega estimado', b: 'La entrega habitual se completa en 1–5 minutos tras la confirmación y validación del pago. Pueden ocurrir demoras ocasionales del proveedor o de la red.' },
        { h: 'Método de entrega', b: 'Los diamantes se envían al ID de jugador (UID) ingresado tras confirmar y validar el pago.' },
        { h: 'Requisitos de cuenta', b: 'Asegúrate de que tu ID de jugador sea correcto y que tu cuenta acepte envíos.' },
        { h: 'Diamantes bonus', b: 'Algunos paquetes incluyen diamantes adicionales mostrados claramente en el total antes de pagar.' },
        { h: 'Retrasos', b: 'En casos poco frecuentes puede haber demoras. Contacta al soporte en el horario indicado.' },
        { h: 'Seguimiento', b: 'Usa la página de rastreo con tu número de pedido y tu token de seguimiento privado.' },
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
