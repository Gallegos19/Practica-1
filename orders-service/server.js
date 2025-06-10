const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3002;
const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://localhost:3001';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Base de datos en memoria
let orders = [];

// Configuración Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Orders Service API',
      version: '1.0.0',
      description: 'Microservicio para gestión de pedidos',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Servidor de desarrollo',
      },
    ],
  },
  apis: ['./server.js'],
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       required:
 *         - userId
 *         - items
 *         - total
 *       properties:
 *         id:
 *           type: string
 *           description: ID único del pedido
 *         userId:
 *           type: string
 *           description: ID del usuario que hace el pedido
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               quantity:
 *                 type: number
 *               price:
 *                 type: number
 *         total:
 *           type: number
 *           description: Total del pedido
 *         status:
 *           type: string
 *           enum: [pending, processing, shipped, delivered, cancelled]
 *           description: Estado del pedido
 *         createdAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: "123e4567-e89b-12d3-a456-426614174000"
 *         userId: "456e7890-e89b-12d3-a456-426614174000"
 *         items:
 *           - name: "Laptop"
 *             quantity: 1
 *             price: 999.99
 *         total: 999.99
 *         status: "pending"
 *         createdAt: "2024-01-01T00:00:00.000Z"
 */

// Función para verificar si el usuario existe
async function verifyUser(userId) {
  try {
    const response = await axios.get(`${USERS_SERVICE_URL}/users/${userId}`);
    return response.status === 200;
  } catch (error) {
    console.error('Error verificando usuario:', error.message);
    return false;
  }
}

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Gestión de pedidos
 */

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Obtiene todos los pedidos
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filtrar pedidos por ID de usuario
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, shipped, delivered, cancelled]
 *         description: Filtrar pedidos por estado
 *     responses:
 *       200:
 *         description: Lista de pedidos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 */
app.get('/orders', (req, res) => {
  let filteredOrders = orders;
  
  if (req.query.userId) {
    filteredOrders = filteredOrders.filter(order => order.userId === req.query.userId);
  }
  
  if (req.query.status) {
    filteredOrders = filteredOrders.filter(order => order.status === req.query.status);
  }
  
  res.json(filteredOrders);
});

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Obtiene un pedido por ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del pedido
 *     responses:
 *       200:
 *         description: Pedido encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Pedido no encontrado
 */
app.get('/orders/:id', (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Pedido no encontrado' });
  }
  res.json(order);
});

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Crea un nuevo pedido
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - items
 *               - total
 *             properties:
 *               userId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     price:
 *                       type: number
 *               total:
 *                 type: number
 *             example:
 *               userId: "456e7890-e89b-12d3-a456-426614174000"
 *               items:
 *                 - name: "Laptop"
 *                   quantity: 1
 *                   price: 999.99
 *               total: 999.99
 *     responses:
 *       201:
 *         description: Pedido creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Datos inválidos o usuario no existe
 */
app.post('/orders', async (req, res) => {
  const { userId, items, total } = req.body;
  
  if (!userId || !items || !total) {
    return res.status(400).json({ error: 'userId, items y total son requeridos' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items debe ser un array no vacío' });
  }

  // Verificar que el usuario existe
  const userExists = await verifyUser(userId);
  if (!userExists) {
    return res.status(400).json({ error: 'El usuario no existe' });
  }

  const order = {
    id: uuidv4(),
    userId,
    items,
    total,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  orders.push(order);
  res.status(201).json(order);
});

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     summary: Actualiza el estado de un pedido
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del pedido
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, shipped, delivered, cancelled]
 *             example:
 *               status: "processing"
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       404:
 *         description: Pedido no encontrado
 *       400:
 *         description: Estado inválido
 */
app.patch('/orders/:id/status', (req, res) => {
  const orderIndex = orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Pedido no encontrado' });
  }

  const { status } = req.body;
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  orders[orderIndex].status = status;
  orders[orderIndex].updatedAt = new Date().toISOString();

  res.json(orders[orderIndex]);
});

/**
 * @swagger
 * /orders/{id}:
 *   delete:
 *     summary: Elimina un pedido
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del pedido
 *     responses:
 *       204:
 *         description: Pedido eliminado
 *       404:
 *         description: Pedido no encontrado
 */
app.delete('/orders/:id', (req, res) => {
  const orderIndex = orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Pedido no encontrado' });
  }

  orders.splice(orderIndex, 1);
  res.status(204).send();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'orders-service', 
    timestamp: new Date().toISOString(),
    usersServiceUrl: USERS_SERVICE_URL
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Orders Service corriendo en puerto ${PORT}`);
  console.log(`📖 Swagger UI disponible en http://localhost:${PORT}/api-docs`);
  console.log(`🔗 Conectado a Users Service en ${USERS_SERVICE_URL}`);
});

module.exports = app;