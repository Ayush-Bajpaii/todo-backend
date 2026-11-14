# TaskFlow Backend

A minimal REST API for the **TaskFlow** Android app (Kotlin, Jetpack Compose, MVVM, Hilt, Retrofit, Room, WorkManager).

- **Node.js + Express 5** running as a single **Netlify Function**
- **MongoDB Atlas** (free M0) via the official `mongodb` driver
- **Firebase Authentication**: the Android app signs users in, and the backend only verifies ID tokens with the Firebase Admin SDK

Only 4 dependencies: `express`, `mongodb`, `firebase-admin`, `serverless-http`.

---

## Project structure

```
.
├── netlify/functions/api.js     # Netlify entry point (wraps Express with serverless-http)
├── src/
│   ├── app.js                   # Express app: JSON, CORS, routes, error handling
│   ├── server.js                # Local dev server (npm run dev)
│   ├── config/
│   │   ├── env.js               # Reads environment variables
│   │   └── firebase.js          # Firebase Admin init + verifyIdToken
│   ├── db/mongo.js              # Cached MongoClient (reused across warm invocations)
│   ├── middleware/
│   │   ├── auth.js              # Verifies "Authorization: Bearer <idToken>"
│   │   └── errorHandler.js      # 404 + centralised JSON errors
│   ├── controllers/taskController.js  # CRUD logic (always filtered by userId)
│   ├── routes/tasks.js          # /api/tasks routes
│   └── utils/
│       ├── ApiError.js
│       └── taskValidator.js     # Input validation
├── public/index.html            # Tiny landing page (Netlify needs a publish dir)
├── netlify.toml                 # Functions config + /api/* redirect
├── .env.example
└── package.json
```

---

## Environment variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | Atlas connection string (`mongodb+srv://user:pass@cluster.../?retryWrites=true&w=majority`) |
| `MONGODB_DB_NAME` | Database name, e.g. `taskflow` |
| `FIREBASE_PROJECT_ID` | `project_id` from the service-account JSON |
| `FIREBASE_CLIENT_EMAIL` | `client_email` from the service-account JSON |
| `FIREBASE_PRIVATE_KEY` | `private_key` from the service-account JSON (keep the `\n`; the code converts them) |
| `CORS_ORIGIN` | Optional. Default `*`. Native Android doesn't need CORS. |
| `PORT` | Optional. Local dev port, default `3000`. |

---

## 1. MongoDB Atlas setup (free)

1. Sign up at https://www.mongodb.com/cloud/atlas/register.
2. **Create → Free (M0)** cluster. Pick AWS and a nearby region (e.g. Mumbai).
3. **Security → Database Access → Add New Database User**: username plus an auto-generated password (letters and numbers only), with role *Read and write to any database*.
4. **Security → Network Access → Add IP Address → Allow Access from Anywhere** (`0.0.0.0/0`). Netlify has no fixed IPs.
5. **Clusters → Connect → Drivers → Node.js**: copy the URI and replace `<db_password>`. That value is `MONGODB_URI`.

The `taskflow` database and `tasks` collection are created automatically on first use.

## 2. Firebase setup (free Spark plan)

1. Open https://console.firebase.google.com and create or open your project (the same one the Android app uses).
2. **Build → Authentication → Get started → Sign-in method**: enable **Email/Password** (and Google if you want).
3. **⚙️ Project settings → Service accounts → Generate new private key**. This downloads a JSON file.
4. Copy `project_id`, `client_email`, `private_key` into the env vars above.
   **Never commit this JSON file.** Keep it outside the repo.

## 3. Run locally

Requires **Node.js 20+**.

```bash
npm install
cp .env.example .env      # then fill in the real values
npm run dev               # http://localhost:3000/api
```

Check it works:

```bash
curl http://localhost:3000/api/health
# {"success":true,"data":{"status":"ok","time":"..."}}
```

Optional: run exactly like Netlify with the CLI:

```bash
npm install -g netlify-cli
netlify dev               # http://localhost:8888/api
```

### Getting a test ID token (without the Android app)

1. Firebase Console → Authentication → **Users → Add user** (email + password).
2. Firebase Console → Project settings → General → copy the **Web API Key**.
3. Exchange the email and password for an ID token:

```bash
curl -s -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=YOUR_WEB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret123","returnSecureToken":true}'
```

Copy `idToken` from the response (valid for about 1 hour) and use it:

```bash
TOKEN="paste-id-token-here"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/tasks
```

## 4. Deploy to Netlify (free)

1. Push this repo to GitHub.
2. https://app.netlify.com → **Add new project → Import an existing project → GitHub** → select `todo-backend`.
3. Build settings are read from `netlify.toml`. Leave the defaults and click **Deploy**.
4. **Project configuration → Environment variables → Add a variable**: add `MONGODB_URI`, `MONGODB_DB_NAME`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
   For `FIREBASE_PRIVATE_KEY`, paste the value **without** surrounding quotes, `\n` included.
5. **Deploys → Trigger deploy → Deploy project**, so the new variables are picked up.
6. Test: `https://<your-site>.netlify.app/api/health`

Every `git push` to `main` redeploys automatically.

---

## API reference

Base URL: `https://<your-site>.netlify.app/api/`

All `/tasks` endpoints require:

```
Authorization: Bearer <Firebase ID token>
Content-Type: application/json
```

### Response format

Success:
```json
{ "success": true, "data": { ... } }
```

