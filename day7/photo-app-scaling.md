# SnapShare Scaling Plan
---

## 1. Assumptions & Starting Facts
### Given Facts
- **Total Registered Users:** 10,000,000 (10 million)
- **Daily Active Users Ratio:** 10% -> 1,000,000 (1 million) DAU
- **Uploads per Active User per Day:** 1 photo
- **Feed Views per Active User per Day:** 50 pages
- **Average Photo Size:** 2 MB
- **Thumbnail Size:** 50 KB (0.05 MB)
- **Peak Multiplier:** 5× average traffic
- **Time Constants:** 86,400 seconds/day, 365 days/year 
- **NOTE:** Seconds in a day ≈ 86,400 (round to 100,000)

---

## 2. Capacity & Traffic Estimations

### 2.1 Daily Active Users (DAU):
- **Formula:** `Total Registered Users × DAU Ratio`
- **Calculation:** $10,000,000 \times 0.10 = 1,000,000$ DAU
- **DAU Result:** 1,000,000 DAU

### 2.2 Uploads per Second:
#### 2.2.1 Total daily uploads:
- **Formula:** `DAU × Uploads per Active User per Day`
- **Calculation:**
    - $1,000,000\text{ DAU} \times 1\text{ photo/day/user} = 1,000,000\text{ daily uploads}$
- **Result:** $1,000,000\text{ daily uploads}$

#### 2.2.2 Average uploads per second:
- **Formula:** `Total Daily Uploads ÷ Seconds in a Day`
- **Calculation:**
    - \( \frac{1,000,000 \text{ daily uploads}}{100,000 \text{ seconds}} = 10 \text{ uploads/second} \)
- **Result:** 10 uploads/second

#### 2.2.3 Peak uploads per second:
- **Formula:** `Average Uploads per Second × Peak Multiplier`
- **Calculation:**
    - \( 10 \text{ uploads/second} \times 5 = 50 \text{ uploads/second} \)
- **Result:** 50 uploads/second

### 2.3 Feed Views per Second:
#### 2.3.1 Total daily feed views:
- **Formula:** `DAU × Feed Views per Active User per Day`
- **Calculation:**
    - \( 1,000,000\text{ DAU} \times 50\text{ views/day/user} = 50,000,000\text{ daily feed views} \)
- **Result:** 50,000,000 daily feed views

#### 2.3.2 Average feed views per second:
- **Formula:** `Total Daily Feed Views ÷ Seconds in a Day`
- **Calculation:**
    - \( \frac{50,000,000\text{ daily feed views}}{100,000\text{ seconds}} = 500\text{ feed views/second} \)
- **Result:** 500 feed views/second

#### 2.3.3 Peak feed views per second:
- **Formula:** `Average Feed Views per Second × Peak Multiplier`
- **Calculation:**
    - \( 500\text{ feed views/second} \times 5 = 2,500\text{ feed views/second} \)
- **Result:** 2,500 feed views/second

### 2.4 Storage per Year:
#### 2.4.1 Storage per Photo:
- **Formula:** `Original + Thumbnail`
- **Calculation:**
    - $2\text{ MB} + 0.05\text{ MB} = 2.05\text{ MB}$
- **Result:** 2.05 MB/photo

#### 2.4.2 Total daily storage:
- **Formula:** `Total Daily Uploads × Storage per Photo`
- **Calculation:**
    - $1,000,000\text{ daily uploads} \times 2.05\text{ MB/photo} = 2,050,000\text{ MB/day}$
- **Result:** 2,050,000 MB/day

#### 2.4.3 Total annual storage:
- **Formula:** `Total Daily Storage × Days in a Year`
- **Calculation:**
    - $2,050,000\text{ MB/day} \times 365\text{ days/year} = 748,250,000\text{ MB/year}$
- **Result:** 748,250,000 MB/year

#### 2.4.4 Convert to Terabytes (TB):
- **Conversion Factor:** 1 TB = 1,000,000 MB
- **Calculation:**
    - \( \frac{748,250,000\text{ MB}}{1,000,000\text{ MB/TB}} = 748.25\text{ TB} \)
- **Result:** 748.25 TB/year

## 3. System Nature: Read-Heavy vs. Write Heavy

### Characteristics
- **Read-to-Write Ratio:** `[Feed views/sec (reads) : Uploads/sec (writes)] = 500 : 10 = 50:1`
- **Classification:** `Read-heavy`
- **Reason:** `50 times more reads than writes`
- **What this means for the architecture:**
    - Since reads vastly outnumber writes, this means that the database will struggle with read traffic if all queries hit one server.
    - Thus, we need solutions that optimize read retrieval:
        1. read replicas ( distributing SELECT queries)
        2. in-memory caching (storing hot feeds/metadata in RAM)
        3. CDNs (serving static assets close to the user without touching your servers)
        
## 4. Storage Strategy: Database vs. Object Storage

### Why Photos Should NOT Be Stored in the Database 

1. Database bloat & memory efficiency: Databases keep indexes and working datasets in RAM. Massive binary files blow out the database buffer pool and degrade query performance.
2. Backups & replication: Backing up or replicating a database holding terabytes of media files becomes painfully slow and fragile.
3. Cost & scaling: Database storage (SSD with high IOPS) is significantly more expensive than Object Storage (like Amazon S3, Google Cloud Storage, or Azure Blob Storage).

### Where Photos Belong Instead

1. Object Storage: Stores the binary files (original photos, thumbnails).
2. Database: Stores only metadata (e.g., id, user_id, photo_url, created_at, caption).


