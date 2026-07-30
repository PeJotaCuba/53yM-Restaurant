import { MenuItem } from './types';

export const MENU_ITEMS: MenuItem[] = [
  {
    id: '1',
    name: 'Tabla 53&M',
    category: 'Entradas',
    shortDescription: 'Frituras, jamón y quesos con salsas de la casa.',
    sensoryDescription: 'Una explosión de texturas: el crujir dorado de nuestras frituras tradicionales contrasta con la suavidad de quesos seleccionados y el toque ahumado del jamón. Cada bocado se realza con nuestras salsas artesanales.',
    story: 'Inspirada en las reuniones familiares domingueras de Bayamo, donde siempre hay "algo para picar" en el centro de la mesa. Nuestra versión eleva esta tradición con ingredientes de primera.',
    ingredients: ['Frituras de malanga', 'Jamón ahumado', 'Queso Gouda', 'Aceitunas', 'Salsa brava de la casa'],
    priceCUP: 2500,
    priceUSD: 8,
    imageUrl: 'https://z-cdn-media.chatglm.cn/files/097656df-1db6-471e-b27a-7bb51288dcdc.jpg?auth_key=1885072204-3ffce6651cd44325a80ec815abe63883-0-ddcbb5c83fd15b3aafc7126350ec2134'
  },
  {
    id: '2',
    name: 'Cerdo Glaseado',
    category: 'Platos Fuertes',
    shortDescription: 'Lonjas de cerdo asado con vegetales y salsa.',
    sensoryDescription: 'Imagina el aroma del cerdo asado a fuego lento, caramelizado en su exterior pero jugoso por dentro. Un baño de glaseado agridulce que despierta el paladar, acompañado de vegetales al dente.',
    story: 'El cerdo asado es el rey de las fiestas cubanas. En 53&M lo reinterpretamos: técnicas modernas de cocción lenta con los adobos de nuestras abuelas, creando un puente entre lo clásico y lo contemporáneo.',
    ingredients: ['Lomo de cerdo', 'Miel y mostaza', 'Ajo y naranja agria', 'Vegetales de temporada'],
    priceCUP: 4500,
    priceUSD: 14,
    imageUrl: 'https://z-cdn-media.chatglm.cn/files/f8a6699a-c53e-410b-a1f3-fd4c3027f55f.jpg?auth_key=1885072204-effa97ef1e5740658a7c4e43e8726751-0-7a741a911c6a4d30c2b3e77169ea33f4'
  },
  {
    id: '3',
    name: 'Ensalada de Camarones',
    category: 'Especialidad',
    shortDescription: 'Camarones sobre vegetales con aderezo cremoso.',
    sensoryDescription: 'Frescura total. La brisa marina en un plato. Camarones tiernos y rosados reposan sobre hojas verdes crujientes, todo abrazado por un aderezo cítrico y cremoso que limpia el paladar.',
    story: 'Un homenaje a nuestras costas. Traemos los camarones más frescos y los tratamos con el respeto que merecen, acompañándolos solo con ingredientes que realcen su dulzor natural.',
    ingredients: ['Camarones frescos', 'Lechuga romana', 'Tomates cherry', 'Aderezo de limón y cilantro'],
    priceCUP: 3800,
    priceUSD: 12,
    imageUrl: 'https://z-cdn-media.chatglm.cn/files/41b63cb5-b31a-466d-9e40-b2cb1a483fc7.jpg?auth_key=1885072204-c2ae5ffe75a04e0b92bdd0e5103388ca-0-80de0c22a524123fe27789f7d99c7ebe'
  },
  {
    id: '4',
    name: 'Coctel 53&M',
    category: 'Bebidas',
    shortDescription: 'Nuestra firma refrescante con equilibrio perfecto.',
    sensoryDescription: 'Un baile de sabores tropicales. El toque fuerte del ron añejo se suaviza con notas frutales, dejando un final refrescante con un ligero cosquilleo en los labios.',
    story: 'Diseñado por nuestro bartender principal para encapsular el espíritu de la terraza: vibrante, elegante y profundamente cubano.',
    ingredients: ['Ron Havana Club', 'Zumo de piña', 'Sirope de menta', 'Toque de cítricos'],
    priceCUP: 1200,
    priceUSD: 4,
    imageUrl: 'https://z-cdn-media.chatglm.cn/files/6bec7882-cc95-438d-b057-cc7b8f5e1346.jpg?auth_key=1885072204-0ffb1a7eca5645cebfb5ba564e33faea-0-a51e75e28e7e8ea35ccd90cfde74f7b3'
  },
  {
    id: '5',
    name: 'Tostones Rellenos',
    category: 'Entradas',
    shortDescription: 'Tostones crujientes rellenos de ropa vieja.',
    sensoryDescription: 'El crujido perfecto del plátano frito da paso a la jugosidad y el sabor intenso de una ropa vieja preparada a fuego lento, creando el equilibrio ideal de texturas y sabores criollos.',
    story: 'Un clásico de las fiestas en Cuba que nunca decepciona, elevado con nuestra sazón secreta y un toque moderno.',
    ingredients: ['Plátano macho', 'Carne de res', 'Sofrito cubano', 'Especias'],
    priceCUP: 2100,
    priceUSD: 7,
    imageUrl: 'https://z-cdn-media.chatglm.cn/files/a20cb29b-f9d1-4394-a1a1-26761d8b70a4.jpg?auth_key=1885072204-9eaa3475fe634f809b8a4c9f93cd88d3-0-9f084dd3e3c56836fbf428035774d9cf'
  },
  {
    id: '6',
    name: 'Arroz Frito 53&M',
    category: 'Platos Fuertes',
    shortDescription: 'Arroz frito al estilo cubano con cerdo, jamón y camarones.',
    sensoryDescription: 'Un festival de sabores en cada bocado, combinando la frescura de los camarones, el ahumado del cerdo y el jamón, con un arroz suelto y lleno de matices asiático-cubanos.',
    story: 'Una fusión que celebra la herencia multicultural de nuestra cocina, preparado en wok al momento para sellar todos sus sabores.',
    ingredients: ['Arroz blanco', 'Cerdo asado', 'Jamón', 'Camarones', 'Salsa de soja', 'Cebollino'],
    priceCUP: 3500,
    priceUSD: 11,
    imageUrl: 'https://z-cdn-media.chatglm.cn/files/d65f4c50-d968-40d9-a900-31747523a606.jpg?auth_key=1885072204-ceb472f4217e4d66961f5e7c1298ca43-0-d31b88ad817d66faad48095088e864cf'
  },
  {
    id: '7',
    name: 'Mojito Tradicional',
    category: 'Bebidas',
    shortDescription: 'El clásico cubano con hierbabuena fresca y ron blanco.',
    sensoryDescription: 'Refrescante y equilibrado, con el aroma intenso de la hierbabuena macerada, el dulzor justo y la frescura del limón.',
    story: 'El rey de la coctelería cubana, preparado respetando la receta tradicional para refrescar las tardes en nuestra terraza.',
    ingredients: ['Ron blanco', 'Hierbabuena', 'Azúcar', 'Zumo de limón', 'Agua con gas'],
    priceCUP: 900,
    priceUSD: 3,
    imageUrl: 'https://z-cdn-media.chatglm.cn/files/6bec7882-cc95-438d-b057-cc7b8f5e1346.jpg?auth_key=1885072204-0ffb1a7eca5645cebfb5ba564e33faea-0-a51e75e28e7e8ea35ccd90cfde74f7b3'
  },
  {
    id: '8',
    name: 'Fricase de Pollo',
    category: 'Platos Fuertes',
    shortDescription: 'Pollo estofado en salsa de tomate con papas y aceitunas.',
    sensoryDescription: 'Un guiso reconfortante y lleno de sabor, donde el pollo se deshace en la boca, bañado en una salsa rica y espesa.',
    story: 'Un plato de la abuela, cocinado a fuego lento con amor y tradición, perfecto para sentirse en casa.',
    ingredients: ['Pollo', 'Papas', 'Salsa de tomate', 'Aceitunas', 'Vino seco'],
    priceCUP: 3200,
    priceUSD: 10,
    imageUrl: 'https://z-cdn-media.chatglm.cn/files/f8a6699a-c53e-410b-a1f3-fd4c3027f55f.jpg?auth_key=1885072204-effa97ef1e5740658a7c4e43e8726751-0-7a741a911c6a4d30c2b3e77169ea33f4'
  }
];

export const CATEGORIES = ['Todos', 'Entradas', 'Platos Fuertes', 'Especialidad', 'Bebidas'];
