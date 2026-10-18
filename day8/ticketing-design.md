# TicketHub System Design Document
---

## 1. Requirements

### 1.1 Functional Requirements
1. **Browse & Search Events**: Users can browse, search, and filter upcoming events (concerts, sports, theater) by title, artist, venue, category, and date.
2. **View Seat Availability**: Users can select an event and view a dynamic visual seating map indicating real-time availability and pricing per seat tier.
3. **Hold Seats (Temporary Reservation)**: Users can select one or more available seats and place a temporary hold on them for **10 minutes** to complete checkout. During this window, no other user can reserve or purchase these seats.
4. **Checkout & Payment**: Users can securely submit payment information for held seats. Upon payment confirmation, the hold transitions to a confirmed, finalized booking.
5. **View Purchased Tickets**: Users can view their order history and access active tickets with unique verification barcodes/QR codes in their account profile.
6. **Automatic Release of Unpaid Holds**: If a user abandons checkout or the 10-minute timer expires, held seats automatically return to `AVAILABLE` status for other buyers.

### 1.2 Non-Functional Requirements
- **Speed (Low Latency)**:
  - Event catalog browsing and seat map queries must return in **< 200 ms**.
  - Seat hold and payment confirmation requests must complete in **< 500 ms** under peak load.
- **Correctness & Consistency (Zero Double-Booking)**:
  - **Strict strong consistency** is required for seat states. Under no circumstances may two users purchase or hold the exact same seat (*zero tolerance for double-selling*).
  - All inventory state transitions (`AVAILABLE` $\rightarrow$ `HELD` $\rightarrow$ `SOLD`) must satisfy ACID properties.
- **Fairness**:
  - Seats must be allocated on a strict **First-Come, First-Served (FCFS)** basis.
  - To prevent ticket scalping and denial-of-service bot swarms, the system must enforce queue tokens, per-user seat limits (e.g., max 4-6 tickets per transaction), and rate limiting.
- **High Availability & Fault Tolerance**:
  - The browsing and seat-viewing infrastructure must maintain **99.99% availability**.
  - A massive traffic spike for one hot concert must be isolated so that it does not degrade operations for other events across the platform.

---

## 2. Capacity & Traffic Estimations

### 2.1 Given Facts & Assumptions
- **Total Registered Users:** 2,000,000 (2 million)
- **Normal Day Visitors:** 50,000 visitors/day
- **Page Views per Visitor:** 10 pages/visit $\rightarrow$ 500,000 views/day
- **Normal Tickets Sold:** 5,000 tickets/day
- **Big Sale Event:** 200,000 users attempting to buy 20,000 available seats within the first **10 minutes** (600 seconds).
- **Time Constants:** 86,400 seconds/day (standard estimation constant: 100,000 seconds/day).

---

### 2.2 Normal Traffic Estimations

#### 2.2.1 Normal Read Traffic (Page Views & Seat Map Requests)
- **Total Daily Views:**
  $$\text{Daily Views} = 50,000 \text{ visitors} \times 10 \text{ pages} = 500,000 \text{ views/day}$$
- **Average Read Requests per Second (QPS):**
  $$\text{Average Read QPS} = \frac{500,000 \text{ views}}{86,400 \text{ seconds}} \approx 5.79 \text{ req/sec} \quad (\approx 5 \text{ req/sec using 100,000 s})$$
- **Peak Normal Read QPS (Assuming 5× average multiplier):**
  $$\text{Peak Normal Read QPS} = 5.79 \times 5 \approx 29 \text{ req/sec}$$

#### 2.2.2 Normal Write Traffic (Ticket Purchases & Holds)
- **Total Daily Purchases:** 5,000 purchases/day
- **Average Write Transactions per Second (TPS):**
  $$\text{Average Write TPS} = \frac{5,000 \text{ tickets}}{86,400 \text{ seconds}} \approx 0.058 \text{ TPS} \quad (\approx 1 \text{ purchase every 17 seconds})$$
