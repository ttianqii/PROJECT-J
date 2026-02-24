import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { pronunciationRoutes } from './routes/pronunciation'

const PORT = Number(process.env.PORT) || 3001

const app = new Elysia()
  .use(
    cors({
      origin: ['http://localhost:5173', 'http://localhost:5174'],
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    }),
  )
  .use(
    swagger({
      path: '/docs',
      documentation: {
        info: {
          title: 'PROJECT-J Pronunciation API',
          version: '1.0.0',
          description:
            'Backend for Thai ⇄ Japanese pronunciation learning app. Powered by OpenAI Whisper.',
        },
      },
    }),
  )
  // Health check
  .get('/api/health', () => ({ ok: true, timestamp: new Date().toISOString() }))
  // Pronunciation assessment
  .use(pronunciationRoutes)
  .listen(PORT)

console.log(`🚀 PROJECT-J backend running at http://localhost:${PORT}`)
console.log(`📖 Swagger docs at http://localhost:${PORT}/docs`)
