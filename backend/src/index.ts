import { Hono } from 'hono'
import auth from './routes/auth.route'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

//routes
app.route('/auth', auth)


export default app
