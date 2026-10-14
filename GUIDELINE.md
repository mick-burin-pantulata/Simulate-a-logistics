# คู่มือโค้ด LogiSim Factory

เอกสารนี้อธิบายว่าแต่ละส่วนของโปรเจกต์ทำอะไร และถ้าอยากแก้เรื่องไหน ควรเปิดไฟล์ไหน

- อยากหาไฟล์ที่ต้องแก้เร็ว ๆ → ดู [ข้อ 3 อยากแก้อะไร ไปไฟล์ไหน](#3-อยากแก้อะไร-ไปไฟล์ไหน)
- อยากเข้าใจภาพรวมก่อน → อ่าน [ข้อ 1](#1-ภาพรวมการทำงาน) กับ [ข้อ 2](#2-โครงสร้างโฟลเดอร์)

---

## 1. ภาพรวมการทำงาน

โค้ดแบ่งเป็น 3 ชั้น ไหลไปทางเดียว:

```
 ┌──────────────── World (สถานะการจำลอง, แก้ค่าได้ตรง ๆ) ────────────────┐
 │  world/world.ts → tickWorld(dt)  เรียกทุกฟีเจอร์ตามลำดับ ทุก ≤0.05 วิ   │
 │  เมือง:   suppliers → stores → shopping → orders → signals → traffic    │
 │           → trucks → cars                                              │
 │  โรงงาน:  gate → drivers → docks → production → conveyor → rawConveyor │
 │           → agvs → workers                                             │
 └──────────────┬──────────────────────────────────┬──────────────────────┘
                │ อ่านทุกเฟรม (useFrame)            │ สรุปทุก 0.25 วิ
                ▼                                  ▼
   ฉาก 3D  features/*/scene/*.tsx        world/snapshot.ts → Snapshot
   (ตำแหน่งรถ คน ประตู ไฟ)                         │ (Zustand selector)
                                                   ▼
                                        UI  ui/*  และ  features/*/ui/*
```

| ชั้น | อยู่ที่ไหน | กฎ |
|---|---|---|
| **ตรรกะ (logic)** | `features/<ชื่อ>/<ชื่อ>.ts`, `world/` | เป็น TypeScript ล้วน ไม่มี React เปลี่ยนค่าใน `World` ได้โดยตรง |
| **ฉาก 3D (scene)** | `features/<ชื่อ>/scene/` | อ่าน `useSimStore.getState().world` ใน `useFrame` แล้วขยับ ref เอง **ห้ามใช้ selector อ่าน world** เพราะจะ re-render ทุกเฟรม |
| **แผงข้อมูล (UI)** | `features/<ชื่อ>/ui/`, `ui/` | อ่านจาก `snapshot` ผ่าน selector เท่านั้น ไม่แตะ `world` โดยตรง |

ตัวกลางคือ [`store/useSimStore.ts`](src/store/useSimStore.ts) (Zustand) ทำหน้าที่ดังนี้:
- เก็บ `world`, `snapshot`, ความเร็ว, ค่าตั้ง, สิ่งที่เลือกอยู่ และคำสั่งกล้อง
- มีคำสั่ง `advance`, `reset`, `select`, `focus`, `flyTo`

ตัวขับเวลาคือ [`app/SimDriver.tsx`](src/app/SimDriver.tsx) เรียก `advance` ทุกเฟรม และ `refresh` (สร้าง snapshot ใหม่) ทุก 0.25 วินาที

### หน่วยและพิกัด
- **ระยะทาง:** 1 หน่วย = 1 เมตร
- **ทิศ:** แกน +x = ตะวันออก, แกน +z = ใต้ (ฝั่งถนน), แกน y = ขึ้น
- **การหมุน:** `heading`/`rotation.y` = 0 แปลว่าโมเดลหันไปทาง +z
- **ผังไซต์:** สมมาตรรอบแกน x = 0 ถ้าวางของฝั่งหนึ่ง ให้วางกระจกอีกฝั่งด้วย `mirrorX()`
- **ผังเมือง:** ประมาณ x ∈ [-300, 300], z ∈ [-260, 620] โรงงานอยู่กลาง ทิศเหนือ (z ติดลบ) เป็นบ้าน ตะวันตกเป็นร้านค้า ตะวันออกเป็นซัพพลายเออร์ ใต้สุดเป็นทางหลวง
- **จราจร:** ขับชิดซ้าย (เลนห่างกลางถนน `LANE_OFFSET` = 2 ม.) อาคารทุกหลังอยู่ **ฝั่งซ้าย** ของถนนตามทิศของ edge ที่ระบุ
- **เวลา:**
  - ทุกอย่างใน world นับเป็น **วินาทีจำลอง** (`world.time`)
  - นาฬิกาเกมคิดจาก `GAME_MIN_PER_SEC` (1 วินาทีจำลอง = 20 วินาทีในเกม)
  - ถ้าจะตั้งเวลาเป็น "นาทีในเกม" ให้ใช้ `minutes(n)` จาก [`time/clock.ts`](src/features/time/clock.ts)

---

## 2. โครงสร้างโฟลเดอร์

```
src/
  main.tsx                 จุดเริ่มแอป
  index.css                สไตล์ UI ทั้งหมด (ตัวแปรสีอยู่บน :root)
  app/                     ประกอบฉาก 3D + กล้อง + ตัวขับเวลา
  core/                    ฟังก์ชันพื้นฐาน ใช้ได้ทุกฟีเจอร์
  world/                   สถานะรวม, tick, snapshot, บันทึกเหตุการณ์
  store/                   Zustand store
  shared/                  ของใช้ร่วมใน 3D: ธีมสี, ป้าย, กรอบเลือก, เส้นทาง, texture
  ui/                      แถบบน, แถบข้าง, Inspector, Event log, คอมโพเนนต์ UI
  features/                แยกตามฟีเจอร์ (ดูตารางด้านล่าง)
```

### `app/` — ประกอบทุกอย่างเข้าด้วยกัน
| ไฟล์ | หน้าที่ |
|---|---|
| [App.tsx](src/app/App.tsx) | วาง Canvas, ชั้นป้ายลอย (EntityTags) และ HUD |
| [Scene.tsx](src/app/Scene.tsx) | **รายการทุกอย่างที่อยู่ในฉาก 3D** เพิ่ม/ลบวัตถุในฉากที่นี่ |
| [CameraRig.tsx](src/app/CameraRig.tsx) | กล้อง isometric: ซูม หมุน และบินไปตามคำสั่ง |
| [SimDriver.tsx](src/app/SimDriver.tsx) | เดินเวลาการจำลองทุกเฟรม |

### `core/` — เครื่องมือพื้นฐาน
| ไฟล์ | หน้าที่ |
|---|---|
| [math.ts](src/core/math.ts) | `V2`, สุ่ม, `lerpAngle`, `stepToward`, `approach` |
| [path.ts](src/core/path.ts) | `Path` (เส้นทางวัดตามระยะทาง) และ `roundCorners` (ลบมุมเส้นทางรถ) |
| [grid.ts](src/core/grid.ts) | ค้นหาเส้นทางบนกริด (BFS) ที่ AGV ใช้ |

### `world/` — สถานะรวม
| ไฟล์ | หน้าที่ |
|---|---|
| [types.ts](src/world/types.ts) | type `World`, `Settings`, `Stats`, `LogEvent` **(เพิ่ม state ใหม่ต้องประกาศที่นี่)** |
| [world.ts](src/world/world.ts) | `createWorld` (ค่าเริ่มต้น), `tickWorld` (ลำดับการอัปเดต), `DEFAULT_SETTINGS` |
| [snapshot.ts](src/world/snapshot.ts) | แปลง world เป็นข้อมูลให้ UI: KPI, แถวตาราง, ข้อมูล Inspector, สถานะเอกสาร |
| [events.ts](src/world/events.ts) | `pushEvent` สำหรับเขียนบันทึกเหตุการณ์ |

### `features/` — ทีละฟีเจอร์
แต่ละฟีเจอร์มีไฟล์ตรรกะ, `scene/` (3D) และ `ui/` (แผงข้อมูล)

| ฟีเจอร์ | ตรรกะ | ฉาก 3D | UI | ทำอะไร |
|---|---|---|---|---|
| **time** | [clock.ts](src/features/time/clock.ts) | [DayNight.tsx](src/features/time/scene/DayNight.tsx) | (นาฬิกาอยู่ใน TopBar) | นาฬิกาเกม, กะ, ช่วงเวลาที่รถ/ออเดอร์เยอะ, แสงกลางวัน–กลางคืน |
| **roads** | [network.ts](src/features/roads/network.ts) | [RoadNetwork.tsx](src/features/roads/scene/RoadNetwork.tsx) | – | กราฟถนนในเมือง (แยก = node, ถนน = edge), เลนซ้าย, `planRoute` หาเส้นทาง (Dijkstra ห้ามกลับรถ) |
| **traffic** | [signals.ts](src/features/traffic/signals.ts), [collision.ts](src/features/traffic/collision.ts), [cars.ts](src/features/traffic/cars.ts) | [CityCars.tsx](src/features/traffic/scene/CityCars.tsx) | (อยู่ใน CityPanel) | ไฟจราจร + เส้นหยุด, ระบบหลบกันของรถบรรทุกและรถยนต์ (ใช้ร่วมกัน), รถยนต์ชาวเมืองและที่จอด |
| **city** | [layout.ts](src/features/city/layout.ts) | [CityBuildings.tsx](src/features/city/scene/CityBuildings.tsx) | [CityPanel](src/features/city/ui/CityPanel.tsx) | **ผังเมือง**: บ้าน, คอนโด, ร้านค้า, ซัพพลายเออร์, ลานจอดพนักงาน, ปั๊มน้ำมัน, ช่องจอดรถ, ช่องรับของรถบรรทุก |
| **stores** | [stores.ts](src/features/stores/stores.ts) | (กองสินค้าใน CityBuildings) | (อยู่ใน CityPanel) | สต็อกร้าน, ขายให้ชาวเมือง, สั่งของจากโรงงานเมื่อสต็อกต่ำ (ใบสั่งขาย) |
| **suppliers** | [suppliers.ts](src/features/suppliers/suppliers.ts) | (กองวัตถุดิบใน CityBuildings) | (อยู่ใน CityPanel) | ผลิตวัตถุดิบ, ฝ่ายจัดซื้อโรงงานสั่งเมื่อวัตถุดิบต่ำ (ใบสั่งซื้อ) |
| **residential** | [residents.ts](src/features/residential/residents.ts) | – | (อยู่ใน CityPanel) | ผูกพนักงานกับบ้าน/รถ, ขับไป–กลับที่ทำงาน, ชาวเมืองขับไปซื้อของ |
| **orders** | [orders.ts](src/features/orders/orders.ts) | – | [OrdersPanel](src/features/orders/ui/OrdersPanel.tsx) | เอกสาร PO- (รับวัตถุดิบ) และ SO- (ส่งสินค้า) ที่ suppliers/stores สร้าง |
| **trucks** | [trucks.ts](src/features/trucks/trucks.ts), [routes.ts](src/features/trucks/routes.ts), [gate.ts](src/features/trucks/gate.ts), [drivers.ts](src/features/trucks/drivers.ts), [labels.ts](src/features/trucks/labels.ts) | [Truck.tsx](src/features/trucks/scene/Truck.tsx), [TruckPark.tsx](src/features/trucks/scene/TruckPark.tsx) | [TrucksPanel](src/features/trucks/ui/TrucksPanel.tsx) | วงจรชีวิตรถ (ทางหลวง → ซัพพลายเออร์/โรงงาน/ร้าน → ทางหลวง), คิว FIFO, ลานพัก P/C, ถอยเข้าท่า, ไม้กั้น, คนขับ |
| **docks** | [docks.ts](src/features/docks/docks.ts) | [DockArea.tsx](src/features/docks/scene/DockArea.tsx) | [DocksPanel](src/features/docks/ui/DocksPanel.tsx) | ประตูม้วน, ช่องพักสินค้า, งานพนักงานท่า, QC ตรวจรับ, สั่งหยิบสินค้าขาออก |
| **agv** | [agv.ts](src/features/agv/agv.ts), [labels.ts](src/features/agv/labels.ts) | [Agv.tsx](src/features/agv/scene/Agv.tsx) | [AgvPanel](src/features/agv/ui/AgvPanel.tsx) | คิวงาน (putaway/pick), จ่ายงาน, หาเส้นทาง, จองช่องกริด, ยกงา |
| **warehouse** | [layout.ts](src/features/warehouse/layout.ts), [inventory.ts](src/features/warehouse/inventory.ts) | [WarehouseBuilding.tsx](src/features/warehouse/scene/WarehouseBuilding.tsx), [Racks.tsx](src/features/warehouse/scene/Racks.tsx) | [InventoryPanel](src/features/warehouse/ui/InventoryPanel.tsx) | กริดคลัง, ชั้นวาง, ตำแหน่งท่า 6 ท่า, สต็อกแต่ละช่อง |
| **production** | [production.ts](src/features/production/production.ts), [layout.ts](src/features/production/layout.ts) | [ProductionHall.tsx](src/features/production/scene/ProductionHall.tsx), [Palletizer.tsx](src/features/production/scene/Palletizer.tsx) | (อยู่ใน InventoryPanel) | ไลน์ผลิต (ใช้วัตถุดิบ 1 พาเลทต่อสินค้า 1 พาเลท), การเติมพาเลท, พันฟิล์ม, ส่งเข้าสายพาน |
| **conveyor** | [conveyor.ts](src/features/conveyor/conveyor.ts) | [Conveyor.tsx](src/features/conveyor/scene/Conveyor.tsx) | (อยู่ใน InventoryPanel) | สายพานสินค้า (ตะวันออก: ผลิต → คลัง) และสายพานวัตถุดิบ (ตะวันตก: คลัง → ข้างไลน์) |
| **workers** | [workers.ts](src/features/workers/workers.ts), [labels.ts](src/features/workers/labels.ts) | [Worker.tsx](src/features/workers/scene/Worker.tsx) | [PeoplePanel](src/features/workers/ui/PeoplePanel.tsx) | ตำแหน่งงาน, กะ, การเดินทางเข้า–ออกงาน, พักกลางวัน, รปภ. 2 ประตู |
| **site** | [layout.ts](src/features/site/layout.ts) | [SiteGround](src/features/site/scene/SiteGround.tsx), [Buildings](src/features/site/scene/Buildings.tsx), [Gate](src/features/site/scene/Gate.tsx), [Landscape](src/features/site/scene/Landscape.tsx), [Markings](src/features/site/scene/Markings.tsx), [YardProps](src/features/site/scene/YardProps.tsx), [ZoneLabels](src/features/site/scene/ZoneLabels.tsx) | – | **ผังไซต์โรงงาน**: ขอบรั้ว, ประตู, โซนอาคาร, ลานจอด, ทางเดินคน (ถนนย้ายไปอยู่ใน roads) |

### `shared/` — ของใช้ร่วมในฉาก 3D
| ไฟล์ | หน้าที่ |
|---|---|
| [theme.ts](src/shared/theme.ts) | **ชุดสีของฉาก** (พื้น ถนน ผนัง ต้นไม้ ไฮไลต์) |
| [nightMaterials.ts](src/shared/nightMaterials.ts) | วัสดุที่สว่างตอนกลางคืน (หน้าต่าง โคมไฟ แสงตกพื้น ไฟหน้ารถ) |
| [primitives.tsx](src/shared/primitives.tsx) | `Box`, `GroundRect`, `GroundStrip` สำหรับประกอบฉาก |
| [Label.tsx](src/shared/Label.tsx) | ป้ายลอยแบบ sprite (ชื่อโซน ชื่อท่า) |
| [GroundText.tsx](src/shared/GroundText.tsx) | ตัวหนังสือทาสีบนพื้น และแถบเตือนเหลืองดำ |
| [canvasTexture.ts](src/shared/canvasTexture.ts) | วาด texture: ตัวอักษร, แถบเตือน, รั้วตาข่าย, โลโก้ข้างตู้รถ |
| [tags/](src/shared/tags/) | ป้ายทะเบียนลอยเหนือรถ (เป็น DOM ที่คำนวณตำแหน่งจาก 3D ทุกเฟรม) |
| [SelectionBrackets.tsx](src/shared/SelectionBrackets.tsx) | กรอบมุมเรืองแสงรอบสิ่งที่เลือก |
| [RoutePath.tsx](src/shared/RoutePath.tsx) | แถบเส้นทางเรืองแสงที่มีจุดวิ่ง |
| [pointer.ts](src/shared/pointer.ts) | ทำให้วัตถุ 3D คลิกเลือกได้ |

### `ui/` — HUD
| ไฟล์ | หน้าที่ |
|---|---|
| [TopBar.tsx](src/ui/TopBar.tsx) | นาฬิกา/วัน/กะ, เล่น–หยุด, ความเร็ว, ปุ่มมุมกล้อง |
| [Sidebar.tsx](src/ui/Sidebar.tsx) | **รายการแท็บ** (เพิ่มแท็บใหม่ที่นี่) |
| [panels/OverviewPanel.tsx](src/ui/panels/OverviewPanel.tsx), [panels/SettingsPanel.tsx](src/ui/panels/SettingsPanel.tsx) | แท็บภาพรวม และแท็บตั้งค่า |
| [Inspector.tsx](src/ui/Inspector.tsx) | การ์ดรายละเอียดของสิ่งที่เลือก (ข้อมูลมาจาก `inspect()` ใน snapshot.ts) |
| [EventLog.tsx](src/ui/EventLog.tsx) | บันทึกเหตุการณ์ และสีของแต่ละประเภท |
| [components.tsx](src/ui/components.tsx), [icons.tsx](src/ui/icons.tsx) | `Stat`, `Meter`, `Badge`, `Sparkline`, `Section` และไอคอน |

---

## 3. อยากแก้อะไร ไปไฟล์ไหน

### เวลาและกะ
| อยากแก้ | ไฟล์ / ค่าที่ต้องดู |
|---|---|
| ความเร็วนาฬิกาเกม (เกม 1 วันยาวกี่นาทีจริง) | `GAME_MIN_PER_SEC` ใน [time/clock.ts](src/features/time/clock.ts) |
| เวลาเริ่มต้นตอนเปิดแอป | `START_MINUTE` ใน [time/clock.ts](src/features/time/clock.ts) |
| ชั่วโมงของกะเช้า/ดึก/สำนักงาน | `SHIFT_HOURS` ใน [time/clock.ts](src/features/time/clock.ts) |
| ช่วงเวลาที่ชาวเมืองออกไปซื้อของ | `shopProfile`, `SHOP_TRIPS_PER_HOUR` ใน [residential/residents.ts](src/features/residential/residents.ts) |
| เวลาเปิด–ปิดร้าน | `storeOpen` ใน [stores/stores.ts](src/features/stores/stores.ts) |
| สีท้องฟ้า แสงแดด/ดวงจันทร์ | [time/scene/DayNight.tsx](src/features/time/scene/DayNight.tsx) |
| ความสว่างของไฟตอนกลางคืน | `applyNight()` ใน [shared/nightMaterials.ts](src/shared/nightMaterials.ts) |
| ปุ่มความเร็ว 1×–32× | `SPEEDS` ใน [ui/TopBar.tsx](src/ui/TopBar.tsx) |

### เมือง ถนน และไฟจราจร
| อยากแก้ | ไฟล์ / ค่าที่ต้องดู |
|---|---|
| เพิ่ม/ย้ายถนนหรือแยก | `ROW_Z`, `COL_X`, `ROAD_NODES`, `ROAD_EDGES` ใน [roads/network.ts](src/features/roads/network.ts) |
| แยกไหนมีไฟจราจร | `SIGNALS` ใน [roads/network.ts](src/features/roads/network.ts) |
| ความยาวไฟเขียว (ค่าเริ่มต้น) | `signalGreen` ใน `DEFAULT_SETTINGS` ([world/world.ts](src/world/world.ts)) ปรับได้ในแท็บตั้งค่า |
| ไฟเหลือง / ไฟแดงทุกทาง / ระยะเส้นหยุด | `YELLOW`, `ALL_RED`, `STOP_BACK` ใน [traffic/signals.ts](src/features/traffic/signals.ts) |
| ตำแหน่ง/ขนาด/ชื่อ ร้าน ซัพพลายเออร์ บ้าน คอนโด | `STORES`, `SUPPLIERS`, `HOMES`, `GAS_STATION` ใน [city/layout.ts](src/features/city/layout.ts) (ระบุ `edge` + `at` = ระยะจากต้นถนน ห่างแยก ≥ 12 ม.) |
| ลานจอดรถพนักงาน (จำนวนช่อง, ทางเข้า) | `staffLot`, `STAFF_LOTS` ใน [city/layout.ts](src/features/city/layout.ts) |
| จุดที่รถเลี้ยวเข้า/ออกอาคาร | `carArrival`, `carDeparture`, `truckArrival`, `truckDeparture` ใน [city/layout.ts](src/features/city/layout.ts) |
| ความเร็วรถยนต์ในเมือง/ในลานจอด | `CITY_SPEED`, `LOT_SPEED`, `ACCEL`, `BRAKE` ใน [traffic/cars.ts](src/features/traffic/cars.ts) |
| การหลบกัน / แก้รถติดวน (รถทุกชนิดในเมือง) | `computeBlockers`, `mustYield`, `MAX_YIELD`, `GHOST_TIME` ใน [traffic/collision.ts](src/features/traffic/collision.ts) |
| สี/รูปทรงรถยนต์ | `COLORS` ใน [traffic/cars.ts](src/features/traffic/cars.ts), โมเดลใน [CityCars.tsx](src/features/traffic/scene/CityCars.tsx) |
| หน้าตาบ้าน ร้าน โรงงานซัพพลายเออร์ ปั๊ม สวน | [city/scene/CityBuildings.tsx](src/features/city/scene/CityBuildings.tsx) |
| หน้าตาถนน ทางม้าลาย เสาไฟจราจร | [roads/scene/RoadNetwork.tsx](src/features/roads/scene/RoadNetwork.tsx) |

### ห่วงโซ่อุปทาน (ร้านค้า ซัพพลายเออร์ ชาวเมือง)
| อยากแก้ | ไฟล์ / ค่าที่ต้องดู |
|---|---|
| ร้านสั่งของเมื่อสต็อกเหลือกี่ % | `storeReorder` ใน `DEFAULT_SETTINGS` (แท็บตั้งค่า) |
| จำนวนพาเลทต่อใบสั่งร้าน / เวลานัดรถ | `updateStores` ใน [stores/stores.ts](src/features/stores/stores.ts) |
| ความจุร้าน, ปริมาณที่ลูกค้าซื้อต่อครั้ง | `capacityOf`, `BASKET` ใน [stores/stores.ts](src/features/stores/stores.ts) |
| ปริมาณความต้องการโดยรวม | `demand` ใน `DEFAULT_SETTINGS` (แท็บตั้งค่า) และ `SHOP_TRIPS_PER_HOUR` ใน [residents.ts](src/features/residential/residents.ts) |
| โรงงานสั่งวัตถุดิบเมื่อเหลือกี่พาเลท | `rawReorder` ใน `DEFAULT_SETTINGS` (แท็บตั้งค่า), สูตร `rawPosition` ใน [suppliers.ts](src/features/suppliers/suppliers.ts) |
| กำลังผลิต/ความจุของซัพพลายเออร์, จำนวนพาเลทต่อใบสั่ง | `createSuppliers`, `updateSuppliers` ใน [suppliers/suppliers.ts](src/features/suppliers/suppliers.ts) |
| เวลาโหลดที่ซัพพลายเออร์ / ขนลงที่ร้าน | `SUPPLIER_LOAD_TIME`, `STORE_UNLOAD_TIME` ใน [trucks/trucks.ts](src/features/trucks/trucks.ts) |
| พนักงานอยู่บ้านไหน, ขับรถออกจากบ้านก่อนกะกี่ชั่วโมง | `setupResidents` ใน [residents.ts](src/features/residential/residents.ts), `leadOf` ใน [workers/workers.ts](src/features/workers/workers.ts) |
| เลขที่เอกสาร PO-/SO- และข้อมูลใน shipment | `createShipment` ใน [orders/orders.ts](src/features/orders/orders.ts) |

### รถบรรทุก คิว และประตู
| อยากแก้ | ไฟล์ / ค่าที่ต้องดู |
|---|---|
| จุดเกิด/จุดหายของรถบรรทุก (ทางหลวง) | `HIGHWAY_START`, `HIGHWAY_GOAL` ใน [trucks/routes.ts](src/features/trucks/routes.ts) |
| เส้นทางเมือง ↔ ประตูโรงงาน | `FACTORY_ENTRY`, `FACTORY_EXIT` ใน [trucks/routes.ts](src/features/trucks/routes.ts), `startTownLeg` ใน [trucks.ts](src/features/trucks/trucks.ts) |
| ความเร็วรถ (ถนน/ในลาน/ถอย), การเบรก | `ROAD_SPEED`, `YARD_SPEED`, `REVERSE_SPEED`, `ACCEL`, `BRAKE` ใน [trucks/trucks.ts](src/features/trucks/trucks.ts) |
| ลำดับขั้นของรถ (phase) และสิ่งที่เกิดเมื่อจบแต่ละช่วง | `TruckPhase`, `onLegEnd`, `updateTrucks` ใน [trucks/trucks.ts](src/features/trucks/trucks.ts) |
| กติกาเรียกคิวเข้าท่า (FIFO) | `dispatch()` ใน [trucks/trucks.ts](src/features/trucks/trucks.ts) |
| เวลาชั่งน้ำหนัก/ซีลตู้ที่ลาน C | `CHECKOUT_TIME` ใน [trucks/trucks.ts](src/features/trucks/trucks.ts) |
| เส้นทางที่รถวิ่ง (เข้า, ไปลานพัก, ไปท่า, ถอย, ออก) | [trucks/routes.ts](src/features/trucks/routes.ts) |
| ระยะเลี้ยวตอนถอยเข้าท่า | `DOCK_TURN` ใน [trucks/routes.ts](src/features/trucks/routes.ts) |
| ขนาดรถ (ระยะหัวลาก/หาง) | `HITCH_TO_AXLE`, `CAB_FRONT` … ใน [trucks/routes.ts](src/features/trucks/routes.ts) (ต้องแก้โมเดลใน Truck.tsx ให้ตรงกันด้วย) |
| การหลบกัน / แก้รถติดวน | [traffic/collision.ts](src/features/traffic/collision.ts) (ใช้ร่วมกับรถยนต์) |
| ไม้กั้นเปิด–ปิด | [trucks/gate.ts](src/features/trucks/gate.ts) |
| คนขับลงจากรถไปยื่นเอกสาร | [trucks/drivers.ts](src/features/trucks/drivers.ts) |
| ชื่อ/สีบริษัทขนส่ง, ทะเบียนรถ | `COMPANIES`, `spawnTruck` ใน [trucks/trucks.ts](src/features/trucks/trucks.ts) |
| ชื่อสถานะรถภาษาไทยและสี | [trucks/labels.ts](src/features/trucks/labels.ts) |
| หน้าตาโมเดลรถ | [trucks/scene/Truck.tsx](src/features/trucks/scene/Truck.tsx) |
| ลายโลโก้ข้างตู้ | `brandTexture` ใน [shared/canvasTexture.ts](src/shared/canvasTexture.ts) |

### ท่าโหลด QC และ AGV
| อยากแก้ | ไฟล์ / ค่าที่ต้องดู |
|---|---|
| จำนวน/ตำแหน่ง/ชนิดท่า (รับ–ส่ง) | `DOCKS` ใน [warehouse/layout.ts](src/features/warehouse/layout.ts) |
| ขั้นตอนพนักงานท่า (ลากพาเลทเข้า–ออก) | `receivingWorker`, `shippingWorker` ใน [docks/docks.ts](src/features/docks/docks.ts) |
| เวลายก/วาง/ตรวจ QC | `PICK_TIME`, `DROP_TIME`, `QC_TIME` ใน [docks/docks.ts](src/features/docks/docks.ts) |
| เงื่อนไขว่ารถทำงานเสร็จแล้ว | ท้าย `updateDocks` ใน [docks/docks.ts](src/features/docks/docks.ts) |
| การสั่งหยิบสินค้าเพื่อส่งออก | `requestPicks` ใน [docks/docks.ts](src/features/docks/docks.ts) |
| ตำแหน่งโต๊ะ QC | `QC_POST` ใน [workers/workers.ts](src/features/workers/workers.ts) |
| จำนวน AGV เริ่มต้น / สูงสุด | `INITIAL_AGVS` ใน [store/useSimStore.ts](src/store/useSimStore.ts), `MAX_AGVS` + `PARKING` ใน [warehouse/layout.ts](src/features/warehouse/layout.ts) |
| ความเร็ว AGV, เวลายก, การหลบกัน | ค่าคงที่ด้านบนไฟล์ [agv/agv.ts](src/features/agv/agv.ts) |
| วิธีเลือกว่า AGV คันไหนรับงานไหน | `assignTasks` ใน [agv/agv.ts](src/features/agv/agv.ts) |
| เพิ่มจุดรับ/ส่งของใหม่ให้ AGV | type `Loc` + `locAccess`/`locHeight`/`completePickup`/`completeDrop` ใน [agv/agv.ts](src/features/agv/agv.ts) |
| หน้าตาโมเดลรถยก | [agv/scene/Agv.tsx](src/features/agv/scene/Agv.tsx) |

### คลังสินค้า ฝ่ายผลิต และสายพาน
| อยากแก้ | ไฟล์ / ค่าที่ต้องดู |
|---|---|
| ขนาดกริดคลัง, แถวชั้นวาง, ทางเดินตัดขวาง | `COLS`, `ROWS`, `RACK_ROWS`, `AISLE_COLS` ใน [warehouse/layout.ts](src/features/warehouse/layout.ts) |
| จำนวนชั้นของชั้นวาง | `LEVEL_Y` ใน [warehouse/layout.ts](src/features/warehouse/layout.ts) |
| สต็อกตอนเริ่ม (% วัตถุดิบ, % สินค้าสำเร็จ) | `createInventory(0.18, 0.3)` ใน [world/world.ts](src/world/world.ts) |
| สีพาเลทวัตถุดิบ/สินค้าบนชั้นวาง | `RAW_COLORS` ใน [warehouse/scene/Racks.tsx](src/features/warehouse/scene/Racks.tsx) |
| จำนวนวัตถุดิบที่พักข้างไลน์ได้ | `LINE_BUFFER` ใน [conveyor/conveyor.ts](src/features/conveyor/conveyor.ts) |
| ตำแหน่งต้นสายพานวัตถุดิบในคลัง | `RAW_CONVEYOR_START`, `RAW_CONVEYOR_ACCESS` ใน [warehouse/layout.ts](src/features/warehouse/layout.ts) |
| ผนัง เสา และประตูคนเดินของคลัง | [warehouse/scene/WarehouseBuilding.tsx](src/features/warehouse/scene/WarehouseBuilding.tsx) |
| ความเร็วการผลิต, จำนวนคนต่อไลน์ | `PALLET_TIME`, `WRAP_TIME`, `FULL_CREW` ใน [production/production.ts](src/features/production/production.ts) |
| ตำแหน่งไลน์ผลิตและเครื่องจักร | `LINE_Z`, `MACHINE_X`, `STATIONS` ใน [production/layout.ts](src/features/production/layout.ts) |
| ความเร็วสายพาน, ระยะห่างพาเลท | `SPEED`, `GAP` ใน [conveyor/conveyor.ts](src/features/conveyor/conveyor.ts) |

### คนและพนักงาน
| อยากแก้ | ไฟล์ / ค่าที่ต้องดู |
|---|---|
| จำนวนพนักงานแต่ละตำแหน่ง/กะ | `createStaff` ใน [workers/workers.ts](src/features/workers/workers.ts) |
| เส้นทางเดินเข้า–ออกงาน | `commuteRoute`, `inside`, `doorOf` ใน [workers/workers.ts](src/features/workers/workers.ts) |
| ทางเดินเท้าในไซต์ (จุดและเส้นเชื่อม) | `WALK_NODES`, `WALK_EDGES` ใน [site/layout.ts](src/features/site/layout.ts) |
| เวลาพักกลางวัน, ความยาวพัก | `breakAt` ใน `createStaff`, `BREAK_LENGTH` ใน [workers/workers.ts](src/features/workers/workers.ts) |
| การทำงานของ รปภ. | `updateGuard`, `GUARD_POSTS`, `GATE_CHECK` ใน [workers/workers.ts](src/features/workers/workers.ts) |
| ชื่อพนักงาน | `NAMES` ใน [workers/workers.ts](src/features/workers/workers.ts) |
| คำอธิบายกิจกรรมภาษาไทย, สีตำแหน่ง | [workers/labels.ts](src/features/workers/labels.ts) |
| หน้าตาคน, หมวก, แฮนด์ลิฟต์ | [workers/scene/Worker.tsx](src/features/workers/scene/Worker.tsx) |

### ผังไซต์และฉาก
| อยากแก้ | ไฟล์ / ค่าที่ต้องดู |
|---|---|
| ขนาดรั้ว | `SITE` ใน [site/layout.ts](src/features/site/layout.ts) (ถนนรอบโรงงานเป็นส่วนหนึ่งของกราฟใน [roads/network.ts](src/features/roads/network.ts)) |
| ตำแหน่งประตูเข้า/ออก และป้อมยาม | `ENTRY_GATE`, `EXIT_GATE`, `GUARD_HOUSES` ใน [site/layout.ts](src/features/site/layout.ts) |
| ลานพักรถ P / ลานตรวจปล่อย C (จำนวนช่อง, ตำแหน่ง) | `WEST_BAY_X`, `EAST_BAY_X`, `BAY_CAB_Z` … ใน [site/layout.ts](src/features/site/layout.ts) |
| ตำแหน่ง/ขนาดอาคาร | `ZONES` ใน [site/layout.ts](src/features/site/layout.ts) (หน้าตาอาคารอยู่ใน [Buildings.tsx](src/features/site/scene/Buildings.tsx)) |
| ตัวหนังสือบนพื้น (In 1, Dock lane …) | [site/scene/Markings.tsx](src/features/site/scene/Markings.tsx) |
| ป้ายชื่อโซนที่ลอยอยู่ | [site/scene/ZoneLabels.tsx](src/features/site/scene/ZoneLabels.tsx) |
| ต้นไม้, รั้ว, ลานจอดรถยนต์, เสาไฟ | [site/scene/Landscape.tsx](src/features/site/scene/Landscape.tsx) |
| กองพาเลท, หมุดแผนที่, บิลบอร์ด | [site/scene/YardProps.tsx](src/features/site/scene/YardProps.tsx) |
| สีของทั้งฉาก | [shared/theme.ts](src/shared/theme.ts) |

### กล้องและ UI
| อยากแก้ | ไฟล์ / ค่าที่ต้องดู |
|---|---|
| มุมกล้องสำเร็จรูป / ระยะซูม | `CAMERA_PRESETS`, `ISO_DIR` ใน [store/useSimStore.ts](src/store/useSimStore.ts) |
| ระยะซูมตอนกดดูรถ/คน | `focus` ใน [store/useSimStore.ts](src/store/useSimStore.ts) |
| ขอบเขตซูม/หมุนกล้อง | [app/CameraRig.tsx](src/app/CameraRig.tsx) |
| เพิ่ม/เรียงแท็บด้านซ้าย | `TABS` ใน [ui/Sidebar.tsx](src/ui/Sidebar.tsx) |
| ตัวเลข KPI ใหม่ | `Kpi` + `makeSnapshot` ใน [world/snapshot.ts](src/world/snapshot.ts) แล้วนำไปแสดงในแผง |
| ข้อความในการ์ดรายละเอียด | `inspect()` ใน [world/snapshot.ts](src/world/snapshot.ts) |
| ป้ายทะเบียนลอยเหนือรถ | [shared/tags/EntityTags.tsx](src/shared/tags/EntityTags.tsx) (ความสูงของป้ายแก้ที่ `tagAnchor` ใน registry.ts) |
| สี/ระยะห่าง/ฟอนต์ของ UI | ตัวแปรใน `:root` ของ [index.css](src/index.css) |

---

## 4. ลำดับการทำงาน (Workflow) และโค้ดที่รับผิดชอบ

### ห่วงโซ่อุปทานทั้งเมือง
```
ซัพพลายเออร์ ──PO──▶ โรงงาน: รับเข้า → คลัง(วัตถุดิบ) → สายพานวัตถุดิบ → ไลน์ผลิต
     ▲                        → สายพานสินค้า → คลัง(สินค้าสำเร็จ) → โหลด ──SO──▶ ร้านค้า
     └─ จัดซื้อสั่งเมื่อวัตถุดิบต่ำ                    ร้านสั่งเมื่อสต็อกต่ำ ◀── ชาวเมืองขับรถมาซื้อ
```
- **suppliers:** ผลิตวัตถุดิบสะสมในลาน ถ้า `rawPosition` (ในคลัง + ที่สั่งไว้) < `rawReorder` จะออก PO (`updateSuppliers`)
- **stores:** ชาวเมืองซื้อ (`buyAt`) ทำให้สต็อกลด ถ้าต่ำกว่า `storeReorder` × ความจุ จะออก SO (`updateStores`)
- **residential:** สุ่มรถบ้านออกไปซื้อของตาม `shopProfile` จอดที่ร้าน ซื้อ แล้วขับกลับบ้าน (`updateShopping`)

### รถขาเข้า (รับวัตถุดิบ)
1. **suppliers → orders:** ออกใบสั่งซื้อ PO- และนัดเวลา
2. **trucks:** รถเกิดที่ทางหลวงเมื่อถึงเวลานัด วิ่งตามกราฟถนนไปซัพพลายเออร์ (`toSupplier` → `atSupplier` โหลด `SUPPLIER_LOAD_TIME`) แล้ววิ่งมาจอดที่ประตูทางเข้าโรงงาน (phase `gateIn`) ระหว่างทางหยุดไฟแดง
3. **workers:** รปภ. ประตูเข้าเดินมาตรวจเอกสาร แล้วตั้ง `truck.cleared = true` (`updateGuard`)
4. **trucks:** ถ้าท่าว่าง ไปท่าเลย ถ้าไม่ว่าง ไปจอดลานพัก P (`leaveGate`, `toBay` → `waiting`)
5. **trucks:** ท่าว่างเมื่อไร `dispatch` เรียกคันที่มาถึงประตูก่อน แล้วรถวิ่ง (`toDock`) และถอยเข้าท่า (`reversing` → `docked`)
6. **drivers:** คนขับลงจากรถไปยื่นเอกสารที่สำนักงานรับสินค้า
7. **docks:**
   - พนักงานลากพาเลทจากรถไปวางที่ช่องพัก (`receivingWorker`)
   - เจ้าหน้าที่ QC ตรวจพาเลท แล้วสร้างงาน putaway (`updateCheckers`)
8. **agv:** AGV นำพาเลทจากช่องพักเข้าชั้นวาง (บันทึกเป็น `item: 'raw'`)
9. **docks → trucks:** ขนลงครบเมื่อไร ตั้ง `ready` แล้วคนขับเดินกลับขึ้นรถ ประตูท่าปิด รถออกจากท่า
10. **trucks:** รถไปลาน C เพื่อชั่งน้ำหนักและตรวจซีล (`checkout`)
11. **workers + trucks:** รปภ. ประตูออกตรวจเอกสาร แล้วรถวิ่งกลับไปทางหลวง (`gateOut` → `toHighway`) PO ปิดที่ `closeVisit`

### รถขาออก (ส่งสินค้าให้ร้าน)
ขั้นตอนเหมือนขาเข้า ต่างกันที่:
- รถเปล่ามาจากทางหลวงตรงเข้าโรงงาน
- เมื่อรถถูกเรียกเข้าท่า `requestPicks` จะสร้างงานหยิบ (เฉพาะ `item: 'finished'`) แล้ว AGV หยิบของจากชั้นวางมาวางที่ช่องพัก
- พนักงานโหลดพาเลทขึ้นรถ (`shippingWorker`)
- คนขับขาออกไปรอที่ห้องพักคนขับ ไม่ใช่สำนักงานรับสินค้า
- ออกประตูแล้ววิ่งไปร้าน (`toStore` → `atStore` ขนลง `STORE_UNLOAD_TIME`, `deliverToStore` เติมสต็อก) แล้วกลับทางหลวง

### วัตถุดิบเข้าไลน์ และสินค้าจากฝ่ายผลิต
1. **production:** ถ้าวัตถุดิบข้างไลน์น้อยกว่า `LINE_BUFFER` สร้างงาน `feed` ให้ AGV หยิบวัตถุดิบไปวางบนสายพานวัตถุดิบ (`requestFeed`) → **conveyor** ส่งไปข้างไลน์ (`updateRawConveyor`)
2. **production:** ไลน์ใช้วัตถุดิบ 1 พาเลทเริ่มพาเลทใหม่ (ถ้าไม่มีจะขึ้น "ขาดวัตถุดิบ" ไฟเตือนกะพริบ) เติมกล่องจนเต็ม พนักงานพันฟิล์ม แล้วส่งพาเลทขึ้นสายพาน (`updateProduction`)
2. **conveyor:** พาเลทเลื่อนไปจนถึงปลายสายพาน แล้วสร้างงาน putaway (`updateConveyor`)
3. **agv:** AGV รับพาเลทจากปลายสายพานไปเก็บเข้าชั้นวาง

### วันทำงานของพนักงาน
`updateDuty` ใน [workers/workers.ts](src/features/workers/workers.ts) ทำให้แต่ละคนเปลี่ยนสถานะตามลำดับนี้:

`home` → `drivingIn` (ขับรถจากบ้านตามถนนจริง) → `commuting` (จอดที่ลานจอดพนักงานแล้วเดินเข้า) → `onDuty` → `leaving` (เดินไปรถ) → `drivingHome` → `home`

- ออกจากบ้านก่อนเริ่มกะ `leadOf` ชั่วโมง (คนขับรถ 1.6 ชม. ในเกม)

- ช่วงเปลี่ยนกะ คนที่ทำงานค้างอยู่จะทำให้เสร็จก่อน (`onDutyAt`, `canClockOff`)
- ระหว่างกะมีพักทานข้าวตามรอบ (`updateBreak`)

---

## 5. สูตรการเพิ่มของใหม่

**เพิ่มฟีเจอร์ใหม่**
1. สร้าง `features/<ชื่อ>/<ชื่อ>.ts` มี `createX()` และ `updateX(w, dt)`
2. เพิ่ม state ลงใน `World` ([world/types.ts](src/world/types.ts)) แล้วใส่ค่าเริ่มต้นใน `createWorld`
3. เรียก `updateX` ใน `tickWorld` ([world/world.ts](src/world/world.ts)) ตรงตำแหน่งที่ต้องการ
4. ถ้ามีหน้าตา 3D:
   - สร้าง `features/<ชื่อ>/scene/X.tsx`
   - อ่าน world ใน `useFrame`
   - ใส่คอมโพเนนต์ลงใน [app/Scene.tsx](src/app/Scene.tsx)
5. ถ้ามีแผงข้อมูล:
   - เพิ่มข้อมูลใน `Snapshot` ([world/snapshot.ts](src/world/snapshot.ts))
   - สร้าง `features/<ชื่อ>/ui/XPanel.tsx`
   - เพิ่มแท็บใน [ui/Sidebar.tsx](src/ui/Sidebar.tsx)

**เพิ่มอาคาร/วัตถุตกแต่ง:** กำหนดพื้นที่ใน `ZONES` (ใช้ `mirrorX` เพื่อให้สมมาตร) แล้วสร้างหน้าตาใน [Buildings.tsx](src/features/site/scene/Buildings.tsx) หรือ [YardProps.tsx](src/features/site/scene/YardProps.tsx)

**เพิ่มตำแหน่งพนักงานใหม่**
1. เพิ่มค่าใน `WorkerRole` แล้วสร้างคนใน `createStaff`
2. กำหนดเส้นทางใน `inside`/`doorOf`
3. เขียนพฤติกรรมไว้ในฟีเจอร์ที่เกี่ยวข้อง
4. เพิ่มชื่อและสีใน [workers/labels.ts](src/features/workers/labels.ts)

**เพิ่มร้านค้า/ซัพพลายเออร์/บ้าน:** เพิ่ม `facility(...)` ใน `STORES`/`SUPPLIERS`/`HOMES` ([city/layout.ts](src/features/city/layout.ts)) ระบุ edge (อาคารอยู่ฝั่งซ้ายของทิศ edge), `at`, ขนาด สถานะร้าน/ซัพพลายเออร์ใน world และแถวใน CityPanel จะถูกสร้างให้เอง ตรวจว่าไม่ทับอาคารอื่นและทางเข้าห่างแยก ≥ 12 ม.

**เพิ่มลานพักรถ/ท่า:** แก้ `WEST_BAY_X`/`EAST_BAY_X` หรือ `DOCKS` ข้อมูลใน world และ UI จะปรับตามเอง แต่ต้องตรวจเส้นทางใน [routes.ts](src/features/trucks/routes.ts) ว่ายังไม่ชนอาคาร

---

## 6. ข้อควรระวัง

- **ห้ามอ่าน `world` ผ่าน selector ใน React** เช่น `useSimStore(s => s.world.trucks)` จะไม่อัปเดตและอาจช้า ให้อ่านใน `useFrame` สำหรับ 3D หรืออ่าน `snapshot` สำหรับ UI
- **ใน `tickWorld` ลำดับมีผล** เช่น docks ต้องรันก่อน agv เพื่อให้งานที่สร้างใหม่ถูกจ่ายใน tick เดียวกัน
- **แยกหน่วยเวลาให้ถูก:** ความเร็วและระยะใช้หน่วยวินาทีจำลอง ส่วนตารางเวลา กะ และนัดหมาย ให้ใช้ `minutes()` หรือ `hourOfDay()`
- **แก้เส้นทางรถแล้วต้องทดสอบเรื่องรถติด** การหลบกันใช้จุดตรวจด้านหน้ารถ ถ้าเลนสองเลนห่างกันน้อยกว่า ~2.5 เมตร รถจะรอกันเอง
- **ปรับค่าห่วงโซ่แล้วต้องรันทดสอบหลายวัน** ตรวจว่าวัตถุดิบไม่หมด (`lines[].starved`), สินค้าสำเร็จไม่ล้น/ไม่หมด, ร้าน `lost` ไม่เพิ่ม
- **ทดสอบแบบไม่ต้องเปิดภาพ:** เปิด DevTools บนหน้าแอปแล้วรัน

  ```js
  const W = await import('/src/world/world.ts');
  const w = W.createWorld(9, { ...W.DEFAULT_SETTINGS });
  for (let i = 0; i < 4320 * 20; i++) W.tickWorld(w, 0.05); // 1 วันในเกม
  w.stats;                                   // รถที่ให้บริการ, ผลิตได้
  w.stores.map((s) => [s.id, s.stock, s.sold, s.lost]);
  w.suppliers.map((s) => [s.id, s.stock]);
  ```
- **ถ้าแก้ไฟล์ layout หรือย้ายไฟล์แล้วฉากว่างเปล่า** มักเกิดจาก cache ของ Vite HMR ให้ปิดแล้วรัน `npm run dev` ใหม่
- **ก่อน commit ให้รัน `npm run build`** คำสั่งนี้ตรวจ TypeScript แบบเข้มงวด ตัวแปรที่ประกาศแล้วไม่ใช้จะทำให้ build ไม่ผ่าน
