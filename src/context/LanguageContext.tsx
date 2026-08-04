import React, { createContext, useContext, useState } from 'react';

export type Language = 'es' | 'en' | 'fr' | 'pt';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (text: string) => string;
}

export const LANGUAGE_OPTIONS: { code: Language; name: string; flag: string; label: string }[] = [
  { code: 'es', name: 'Español', flag: '🇪🇸', label: 'ES' },
  { code: 'en', name: 'English', flag: '🇬🇧', label: 'EN' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', label: 'FR' },
  { code: 'pt', name: 'Português', flag: '🇵🇹', label: 'PT' }
];

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  es: {},
  en: {
    // Navigation & Header
    'Inicio': 'Home',
    'Nosotros': 'About Us',
    'Servicios': 'Services',
    'Galería': 'Gallery',
    'Menú': 'Menu',
    'Promociones': 'Promotions',
    'Reservar': 'Book Table',
    'Reservar Mesa': 'Book a Table',
    'RESERVAR MESA': 'BOOK A TABLE',
    'VER MENÚ': 'VIEW MENU',
    'Mi perfil': 'My Profile',
    'Gestión Admin': 'Admin Management',
    'Jefe Restaurante': 'Restaurant Manager',
    'Mi cuenta': 'My Account',
    'Actualizar': 'Refresh',
    'Cargando...': 'Loading...',
    'Salir': 'Exit',
    'Cerrar Sesión': 'Log Out',
    'Acceso Personal': 'Staff Access',
    'Acceso de Personal': 'Staff Access',

    // Hero & Slogans
    'Exclusivo, diferente y delicioso': 'Exclusive, unique and delicious',
    'Donde la excelencia y el sabor confluyen': 'Where excellence and flavor converge',
    'Descubre la auténtica gastronomía cubana en un ambiente de elegancia inigualable.': 'Discover authentic Cuban cuisine in an atmosphere of unparalleled elegance.',
    'Sabores que cuentan historias': 'Flavors that tell stories',

    // About & Team
    'En el Reparto Nuevo Bayamo, nació una idea transformadora: crear un espacio donde la gastronomía cubana se vistiera de gala. Restaurante - Terraza 53&M se ha consolidado como un "lugar de lujo" en la zona, redefiniendo la experiencia culinaria con un toque de distinción y autenticidad.': 'In the Reparto Nuevo Bayamo neighborhood, a transformative idea was born: to create a space where Cuban gastronomy wears its finest gala. Restaurant - Terrace 53&M has established itself as a luxury venue in the area, redefining the culinary experience with distinction and authenticity.',
    'Nuestra misión es ofrecer gastronomía cubana elegante con un servicio excepcional. Cada detalle está diseñado para que disfrutes no solo de platos exquisitos, sino de momentos memorables en un ambiente que combina la calidez de nuestra tierra con la sofisticación internacional.': 'Our mission is to offer elegant Cuban gastronomy with exceptional service. Every detail is crafted so you enjoy not only exquisite dishes, but memorable moments in an environment combining local warmth with international sophistication.',
    'Sabor Auténtico': 'Authentic Flavor',
    'Ambiente Exclusivo': 'Exclusive Ambiance',
    'Atención de Primera': 'Top Quality Service',
    'Nuestro Equipo': 'Our Team',
    'Las manos y rostros que hacen posible la excelencia en 53&M': 'The hands and faces that make excellence possible at 53&M',
    'Equipo 53&M': '53&M Team',
    'Exclusividad': 'Exclusivity',
    'Diferencia': 'Uniqueness',
    'Sabor': 'Flavor',
    'Elegancia': 'Elegance',

    // Services
    'Nuestros Servicios': 'Our Services',
    'Experiencias diseñadas para todos los sentidos': 'Experiences crafted for all your senses',
    'Restaurante': 'Restaurant',
    'Bar y Coctelería': 'Bar & Cocktails',
    'Terraza Privada': 'Private Terrace',
    'Terraza al Aire Libre': 'Outdoor Terrace',
    'Eventos Especiales': 'Special Events',
    'Eventos Privados': 'Private Events',
    'Almuerzos y cenas elegantes con lo mejor de la cocina cubana e internacional.': 'Elegant lunches and dinners featuring the finest Cuban and international cuisine.',
    'Una selección exclusiva de cócteles preparados por nuestros bartenders expertos.': 'An exclusive selection of cocktails crafted by our expert bartenders.',
    'Espacios al aire libre ideales para eventos, celebraciones y reuniones íntimas.': 'Outdoor spaces ideal for events, celebrations, and intimate gatherings.',
    'Espacios frescos para disfrutar de una velada inolvidable bajo las estrellas.': 'Fresh open-air spaces to enjoy an unforgettable evening under the stars.',
    'Cumpleaños, aniversarios y ocasiones especiales con un toque de distinción.': 'Birthdays, anniversaries, and special occasions with a touch of distinction.',
    'Celebraciones exclusivas con menús personalizados y atención personalizada.': 'Exclusive celebrations with tailored menus and personal service.',

    // Menu & Categories
    'Especialidades de la Casa': 'House Specialties',
    'Ver Menú Completo': 'View Full Menu',
    'Cerrar Menú': 'Close Menu',
    'Buscar plato o ingrediente...': 'Search dish or ingredient...',
    'Todas las Categorías': 'All Categories',
    'Todos': 'All',
    'Entradas': 'Starters',
    'Platos Principales': 'Main Courses',
    'Platos Fuertes': 'Main Dishes',
    'Especialidad': 'Specialty',
    'Postres': 'Desserts',
    'Bebidas': 'Drinks & Cocktails',
    'Añadir a mi Reserva': 'Add to my Booking',
    'Precio': 'Price',
    'Ingredientes': 'Ingredients',
    'Sin Gluten': 'Gluten-Free',
    'Vegano': 'Vegan',
    'Especialidad de la Casa': 'House Specialty',
    'Nuestra Historia': 'Our Story',
    'Ingredientes Principales': 'Main Ingredients',
    'Descubrir': 'Discover',
    'Los más populares': 'Most Popular Dishes',
    'Nuestro Menú': 'Our Menu',
    'Añadir': 'Add',
    'Añadido': 'Added',

    // Dishes
    'Tabla 53&M': '53&M Tasting Platter',
    'Frituras, jamón y quesos con salsas de la casa.': 'Fritters, ham, and cheeses with house dips.',
    'Cerdo Glaseado': 'Glazed Pork',
    'Lonjas de cerdo asado con vegetales y salsa.': 'Slices of roasted pork with vegetables and glaze.',
    'Ensalada de Camarones': 'Shrimp Salad',
    'Camarones sobre vegetales con aderezo cremoso.': 'Fresh shrimp over greens with creamy dressing.',
    'Coctel 53&M': '53&M Signature Cocktail',
    'Nuestra firma refrescante con equilibrio perfecto.': 'Our refreshing signature drink with perfect balance.',
    'Tostones Rellenos': 'Stuffed Plantains',
    'Tostones crujientes rellenos de ropa vieja.': 'Crispy green plantains stuffed with shredded beef.',
    'Arroz Frito 53&M': '53&M Fried Rice',
    'Arroz frito al estilo cubano con cerdo, jamón y camarones.': 'Cuban style fried rice with pork, ham, and shrimp.',
    'Mojito Tradicional': 'Traditional Mojito',
    'El clásico cubano con hierbabuena fresca y ron blanco.': 'The Cuban classic with fresh mint and white rum.',
    'Fricase de Pollo': 'Chicken Fricassee',
    'Pollo estofado en salsa de tomate con papas y aceitunas.': 'Chicken braised in tomato sauce with potatoes and olives.',

    // Gallery & Promos
    'Galería de Momentos': 'Gallery of Moments',
    'Conoce nuestros ambientes y la experiencia que te espera': 'Discover our ambiance and the experience awaiting you',
    'Promociones y Eventos Especiales': 'Promotions & Special Events',
    'Porque te mereces lo mejor': 'Because you deserve the best',
    'Cumpleañeros': 'Birthday Specials',
    '15% OFF': '15% OFF',
    'Disfruta de un 15% de descuento en tu celebración durante los meses de junio, julio y agosto. ¡Ven a festejar tu día especial con nosotros!': 'Enjoy a 15% discount on your celebration during June, July, and August. Come celebrate your special day with us!',
    'Paquetes para Dos': 'Packages for Two',
    'Parejas': 'Couples',
    'Paquetes gastronómicos diseñados exclusivamente para parejas, incluyendo servicios complementarios para una velada inolvidable.': 'Gastronomic packages designed exclusively for couples, including complementary services for an unforgettable night.',
    'Fin de Semana': 'Weekend',
    'Sáb & Dom': 'Sat & Sun',
    'Ofertas especiales de almuerzo y cena todos los sábados y domingos. ¡Te esperamos desde las 12:00 pm para comenzar el fin de semana con sabor!': 'Special lunch and dinner deals every Saturday and Sunday. We await you from 12:00 PM to start the weekend with flavor!',

    // Testimonials & FAQ
    'Testimonios': 'Testimonials',
    'Lo que dicen nuestros clientes': 'What Our Guests Say',
    'Definitivamente el lugar de lujo en Bayamo. El servicio fue impecable y los platos exquisitos. Un rincón diferente y delicioso.': 'Definitely the luxury spot in Bayamo. The service was impeccable and the dishes exquisite. A unique and delicious venue.',
    'La ambientación de la terraza es hermosa, perfecta para celebrar un aniversario. La atención del personal es muy buena y profesional.': 'The terrace setting is beautiful, perfect for celebrating an anniversary. Staff service is wonderful and professional.',
    'Los cócteles y las tablas para compartir son de otro nivel. Súper recomendado si buscas comer rico y pasar un momento agradable.': 'The cocktails and sharing platters are next level. Highly recommended if you want delicious food and a wonderful time.',
    'Preguntas Frecuentes': 'Frequently Asked Questions',
    '¿Cómo puedo hacer una reserva?': 'How can I make a reservation?',
    'Puedes realizar tu reserva a través del formulario de nuestra página, o más rápidamente, enviándonos un mensaje directo por WhatsApp o nuestras redes sociales (Facebook o Instagram).': 'You can make your reservation via the form on our website or, even faster, by sending us a direct message on WhatsApp or social media (Facebook or Instagram).',
    '¿Qué métodos de pago aceptan?': 'What payment methods do you accept?',
    'Aceptamos pagos en efectivo (CUP) y métodos electrónicos como Transfermóvil y EnZona. También aceptamos USD según disponibilidad.': 'We accept cash (CUP) and electronic payments like Transfermóvil and EnZona. We also accept USD subject to availability.',
    '¿Tienen opciones para eventos o cumpleaños?': 'Do you have options for events or birthdays?',
    '¡Sí! Ofrecemos paquetes especiales para cumpleaños y parejas. Puedes contactar directamente al administrador para personalizar tu evento.': 'Yes! We offer special packages for birthdays and couples. You can contact the admin directly to customize your event.',
    '¿Cuál es el horario de atención?': 'What are your opening hours?',
    'Estamos abiertos de Lunes a Domingo, de 12:00 PM a 11:00 PM.': 'We are open Monday through Sunday, from 12:00 PM to 11:00 PM.',

    // Contact
    'Ubicación y Contacto': 'Location & Contact',
    'Dirección': 'Address',
    'Horario': 'Hours',
    'Lunes a Domingo: 12:00 PM - 11:00 PM': 'Monday to Sunday: 12:00 PM - 11:00 PM',
    'Teléfono': 'Phone',
    'Correo': 'Email',
    'Reservar Mesa Ahora': 'Book Table Now',
    'Contactar Administrador por WhatsApp': 'Contact Admin via WhatsApp',

    // Order & Cart
    'Revisar Pedido': 'Review Order',
    'Tu Pedido': 'Your Order',
    'No hay platos en tu pedido.': 'There are no items in your order.',
    'Total Pedido': 'Order Total',
    'Número de Mesa': 'Table Number',
    'Enviar Pedido': 'Send Order',
    'Enviar Reserva y Pedido': 'Submit Booking & Order',
    'Serás redirigido a WhatsApp para confirmar tu pedido.': 'You will be redirected to WhatsApp to confirm your order.',
    'platos': 'dishes',
    'Revisar': 'Review',

    // Reservation Wizard
    '¿Para cuántas personas?': 'How many guests?',
    '¿Qué día nos visitas?': 'Which day will you visit us?',
    '¿En qué horario?': 'At what time?',
    'Datos de Contacto': 'Contact Details',
    'Nombre completo': 'Full Name',
    'Confirmar Reserva': 'Confirm Reservation',
    'Solo Enviar Reserva': 'Submit Booking Only',
    'Adelantar Pedidos del Menú': 'Pre-order Menu Dishes',
    'Serás redirigido a WhatsApp para confirmar los detalles.': 'You will be redirected to WhatsApp to confirm details.',
    '¿Tienes dudas con tu reservación?': 'Questions about your reservation?',
    'Solicitar reserva de grupo al Administrador por WhatsApp': 'Request group booking with Admin via WhatsApp',
    'Fecha': 'Date',
    'Hora': 'Time',
    'Personas': 'Guests',
    'Ocasión': 'Occasion',
    'comensales': 'guests',
    'Cena romántica': 'Romantic Dinner',
    'Cumpleaños': 'Birthday',
    'Reunión de negocios': 'Business Meeting',
    'Familiar / Amigos': 'Family / Friends',
    'Otro': 'Other',
    'Siguiente': 'Next',
    'Anterior': 'Previous',
    'A nombre de': 'Under the name of',
    'Cambiar Fecha / Detalles': 'Change Date / Details',
    'Cancelar Reserva': 'Cancel Booking',

    // User Dashboard
    'Gestiona, modifica o cancela tus próximas experiencias en 53&M': 'Manage, modify or cancel your upcoming experiences at 53&M',
    'No tienes reservas activas': 'You have no active bookings',
    '¿Listo para vivir una experiencia diferente?': 'Ready for a unique dining experience?',
    'Hablar con el Administrador por WhatsApp': 'Chat with Administrator on WhatsApp',
    'Estado': 'Status',
    'Pendiente': 'Pending',
    'Confirmada': 'Confirmed',
    'Completada': 'Completed',
    'Cancelada': 'Cancelled',

    // Staff Login
    'Administrador, Jefe de Restaurante o Dependiente': 'Administrator, Restaurant Manager or Server',
    'Usuario o Teléfono Móvil': 'Username or Mobile Phone',
    'Contraseña': 'Password',
    'Ingresar al Sistema': 'Log in to System',
    'ID de este dispositivo:': 'This device ID:',
    '* Las sesiones de personal caducan automáticamente a las 24 horas.': '* Staff sessions automatically expire after 24 hours.',
    'Las cuentas de Administrador y Dependiente no realizan reservas.': 'Admin and Server accounts do not place reservations.',
    'Restaurante - Terraza 53&M. Todos los derechos reservados.': 'Restaurant - Terrace 53&M. All rights reserved.',
    'Restaurante - Terraza 53&M. Todos los derechos reservados | Desarrollado por': 'Restaurant - Terrace 53&M. All rights reserved | Developed by'
  },
  fr: {
    // Navigation & Header
    'Inicio': 'Accueil',
    'Nosotros': 'À Propos',
    'Servicios': 'Services',
    'Galería': 'Galerie',
    'Menú': 'Menu',
    'Promociones': 'Promotions',
    'Reservar': 'Réserver',
    'Reservar Mesa': 'Réserver une Table',
    'RESERVAR MESA': 'RÉSERVER UNE TABLE',
    'VER MENÚ': 'VOIR LE MENU',
    'Mi perfil': 'Mon Profil',
    'Gestión Admin': 'Gestion Admin',
    'Jefe Restaurante': 'Chef de Restaurant',
    'Mi cuenta': 'Mon Compte',
    'Actualiser': 'Actualiser',
    'Cargando...': 'Chargement...',
    'Salir': 'Quitter',
    'Cerrar Sesión': 'Se Déconnecter',
    'Acceso Personal': 'Accès Personnel',
    'Acceso de Personal': 'Accès Personnel',

    // Hero & Slogans
    'Exclusivo, diferente y delicioso': 'Exclusif, différent et délicieux',
    'Donde la excelencia y el sabor confluyen': 'Où l\'excellence et la saveur se rencontrent',
    'Descubre la auténtica gastronomía cubana en un ambiente de elegancia inigualable.': 'Découvrez la gastronomie cubaine authentique dans un cadre d\'une élégance inégalée.',
    'Sabores que cuentan historias': 'Des saveurs qui racontent des histoires',

    // About & Team
    'En el Reparto Nuevo Bayamo, nació una idea transformadora: crear un espacio donde la gastronomía cubana se vistiera de gala. Restaurante - Terraza 53&M se ha consolidado como un "lugar de lujo" en la zona, redefiniendo la experiencia culinaria con un toque de distinción y autenticidad.': 'Dans le quartier de Nuevo Bayamo est née une idée novatrice : créer un espace où la gastronomie cubaine s\'habille de gala. Restaurant - Terrasse 53&M s\'est imposé comme un lieu d\'exception redéfinissant l\'expérience culinaire.',
    'Nuestra misión es ofrecer gastronomía cubana elegante con un servicio excepcional. Cada detalle está diseñado para que disfrutes no solo de platos exquisitos, sino de momentos memorables en un ambiente que combina la calidez de nuestra tierra con la sofisticación internacional.': 'Notre mission est d\'offrir une cuisine cubaine élégante avec un service exceptionnel. Chaque détail est conçu pour vous offrir des moments mémorables alliant chaleur locale et sophistication internationale.',
    'Sabor Auténtico': 'Saveur Authentique',
    'Ambiente Exclusivo': 'Ambiance Exclusive',
    'Atención de Primera': 'Service de Premier Ordre',
    'Nuestro Equipo': 'Notre Équipe',
    'Las manos y rostros que hacen posible la excelencia en 53&M': 'Les mains et visages qui rendent l\'excellence possible chez 53&M',
    'Equipo 53&M': 'Équipe 53&M',
    'Exclusividad': 'Exclusivité',
    'Diferencia': 'Originalité',
    'Sabor': 'Saveur',
    'Elegancia': 'Élégance',

    // Services
    'Nuestros Servicios': 'Nos Services',
    'Experiencias diseñadas para todos los sentidos': 'Des expériences conçues pour éveiller tous vos sens',
    'Restaurante': 'Restaurant',
    'Bar y Coctelería': 'Bar & Cocktails',
    'Terraza Privada': 'Terrasse Privée',
    'Terraza al Aire Libre': 'Terrasse Extérieure',
    'Eventos Especiales': 'Événements Spéciaux',
    'Eventos Privados': 'Événements Privés',
    'Almuerzos y cenas elegantes con lo mejor de la cocina cubana e internacional.': 'Déjeuners et dîners élégants proposant le meilleur de la cuisine cubaine et internationale.',
    'Una selección exclusiva de cócteles preparados por nuestros bartenders expertos.': 'Une sélection exclusive de cocktails préparés par nos barmen experts.',
    'Espacios al aire libre ideales para eventos, celebraciones y reuniones íntimas.': 'Des espaces en plein air idéaux pour vos événements et célébrations intimes.',
    'Espacios frescos para disfrutar de una velada inolvidable bajo las estrellas.': 'Des espaces frais pour profiter d\'une soirée inoubliable sous les étoiles.',
    'Cumpleaños, aniversarios y ocasiones especiales con un toque de distinción.': 'Anniversaires et occasions spéciales avec une touche de distinction.',
    'Celebraciones exclusivas con menús personalizados y atención personalizada.': 'Célébrations exclusives avec menus sur mesure et service personnalisé.',

    // Menu & Categories
    'Especialidades de la Casa': 'Spécialités de la Maison',
    'Ver Menú Completo': 'Voir le Menu Complet',
    'Cerrar Menú': 'Fermer le Menu',
    'Buscar plato o ingrediente...': 'Rechercher un plat ou un ingrédient...',
    'Todas las Categorías': 'Toutes les Catégories',
    'Todos': 'Tous',
    'Entradas': 'Entrées',
    'Platos Principales': 'Plats Principaux',
    'Platos Fuertes': 'Plats Consistants',
    'Especialidad': 'Spécialité',
    'Postres': 'Desserts',
    'Bebidas': 'Boissons & Cocktails',
    'Añadir a mi Reserva': 'Ajouter à ma Réservation',
    'Precio': 'Prix',
    'Ingredientes': 'Ingrédients',
    'Sin Gluten': 'Sans Gluten',
    'Vegano': 'Végétalien',
    'Especialidad de la Casa': 'Spécialité du Chef',
    'Nuestra Historia': 'Notre Histoire',
    'Ingredientes Principales': 'Ingrédients Principaux',
    'Descubrir': 'Découvrir',
    'Los más populares': 'Les Plus Populaires',
    'Nuestro Menú': 'Notre Menu',
    'Añadir': 'Ajouter',
    'Añadido': 'Ajouté',

    // Dishes
    'Tabla 53&M': 'Planche Découverte 53&M',
    'Frituras, jamón y quesos con salsas de la casa.': 'Beignets, jambon et fromages avec sauces maison.',
    'Cerdo Glaseado': 'Porc Glacé',
    'Lonjas de cerdo asado con vegetales y salsa.': 'Tranches de porc rôti aux légumes et sauce glacée.',
    'Ensalada de Camarones': 'Salade de Crevettes',
    'Camarones sobre vegetales con aderezo cremoso.': 'Crevettes fraîches sur lit de légumes et vinaigrette crémeuse.',
    'Coctel 53&M': 'Cocktail Signature 53&M',
    'Nuestra firma refrescante con equilibrio perfecto.': 'Notre création rafraîchissante au dosage parfait.',
    'Tostones Rellenos': 'Tostones Farcis',
    'Tostones crujientes rellenos de ropa vieja.': 'Bananes plantains croustillantes farcies d\'effiloché de bœuf.',
    'Arroz Frito 53&M': 'Riz Frit 53&M',
    'Arroz frito al estilo cubano con cerdo, jamón y camarones.': 'Riz frit style cubain au porc, jambon et crevettes.',
    'Mojito Tradicional': 'Mojito Traditionnel',
    'El clásico cubano con hierbabuena fresca y ron blanco.': 'Le grand classique cubain à la menthe fraîche et rhum blanc.',
    'Fricase de Pollo': 'Fricassée de Poulet',
    'Pollo estofado en salsa de tomate con papas y aceitunas.': 'Poulet mijoté en sauce tomate aux pommes de terre et olives.',

    // Gallery & Promos
    'Galería de Momentos': 'Galerie de Moments',
    'Conoce nuestros ambientes y la experiencia que te espera': 'Découvrez nos espaces et l\'expérience qui vous attend',
    'Promociones y Eventos Especiales': 'Promotions & Événements Spéciaux',
    'Porque te mereces lo mejor': 'Parce que vous méritez le meilleur',
    'Cumpleañeros': 'Offre Anniversaire',
    '15% OFF': '-15% de Réduction',
    'Disfruta de un 15% de descuento en tu celebración durante los meses de junio, julio y agosto. ¡Ven a festejar tu día especial con nosotros!': 'Profitez de 15% de réduction pour votre anniversaire durant les mois de juin, juillet et août !',
    'Paquetes para Dos': 'Formules pour Deux',
    'Parejas': 'Couples',
    'Paquetes gastronómicos diseñados exclusivamente para parejas, incluyendo servicios complementarios para una velada inolvidable.': 'Offres gastronomiques conçues spécialement pour les couples pour une soirée inoubliable.',
    'Fin de Semana': 'Offre Week-end',
    'Sáb & Dom': 'Sam & Dim',
    'Ofertas especiales de almuerzo y cena todos los sábados y domingos. ¡Te esperamos desde las 12:00 pm para comenzar el fin de semana con sabor!': 'Offres spéciales déjeuner et dîner chaque samedi et dimanche à partir de 12h00 !',

    // Testimonials & FAQ
    'Testimonios': 'Témoignages',
    'Lo que dicen nuestros clientes': 'Ce que disent nos clients',
    'Definitivamente el lugar de lujo en Bayamo. El servicio fue impecable y los platos exquisitos. Un rincón diferente y delicioso.': 'Définitivement le lieu de luxe à Bayamo. Un service impeccable et des plats exquis. Un endroit unique.',
    'La ambientación de la terraza es hermosa, perfecta para celebrar un aniversario. La atención del personal es muy buena y profesional.': 'L\'ambiance sur la terrasse est magnifique pour un anniversaire. Le personnel est très attentionné et professionnel.',
    'Los cócteles y las tablas para compartir son de otro nivel. Súper recomendado si buscas comer rico y pasar un momento agradable.': 'Les cocktails et les planches sont fantastiques. Très recommandé pour passer un excellent moment.',
    'Preguntas Frecuentes': 'Foire Aux Questions',
    '¿Cómo puedo hacer una reserva?': 'Comment puis-je réserver ?',
    'Puedes realizar tu reserva a través del formulario de nuestra página, o más rápidamente, enviándonos un mensaje directo por WhatsApp o nuestras redes sociales (Facebook o Instagram).': 'Vous pouvez réserver via le formulaire de notre site ou directement sur WhatsApp et nos réseaux sociaux.',
    '¿Qué métodos de pago aceptan?': 'Quels modes de paiement acceptez-vous ?',
    'Aceptamos pagos en efectivo (CUP) y métodos electrónicos como Transfermóvil y EnZona. También aceptamos USD según disponibilidad.': 'Nous acceptons les espèces (CUP) et les paiements électroniques ainsi que les USD selon disponibilité.',
    '¿Tienen opciones para eventos o cumpleaños?': 'Proposez-vous des formules pour événements ou anniversaires ?',
    '¡Sí! Ofrecemos paquetes especiales para cumpleaños y parejas. Puedes contactar directamente al administrador para personalizar tu evento.': 'Oui ! Nous proposons des formules spéciales anniversaires et couples. Contactez l\'administrateur pour personnaliser votre événement.',
    '¿Cuál es el horario de atención?': 'Quels sont les horaires d\'ouverture ?',
    'Estamos abiertos de Lunes a Domingo, de 12:00 PM a 11:00 PM.': 'Ouvert du lundi au dimanche, de 12h00 à 23h00.',

    // Contact
    'Ubicación y Contacto': 'Emplacement & Contact',
    'Dirección': 'Adresse',
    'Horario': 'Horaires',
    'Lunes a Domingo: 12:00 PM - 11:00 PM': 'Lundi au Dimanche : 12h00 - 23h00',
    'Teléfono': 'Téléphone',
    'Correo': 'E-mail',
    'Reservar Mesa Ahora': 'Réserver une Table',
    'Contactar Administrador por WhatsApp': 'Contacter l\'Admin via WhatsApp',

    // Order & Cart
    'Revisar Pedido': 'Vérifier la Commande',
    'Tu Pedido': 'Votre Commande',
    'No hay platos en tu pedido.': 'Aucun plat dans votre commande.',
    'Total Pedido': 'Total Commande',
    'Número de Mesa': 'Numéro de Table',
    'Enviar Pedido': 'Envoyer la Commande',
    'Enviar Reserva y Pedido': 'Envoyer Réservation & Commande',
    'Serás redirigido a WhatsApp para confirmar tu pedido.': 'Vous serez redirigé vers WhatsApp pour confirmer votre commande.',
    'platos': 'plats',
    'Revisar': 'Vérifier',

    // Reservation Wizard
    '¿Para cuántas personas?': 'Pour combien de personnes ?',
    '¿Qué día nos visitas?': 'Quel jour nous visitez-vous ?',
    '¿En qué horario?': 'À quelle heure ?',
    'Datos de Contacto': 'Coordonnées de Contact',
    'Nombre completo': 'Nom complet',
    'Confirmar Reserva': 'Confirmer la Réservation',
    'Solo Enviar Reserva': 'Envoyer la Réservation Uniquement',
    'Adelantar Pedidos del Menú': 'Pré-commander des Plats',
    'Serás redirigido a WhatsApp para confirmar los detalles.': 'Vous serez redirigé vers WhatsApp pour confirmer les détails.',
    '¿Tienes dudas con tu reservación?': 'Des questions sur votre réservation ?',
    'Solicitar reserva de grupo al Administrador por WhatsApp': 'Demander une réservation de groupe via WhatsApp',
    'Fecha': 'Date',
    'Hora': 'Heure',
    'Personas': 'Personnes',
    'Ocasión': 'Occasion',
    'comensales': 'personnes',
    'Cena romántica': 'Dîner Romantique',
    'Cumpleaños': 'Anniversaire',
    'Reunión de negocios': 'Réunion d\'Affaires',
    'Familiar / Amigos': 'Famille / Amis',
    'Otro': 'Autre',
    'Siguiente': 'Suivant',
    'Anterior': 'Précédent',
    'A nombre de': 'Au nom de',
    'Cambiar Fecha / Detalles': 'Changer Date / Détails',
    'Cancelar Reserva': 'Annuler la Réservation',

    // User Dashboard
    'Gestiona, modifica o cancela tus próximas experiencias en 53&M': 'Gérez, modifiez ou annulez vos prochaines réservations chez 53&M',
    'No tienes reservas activas': 'Vous n\'avez aucune réservation active',
    '¿Listo para vivir una experiencia diferente?': 'Prêt pour une expérience gastronomique unique ?',
    'Hablar con el Administrador por WhatsApp': 'Discuter avec l\'Administrateur sur WhatsApp',
    'Estado': 'Statut',
    'Pendiente': 'En attente',
    'Confirmada': 'Confirmée',
    'Completada': 'Terminée',
    'Cancelada': 'Annulée',

    // Staff Login
    'Administrador, Jefe de Restaurante o Dependiente': 'Administrateur, Chef de Restaurant ou Serveur',
    'Usuario o Teléfono Móvil': 'Identifiant ou Téléphone',
    'Contraseña': 'Mot de passe',
    'Ingresar al Sistema': 'Se Connecter au Système',
    'ID de este dispositivo:': 'ID de cet appareil :',
    '* Las sesiones de personal caducan automáticamente a las 24 horas.': '* Les sessions du personnel expirent après 24 heures.',
    'Las cuentas de Administrador y Dependiente no realizan reservas.': 'Les comptes Administrateur et Serveur ne font pas de réservations.',
    'Restaurante - Terraza 53&M. Todos los derechos reservados.': 'Restaurant - Terrasse 53&M. Tous droits réservés.',
    'Restaurante - Terraza 53&M. Todos los derechos reservados | Desarrollado por': 'Restaurant - Terrasse 53&M. Tous droits réservés | Développé par'
  },
  pt: {
    // Navigation & Header
    'Inicio': 'Início',
    'Nosotros': 'Sobre Nós',
    'Servicios': 'Serviços',
    'Galería': 'Galeria',
    'Menú': 'Menu',
    'Promociones': 'Promoções',
    'Reservar': 'Reservar',
    'Reservar Mesa': 'Reservar Mesa',
    'RESERVAR MESA': 'RESERVAR MESA',
    'VER MENÚ': 'VER MENU',
    'Mi perfil': 'Meu Perfil',
    'Gestión Admin': 'Gestão Admin',
    'Jefe Restaurante': 'Gerente do Restaurante',
    'Mi cuenta': 'Minha Conta',
    'Actualizar': 'Atualizar',
    'Cargando...': 'Carregando...',
    'Salir': 'Sair',
    'Cerrar Sesión': 'Sair da Conta',
    'Acceso Personal': 'Acesso da Equipe',
    'Acceso de Personal': 'Acesso da Equipe',

    // Hero & Slogans
    'Exclusivo, diferente y delicioso': 'Exclusivo, diferente e delicioso',
    'Donde la excelencia y el sabor confluyen': 'Onde a excelência e o sabor confluem',
    'Descubre la auténtica gastronomía cubana en un ambiente de elegancia inigualable.': 'Descubra a autêntica gastronomia cubana num ambiente de elegância inigualável.',
    'Sabores que cuentan historias': 'Sabores que contam histórias',

    // About & Team
    'En el Reparto Nuevo Bayamo, nació una idea transformadora: crear un espacio donde la gastronomía cubana se vistiera de gala. Restaurante - Terraza 53&M se ha consolidado como un "lugar de lujo" en la zona, redefiniendo la experiencia culinaria con un toque de distinción y autenticidad.': 'No Bairro Nuevo Bayamo nasceu uma ideia transformadora: criar um espaço onde a gastronomia cubana se vestisse de gala. Restaurante - Terraza 53&M consolidou-se como um lugar de luxo redefinindo a experiência culinária.',
    'Nuestra misión es ofrecer gastronomía cubana elegante con un servicio excepcional. Cada detalle está diseñado para que disfrutes no solo de platos exquisitos, sino de momentos memorables en un ambiente que combina la calidez de nuestra tierra con la sofisticación internacional.': 'Nossa missão é oferecer gastronomia cubana elegante com serviço excepcional. Cada detalhe é desenhado para que desfrute de momentos memoráveis combinando o calor da nossa terra com a sofisticação internacional.',
    'Sabor Auténtico': 'Sabor Autêntico',
    'Ambiente Exclusivo': 'Ambiente Exclusivo',
    'Atención de Primera': 'Atendimento de Primeira',
    'Nuestro Equipo': 'Nossa Equipe',
    'Las manos y rostros que hacen posible la excelencia en 53&M': 'As mãos e rostos que tornam a excelência possível no 53&M',
    'Equipo 53&M': 'Equipe 53&M',
    'Exclusividad': 'Exclusividade',
    'Diferencia': 'Diferencial',
    'Sabor': 'Sabor',
    'Elegancia': 'Elegância',

    // Services
    'Nuestros Servicios': 'Nossos Serviços',
    'Experiencias diseñadas para todos los sentidos': 'Experiências desenhadas para todos os sentidos',
    'Restaurante': 'Restaurante',
    'Bar y Coctelería': 'Bar e Coquetelaria',
    'Terraza Privada': 'Esplanada Privada',
    'Terraza al Aire Libre': 'Esplanada Ao Ar Livre',
    'Eventos Especiales': 'Eventos Especiais',
    'Eventos Privados': 'Eventos Privados',
    'Almuerzos y cenas elegantes con lo mejor de la cocina cubana e internacional.': 'Almoços e jantares elegantes com o melhor da cozinha cubana e internacional.',
    'Una selección exclusiva de cócteles preparados por nuestros bartenders expertos.': 'Uma seleção exclusiva de coquetéis preparados pelos nossos bartenders especialistas.',
    'Espacios al aire libre ideales para eventos, celebraciones y reuniones íntimas.': 'Espaços ao ar livre ideais para eventos, celebrações e reuniões íntimas.',
    'Espacios frescos para disfrutar de una velada inolvidable bajo las estrellas.': 'Espaços frescos para desfrutar de uma noite inesquecível sob as estrelas.',
    'Cumpleaños, aniversarios y ocasiones especiales con un toque de distinción.': 'Aniversários e ocasiões especiais com um toque de distinção.',
    'Celebraciones exclusivas con menús personalizados y atención personalizada.': 'Celebrações exclusivas com menus personalizados e atendimento sob medida.',

    // Menu & Categories
    'Especialidades de la Casa': 'Especialidades da Casa',
    'Ver Menú Completo': 'Ver Menu Completo',
    'Cerrar Menú': 'Fechar Menu',
    'Buscar plato o ingrediente...': 'Procurar prato ou ingrediente...',
    'Todas las Categorías': 'Todas as Categorias',
    'Todos': 'Todos',
    'Entradas': 'Entradas',
    'Platos Principales': 'Pratos Principais',
    'Platos Fuertes': 'Pratos Principais',
    'Especialidad': 'Especialidade',
    'Postres': 'Sobremesas',
    'Bebidas': 'Bebidas e Coquetéis',
    'Añadir a mi Reserva': 'Adicionar à minha Reserva',
    'Precio': 'Preço',
    'Ingredientes': 'Ingredientes',
    'Sin Gluten': 'Sem Glúten',
    'Vegano': 'Vegano',
    'Especialidad de la Casa': 'Especialidade da Casa',
    'Nuestra Historia': 'Nossa História',
    'Ingredientes Principales': 'Ingredientes Principais',
    'Descubrir': 'Descobrir',
    'Los más populares': 'Os Mais Populares',
    'Nuestro Menú': 'Nosso Menu',
    'Añadir': 'Adicionar',
    'Añadido': 'Adicionado',

    // Dishes
    'Tabla 53&M': 'Tábua 53&M',
    'Frituras, jamón y quesos con salsas de la casa.': 'Frituras, presunto e queijos com molhos da casa.',
    'Cerdo Glaseado': 'Porco Glaciado',
    'Lonjas de cerdo asado con vegetales y salsa.': 'Fatias de porco assado com vegetais e molho.',
    'Ensalada de Camarones': 'Salada de Camarão',
    'Camarones sobre vegetales con aderezo cremoso.': 'Camarões frescos sobre vegetais com molho cremoso.',
    'Coctel 53&M': 'Coquetel 53&M',
    'Nuestra firma refrescante con equilibrio perfecto.': 'A nossa bebida exclusiva refrescante com equilíbrio perfeito.',
    'Tostones Rellenos': 'Tostones Recheados',
    'Tostones crujientes rellenos de ropa vieja.': 'Tostones crocantes recheados com carne desfiada.',
    'Arroz Frito 53&M': 'Arroz Frito 53&M',
    'Arroz frito al estilo cubano con cerdo, jamón y camarones.': 'Arroz frito estilo cubano com porco, presunto e camarão.',
    'Mojito Tradicional': 'Mojito Tradicional',
    'El clásico cubano con hierbabuena fresca y ron blanco.': 'O clássico cubano com hortelã fresca e rum branco.',
    'Fricase de Pollo': 'Fricassê de Frango',
    'Pollo estofado en salsa de tomate con papas y aceitunas.': 'Frango ensopado em molho de tomate com batatas e azeitonas.',

    // Gallery & Promos
    'Galería de Momentos': 'Galeria de Momentos',
    'Conoce nuestros ambientes y la experiencia que te espera': 'Conheça nossos ambientes e a experiência que o espera',
    'Promociones y Eventos Especiales': 'Promoções e Eventos Especiais',
    'Porque te mereces lo mejor': 'Porque você merece o melhor',
    'Cumpleañeros': 'Especial Aniversário',
    '15% OFF': '15% de Desconto',
    'Disfruta de un 15% de descuento en tu celebración durante los meses de junio, julio y agosto. ¡Ven a festejar tu día especial con nosotros!': 'Desfrute de 15% de desconto na sua celebração nos meses de junho, julho e agosto!',
    'Paquetes para Dos': 'Pacotes para Dois',
    'Parejas': 'Casais',
    'Paquetes gastronómicos diseñados exclusivamente para parejas, incluyendo servicios complementarios para una velada inolvidable.': 'Pacotes gastronômicos exclusivos para casais para uma noite inesquecível.',
    'Fin de Semana': 'Fim de Semana',
    'Sáb & Dom': 'Sáb e Dom',
    'Ofertas especiales de almuerzo y cena todos los sábados y domingos. ¡Te esperamos desde las 12:00 pm para comenzar el fin de semana con sabor!': 'Ofertas especiais de almoço e jantar todos os sábados e domingos a partir das 12:00!',

    // Testimonials & FAQ
    'Testimonios': 'Depoimentos',
    'Lo que dicen nuestros clientes': 'O que dizem nossos clientes',
    'Definitivamente el lugar de lujo en Bayamo. El servicio fue impecable y los platos exquisitos. Un rincón diferente y delicioso.': 'Definitivamente o lugar de luxo em Bayamo. Serviço impecável e pratos requintados.',
    'La ambientación de la terraza es hermosa, perfecta para celebrar un aniversario. La atención del personal es muy buena y profesional.': 'O ambiente do terraço é lindo, perfeito para celebrar um aniversário. Atendimento sensacional.',
    'Los cócteles y las tablas para compartir son de otro nivel. Súper recomendado si buscas comer rico y pasar un momento agradable.': 'Os coquetéis e as tábuas para compartilhar são sensacionais. Muito recomendado!',
    'Preguntas Frecuentes': 'Perguntas Frequentes',
    '¿Cómo puedo hacer una reserva?': 'Como posso fazer uma reserva?',
    'Puedes realizar tu reserva a través del formulario de nuestra página, o más rápidamente, enviándonos un mensaje directo por WhatsApp o nuestras redes sociales (Facebook o Instagram).': 'Pode fazer a sua reserva através do formulário do site ou enviando uma mensagem no WhatsApp.',
    '¿Qué métodos de pago aceptan?': 'Quais métodos de pagamento aceitam?',
    'Aceptamos pagos en efectivo (CUP) y métodos electrónicos como Transfermóvil y EnZona. También aceptamos USD según disponibilidad.': 'Aceitamos pagamentos em dinheiro (CUP), Transfermóvil, EnZona e USD conforme disponibilidade.',
    '¿Tienen opciones para eventos o cumpleaños?': 'Têm opções para eventos ou aniversários?',
    '¡Sí! Ofrecemos paquetes especiales para cumpleaños y parejas. Puedes contactar directamente al administrador para personalizar tu evento.': 'Sim! Oferecemos pacotes especiais para aniversários e casais.',
    '¿Cuál es el horario de atención?': 'Qual é o horário de atendimento?',
    'Estamos abiertos de Lunes a Domingo, de 12:00 PM a 11:00 PM.': 'Aberto de Segunda a Domingo, das 12:00 às 23:00.',

    // Contact
    'Ubicación y Contacto': 'Localización e Contacto',
    'Dirección': 'Endereço',
    'Horario': 'Horário',
    'Lunes a Domingo: 12:00 PM - 11:00 PM': 'Segunda a Domingo: 12:00 - 23:00',
    'Teléfono': 'Telefone',
    'Correo': 'E-mail',
    'Reservar Mesa Ahora': 'Reservar Mesa Agora',
    'Contactar Administrador por WhatsApp': 'Contactar Admin por WhatsApp',

    // Order & Cart
    'Revisar Pedido': 'Revisar Pedido',
    'Tu Pedido': 'Seu Pedido',
    'No hay platos en tu pedido.': 'Não há pratos no seu pedido.',
    'Total Pedido': 'Total do Pedido',
    'Número de Mesa': 'Número da Mesa',
    'Enviar Pedido': 'Enviar Pedido',
    'Enviar Reserva y Pedido': 'Enviar Reserva e Pedido',
    'Serás redirigido a WhatsApp para confirmar tu pedido.': 'Você será redirecionado ao WhatsApp para confirmar o seu pedido.',
    'platos': 'pratos',
    'Revisar': 'Revisar',

    // Reservation Wizard
    '¿Para cuántas personas?': 'Para quantas pessoas?',
    '¿Qué día nos visitas?': 'Em que dia nos visita?',
    '¿En qué horario?': 'A que horas?',
    'Datos de Contacto': 'Dados de Contacto',
    'Nombre completo': 'Nome completo',
    'Confirmar Reserva': 'Confirmar Reserva',
    'Solo Enviar Reserva': 'Apenas Enviar Reserva',
    'Adelantar Pedidos del Menú': 'Adiantar Pedidos do Menu',
    'Serás redirigido a WhatsApp para confirmar los detalles.': 'Será redirecionado ao WhatsApp para confirmar os detalhes.',
    '¿Tienes dudas con tu reservación?': 'Dúvidas sobre a sua reserva?',
    'Solicitar reserva de grupo al Administrador por WhatsApp': 'Solicitar reserva de grupo ao Administrador por WhatsApp',
    'Fecha': 'Data',
    'Hora': 'Hora',
    'Personas': 'Pessoas',
    'Ocasión': 'Ocasião',
    'comensales': 'pessoas',
    'Cena romántica': 'Jantar Romântico',
    'Cumpleaños': 'Aniversário',
    'Reunión de negocios': 'Reunião de Negócios',
    'Familiar / Amigos': 'Família / Amigos',
    'Otro': 'Outro',
    'Siguiente': 'Seguinte',
    'Anterior': 'Anterior',
    'A nombre de': 'Em nome de',
    'Cambiar Fecha / Detalles': 'Alterar Data / Detalhes',
    'Cancelar Reserva': 'Cancelar Reserva',

    // User Dashboard
    'Gestiona, modifica o cancela tus próximas experiencias en 53&M': 'Gerencie, altere ou cancele suas próximas experiências no 53&M',
    'No tienes reservas activas': 'Não tem reservas ativas',
    '¿Listo para vivir una experiencia diferente?': 'Pronto para viver uma experiência diferente?',
    'Hablar con el Administrador por WhatsApp': 'Falar com o Administrador no WhatsApp',
    'Estado': 'Estado',
    'Pendiente': 'Pendente',
    'Confirmada': 'Confirmada',
    'Completada': 'Concluída',
    'Cancelada': 'Cancelada',

    // Staff Login
    'Administrador, Jefe de Restaurante o Dependiente': 'Administrador, Gerente ou Garçom',
    'Usuario o Teléfono Móvil': 'Usuário ou Telefone',
    'Contraseña': 'Senha',
    'Ingresar al Sistema': 'Entrar no Sistema',
    'ID de este dispositivo:': 'ID deste dispositivo:',
    '* Las sesiones de personal caducan automáticamente a las 24 horas.': '* As sessões da equipe expiram em 24 horas.',
    'Las cuentas de Administrador y Dependiente no realizan reservas.': 'Contas de Administrador e Garçom não fazem reservas.',
    'Restaurante - Terraza 53&M. Todos los derechos reservados.': 'Restaurante - Terraza 53&M. Todos os direitos reservados.',
    'Restaurante - Terraza 53&M. Todos los derechos reservados | Desarrollado por': 'Restaurante - Terraza 53&M. Todos os direitos reservados | Desenvolvido por'
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'es',
  setLanguage: () => {},
  t: (text: string) => text
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('appLanguage') as Language;
    return (saved && ['es', 'en', 'fr', 'pt'].includes(saved)) ? saved : 'es';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('appLanguage', lang);
  };

  const t = (text: string): string => {
    if (!text || language === 'es') return text;
    const langDict = TRANSLATIONS[language];
    if (!langDict) return text;

    if (langDict[text]) {
      return langDict[text];
    }

    const trimmed = text.trim();
    if (langDict[trimmed]) {
      return langDict[trimmed];
    }

    // Secondary case-insensitive match
    const lowerText = trimmed.toLowerCase();
    const foundKey = Object.keys(langDict).find(k => k.toLowerCase() === lowerText);
    if (foundKey && langDict[foundKey]) {
      return langDict[foundKey];
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
