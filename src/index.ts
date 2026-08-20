/// <reference types="@cloudflare/workers-types" />

// นำเข้า (Import) คลาส Hono จากโมดูล 'hono' เพื่อใช้สร้างตัวแปรเว็บเซิร์ฟเวอร์
import { Hono } from 'hono'

// กำหนดประเภทข้อมูล (Type Definition) สำหรับ Bindings ของ Cloudflare 
// บอกระบบว่าเรามีตัวแปรชื่อ 'DB' ที่เป็นฐานข้อมูลประเภท Cloudflare D1
type Bindings = {
  DB: D1Database
}

// สร้าง Instance ของแอป Hono พร้อมระบุ Type Bindings เพื่อให้ TypeScript รู้ว่าเซิร์ฟเวอร์ต่อกับฐานข้อมูล D1
const app = new Hono<{ Bindings: Bindings }>()

// ==========================================
// 1. POST /api/tasks -> เพิ่มรายการงานใหม่ (Create)
// ==========================================
app.post('/api/tasks', async (c) => {
  // ดึงค่า 'title' ออกจาก Body ของ Request ที่ส่งเข้ามาในรูปแบบ JSON
  const { title } = await c.req.json()
  
  // เช็คว่าผู้ใช้ส่ง title มาหรือไม่ ถ้าไม่มีให้ตอบกลับด้วย Status Code 400 (Bad Request)
  if (!title) return c.json({ error: 'Title is required' }, 400)

  // เตรียมคำสั่ง SQL เพื่อเพิ่มข้อมูล และใช้ .bind(title) ป้องกันการโจมตีแบบ SQL Injection
  // RETURNING * จะคืนค่าแถวข้อมูลที่เพิ่งถูกเพิ่มเข้ามาใหม่กลับมาด้วย
  const result = await c.env.DB.prepare(
    'INSERT INTO tasks (title) VALUES (?) RETURNING *'
  ).bind(title).first()

  // ส่งข้อมูลรายการที่เพิ่งสร้างกลับไปให้ Client พร้อม Status Code 201 (Created)
  return c.json(result, 201)
})

// ==========================================
// 2. GET /api/tasks -> ดึงรายการงานทั้งหมด (Read All)
// ==========================================
app.get('/api/tasks', async (c) => {
  // รันคำสั่ง SQL ดึงข้อมูลงานทั้งหมด เรียงลำดับจากวันที่สร้างใหม่ล่าสุดไปเก่าสุด
  // .all() จะคืนค่าเป็นอาเรย์ของข้อมูลทั้งหมดไว้ในตัวแปร results
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM tasks ORDER BY created_at DESC'
  ).all()
  
  // ส่งรายการงานทั้งหมดกลับไปให้ Client ในรูปแบบ JSON
  return c.json(results)
})

// ==========================================
// 3. GET /api/tasks/:id -> ดึงรายละเอียดงานเฉพาะ ID ที่ระบุ (Read One)
// ==========================================
app.get('/api/tasks/:id', async (c) => {
  // ดึงค่า 'id' ที่ส่งมาจาก URL Path (เช่น /api/tasks/1 ค่า id จะเท่ากับ 1)
  const id = c.req.param('id')
  
  // ค้นหางานในฐานข้อมูลที่มี id ตรงกับที่ระบุ ใช้ .first() เพราะต้องการผลลัพธ์แค่รายการเดียว
  const task = await c.env.DB.prepare(
    'SELECT * FROM tasks WHERE id = ?'
  ).bind(id).first()

  // ถ้าค้นแล้วไม่พบข้อมูล ให้ส่ง Error แจ้งเตือนพร้อม Status Code 404 (Not Found)
  if (!task) return c.json({ error: 'Task not found' }, 404)
  
  // ส่งข้อมูลงานรายการนั้นกลับไปให้ Client
  return c.json(task)
})

// ==========================================
// 4. PATCH /api/tasks/:id -> อัปเดตข้อมูลงาน (Update)
// ==========================================
app.patch('/api/tasks/:id', async (c) => {
  // รับค่า id จาก URL และรับข้อมูลที่ส่งมาแก้ไขจาก Request Body
  const id = c.req.param('id')
  const body = await c.req.json()
  
  // ตรวจสอบว่าผู้ใช้ส่งค่าที่ต้องการแก้ไข (title หรือ is_completed) มาไหม 
  // ถ้าไม่ส่งมาสักอย่างให้ตอบกลับด้วย Status Code 400 (Bad Request)
  if (body.title === undefined && body.is_completed === undefined) {
    return c.json({ error: 'No fields to update' }, 400)
  }

  // ค้นหาข้อมูลเดิมในฐานข้อมูลก่อนเพื่อเช็คว่างาน ID นี้มีอยู่จริงไหม
  const existing = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: 'Task not found' }, 404)

  // เตรียมค่าใหม่: ถ้าผู้ใช้ส่ง title ใหม่มาให้ใช้ค่าใหม่ ถ้าไม่ได้ส่งมาให้ใช้ title เดิมจากฐานข้อมูล
  const newTitle = body.title !== undefined ? body.title : existing.title
  // เตรียมสถานะใหม่: แปลงค่า boolean (true/false) เป็นตัวเลข 1 หรือ 0 เพื่อเก็บลง SQLite/D1
  const newStatus = body.is_completed !== undefined ? (body.is_completed ? 1 : 0) : existing.is_completed

  // รันคำสั่ง SQL อัปเดตข้อมูล และคืนค่าแถวข้อมูลหลังอัปเดตกลับมา
  const updated = await c.env.DB.prepare(
    'UPDATE tasks SET title = ?, is_completed = ? WHERE id = ? RETURNING *'
  ).bind(newTitle, newStatus, id).first()

  // ส่งข้อมูลงานที่อัปเดตเรียบร้อยแล้วกลับไปให้ Client
  return c.json(updated)
})

// ==========================================
// 5. DELETE /api/tasks/:id -> ลบรายการงาน (Delete)
// ==========================================
app.delete('/api/tasks/:id', async (c) => {
  // รับค่า id ที่ต้องการลบจาก URL
  const id = c.req.param('id')
  
  // รันคำสั่ง SQL เพื่อลบแถวข้อมูลตาม ID ที่ระบุ
  const result = await c.env.DB.prepare(
    'DELETE FROM tasks WHERE id = ?'
  ).bind(id).run()



  // เช็คจาก Metadata หากจำนวนแถวที่เปลี่ยนแปลง (changes) เป็น 0 แสดงว่าไม่มีงาน ID นั้นให้ลบ
  if (result.meta.changes === 0) {
    return c.json({ error: 'Task not found' }, 404)
  }

  // ส่งข้อความยืนยันการลบข้อมูลสำเร็จกลับไปให้ Client
  return c.json({ message: 'Task deleted successfully' })
})

// ส่งออก (Export) ตัวแปร app เพื่อให้ Cloudflare Workers ดึงไปรันทำงานบน Edge Network
export default app