- **Peak Normal Write TPS (Assuming 5× multiplier):**
  $$\text{Peak Normal Write TPS} = 0.058 \times 5 \approx 0.29 \text{ TPS}$$

#### 2.2.3 Normal Read-to-Write Ratio
$$\text{Ratio} = 500,000 \text{ reads} : 5,000 \text{ writes} = 100 : 1 \quad (\text{Highly Read-Heavy})$$

---

### 2.3 The "Big Sale" Peak Estimations (Flash Sale Window)
During a mega concert drop, 200,000 users arrive simultaneously within a 10-minute (600-second) window to fight over 20,000 seats.

#### 2.3.1 Big Sale Read Traffic
- Each active user aggressively refreshes event details, checks seat availability maps, and polls for updates. Assuming each user generates an average of **25 read requests** during these 10 minutes:
  $$\text{Total Big Sale Reads} = 200,000 \text{ users} \times 25 \text{ requests} = 5,000,000 \text{ read requests}$$
- **Average Big Sale Read QPS (over 600 seconds):**
  $$\text{Average Big Sale Read QPS} = \frac{5,000,000}{600} \approx 8,333 \text{ req/sec}$$
- **Instantaneous Peak Surge Read QPS (Opening 60 seconds):**
  In the first minute (10% of time), 40% of reads hit the system:
  $$\text{Peak Surge Read QPS} = \frac{2,000,000 \text{ reads}}{60 \text{ seconds}} \approx 33,333 \text{ req/sec}$$

#### 2.3.2 Big Sale Write Traffic (Hold Attempts & Checkouts)
- **Hold Attempts:** All 200,000 users attempt to hold seats as fast as possible.
  $$\text{Average Hold Attempt TPS} = \frac{200,000 \text{ attempts}}{600 \text{ seconds}} \approx 333.3 \text{ hold TPS}$$
  $$\text{Opening Rush Hold TPS (First 60s, 50% attempts)} = \frac{100,000}{60} \approx 1,667 \text{ hold TPS}$$
- **Completed Sales:** Exactly 20,000 tickets sold across the 10-minute window:
  $$\text{Average Final Booking TPS} = \frac{20,000 \text{ tickets}}{600 \text{ seconds}} \approx 33.3 \text{ final sales TPS}$$

---

### 2.4 Traffic Comparison Summary

| Metric | Normal Day Traffic | Big Sale Flash Traffic (10-min window) | Multiplier / Scale Factor |
| :--- | :--- | :--- | :--- |
| **Concurrent Active Users** | ~500 concurrent | 200,000 concurrent | **400× increase** |
| **Average Read QPS** | ~5.8 req/sec | ~8,333 req/sec | **~1,440× increase** |
| **Peak Surge Read QPS** | ~29 req/sec | ~33,333 req/sec | **~1,150× increase** |
| **Average Write TPS** | ~0.06 TPS | ~333 hold TPS / 33.3 sale TPS | **~5,550× increase** |
| **Opening Minute Write TPS** | ~0.3 TPS | ~1,667 hold TPS | **~5,550× peak spike** |
| **System Bottleneck** | None (easily handled by 1 server) | DB connection pool exhaustion & row lock contention | Requires Queueing, Caching, & Distributed Locks |

---

## 3. API Specification

The TicketHub API is designed following REST principles, using standard HTTP methods, status codes, and JSON payloads.

### Endpoint 1: Browse & Search Events
- **Method & Path:** `GET /api/v1/events`
- **Description:** Returns a paginated list of upcoming events matching optional filter criteria. Cached heavily at CDN.
- **Query Parameters:**
  - `query` (string, optional): Search keyword (e.g., `"Coldplay"`).
  - `category` (string, optional): `"concert"`, `"sports"`, `"theater"`.
  - `page` (integer, default: 1): Page number.
  - `limit` (integer, default: 20): Results per page.
