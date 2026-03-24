import { Hono } from 'hono'
import { cors } from 'hono/cors'
import auth from './routes/auth.route'
import gmail from './routes/gmail.route'

const app = new Hono()

const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3001'

app.use(
  '*',
  cors()
)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

//routes
app.route('/auth', auth)
app.route('/api/gmail', gmail)


export default app
