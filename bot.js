const express = require('express');
const twilio = require('twilio');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: true }));

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Almacenamiento temporal de pedidos (puedes usar MongoDB)
const orders = {};

// Lista de productos (actualizada según tu lista)
const products = {
  'Lost Mary 20k': [
    { id: 'miami_mint', name: 'Miami Mint', price: 1300 },
    { id: 'strawberry_kiwi', name: 'Strawberry Kiwi', price: 1300 },
    { id: 'lime_grapefruit', name: 'Lime Grapefruit', price: 1300 },
    { id: 'blue_razz_ice', name: 'Blue Razz Ice', price: 1300 },
    { id: 'kiwi_passion_fruit_guava', name: 'Kiwi Passion Fruit Guava', price: 1300 },
    { id: 'blue_baja_splash', name: 'Blue Baja Splash', price: 1300 },
    { id: 'banana_ice', name: 'Banana Ice', price: 1300 },
    { id: 'ice_mint', name: 'Ice Mint', price: 1300 },
    { id: 'mango_twist', name: 'Mango Twist', price: 1300 },
    { id: 'watermelon_sour_peach', name: 'Watermelon Sour Peach', price: 1300 },
    { id: 'strawberry_ice', name: 'Strawberry Ice', price: 1300 },
    { id: 'pina_colada', name: 'Piña Colada', price: 1300 },
    { id: 'watermelon_ice', name: 'Watermelon Ice', price: 1300 },
    { id: 'peach', name: 'Peach', price: 1300 },
    { id: 'pineapple_ice', name: 'Pineapple Ice', price: 1300 },
    { id: 'grape_ice', name: 'Grape Ice', price: 1300 },
  ],
};