- **Response (200 OK):**
```json
{
  "page": 1,
  "limit": 20,
  "total": 142,
  "events": [
    {
      "event_id": "evt_99812",
      "title": "Neon Horizon World Tour",
      "artist": "Nova Pulse",
      "venue": "Grand Arena Stadium",
      "event_date": "2026-11-20T20:00:00Z",
      "status": "ON_SALE",
      "min_price_cents": 4500,
      "max_price_cents": 25000
    }
  ]
}
```

---

### Endpoint 2: View Event Seat Map & Availability
- **Method & Path:** `GET /api/v1/events/{event_id}/seats`
- **Description:** Retrieves real-time seating availability and pricing tiers for an event.
- **Path Parameters:**
  - `event_id` (string, required): Unique event identifier.
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
```json
{
  "event_id": "evt_99812",
  "total_seats": 20000,
  "available_seats_count": 4210,
  "seats": [
    {
      "seat_id": "seat_secA_r1_s12",
      "section": "Section A",
      "row": "Row 1",
      "seat_number": "12",
      "tier": "VIP",
      "price_cents": 15000,
      "status": "AVAILABLE"
    },
    {
      "seat_id": "seat_secA_r1_s13",
      "section": "Section A",
      "row": "Row 1",
      "seat_number": "13",
      "tier": "VIP",
      "price_cents": 15000,
      "status": "HELD"
    }
  ]
}
```
- **Error Codes:** `404 Not Found` (Event does not exist).

---

### Endpoint 3: Hold Seats (Temporary Reservation)
- **Method & Path:** `POST /api/v1/events/{event_id}/holds`
- **Description:** Places an exclusive 10-minute hold on selected seats for the authenticated user.
- **Request Headers:**
  - `Authorization: Bearer <jwt_token>`
  - `X-Queue-Token: <virtual_queue_token>`
- **Request Body:**
```json
{
  "seat_ids": ["seat_secA_r1_s12", "seat_secA_r1_s14"]
}
```
- **Response (201 Created):**
```json
{
  "hold_token": "hld_7c9f82ab34",
  "event_id": "evt_99812",
  "user_id": "usr_5501",
  "seat_ids": ["seat_secA_r1_s12", "seat_secA_r1_s14"],
  "total_price_cents": 30000,
  "expires_at": "2026-10-18T20:45:00Z",
  "remaining_seconds": 600
}
```
- **Error Codes:**
  - `400 Bad Request`: Exceeded maximum seat allowance (e.g., > 4 seats).
  - `409 Conflict`: One or more requested seats are already held or sold.
  - `429 Too Many Requests`: User exceeded hold request rate limits.

---

### Endpoint 4: Checkout & Payment Confirmation
- **Method & Path:** `POST /api/v1/orders/checkout`
- **Description:** Finalizes the purchase of held seats by charging payment and converting hold status to confirmed ticket ownership.
- **Request Headers:**
  - `Authorization: Bearer <jwt_token>`
  - `Idempotency-Key: <unique_client_uuid>` (guarantees safe retries without double-charging)
- **Request Body:**
```json
{
  "hold_token": "hld_7c9f82ab34",
  "payment_method_token": "tok_visa_4242",
  "billing_address": {
    "postal_code": "94105",
    "country": "US"
  }
}
```
- **Response (200 OK):**
```json
{
  "order_id": "ord_104882",
  "order_status": "COMPLETED",
  "total_charged_cents": 30000,
  "currency": "USD",
  "payment_reference": "ch_3N9xKl2eZvKYlo2C",
  "purchased_at": "2026-10-18T20:38:12Z",
  "tickets_count": 2
}
```
- **Error Codes:**
  - `400 Bad Request`: Payment provider declined card.
  - `410 Gone`: Hold has expired; seats were released back to inventory.
  - `409 Conflict`: Idempotency collision or invalid state.

---