Error:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid task data",
    "details": [{ "field": "title", "message": "title is required" }]
  }
}
```

| Status | `error.code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` / `INVALID_JSON` | Bad body |
| 401 | `UNAUTHORIZED` / `INVALID_TOKEN` / `TOKEN_EXPIRED` | Missing or invalid token |
| 404 | `NOT_FOUND` | Task doesn't exist **or belongs to another user** |
| 500 | `INTERNAL_ERROR` | Server problem |

### Task object

```json
{
  "id": "6730c1f2a1b2c3d4e5f60718",
  "userId": "firebaseUid123",
  "title": "Buy milk",
  "description": "2 litres",
  "priority": "HIGH",
  "status": "TODO",
  "dueDate": "2026-11-20T10:00:00.000Z",
  "createdAt": "2026-11-14T16:00:00.000Z",
  "updatedAt": "2026-11-14T16:00:00.000Z"
}
```

| Field | Rules |
|---|---|
| `title` | Required on create, 1–200 chars |
| `description` | Optional, max 2000 chars, default `""` |
| `priority` | `LOW` \| `MEDIUM` \| `HIGH`, default `MEDIUM` |
| `status` | `TODO` \| `IN_PROGRESS` \| `COMPLETED`, default `TODO` |
| `dueDate` | ISO-8601 string or `null` |
| `id`, `userId`, `createdAt`, `updatedAt` | Set by the server (ignored if sent) |

### GET /api/tasks

Returns the user's tasks, newest first.

```
200 OK
{ "success": true, "data": [ { ...task }, { ...task } ] }
```

### GET /api/tasks/:id

```
200 OK   { "success": true, "data": { ...task } }
404      { "success": false, "error": { "code": "NOT_FOUND", "message": "Task not found" } }
```

### POST /api/tasks

```json
{
  "title": "Buy milk",
  "description": "2 litres",
  "priority": "HIGH",
  "status": "TODO",
  "dueDate": "2026-11-20T10:00:00Z"
}
```

```
201 Created   { "success": true, "data": { ...task } }
```

### PATCH /api/tasks/:id

Send only the fields to change:

```json
{ "status": "COMPLETED" }
```

```
200 OK   { "success": true, "data": { ...updated task } }
```

### DELETE /api/tasks/:id

```
200 OK   { "success": true, "data": { "id": "6730c1f2a1b2c3d4e5f60718" } }
```

---

## Android / Retrofit integration

### DTOs (Kotlin, kotlinx.serialization or Moshi/Gson)

```kotlin
@Serializable
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val error: ApiErrorDto? = null
)

@Serializable
data class ApiErrorDto(
    val code: String,
    val message: String,
    val details: List<FieldErrorDto>? = null
)

@Serializable
data class FieldErrorDto(val field: String, val message: String)

@Serializable
data class TaskDto(
    val id: String,
    val userId: String,
    val title: String,
    val description: String,
    val priority: String,      // LOW | MEDIUM | HIGH
    val status: String,        // TODO | IN_PROGRESS | COMPLETED
    val dueDate: String?,      // ISO-8601 -> Instant.parse(...)
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class CreateTaskRequest(
    val title: String,
    val description: String? = null,
    val priority: String? = null,
    val status: String? = null,
    val dueDate: String? = null
)

// For PATCH, send only the fields you change.
// Configure your Json with explicitNulls = false so null fields are omitted.
@Serializable
data class UpdateTaskRequest(
    val title: String? = null,
    val description: String? = null,
    val priority: String? = null,
    val status: String? = null,
    val dueDate: String? = null
)

@Serializable
data class DeletedDto(val id: String)
```

### Retrofit service

```kotlin
interface TaskApi {
    @GET("tasks")
    suspend fun getTasks(): ApiResponse<List<TaskDto>>

    @GET("tasks/{id}")
    suspend fun getTask(@Path("id") id: String): ApiResponse<TaskDto>

    @POST("tasks")
    suspend fun createTask(@Body body: CreateTaskRequest): ApiResponse<TaskDto>

    @PATCH("tasks/{id}")
    suspend fun updateTask(@Path("id") id: String, @Body body: UpdateTaskRequest): ApiResponse<TaskDto>

    @DELETE("tasks/{id}")
    suspend fun deleteTask(@Path("id") id: String): ApiResponse<DeletedDto>
}
```

> Retrofit throws `HttpException` for 4xx/5xx. Parse `e.response()?.errorBody()?.string()` into `ApiResponse<Unit>` to read `error.code` / `error.message`.

### Auth interceptor (adds the Firebase ID token)

```kotlin
class AuthInterceptor @Inject constructor(
    private val firebaseAuth: FirebaseAuth
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val user = firebaseAuth.currentUser
            ?: return chain.proceed(chain.request())
        // getIdToken(false) returns a cached token and refreshes it automatically when expired.
        val token = Tasks.await(user.getIdToken(false)).token
        val request = chain.request().newBuilder()
            .header("Authorization", "Bearer $token")
            .build()
        return chain.proceed(request)
    }
}
```

### Base URL

| Environment | Base URL |
|---|---|
| Production | `https://<your-site>.netlify.app/api/` |
| Emulator → `npm run dev` | `http://10.0.2.2:3000/api/` |
| Emulator → `netlify dev` | `http://10.0.2.2:8888/api/` |

The base URL **must end with `/`**. For local `http://` URLs, allow cleartext traffic in debug builds (`android:usesCleartextTraffic="true"` or a debug `network_security_config`).

---

## Notes

- **Security:** every database query includes `userId = <verified Firebase UID>`, so users can never read or modify another user's tasks. `userId` is never accepted from the client.
- **Serverless:** the MongoDB client and Firebase app are cached at module level and reused across warm invocations.
- **Free tiers:** Atlas M0 (512 MB), Firebase Spark, and Netlify Free are more than enough for this project.
