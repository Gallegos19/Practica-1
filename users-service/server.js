const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Base de datos en memoria (en producción usar MongoDB/PostgreSQL)
let users = [];

// Configuración Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Users Service API',
      version: '1.0.0',
      description: 'Microservicio para gestión de usuarios',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Servidor de desarrollo',
      },
    ],
  },
  apis: ['./server.js'], // archivos que contienen anotaciones
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *       properties:
 *         id:
 *           type: string
 *           description: ID único del usuario
 *         name:
 *           type: string
 *           description: Nombre del usuario
 *         email:
 *           type: string
 *           description: Email del usuario
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación
 *       example:
 *         id: "123e4567-e89b-12d3-a456-426614174000"
 *         name: "Juan Pérez"
 *         email: "juan@example.com"
 *         createdAt: "2024-01-01T00:00:00.000Z"
 */

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestión de usuarios
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Obtiene todos los usuarios
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
app.get('/users', (req, res) => {
  res.json(users);
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Obtiene un usuario por ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Usuario no encontrado
 */
app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  res.json(user);
});

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Crea un nuevo usuario
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *             example:
 *               name: "Juan Pérez"
 *               email: "juan@example.com"
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Datos inválidos
 */
app.post('/users', (req, res) => {
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Nombre y email son requeridos' });
  }

  // Verificar email único
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'El email ya existe' });
  }

  const user = {
    id: uuidv4(),
    name,
    email,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  res.status(201).json(user);
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Actualiza un usuario
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *       404:
 *         description: Usuario no encontrado
 */
app.put('/users/:id', (req, res) => {
  const userIndex = users.findIndex(u => u.id === req.params.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const { name, email } = req.body;
  if (name) users[userIndex].name = name;
  if (email) users[userIndex].email = email;

  res.json(users[userIndex]);
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Elimina un usuario
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del usuario
 *     responses:
 *       204:
 *         description: Usuario eliminado
 *       404:
 *         description: Usuario no encontrado
 */
app.delete('/users/:id', (req, res) => {
  const userIndex = users.findIndex(u => u.id === req.params.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  users.splice(userIndex, 1);
  res.status(204).send();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'users-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Users Service corriendo en puerto ${PORT}`);
  console.log(`📖 Swagger UI disponible en http://localhost:${PORT}/api-docs`);
});

module.exports = app;