## 5. System Architecture Diagram
```text
                     +-----------------------+
                     |        Clients        |
                     |  (Mobile App/Browser) |
                     +-----------+-----------+
                                 |
         +-----------------------+-----------------------+
         | (Static Media / Photos)                       | (API Requests / Uploads)
         v                                               v
+-----------------+                             +-----------------+
|       CDN       |                             |  Load Balancer  |
+--------+--------+                             +--------+--------+
         |                                               |
         | (Origin Fetch on Cache Miss)         +--------+--------+
         |                                      |                 |
         |                                      v                 v
         |                            +-----------------+ +-----------------+
         |                            |   App Server 1  | |   App Server 2  |
         |                            +--------+--------+ +--------+--------+
         |                                     |                   |
         |         +---------------------------+---------+         |
         |         |                           |         |         |
         |         v                           v         v         v
         |  +-------------+             +------------+ +-------------+
         |  |    Cache    |             | Primary DB | |Read Replica |
         |  +-------------+             +-----+------+ +-------------+
         |                                    | (Writes)      ^ (Reads)
         |                                    +---------------+ (Replication)
         v                                    |
+------------------+                   +------+------+
|  Object Storage  |<------------------|Message Queue|
| (Photos & Thumbs)| (Upload / Read)   +------+------+
+--------^---------+                          |
         |                                    v
         +-----------------------------+-------------+
             (Write Thumbnails)        |   Worker    |
                                       +-------------+
```

## 6. The Architectural Components & What Problem Each Solves

1. **CDN (Content Delivery Network)**: Caches static media (photos, thumbnails) geographically closer to users to reduce latency and origin server bandwidth.
2. **Load Balancer**: Distributes incoming HTTP traffic across multiple application servers so no single server gets overwhelmed or becomes a single point of failure.
3. **App Servers (Application Layer)**: Runs the core business logic (authenticating users, handling uploads, assembling user feeds).
4. **Cache (e.g., Redis / Memcached)**: Stores frequently read data in memory (like user sessions or recent feeds) to avoid querying the database repeatedly.
5. **Database with Read Replica**:
    - **Primary DB**: Handles all writes/updates.
    - **Read Replica**: Replicates data from the primary to handle heavy read/query traffic without slowing down writes.
6. **Object Storage**: Durable, scalable, low-cost storage specifically designed for large unstructured binary files (photos).
7. **Message Queue & Thumbnail Worker**:
    - **Queue (e.g., SQS, RabbitMQ)**: Buffers thumbnail processing jobs so upload requests stay fast.
    - **Worker**: Asynchronously pulls jobs from the queue, resizes the image, and writes the thumbnail back to Object Storage.

## 7. The Step-by-Step Upload Flow

When a user taps "Upload", what happens?

1. User sends request: The client POSTs the photo and caption to the Load Balancer $\rightarrow$ App Server.
2. Store raw file: The App Server uploads the original 2 MB photo to Object Storage and receives the photo URL.
3. Save metadata: The App Server writes the photo metadata (URL, user ID, timestamp) to the Primary Database.
4. Queue the thumbnail job: The App Server pushes a job (e.g., photo_id, image_url) onto the Message Queue.
5. Immediate response: The App Server immediately responds to the user: "Upload successful!" (The user does not wait for resizing).
6. Worker processes: The background Worker picks up the task from the queue, downloads the photo from Object Storage, generates the 50 KB thumbnail, uploads the thumbnail back to Object Storage, and updates the database record with thumbnail_url.

## 8. Architectural Trade-offs

### Trade-off 1: Asynchronous vs. Synchronous Thumbnail Generation

- **Decision**: Asynchronous thumbnail generation (using a Message Queue and background Worker) was chosen for this architecture.
- **Pros**: 
    - **Fast Upload Experience**: Users receive an immediate "Upload successful" response, improving perceived performance and user satisfaction.
    - **Scalability**: The system can handle sudden spikes in upload traffic because the web servers are decoupled from the computationally intensive task of image processing.
    - **Resilience**: If the thumbnail worker service fails or slows down, the upload process continues unaffected, and failed jobs can be retried from the queue.
- **Cons / Risks**: 
    - **Increased Complexity**: Requires managing additional infrastructure components (Message Queue and Worker processes), which adds operational overhead.
    - **Eventual Consistency**: The user will not see the thumbnail immediately after the upload; there is a delay between the upload and the appearance of the processed thumbnail.
    - **Potential Data Inconsistency**: If the worker fails and cannot process the job, the original image will be stored, but the thumbnail will be missing, requiring additional logic for error handling and retry mechanisms.


### Trade-off 2: Read Replicas & Eventual Consistency vs. Strong Consistency

- **Decision**: Read Replicas with Eventual Consistency were chosen for this architecture.
- **Pros**:
    - **Improved Read Scalability**: The architecture can handle a high volume of read requests (500 reads per second) by distributing the load across multiple read replicas.
    - **Enhanced Availability**: If the primary database server fails, read replicas can continue to serve read traffic, ensuring high availability of the application.
    - **Decoupled Write and Read Operations**: Read operations do not compete with write operations for database resources, leading to better overall performance.
- **Cons / Risks**:
    - **Replication Lag**: There is a delay between when data is written to the primary database and when it becomes available on the read replicas. This can lead to users seeing stale data.
    - **Complexity in Application Logic**: The application needs to be designed to handle eventual consistency, which may require additional logic for data synchronization and conflict resolution.
    - **Cost**: Maintaining multiple database servers (one primary and one or more read replicas) increases infrastructure costs.
    - **Complexity in Testing**: Testing for race conditions and data consistency across replicas adds complexity to the development and testing process.