// Manejar mensajes entrantes
app.post('/webhook', async (req, res) => {
  const from = req.body.From;
  const message = req.body.Body ? req.body.Body.toLowerCase() : '';
  const buttonPayload = req.body.ButtonText || '';

  let response = '';

  // Estado inicial: bienvenida
  if (!orders[from] && !buttonPayload) {
    orders[from] = { step: 'welcome', items: [], delivery: null, address: '', payment: null };
    response = {
      body: '¡Hola! Bienvenido a Vape Shop. ¿Quieres ver la lista de vapes? (Precio: $1300, promo 2 x $2400)',
      buttons: [
        { id: 'see_list', title: 'Ver lista' },
        { id: 'help', title: 'Ayuda' },
      ],
    };
  }
  // Manejar selección de botón
  else if (buttonPayload) {
    const order = orders[from];

    // Seleccionar categoría
    if (order.step === 'welcome' && buttonPayload === 'see_list') {
      order.step = 'select_category';
      response = {
        body: 'Elige una categoría:',
        list: {
          title: 'Categorías',
          sections: [
            {
              title: 'Vapes',
              rows: Object.keys(products).map((cat) => ({
                id: `cat_${cat}`,
                title: cat,
              })),
            },
          ],
        },
      };
    }
    // Seleccionar sabor
    else if (order.step === 'select_category' && buttonPayload.startsWith('cat_')) {
      const category = buttonPayload.replace('cat_', '');
      order.category = category;
      order.step = 'select_flavor';
      response = {
        body: `Elige un sabor de ${category}:`,
        list: {
          title: 'Sabores',
          sections: [
            {
              title: category,
              rows: products[category].map((flavor) => ({
                id: `flavor_${flavor.id}`,
                title: `${flavor.name} ($${flavor.price})`,
              })),
            },
          ],
        },
      };
    }
    // Confirmar sabor
    else if (order.step === 'select_flavor' && buttonPayload.startsWith('flavor_')) {
      const flavorId = buttonPayload.replace('flavor_', '');
      const flavor = products[order.category].find((f) => f.id === flavorId);
      order.items.push(flavor);
      order.step = 'more_items';

      // Si ya tiene 2 vapes, pasa al siguiente paso
      if (order.items.length >= 2) {
        order.step = 'delivery';
        response = {
          body: '¿Cómo prefieres recibir tu pedido?',
          buttons: [
            { id: 'delivery', title: 'Envío ($250, en el día)' },
            { id: 'instant', title: 'Pedidos Ya/Uber Flash (inmediato)' },
            { id: 'pickup', title: 'Retiro' },
          ],
        };
      } else {
        response = {
          body: `Añadiste ${flavor.name}. ¿Quieres añadir otro del mismo sabor o elegir uno diferente?`,
          buttons: [
            { id: `same_${flavor.id}`, title: 'Añadir otro del mismo' },
            { id: 'different', title: 'Elegir uno diferente' },
          ],
        };
      }
    }
    // Añadir otro del mismo sabor
    else if (order.step === 'more_items' && buttonPayload.startsWith('same_')) {
      const flavorId = buttonPayload.replace('same_', '');
      const flavor = products[order.category].find((f) => f.id === flavorId);
      order.items.push(flavor);
      order.step = 'delivery'; // Ya tiene 2 vapes, pasa al siguiente paso
      response = {
        body: `Añadiste otro ${flavor.name}. Ahora tienes 2 vapes. ¿Cómo prefieres recibir tu pedido?`,
        buttons: [
          { id: 'delivery', title: 'Envío ($250, en el día)' },
          { id: 'instant', title: 'Pedidos Ya/Uber Flash (inmediato)' },
          { id: 'pickup', title: 'Retiro' },
        ],
      };
    }
    // Elegir un sabor diferente
    else if (order.step === 'more_items' && buttonPayload === 'different') {
      order.step = 'select_flavor';
      response = {
        body: `Elige otro sabor de ${order.category}:`,
        list: {
          title: 'Sabores',
          sections: [
            {
              title: order.category,
              rows: products[order.category].map((flavor) => ({
                id: `flavor_${flavor.id}`,
                title: `${flavor.name} ($${flavor.price})`,
              })),
            },
          ],
        },
      };
    }
    // Continuar con entrega
    else if (order.step === 'delivery') {
      if (buttonPayload === 'delivery') {
        order.delivery = 'delivery';
        order.step = 'address';
        response = {
          body: 'Por favor, envía tu dirección y hora preferida para el envío (se entregará lo antes posible en el día).',
        };
      } else if (buttonPayload === 'instant') {
        order.delivery = 'instant';
        order.step = 'address';
        response = {
          body: 'Por favor, envía tu dirección. Deberás pedir un Pedidos Ya o Uber Flash y cubrir el costo del envío.',
        };
      } else if (buttonPayload === 'pickup') {
        order.delivery = 'pickup';
        order.step = 'payment';
        // Calcula el total con la promo
        const baseTotal = order.items.reduce((sum, item) => sum + item.price, 0);
        const total = order.items.length === 2 ? 2400 : baseTotal;
        response = {
          body: `Tu pedido:\n${order.items.map((item) => `- ${item.name} ($${item.price})`).join('\n')}\nTotal: $${total}\nElige un método de pago:`,
          buttons: [
            { id: 'mercado_pago', title: 'Mercado Pago (preferente)' },
            { id: 'transfer', title: 'Transferencia' },
            { id: 'cash', title: 'Efectivo' },
          ],
        };
      }
    }
    // Seleccionar método de pago
    else if (order.step === 'payment' && ['mercado_pago', 'transfer', 'cash'].includes(buttonPayload)) {
      order.payment = buttonPayload;
      // Calcula el total con la promo
      const baseTotal = order.items.reduce((sum, item) => sum + item.price, 0);
      const total = order.items.length === 2 ? 2400 : baseTotal;
      const finalTotal = order.delivery === 'delivery' ? total + 250 : total;

      if (buttonPayload === 'cash') {
        order.step = 'confirm';
        response = {
          body: `Tu pedido:\n${order.items.map((item) => `- ${item.name} ($${item.price})`).join('\n')}\n${order.delivery === 'pickup' ? 'Método: Retiro' : `Envío a: ${order.address}`}\nTotal: $${finalTotal}\nPagarás en efectivo al recibir. ¿Confirmas?`,
          buttons: [
            { id: 'confirm', title: 'Confirmar' },
            { id: 'edit', title: 'Editar' },
          ],
        };
      } else {
        order.step = 'confirm';
        response = {
          body: `Tu pedido:\n${order.items.map((item) => `- ${item.name} ($${item.price})`).join('\n')}\n${order.delivery === 'pickup' ? 'Método: Retiro' : `Envío a: ${order.address}`}\nTotal: $${finalTotal}\n${buttonPayload === 'transfer' ? 'Transfiere a: Cuenta 12345678, Itaú, Lorenzo Lareo' : 'Paga con Mercado Pago (puedes pagar en cuotas, enlace enviado tras confirmar)'}\n¿Confirmas?`,
          buttons: [
            { id: 'confirm', title: 'Confirmar' },
            { id: 'edit', title: 'Editar' },
          ],
        };
      }
    }
    // Confirmar pedido
    else if (order.step === 'confirm' && buttonPayload === 'confirm') {
      // Calcula el total con la promo
      const baseTotal = order.items.reduce((sum, item) => sum + item.price, 0);
      const total = order.items.length === 2 ? 2400 : baseTotal;
      const finalTotal = order.delivery === 'delivery' ? total + 250 : total;

      if (order.payment === 'transfer') {
        response = {
          body: `¡Pedido confirmado! Total: $${finalTotal}\nPor favor, transfiere a:\nCuenta: 12345678, Itaú, Lorenzo Lareo\nEnvía el comprobante para coordinar la entrega.`,
        };
      } else if (order.payment === 'mercado_pago') {
        response = {
          body: `¡Pedido confirmado! Total: $${finalTotal}\nPaga con Mercado Pago: [Enlace de pago simulado]. Envía el comprobante para coordinar la entrega.`,
        };
      } else {
        response = {
          body: `¡Pedido confirmado! Total: $${finalTotal}\nPagarás en efectivo al recibir. Apenas llegue, manda ubicación.`,
        };
      }
      // Notificar al dueño (tú)
      console.log(`Nuevo pedido de ${from}:\n${JSON.stringify(order, null, 2)}`);

      // Enviar la dirección de retiro después de recibir el comprobante
      if (order.payment !== 'cash' && order.delivery === 'pickup') {
        setTimeout(() => {
          client.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: from,
            body: 'Te paso la dirección para el retiro: Valiente 4858.',
          });
        }, 1000); // Simula espera para el comprobante
      }

      delete orders[from]; // Limpiar el estado
    }
  }
  // Manejar dirección
  else if (orders[from].step === 'address') {
    orders[from].address = message;
    orders[from].step = 'payment';
    // Calcula el total con la promo
    const baseTotal = orders[from].items.reduce((sum, item) => sum + item.price, 0);
    const total = orders[from].items.length === 2 ? 2400 : baseTotal;
    const finalTotal = orders[from].delivery === 'delivery' ? total + 250 : total;

    response = {
      body: `Tu pedido:\n${order.items.map((item) => `- ${item.name} ($${item.price})`).join('\n')}\n${order.delivery === 'pickup' ? 'Método: Retiro' : `Envío a: ${order.address}`}\nTotal: $${finalTotal}\nElige un método de pago:`,
      buttons: [
        { id: 'mercado_pago', title: 'Mercado Pago (preferente)' },
        { id: 'transfer', title: 'Transferencia' },
        { id: 'cash', title: 'Efectivo' },
      ],
    };
  }
  // Respuesta por defecto
  else {
    response = {
      body: 'No entendí, ¿quieres ver la lista de vapes? (Precio: $1300, promo 2 x $2400)',
      buttons: [{ id: 'see_list', title: 'Ver lista' }],
    };
  }

  // Enviar respuesta
  const messagingService = client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to: from,
    body: response.body,
    ...(response.buttons && {
      contentSid: 'custom_buttons',
      contentVariables: JSON.stringify({
        buttons: response.buttons.map((b) => ({
          id: b.id,
          title: b.title,
        })),
      }),
    }),
    ...(response.list && {
      contentSid: 'custom_list',
      contentVariables: JSON.stringify(response.list),
    }),
  });

  res.status(200).send('OK');
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
