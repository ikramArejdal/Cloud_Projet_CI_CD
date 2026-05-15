const request = require('supertest');
const app = require('../src/app');

// ════════════════════════════════════════════
// ROUTES DE BASE
// ════════════════════════════════════════════
describe('Routes de base', () => {
  it('GET / répond avec 200', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
  });

  it('GET /test retourne un JSON avec message', async () => {
    const res = await request(app).get('/test');
    expect(res.body.message).toBe('Test route OK');
  });

  it('GET /route-inexistante retourne 404', async () => {
    const res = await request(app).get('/route-inexistante');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ════════════════════════════════════════════
// AUTHENTIFICATION
// ════════════════════════════════════════════
describe('POST /api/auth/register', () => {
  it('crée un compte avec des données valides', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser_ci', password: 'pass1234' });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe('testuser_ci');
    expect(res.body.user.password).toBeUndefined();
  });

  it('refuse un username trop court (< 10 chars)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'test', password: 'pass1234' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('refuse un mot de passe trop court (< 4 chars)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'validuser', password: '123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('refuse un username déjà utilisé', async () => {
    // Premier enregistrement
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'duplicate_user', password: 'pass1234' });

    // Deuxième tentative avec le même username
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'duplicate_user', password: 'autrepass' });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('refuse si username manquant', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'pass1234' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/login', () => {
  // Créer un compte avant les tests de login
  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'loginuser', password: 'monmotdepasse' });
  });

  it('connecte un utilisateur avec des identifiants valides', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'loginuser', password: 'monmotdepasse' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe('loginuser');
  });

  it('refuse un mauvais mot de passe', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'loginuser', password: 'mauvaismdp' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('refuse un username inexistant', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nExistePas', password: 'pass1234' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('refuse si champs manquants', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ════════════════════════════════════════════
// TÂCHES (routes protégées)
// ════════════════════════════════════════════
describe('API Tâches', () => {
  let token;

  // Créer un compte et récupérer le token avant les tests
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'taskuser_ci', password: 'pass1234' });
    token = res.body.token;
  });

  // ── GET /api/tasks ──
  describe('GET /api/tasks', () => {
    it('retourne la liste des tâches (vide au départ)', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.tasks)).toBe(true);
    });

    it('refuse sans token (401)', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.statusCode).toBe(401);
    });

    it('refuse avec un token invalide (401)', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', 'Bearer tokenbidon');
      expect(res.statusCode).toBe(401);
    });
  });

  // ── POST /api/tasks ──
  describe('POST /api/tasks', () => {
    it('crée une tâche avec un titre valide', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Ma première tâche CI', priority: 'high' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.task.title).toBe('Ma première tâche CI');
      expect(res.body.task.priority).toBe('high');
      expect(res.body.task.status).toBe('pending');
    });

    it('crée une tâche avec priorité par défaut (medium)', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Tâche priorité défaut' });

      expect(res.statusCode).toBe(201);
      expect(res.body.task.priority).toBe('medium');
    });

    it('refuse si le titre est vide', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('refuse sans token', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Sans auth' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── PUT /api/tasks/:id (toggle) ──
  describe('PUT /api/tasks/:id', () => {
    let taskId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Tâche à toggler' });
      taskId = res.body.task.id;
    });

    it('toggle la tâche de pending → completed', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.task.status).toBe('completed');
    });

    it('toggle la tâche de completed → pending', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.task.status).toBe('pending');
    });

    it('retourne 404 pour une tâche inexistante', async () => {
      const res = await request(app)
        .put('/api/tasks/999999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // ── DELETE /api/tasks/:id ──
  describe('DELETE /api/tasks/:id', () => {
    let taskId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Tâche à supprimer' });
      taskId = res.body.task.id;
    });

    it('supprime une tâche existante', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('retourne 404 après suppression', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });

    it('refuse sans token', async () => {
      const res = await request(app).delete(`/api/tasks/${taskId}`);
      expect(res.statusCode).toBe(401);
    });
  });
});