### Endpoint 5: View Purchased Tickets
- **Method & Path:** `GET /api/v1/users/me/tickets`
- **Description:** Returns all valid tickets owned by the authenticated user, complete with verification codes for venue admission.
- **Request Headers:** `Authorization: Bearer <jwt_token>`
- **Response (200 OK):**
```json
{
  "user_id": "usr_5501",
  "tickets": [
    {
      "ticket_id": "tkt_883201",
      "order_id": "ord_104882",
      "event_title": "Neon Horizon World Tour",
      "venue": "Grand Arena Stadium",
      "event_date": "2026-11-20T20:00:00Z",
      "section": "Section A",
      "row": "Row 1",
      "seat_number": "12",
      "verification_code": "QR_9381a8fc20b39",
      "qr_code_url": "https://cdn.tickethub.com/qrcodes/QR_9381a8fc20b39.png",
      "status": "VALID"
    }
  ]
}
```

---

## 4. Data Model

The data model uses a relational SQL database (such as PostgreSQL) because ticket reservations require strict ACID compliance, relational integrity, unique constraints, and transaction guarantees.

```
+---------------+           +---------------+
|     users     |           |    events     |
+---------------+           +---------------+
| PK  user_id   |           | PK  event_id  |
|     email     |           |     title     |
|     name      |           |   venue_name  |
|  phone_number |           |   event_date  |
|  created_at   |           |     status    |
+-------+-------+           +---+-------+---+
        |                       |       |
        | 1                     | 1     | 1
        |                       |       |
        | N                     | N     | N
+-------v-------+           +---v---+   |
|    orders     |           | seats |   |
+---------------+           +-------+   |
| PK  order_id  |           |PK seat_id |
| FK  user_id   |           |FK event_id|
| FK  event_id  |<----------+   section |
|  total_amount |           |   row_num |
|     status    |           |  seat_num |
|  payment_ref  |           |   price   |
|  created_at   |           |   status  |
+-------+-------+           |  held_by  |
        |                   | hold_exp  |
        | 1                 |  version  |
        |                   +---+-------+
        | N                     | 1
+-------v-------+               |
|  order_items  |<--------------+
+---------------+ (tickets)
| PK  item_id   |
| FK  order_id  |
| FK  seat_id   |
|  ticket_code  |
|  price_paid   |
+---------------+
```

### 4.1 Table Definitions & Schemas

