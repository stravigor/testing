# Testing

TestCase boots your app, provides HTTP helpers, and wraps each test in a rolled-back database transaction for full isolation.

## Quick Start

```typescript
import { describe, test, expect } from 'bun:test'
import { TestCase, Factory } from '@stravigor/testing'
import User from '../app/models/user'

const UserFactory = Factory.define(User, (seq) => ({
  pid: crypto.randomUUID(),
  name: `User ${seq}`,
  email: `user-${seq}@test.com`,
  passwordHash: 'hashed',
}))

const t = await TestCase.boot({
  auth: true,
  routes: () => import('../start/api_routes'),
})

describe('Users API', () => {
  test('list users', async () => {
    const user = await UserFactory.create()
    await t.actingAs(user)

    const res = await t.get('/api/users')
    expect(res.status).toBe(200)
  })

  // No cleanup needed — transaction auto-rollbacks after each test
})
```

## TestCase

### Boot

`TestCase.boot()` registers `beforeEach`, `afterEach`, and `afterAll` hooks automatically:

```typescript
const t = await TestCase.boot({
  routes: () => import('../start/api_routes'),
})
```

For manual control, use the instance methods directly:

```typescript
const t = new TestCase()
beforeAll(() => t.setup())
afterAll(() => t.teardown())
beforeEach(() => t.beforeEach())
afterEach(() => t.afterEach())
```

### Options

```typescript
const t = await TestCase.boot({
  // Load route files (called once during setup)
  routes: () => import('../start/api_routes'),

  // Boot Auth + SessionManager, create their tables (default: false)
  auth: true,

  // Set Auth.useResolver() for loading users by ID
  userResolver: async (id) => User.find(id as string),

  // Boot ViewEngine (default: false)
  views: true,

  // Wrap each test in a transaction (default: true)
  transaction: true,
})
```

### HTTP Helpers

All helpers call `router.handle()` directly — no HTTP server needed, no port conflicts:

```typescript
const res = await t.get('/api/users')
const res = await t.post('/api/users', { name: 'Alice' })
const res = await t.put('/api/users/1', { name: 'Bob' })
const res = await t.patch('/api/users/1', { name: 'Charlie' })
const res = await t.delete('/api/users/1')
```

Bodies are automatically serialized as JSON. Custom headers can be passed as the last argument:

```typescript
const res = await t.get('/api/users', { 'X-Custom': 'value' })
const res = await t.post('/api/users', body, { 'X-Custom': 'value' })
```

### Authentication

```typescript
// Authenticate as a user (creates a real AccessToken)
const user = await UserFactory.create()
await t.actingAs(user)

// All subsequent requests include the Bearer token
const res = await t.get('/api/profile')  // Authenticated

// Clear authentication
t.withoutAuth()
const res = await t.get('/api/profile')  // Unauthenticated
```

Auth state resets automatically after each test (via `afterEach`).

### Custom Headers

```typescript
t.withHeaders({ 'Accept-Language': 'fr' })
const res = await t.get('/api/content')
```

Headers reset after each test.

### Exposed Properties

```typescript
t.db       // Database instance — for direct SQL queries
t.router   // Router instance — for custom assertions
t.config   // Configuration instance — for reading config values
```

## Transaction Isolation

By default, every test runs inside a database transaction that rolls back when the test completes. This means:

- Tests are fully isolated — data created in one test is invisible to the next
- No `DELETE FROM` cleanup needed
- Tests can run in any order
- Fast — rollback is cheaper than delete + re-insert

To disable transaction wrapping (e.g., for tests that don't touch the database):

```typescript
const t = await TestCase.boot({ transaction: false })
```

## Factory

### Shared factory definitions

Define factories in `database/factories/` so both tests and [seeders](./database.md#seeding) can import them:

```
database/
  factories/
    user_factory.ts
    post_factory.ts
    index.ts          # re-exports all factories
```

```typescript
// database/factories/user_factory.ts
import { Factory } from '@stravigor/testing'
import User from '../../app/models/user'

export const UserFactory = Factory.define(User, (seq) => ({
  pid: crypto.randomUUID(),
  name: `User ${seq}`,
  email: `user-${seq}@test.com`,
  passwordHash: 'hashed',
}))
```

Then import in tests:

```typescript
import { UserFactory, PostFactory } from '../database/factories'
```

### Define

```typescript
import { Factory } from '@stravigor/testing'
import User from '../app/models/user'
import Post from '../app/models/post'

const UserFactory = Factory.define(User, (seq) => ({
  pid: crypto.randomUUID(),
  name: `User ${seq}`,
  email: `user-${seq}@test.com`,
  passwordHash: 'hashed',
}))

const PostFactory = Factory.define(Post, (seq) => ({
  title: `Post ${seq}`,
  body: 'Lorem ipsum',
  status: 'draft',
}))
```

The `seq` argument is an auto-incrementing number (1, 2, 3...) unique to each factory, useful for generating unique values.

### Create

```typescript
// Create and persist a single record
const user = await UserFactory.create()

// With overrides
const admin = await UserFactory.create({ name: 'Admin', role: 'admin' })

// Create multiple
const users = await UserFactory.createMany(5)
const editors = await UserFactory.createMany(3, { role: 'editor' })
```

### Make (No Database)

Build an in-memory instance without persisting:

```typescript
const user = UserFactory.make()
user._exists  // false — not in the database
user.name     // 'User 1'

const custom = UserFactory.make({ name: 'Override' })
```

### Reset Sequences

```typescript
Factory.resetSequences()  // Resets all factory counters to 0
```

## Full Example

```typescript
import { describe, test, expect } from 'bun:test'
import { TestCase, Factory } from '@stravigor/testing'
import User from '../app/models/user'
import Post from '../app/models/post'

const UserFactory = Factory.define(User, (seq) => ({
  pid: crypto.randomUUID(),
  name: `User ${seq}`,
  email: `user-${seq}@test.com`,
  passwordHash: 'hashed',
}))

const PostFactory = Factory.define(Post, (seq) => ({
  title: `Post ${seq}`,
  body: `Content for post ${seq}`,
}))

const t = await TestCase.boot({
  auth: true,
  userResolver: async (id) => User.find(id as string),
  routes: () => import('../start/api_routes'),
})

describe('Posts API', () => {
  test('create a post', async () => {
    const user = await UserFactory.create()
    await t.actingAs(user)

    const res = await t.post(`/api/users/${user.pid}/posts`, {
      title: 'My Post',
      body: 'Hello world',
    })

    expect(res.status).toBe(201)
    const data = await res.json() as any
    expect(data.title).toBe('My Post')
  })

  test('list posts for a user', async () => {
    const user = await UserFactory.create()
    await t.actingAs(user)

    // Create posts with the factory
    await PostFactory.create({ userPid: user.pid })
    await PostFactory.create({ userPid: user.pid })

    const res = await t.get(`/api/users/${user.pid}/posts`)
    expect(res.status).toBe(200)
    const data = await res.json() as any[]
    expect(data).toHaveLength(2)
  })

  test('unauthenticated request returns 401', async () => {
    const res = await t.get('/api/profile')
    expect(res.status).toBe(401)
  })
})
```
