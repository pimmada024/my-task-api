
# Task Management API (Cloudflare Workers + D1)

 RESTful API สำหรับระบบจัดการ Task โดยใช้ Hono Framework, Cloudflare Workers และ Cloudflare D1 Database

**Base URL:** https://my-task-api.task-6731503024.workers.dev/api/tasks
  
---

**สรุปผลการทดสอบ API ผ่าน Postman**

* **1. Create Task (POST /api/tasks)**
  - การทำงาน: ส่งข้อมูล JSON (ฟิลด์ title) เพื่อบันทึกงานใหม่ลงฐานข้อมูล Cloudflare D1
  - เบื้องหลัง: Server รันคำสั่ง SQL INSERT INTO tasks (title) VALUES (?)
  - ผลลัพธ์: สร้างข้อมูลสำเร็จ ได้รับ Response กลับมาเป็น Object งานใหม่ที่มี id อัตโนมัติ, ค่าเริ่มต้น is_completed: 0 และเวลาที่สร้าง            created_at
  - Status: 201 Created
  
<img width="1157" height="794" alt="ภาพถ่ายหน้าจอ 2569-08-20 เวลา 22 45 26" src="https://github.com/user-attachments/assets/b04e45e0-7b5c-48b3-84e8-c5df704178fb" />

  

* **2. Get All Tasks (GET /api/tasks)**
  - การทำงาน: เรียกดูรายการงานทั้งหมดที่มีอยู่ในระบบ
  - เบื้องหลัง:Server รันคำสั่ง SQL SELECT * FROM tasks
  - ผลลัพธ์: ดึงข้อมูลงานทั้งหมดส่งกลับมาในรูปแบบ Array ของ JSON Object
  - Status: 200 OK

  <img width="1156" height="793" alt="ภาพถ่ายหน้าจอ 2569-08-20 เวลา 22 46 07" src="https://github.com/user-attachments/assets/0b17bf0a-90f8-4cc9-b4ca-2805773d6c76" />


* **3. Get Task by ID (GET /api/tasks/1)**
  - การทำงาน: ค้นหาและดึงข้อมูลงานเฉพาะรายการ โดยระบุ ID ผ่าน URL Path Parameter (เช่น /1)
  - เบื้องหลัง:Server รันคำสั่ง SQL SELECT * FROM tasks WHERE id = ?
  - ผลลัพธ์: ได้รับ JSON Object ของงานรายการนั้นๆ เพียงรายการเดียว
  - Status: 200 OK

  <img width="1159" height="795" alt="ภาพถ่ายหน้าจอ 2569-08-20 เวลา 22 47 42" src="https://github.com/user-attachments/assets/aeea553a-1d69-4b97-82a7-0a456cc96250" />


* **4. Update Task Status (PATCH /api/tasks/1)**
  - การทำงาน: อัปเดตสถานะการทำงาน โดยส่ง Body {"is_completed": true} ไปยัง ID ที่ต้องการ
  - เบื้องหลัง:Server รันคำสั่ง SQL UPDATE tasks SET is_completed = ? WHERE id = ?
  - ผลลัพธ์: ค่า is_completed ในฐานข้อมูลเปลี่ยนจาก 0 เป็น 1 (ทำเสร็จแล้ว) พร้อมตอบกลับข้อมูลเวอร์ชันล่าสุด
  - Status: 200 OK

 <img width="1156" height="794" alt="ภาพถ่ายหน้าจอ 2569-08-20 เวลา 22 48 47" src="https://github.com/user-attachments/assets/edec38a3-95f1-4149-818a-9a90de80abaf" />


* **5. Delete Task (DELETE /api/tasks/1)**
  - การทำงาน:ลบรายการงานออกจากฐานข้อมูลตาม ID ที่ระบุ
  - เบื้องหลัง:Server รันคำสั่ง SQL DELETE FROM tasks WHERE id = ?
  - ผลลัพธ์: แถวข้อมูลถูกลบออกจาก D1 Database และคืนค่าข้อความยืนยัน {"message": "Task deleted successfully"}
  - Status: 200 OK

 <img width="1158" height="794" alt="ภาพถ่ายหน้าจอ 2569-08-20 เวลา 22 50 44" src="https://github.com/user-attachments/assets/414672fa-7161-4284-b18b-bd4666a99656" />








































```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiating `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