#### 1. `users` Table
Stores registered customer accounts.
```sql
CREATE TABLE users (
    user_id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. `events` Table
Stores event catalog details and status.
```sql
CREATE TABLE events (
    event_id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    venue_name VARCHAR(255) NOT NULL,
    venue_capacity INTEGER NOT NULL CHECK (venue_capacity > 0),
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'UPCOMING', -- 'UPCOMING', 'ON_SALE', 'SOLD_OUT', 'CANCELLED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. `seats` Table
Represents physical seats for an event. Enforces unique seat identity per event.
```sql
CREATE TABLE seats (
    seat_id VARCHAR(36) PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    section VARCHAR(50) NOT NULL,
    row_num VARCHAR(20) NOT NULL,
    seat_num VARCHAR(20) NOT NULL,
    tier VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'HELD', 'SOLD'
    held_by_user_id VARCHAR(36) REFERENCES users(user_id),
    hold_expires_at TIMESTAMP WITH TIME ZONE,
    version INTEGER NOT NULL DEFAULT 1, -- For Optimistic Concurrency Control
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: No two records can represent the same physical seat in one event
    CONSTRAINT uq_event_seat UNIQUE (event_id, section, row_num, seat_num)
);

-- Indexes for lightning-fast seat map rendering and hold queries
CREATE INDEX idx_seats_event_status ON seats(event_id, status);
CREATE INDEX idx_seats_hold_expiry ON seats(hold_expires_at) WHERE status = 'HELD';
```

#### 4. `orders` Table
Tracks monetary transactions and purchase records.
```sql
CREATE TABLE orders (
    order_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(user_id),
    event_id VARCHAR(36) NOT NULL REFERENCES events(event_id),
    total_amount_cents INTEGER NOT NULL CHECK (total_amount_cents >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED'
    idempotency_key VARCHAR(64) UNIQUE,
    payment_reference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user ON orders(user_id);
```

#### 5. `order_items` (Tickets) Table
Associative entity connecting an order to individual purchased seats, storing digital ticket barcodes.
```sql
CREATE TABLE order_items (
    order_item_id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    seat_id VARCHAR(36) NOT NULL REFERENCES seats(seat_id),
    unit_price_cents INTEGER NOT NULL,
    ticket_verification_code VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_order_seat UNIQUE (seat_id) -- A seat can belong to at most one completed order
);
```

### 4.2 Relationships Explanation
- **`users` to `orders` (1:N):** A single user can place multiple ticket orders over time. Each order belongs to exactly one user.
- **`events` to `seats` (1:N):** An event has many seats (e.g., 20,000 for a concert). Each seat row belongs to exactly one event.
- **`events` to `orders` (1:N):** Multiple customer orders can be placed for a single event.
- **`orders` to `order_items` (1:N):** An order can contain multiple tickets (e.g., 1 to 4 seats).
- **`seats` to `order_items` (1:1 upon purchase):** A specific seat can only ever appear in one active `order_items` record, strictly guarded by the unique constraint `uq_order_seat`.

---

## 5. Architecture & How It Survives the Big Sale

### 5.1 Architecture Diagram

```text
                                    [ 200,000 Users ]
                                            |
                                            v
                                 +---------------------+
                                 | Cloudflare CDN /    |
                                 | DDoS / WAF Shield   |
                                 +----------+----------+
                                            |
                                            v
                                 +---------------------+
                                 |   Virtual Waiting   |
                                 |     Room Queue      |
                                 | (Fair Token Dispatch)
                                 +----------+----------+
                                            |
                       (Admitted 2,000 req/sec throttled traffic)
                                            |
                                            v
                                 +---------------------+
                                 | API Gateway & Load  |
                                 |      Balancer       |
                                 +----------+----------+
                                            |
                   +------------------------+------------------------+
                   |                                                 |
                   v                                                 v
        +---------------------+                           +---------------------+
        |  App Server Pool 1  |                           |  App Server Pool N  |
        |  (Stateless Node/Go)|                           | (Auto-scaled 10-40) |
        +----------+----------+                           +----------+----------+
                   |                                                 |
         +---------+--------------------+----------------------------+
         |                              |                            |
         v                              v                            v
+------------------+          +------------------+         +-------------------+
|  Redis Cluster   |          |  Read Replica DB |         |    Primary DB     |
| (Atomic Seat     |          | (PostgreSQL      |         |   (PostgreSQL     |
|  Hold & TTL,     |          |  Catalog Reads)  |         |  ACID Writes &    |
|  Waiting Room)   |          +------------------+         |   Transactions)   |
+--------+---------+                                       +---------+---------+
         |                                                           |
         | (On Hold Expiry / Event Hook)                             |
         v                                                           v
+------------------+                                       +-------------------+
| Background Worker|                                       | Stripe / Payment  |
| (RabbitMQ Queue) |-------------------------------------->|     Gateway       |
| Ticket & Email   |                                       +-------------------+
+------------------+
```

---

### 5.2 Component Breakdown & Big Sale Defense

1. **Cloudflare CDN & Web Application Firewall (WAF):**
   - **Role:** Absorbs 95% of incoming read volume for static assets (HTML/CSS/JS, venue SVG layouts, event banner images).
   - **Protection:** Mitigates DDoS attacks and blocks malicious automated scraping bots.
2. **Virtual Waiting Room (Fair Queue Layer):**
   - **The Problem:** 200,000 users hitting the seat reservation endpoint simultaneously would cause catastrophic database connection pool starvation and collapse the servers.
   - **Solution:** When concurrent active users exceed system capacity, users enter a FIFO Virtual Waiting Room (e.g., using Redis sorted sets with user timestamps). Users receive a signed Queue Token. The system admits a safe, controlled stream of users (e.g., 500 users every 15 seconds) into the checkout funnel.
3. **API Gateway & Load Balancer:**
   - Performs TLS termination, JWT authentication verification, and client IP rate limiting (e.g., maximum 5 seat hold requests per user per minute).
   - Evenly distributes valid requests across stateless application servers.
4. **Auto-Scaled Stateless Application Servers:**
   - Horizontally scalable containerized services (Node.js/Go/Java) that scale automatically from 5 instances to 40+ instances based on CPU utilization and incoming request queues.
5. **Redis In-Memory Distributed Cache & Atomic Holds:**
   - Stores real-time seat status keys (`seat:<id>:status`).
   - Executes atomic holds in microsecond latency without touching the relational database disk.
6. **Primary PostgreSQL Database with Read Replicas:**
   - **Read Replicas:** Serve generic event queries, historical order looks, and ticket retrievals.
   - **Primary Writer:** Dedicated strictly to finalized order commitments and ACID transaction persistence.
7. **Message Queue (RabbitMQ) & Async Worker Pool:**
   - Offloads asynchronous tasks such as generating PDF tickets, barcode watermarking, sending confirmation emails, and syncing analytics so that user checkout responses remain instantaneous (< 300 ms).

---

### 5.3 Exactly How Double-Booking is Prevented

Preventing two people from acquiring the same seat is the single most critical correctness requirement. TicketHub implements a **Two-Tier Defense-in-Depth** mechanism:

```
User A Request ───┐
                  ├─► [Tier 1: Redis Atomic Hold (NX)] ──► Lock Acquired ──► [Tier 2: SQL ACID Transaction] ──► Confirmed
User B Request ───┘         │                                                     │
                            └─► Lock Denied (409 Conflict)                        └─► Unique Constraint uq_order_seat
```

#### Tier 1: Fast Distributed Locking via Redis Atomic Operations (Pre-DB Filter)
When User A and User B click on Seat #12 at the exact same millisecond:
1. The application server issues an atomic Redis `SET` command with `NX` (only set if not exists) and an expiration `EX` (TTL of 600 seconds = 10 minutes):
   ```bash
   SET seat:evt_99812:secA_r1_s12:hold "usr_A" NX EX 600
   ```
2. **Execution:**
   - Redis processes commands in a single-threaded event loop. If User A's packet arrives 1 microsecond before User B's packet, User A's command returns `OK`.
   - User B's command immediately returns `(nil)` (failure).
3. **Immediate Early Exit:**
   - User B is instantly returned an HTTP `409 Conflict: Seat already held by another user` in **under 5 ms**, without generating any database lock or query overhead!
4. **Automatic Expiry (TTL):**
   - If User A closes their browser or their payment fails, the Redis key automatically expires after 10 minutes, making the seat instantly available again without orphaned database locks.

#### Tier 2: Relational Database ACID Transactions & Constraints (Ultimate Source of Truth)
When User A proceeds to purchase the seat, the application persists the booking inside an isolated relational database transaction.

```sql
BEGIN TRANSACTION;

-- 1. Select the seat with a Pessimistic Write Lock (FOR UPDATE)
SELECT seat_id, status, held_by_user_id, hold_expires_at 
FROM seats 
WHERE seat_id = 'seat_secA_r1_s12' 
  AND event_id = 'evt_99812'
FOR UPDATE;

-- 2. Verify business invariant: the seat must still be HELD by THIS user and not expired
-- (If status <> 'HELD' or held_by_user_id <> current_user or hold_expires_at < NOW(), ROLLBACK)

-- 3. Update the seat status to SOLD permanently
UPDATE seats 
SET status = 'SOLD',
    held_by_user_id = NULL,
    hold_expires_at = NULL,
    version = version + 1
WHERE seat_id = 'seat_secA_r1_s12';

-- 4. Create the finalized order and ticket record
INSERT INTO orders (order_id, user_id, event_id, total_amount_cents, status, payment_reference)
VALUES ('ord_104882', 'usr_A', 'evt_99812', 15000, 'COMPLETED', 'ch_3N9xKl2eZvKYlo2C');

INSERT INTO order_items (order_item_id, order_id, seat_id, unit_price_cents, ticket_verification_code)
VALUES ('item_5541', 'ord_104882', 'seat_secA_r1_s12', 15000, 'QR_9381a8fc20b39');

COMMIT;
```

#### Why This Cannot Fail:
1. **Pessimistic Row Lock (`FOR UPDATE`):** If two concurrent transactions attempt to finalize the same seat, one transaction acquires the exclusive row lock while the second transaction blocks until the first completes.
2. **Database Unique Constraints:** Even if application logic had a bug, the `order_items` table contains `CONSTRAINT uq_order_seat UNIQUE (seat_id)`. The database engine will physically reject any second `INSERT` referencing the same seat ID and throw an integrity error, guaranteeing mathematical impossibility of double-booking.

---

## 6. Architectural Trade-offs

### Trade-off 1: Redis Distributed Hold + DB Pessimistic Locking vs. Pure Database Optimistic Locking
- **The Decision:** We implemented a two-tier hybrid approach: Redis atomic holds (`SET NX EX`) at the memory layer followed by pessimistic `SELECT FOR UPDATE` at checkout time, rather than relying exclusively on SQL database optimistic locking (`version = version + 1`).
- **Pros:**
  - **Extreme Database Protection:** In a flash sale where 200,000 users compete for 20,000 seats, pure database optimistic locking would send hundreds of thousands of concurrent `UPDATE` queries directly to PostgreSQL. 99% of those queries would fail with serialization conflicts, wasting CPU, thrashing disk I/O, and causing transaction rollbacks.
  - **Sub-Millisecond Rejection:** Redis rejects competing hold requests in under 2 ms in memory, shedding 90%+ of write load before it ever touches database connection pools.
  - **Graceful TTL Expiration:** Redis natively handles expiration via key TTLs without requiring expensive database polling cron jobs.
- **Cons & Risks:**
  - **Two Sources of State:** Introduces state synchronization overhead between Redis and PostgreSQL. If Redis crashes or fails over before the DB write, state discrepancies could temporarily occur unless guarded by cache warming and DB fallback reconciliation.
  - **Operational Complexity:** Requires deploying, clustering, and monitoring a highly available Redis sentinel/cluster alongside the relational database.

---

### Trade-off 2: Virtual Waiting Room (Queue Throttling) vs. Open Concurrency ("Free-for-All")
- **The Decision:** We chose a **Virtual Waiting Room** (queue-it style admission token system) during high-demand events rather than allowing all 200,000 visitors to directly hit the API simultaneously.
- **Pros:**
  - **Guaranteed System Survival:** By capping downstream traffic at a steady rate of 2,000 requests/second, the application servers, cache, and database operate within known safe headroom, preventing cascade crashes.
  - **Fairness & Bot Mitigation:** Genuine fans are queued in order of arrival, while bot swarms submitting parallel requests get queued just like human users.
  - **Predictable Checkout Experience:** Users admitted from the queue experience instant load times and reliable checkout rather than frustrating timeout errors.
- **Cons & Risks:**
  - **User Perception & Friction:** Users must wait in an explicit queue screen with a progress bar, which can feel frustrating if they are accustomed to instant access.
  - **Additional Infrastructure Layer:** The waiting room requires stateful session management and cryptographic token signing to ensure users cannot forge admission tokens.
