# @stravigor/testing

Testing utilities for the [Strav](https://www.npmjs.com/package/@stravigor/core) framework. Provides HTTP testing helpers, authentication simulation, transaction-based test isolation, and model factories.

## Install

```bash
bun add -d @stravigor/testing
```

Requires `@stravigor/core` as a peer dependency.

## TestCase

Boots the app, provides HTTP helpers, and wraps each test in a rolled-back transaction for full isolation.

```ts
import { describe, test, expect } from 'bun:test'
import { TestCase } from '@stravigor/testing'

const t = await TestCase.boot({
  auth: true,
  routes: () => import('./start/api_routes'),
})

describe('Posts API', () => {
  test('list posts', async () => {
    const res = await t.get('/api/posts')
    expect(res.status).toBe(200)
  })

  test('create post as authenticated user', async () => {
    const user = await UserFactory.create()
    await t.actingAs(user)

    const res = await t.post('/api/posts', { title: 'Hello' })
    expect(res.status).toBe(201)
  })
})
```

### HTTP Methods

```ts
await t.get('/path')
await t.post('/path', body)
await t.put('/path', body)
await t.patch('/path', body)
await t.delete('/path')
```

### Auth Helpers

```ts
await t.actingAs(user)        // authenticate as user
t.withHeaders({ 'X-Custom': 'value' })
t.withoutAuth()               // clear auth token
```

## Factory

Lightweight model factory for test data seeding.

```ts
import { Factory } from '@stravigor/testing'

const UserFactory = Factory.define(User, (seq) => ({
  pid: crypto.randomUUID(),
  name: `User ${seq}`,
  email: `user-${seq}@test.com`,
  passwordHash: 'hashed',
}))

const user = await UserFactory.create()
const users = await UserFactory.createMany(5)
const user = await UserFactory.create({ name: 'Custom' })
const instance = UserFactory.make()  // in-memory only, no DB
```

## License

MIT
