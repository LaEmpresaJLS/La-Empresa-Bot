# Vape Bot - Bot de WhatsApp para Venta de Vapes

## Descripción
Este es un bot de WhatsApp para mi negocio de venta de vapes en Montevideo. El bot permite a los clientes:
- Ver una lista de vapes disponibles (Lost Mary, ElfBar, etc.) y elegir sabores con botones interactivos.
- Seleccionar el método de envío (envío por $250, Pedidos Ya/Uber Flash, o retiro en Carrasco).
- Elegir el método de pago (transferencia, efectivo, Mercado Pago).
- Confirmar el pedido y enviarme los detalles para coordinar la entrega.

El bot está construido con Node.js, usa Twilio para conectarse a WhatsApp, y está hospedado en Heroku.

## Archivos
- `bot.js`: Código principal del bot.
- `package.json`: Dependencias del bot (express, twilio, dotenv).
- `.env`: Variables de entorno (credenciales de Twilio y otras configuraciones).

## Cómo usarlo
1. Configura una cuenta en Twilio y obtén un número de WhatsApp.
2. Sube este repositorio a Heroku.
3. Configura las variables de entorno en Heroku (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`).
4. Conecta Twilio con Heroku configurando el webhook.
5. Activa WhatsApp enviando el mensaje `join [palabra]` al número de Twilio.
6. Prueba el bot enviando un mensaje desde WhatsApp.

## Notas
- Este bot es para uso personal de mi negocio de vapes.
- Asegúrate de eliminar el archivo `.env` de GitHub después de configurar las variables en Heroku para proteger los datos sensibles.
- Más adelante, puedo añadir funciones como promos, inventario, o notificaciones por email.

## Contacto
Creado por VapeCrew.uy , Montevideo, Uruguay.
