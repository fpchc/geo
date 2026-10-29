import { createServer } from 'node:http';

const port = Number(process.env.STUB_PORT ?? 4010);

const CONTENT_OPS_PERMISSIONS = [
  'content:agent:list',
  'content:agent:query',
  'content:material:create',
  'content:content:list',
  'content:content:query',
  'content:content:generate',
  'content:content:create',
  'content:review:score',
  'content:review:query',
  'content:setting:query',
  'content:setting:update',
];

const CONTENT_VIEWER_PERMISSIONS = [
  'content:content:list',
  'content:content:query',
  'content:review:query',
];

const SYSTEM_ADMIN_PERMISSIONS = [
  'system:user:list',
  'system:user:query',
  'system:user:create',
  'system:user:update',
  'system:user:delete',
  'system:user:resetpwd',
  'system:user:assign',
  'system:role:list',
  'system:role:query',
  'system:role:create',
  'system:role:update',
  'system:role:delete',
  'system:role:assign',
  'system:menu:list',
  'system:menu:query',
  'system:menu:create',
  'system:menu:update',
  'system:menu:delete',
];

const users = {
  super_admin: {
    user_id: 1,
    username: 'super_admin',
    permissions: ['*'],
  },
  content_ops: {
    user_id: 2,
    username: 'content_ops',
    permissions: CONTENT_OPS_PERMISSIONS,
  },
  content_viewer: {
    user_id: 6,
    username: 'content_viewer',
    permissions: CONTENT_VIEWER_PERMISSIONS,
  },
  system_admin: {
    user_id: 7,
    username: 'system_admin',
    permissions: SYSTEM_ADMIN_PERMISSIONS,
  },
  settings_viewer: {
    user_id: 8,
    username: 'settings_viewer',
    permissions: ['content:setting:query'],
  },
  expired: {
    user_id: 3,
    username: 'expired',
    permissions: CONTENT_OPS_PERMISSIONS,
  },
  revoked: {
    user_id: 4,
    username: 'revoked',
    permissions: CONTENT_OPS_PERMISSIONS,
  },
  stale: {
    user_id: 5,
    username: 'stale',
    permissions: CONTENT_OPS_PERMISSIONS,
  },
};

const adminUsers = [
  {
    id: 1,
    username: 'super_admin',
    nickname: 'Super Admin',
    email: 'admin@example.com',
    phone: null,
    is_active: true,
    is_superuser: true,
    role_ids: [1],
  },
  {
    id: 2,
    username: 'content_ops',
    nickname: 'Content Ops',
    email: 'ops@example.com',
    phone: null,
    is_active: true,
    is_superuser: false,
    role_ids: [3],
  },
  {
    id: 6,
    username: 'content_viewer',
    nickname: 'Content Viewer',
    email: 'viewer@example.com',
    phone: null,
    is_active: true,
    is_superuser: false,
    role_ids: [4],
  },
  {
    id: 7,
    username: 'system_admin',
    nickname: 'System Admin',
    email: 'sysadmin@example.com',
    phone: null,
    is_active: true,
    is_superuser: false,
    role_ids: [2],
  },
  {
    id: 3,
    username: 'expired',
    nickname: null,
    email: null,
    phone: null,
    is_active: true,
    is_superuser: false,
    role_ids: [3],
  },
  {
    id: 4,
    username: 'revoked',
    nickname: null,
    email: null,
    phone: null,
    is_active: true,
    is_superuser: false,
    role_ids: [3],
  },
  {
    id: 5,
    username: 'stale',
    nickname: null,
    email: null,
    phone: null,
    is_active: true,
    is_superuser: false,
    role_ids: [3],
  },
];

let nextAdminUserId = 8;

function paginate(items, page = 1, pageSize = 20) {
  const total = items.length;
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    page_size: pageSize,
    total_pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

const menuSeed = [
  {
    id: 8,
    name: '工作台',
    type: 1,
    parent_id: 0,
    path: '/dashboard',
    icon: 'dashboard',
    perm_code: null,
    order_no: 0,
    visible: true,
  },
  {
    id: 2,
    name: '内容',
    type: 0,
    parent_id: 0,
    path: '/content',
    icon: 'file',
    perm_code: null,
    order_no: 1,
    visible: true,
  },
  {
    id: 11,
    name: '内容工作台',
    type: 1,
    parent_id: 2,
    path: '/content/studio',
    icon: 'pen',
    perm_code: 'content:content:generate',
    order_no: 1,
    visible: true,
  },
  {
    id: 12,
    name: '内容库',
    type: 1,
    parent_id: 2,
    path: '/content/library',
    icon: 'library',
    perm_code: 'content:content:list',
    order_no: 2,
    visible: true,
  },
  {
    id: 13,
    name: '内容设置',
    type: 1,
    parent_id: 2,
    path: '/content/settings',
    icon: 'settings',
    perm_code: 'content:setting:query',
    order_no: 3,
    visible: true,
  },
  {
    id: 1,
    name: '系统管理',
    type: 0,
    parent_id: 0,
    path: '/system',
    icon: 'shield',
    perm_code: null,
    order_no: 2,
    visible: true,
  },
  {
    id: 5,
    name: '用户',
    type: 1,
    parent_id: 1,
    path: '/system/users',
    icon: 'users',
    perm_code: 'system:user:list',
    order_no: 1,
    visible: true,
  },
  {
    id: 6,
    name: '角色',
    type: 1,
    parent_id: 1,
    path: '/system/roles',
    icon: 'shield',
    perm_code: 'system:role:list',
    order_no: 2,
    visible: true,
  },
  {
    id: 7,
    name: '菜单',
    type: 1,
    parent_id: 1,
    path: '/system/menus',
    icon: 'menu',
    perm_code: 'system:menu:list',
    order_no: 3,
    visible: true,
  },
  {
    id: 100,
    name: '创建用户',
    type: 2,
    parent_id: 5,
    path: '',
    icon: null,
    perm_code: 'system:user:create',
    order_no: 1,
    visible: true,
  },
  {
    id: 101,
    name: '分配角色',
    type: 2,
    parent_id: 5,
    path: '',
    icon: null,
    perm_code: 'system:user:assign',
    order_no: 2,
    visible: true,
  },
  {
    id: 110,
    name: '新建角色',
    type: 2,
    parent_id: 6,
    path: '',
    icon: null,
    perm_code: 'system:role:create',
    order_no: 1,
    visible: true,
  },
  {
    id: 111,
    name: '分配菜单',
    type: 2,
    parent_id: 6,
    path: '',
    icon: null,
    perm_code: 'system:role:assign',
    order_no: 2,
    visible: true,
  },
  {
    id: 120,
    name: '新建菜单',
    type: 2,
    parent_id: 7,
    path: '',
    icon: null,
    perm_code: 'system:menu:create',
    order_no: 1,
    visible: true,
  },
];

const menus = new Map(menuSeed.map((menu) => [menu.id, { ...menu, ancestors: '' }]));
let nextMenuId = 1000;

const roles = new Map([
  [
    1,
    {
      id: 1,
      code: 'super_admin',
      name: '超级管理员',
      description: null,
      menu_ids: menuSeed.map((menu) => menu.id),
    },
  ],
  [
    2,
    {
      id: 2,
      code: 'system_admin',
      name: '系统管理员',
      description: null,
      menu_ids: [1, 5, 6, 7, 100, 101, 110, 111, 120],
    },
  ],
  [
    3,
    {
      id: 3,
      code: 'content_ops',
      name: '内容运营',
      description: null,
      menu_ids: [8, 2, 11, 12, 13],
    },
  ],
  [
    4,
    { id: 4, code: 'content_viewer', name: '内容查看者', description: null, menu_ids: [8, 2, 12] },
  ],
]);
let nextRoleId = 100;

function buildMenuTree() {
  const nodes = [...menus.values()].map((menu) => ({ ...menu, children: [] }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const roots = [];

  for (const node of nodes) {
    const parent = byId.get(node.parent_id);

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function sort(items) {
    items.sort((a, b) => a.order_no - b.order_no || a.id - b.id);
    for (const item of items) {
      sort(item.children);
    }
  }

  sort(roots);
  return roots;
}

function stripButtons(nodes) {
  return nodes
    .filter((node) => node.type !== 2)
    .map((node) => ({ ...node, children: stripButtons(node.children ?? []) }));
}

function removeMenu(id) {
  for (const menu of [...menus.values()]) {
    if (menu.parent_id === id) {
      removeMenu(menu.id);
    }
  }

  menus.delete(id);
}

function listRoles(url) {
  const page = Number(url.searchParams.get('page') ?? 1);
  const pageSize = Number(url.searchParams.get('page_size') ?? 20);
  const code = (url.searchParams.get('code') ?? '').toLowerCase();
  const name = (url.searchParams.get('name') ?? '').toLowerCase();
  let items = [...roles.values()];

  if (code) {
    items = items.filter((role) => role.code.toLowerCase().includes(code));
  }

  if (name) {
    items = items.filter((role) => role.name.toLowerCase().includes(name));
  }

  const total = items.length;
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize),
  };
}

function json(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
}

function ok(response, data) {
  json(response, 200, { code: 0, message: 'success', data });
}

function base64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function makeToken(payload) {
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url(payload)}.stub`;
}

function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function issueTokens(
  username,
  { accessExpiresIn = 3600, refreshValid = true, stale = false } = {},
) {
  const now = Math.floor(Date.now() / 1000);

  return {
    access_token: makeToken({ sub: username, type: 'access', exp: now + accessExpiresIn, stale }),
    refresh_token: makeToken({
      sub: username,
      type: 'refresh',
      exp: now + 7 * 24 * 3600,
      valid: refreshValid,
    }),
    token_type: 'bearer',
    expires_in: accessExpiresIn,
  };
}

function readJson(request) {
  return new Promise((resolve) => {
    let data = '';
    request.on('data', (chunk) => {
      data += chunk;
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

function bearerToken(request) {
  const header = request.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
}

const agents = [
  {
    id: 1,
    name: 'Agent One',
    icon: null,
    description: 'Primary content agent',
    enabled: true,
    prompt_template: 'Write a clear, factual article.',
  },
  {
    id: 2,
    name: 'Disabled Agent',
    icon: null,
    description: 'Disabled agent',
    enabled: false,
    prompt_template: 'This agent is disabled.',
  },
  {
    id: 998,
    name: 'Error data agent',
    icon: null,
    description: 'Returns a dashboard error',
    enabled: true,
    prompt_template: 'Test agent.',
  },
  {
    id: 999,
    name: 'Empty data agent',
    icon: null,
    description: 'Returns empty dashboard data',
    enabled: true,
    prompt_template: 'Test agent.',
  },
];

const creationOptions = {
  audience: ['developers', 'marketing teams'],
  platform: ['blog', 'linkedin'],
  industry: ['software', 'SaaS'],
  angle: ['tutorial', 'thought leadership'],
};

const dashboardOverview = {
  kpis: {
    contentCount: 42,
    generationSuccessRate: 0.86,
    averageScore: 82.4,
    keywordCoverageRate: 0.91,
  },
  statusDistribution: [
    { status: 'generated', count: 18 },
    { status: 'reviewed', count: 12 },
    { status: 'retained', count: 7 },
    { status: 'locked', count: 3 },
    { status: 'generate_failed', count: 2 },
  ],
  scoreDistribution: [
    { bucket: '0-59', count: 3 },
    { bucket: '60-69', count: 5 },
    { bucket: '70-79', count: 9 },
    { bucket: '80-89', count: 15 },
    { bucket: '90-100', count: 10 },
  ],
  keywordCoverage: { covered: 91, total: 100 },
  timezone: 'Asia/Shanghai',
  range: { from: '2026-10-16', to: '2026-10-22' },
};

const emptyDashboardOverview = {
  kpis: {
    contentCount: 0,
    generationSuccessRate: 0,
    averageScore: null,
    keywordCoverageRate: 0,
  },
  statusDistribution: [],
  scoreDistribution: [],
  keywordCoverage: { covered: 0, total: 0 },
  timezone: 'Asia/Shanghai',
  range: { from: '2026-10-16', to: '2026-10-22' },
};

const dashboardTrends = {
  points: [
    { date: '2026-10-16', contentCount: 5, failures: 0, regenerations: 2, retained: 1 },
    { date: '2026-10-17', contentCount: 7, failures: 1, regenerations: 3, retained: 2 },
    { date: '2026-10-18', contentCount: 6, failures: 0, regenerations: 2, retained: 1 },
    { date: '2026-10-19', contentCount: 8, failures: 1, regenerations: 4, retained: 3 },
    { date: '2026-10-20', contentCount: 5, failures: 0, regenerations: 1, retained: 1 },
    { date: '2026-10-21', contentCount: 6, failures: 1, regenerations: 2, retained: 2 },
    { date: '2026-10-22', contentCount: 5, failures: 0, regenerations: 3, retained: 1 },
  ],
  timezone: 'Asia/Shanghai',
};

const tasks = new Map();
const contents = new Map();
const settings = new Map();
const defaultSettings = {
  'content.default_prompt': {
    value: 'Default prompt for E2E',
    description: '默认提示词（F-06）',
  },
  'content.scoring_rule': {
    value: {
      full_score: 100,
      pass_line: null,
      dimensions: [
        { name: 'Keyword coverage', weight: 0.5, detail: '关键词原样命中占比' },
        { name: 'Content relevance', weight: 0.5, detail: '内容相关性' },
      ],
    },
    description: '评分规则（F-12）',
  },
};
const versions = new Map();
let nextContentId = 100;
let nextTaskId = 1;

function createTask(contentId, { fail = false } = {}) {
  const taskId = `task-${nextTaskId++}`;
  tasks.set(taskId, { contentId, fail, polls: 0 });
  return taskId;
}

function contentBody(contentId) {
  return `# Generated content ${contentId}\n\nThis is a **test** body.\n\n| A | B |\n| - | - |\n| 1 | 2 |`;
}

function seedContent(id, { agentId, userId, status, regenCount, versionDefs, score }) {
  const seededVersions = versionDefs.map((version) => ({
    id: version.id,
    content_id: id,
    title: version.title,
    body: version.body,
    word_count: version.body.split(/\s+/).filter(Boolean).length,
    source_type: version.sourceType ?? 'generated',
  }));

  const seededAt = '2026-10-22T10:00:00.000Z';
  contents.set(id, {
    id,
    title: seededVersions[0]?.title ?? `#${id}`,
    created_at: seededAt,
    updated_at: seededAt,
    username: userId === 2 ? 'content_ops' : 'content_viewer',
    agent_id: agentId,
    user_id: userId,
    status,
    regen_count: regenCount,
    current_version_id: seededVersions[0]?.id ?? null,
    params: { keywords: ['alpha'] },
    body: seededVersions[0]?.body ?? '',
    reviewFailures: 0,
    reviewed: status === 'reviewed' || status === 'locked' || status === 'retained',
    score: score ?? null,
  });
  versions.set(id, seededVersions);
}

seedContent(1, {
  agentId: 1,
  userId: 2,
  status: 'generated',
  regenCount: 0,
  versionDefs: [
    {
      id: 11,
      title: 'Generated content 1',
      body: '# Generated content 1\n\nFirst fixture body.\n\n| A | B |\n| - | - |\n| 1 | 2 |',
    },
    {
      id: 10,
      title: 'Draft content 1',
      body: '# Draft content 1\n\nEarlier version.',
    },
  ],
});

seedContent(2, {
  agentId: 1,
  userId: 2,
  status: 'reviewed',
  regenCount: 2,
  versionDefs: [
    {
      id: 21,
      title: 'Generated content 2',
      body: '# Generated content 2\n\nReviewed fixture body.\n\n| A | B |\n| - | - |\n| 3 | 4 |',
    },
    {
      id: 20,
      title: 'Draft content 2',
      body: '# Draft content 2\n\nEarlier version.',
    },
  ],
  score: {
    id: 1,
    content_id: 2,
    version_id: 21,
    overall_score: 85,
    grade: 'A',
    dimensions: [
      {
        name: 'Keyword coverage',
        score: 90,
        weight: 0.5,
        detail: 'All keywords found.',
      },
      {
        name: 'Natural integration',
        score: 80,
        weight: 0.5,
        detail: 'Readable flow.',
      },
    ],
  },
});

seedContent(3, {
  agentId: 2,
  userId: 3,
  status: 'retained',
  regenCount: 1,
  versionDefs: [
    {
      id: 31,
      title: 'Generated content 3',
      body: '# Generated content 3\n\nRetained fixture body.',
    },
  ],
  score: {
    id: 2,
    content_id: 3,
    version_id: 31,
    overall_score: 70,
    grade: 'B',
    dimensions: [
      {
        name: 'Keyword coverage',
        score: 75,
        weight: 1,
        detail: 'Mostly covered.',
      },
    ],
  },
});

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
  const method = request.method ?? 'GET';

  if (url.pathname === '/api/v1/health') {
    json(response, 200, { status: 'ok', version: 'e2e' });
    return;
  }

  if (url.pathname === '/api/v1/health/ready') {
    json(response, 200, {
      status: 'ok',
      components: { database: 'ok', redis: 'ok', storage: 'ok' },
    });
    return;
  }

  if (url.pathname === '/api/v1/auth/login' && method === 'POST') {
    const body = await readJson(request);

    if (body.password !== 'password' || !users[body.username]) {
      json(response, 401, { code: 20001, message: '用户名或密码错误', data: null });
      return;
    }

    const options =
      body.username === 'expired'
        ? { accessExpiresIn: -60 }
        : body.username === 'revoked'
          ? { accessExpiresIn: -60, refreshValid: false }
          : body.username === 'stale'
            ? { accessExpiresIn: 3600, stale: true }
            : {};

    ok(response, issueTokens(body.username, options));
    return;
  }

  if (url.pathname === '/api/v1/auth/refresh' && method === 'POST') {
    const body = await readJson(request);
    const payload = decodeToken(body.refresh_token);

    if (
      !payload ||
      payload.valid === false ||
      payload.type !== 'refresh' ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      json(response, 401, { code: 20003, message: 'Session expired', data: null });
      return;
    }

    ok(response, issueTokens(payload.sub));
    return;
  }

  if (url.pathname === '/api/v1/auth/me' && method === 'GET') {
    const token = bearerToken(request);
    const payload = token ? decodeToken(token) : null;

    if (
      payload?.type !== 'access' ||
      payload.exp <= Math.floor(Date.now() / 1000) ||
      payload.sub === 'revoked' ||
      payload.stale === true
    ) {
      json(response, 401, { code: 20001, message: 'Unauthorized', data: null });
      return;
    }

    ok(response, users[payload.sub] ?? { user_id: 1, username: payload.sub, permissions: [] });
    return;
  }

  if (url.pathname === '/api/v1/auth/logout' && method === 'POST') {
    ok(response, null);
    return;
  }

  if (url.pathname === '/api/v1/users' && method === 'GET') {
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('page_size') ?? 20);
    const username = url.searchParams.get('username')?.toLowerCase();
    const isActive = url.searchParams.get('is_active');
    let filtered = adminUsers;

    if (username) {
      filtered = filtered.filter((user) => user.username.toLowerCase().includes(username));
    }

    if (isActive !== null) {
      const active = isActive === 'true';
      filtered = filtered.filter((user) => user.is_active === active);
    }

    ok(response, paginate(filtered, page, pageSize));
    return;
  }

  if (url.pathname === '/api/v1/users' && method === 'POST') {
    const body = await readJson(request);

    if (adminUsers.some((user) => user.username === body.username)) {
      json(response, 409, { code: 10001, message: 'Username already exists', data: null });
      return;
    }

    const user = {
      id: nextAdminUserId++,
      username: body.username,
      nickname: body.nickname ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      is_active: body.is_active ?? true,
      is_superuser: body.is_superuser ?? false,
      role_ids: body.role_ids ?? [],
    };
    adminUsers.push(user);
    ok(response, user);
    return;
  }

  const userPasswordMatch = url.pathname.match(/^\/api\/v1\/users\/(\d+)\/password$/);
  if (userPasswordMatch && method === 'PUT') {
    await readJson(request);
    ok(response, null);
    return;
  }

  const userRolesMatch = url.pathname.match(/^\/api\/v1\/users\/(\d+)\/roles$/);
  if (userRolesMatch && method === 'PUT') {
    const user = adminUsers.find((item) => item.id === Number(userRolesMatch[1]));

    if (!user) {
      json(response, 404, { code: 40400, message: 'User not found', data: null });
      return;
    }

    const body = await readJson(request);
    user.role_ids = body.role_ids ?? [];
    ok(response, user);
    return;
  }

  const userMatch = url.pathname.match(/^\/api\/v1\/users\/(\d+)$/);
  if (userMatch) {
    const userId = Number(userMatch[1]);
    const userIndex = adminUsers.findIndex((item) => item.id === userId);

    if (userIndex === -1) {
      json(response, 404, { code: 40400, message: 'User not found', data: null });
      return;
    }

    if (method === 'GET') {
      ok(response, adminUsers[userIndex]);
      return;
    }

    if (method === 'PUT') {
      const body = await readJson(request);
      adminUsers[userIndex] = {
        ...adminUsers[userIndex],
        ...body,
      };
      ok(response, adminUsers[userIndex]);
      return;
    }

    if (method === 'DELETE') {
      adminUsers.splice(userIndex, 1);
      ok(response, null);
      return;
    }
  }

  if (url.pathname === '/api/v1/content/contents/creation-options' && method === 'GET') {
    ok(response, creationOptions);
    return;
  }

  if (url.pathname === '/api/v1/content/agents' && method === 'GET') {
    ok(
      response,
      agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        icon: agent.icon,
        description: agent.description,
        enabled: agent.enabled,
      })),
    );
    return;
  }

  const agentMatch = url.pathname.match(/^\/api\/v1\/content\/agents\/(\d+)$/);
  if (agentMatch && method === 'GET') {
    const agent = agents.find((item) => item.id === Number(agentMatch[1]));

    if (!agent) {
      json(response, 404, { code: 40400, message: 'Agent not found', data: null });
      return;
    }

    ok(response, agent);
    return;
  }

  if (url.pathname === '/api/v1/content/materials' && method === 'POST') {
    ok(response, {
      id: 1,
      user_id: 2,
      filename: 'notes.txt',
      file_type: 'txt',
      object_key: 'materials/notes.txt',
      char_count: 5,
    });
    return;
  }

  if (url.pathname === '/api/v1/content/contents/generate' && method === 'POST') {
    const body = await readJson(request);
    const fail = String(body.extra_prompt ?? '').includes('generate-fail');
    const lockNow = String(body.extra_prompt ?? '').includes('lock-now');
    const contentId = nextContentId++;
    const generatedBody = contentBody(contentId);
    const generatedVersion = {
      id: 1,
      content_id: contentId,
      title: `Generated content ${contentId}`,
      body: generatedBody,
      word_count: generatedBody.split(/\s+/).filter(Boolean).length,
      source_type: 'generated',
    };
    const regenCount = lockNow ? 10 : 0;
    versions.set(contentId, [generatedVersion]);
    const createdAt = new Date().toISOString();
    contents.set(contentId, {
      id: contentId,
      title: generatedVersion.title,
      created_at: createdAt,
      updated_at: createdAt,
      username: 'content_ops',
      agent_id: body.agent_id ?? 1,
      user_id: 2,
      status: lockNow ? 'locked' : 'generated',
      regen_count: regenCount,
      current_version_id: 1,
      params: body,
      body: generatedBody,
      reviewFailures: String(body.extra_prompt ?? '').includes('review-fail') ? 1 : 0,
      reviewed: false,
      score: null,
    });
    const taskId = createTask(contentId, { fail });

    ok(response, {
      content_id: contentId,
      task_id: taskId,
      status: 'generating',
      regen_count: regenCount,
    });
    return;
  }

  const taskMatch = url.pathname.match(/^\/api\/v1\/content\/contents\/tasks\/([A-Za-z0-9_-]+)$/);
  if (taskMatch && method === 'GET') {
    const taskId = taskMatch[1];
    const task = tasks.get(taskId);

    if (!task) {
      json(response, 404, { code: 40400, message: 'Task not found', data: null });
      return;
    }

    task.polls += 1;

    if (task.polls < 2) {
      ok(response, { status: 'running' });
      return;
    }

    tasks.delete(taskId);

    if (task.fail) {
      ok(response, { status: 'failed', error: 'Model generation failed' });
      return;
    }

    ok(response, {
      status: 'completed',
      result: {
        content_id: task.contentId,
        version_id: 1,
        title: `Generated content ${task.contentId}`,
      },
    });
    return;
  }

  const regenerateMatch = url.pathname.match(/^\/api\/v1\/content\/contents\/(\d+)\/regenerate$/);
  if (regenerateMatch && method === 'POST') {
    const contentId = Number(regenerateMatch[1]);
    const body = await readJson(request);
    const content = contents.get(contentId);

    if (!content) {
      json(response, 404, { code: 40400, message: 'Content not found', data: null });
      return;
    }

    if ((content.regen_count ?? 0) >= 10) {
      content.status = 'locked';
      json(response, 409, {
        code: 10003,
        message: 'Regeneration limit reached',
        data: null,
      });
      return;
    }

    content.regen_count = (content.regen_count ?? 0) + 1;
    content.reviewed = false;
    content.score = null;
    content.status = 'generated';
    content.params = body;

    const nextVersionId = (versions.get(contentId)?.length ?? 0) + 1;
    const nextVersion = {
      id: nextVersionId,
      content_id: contentId,
      title: `Generated content ${contentId}`,
      body: contentBody(contentId),
      word_count: 8,
      source_type: 'generated',
    };
    versions.set(contentId, [nextVersion, ...(versions.get(contentId) ?? [])]);
    content.current_version_id = nextVersionId;
    content.body = nextVersion.body;
    const taskId = createTask(contentId);

    ok(response, {
      content_id: contentId,
      task_id: taskId,
      status: 'generating',
      regen_count: content.regen_count,
    });
    return;
  }

  const reviewMatch = url.pathname.match(/^\/api\/v1\/content\/contents\/(\d+)\/review$/);
  if (reviewMatch && method === 'POST') {
    const contentId = Number(reviewMatch[1]);
    const content = contents.get(contentId);

    if (!content) {
      json(response, 404, { code: 40400, message: 'Content not found', data: null });
      return;
    }

    if (content.reviewFailures > 0) {
      content.reviewFailures -= 1;
      json(response, 500, { code: 50000, message: 'Review service unavailable', data: null });
      return;
    }

    content.reviewed = true;
    content.status = 'reviewed';
    content.score = {
      id: 1,
      content_id: contentId,
      version_id: 1,
      overall_score: 85,
      grade: 'A',
      dimensions: [
        {
          name: 'Keyword coverage',
          score: 90,
          weight: 0.5,
          detail: 'All keywords found.',
        },
        {
          name: 'Natural integration',
          score: 80,
          weight: 0.5,
          detail: 'Readable flow.',
        },
      ],
    };

    ok(response, content.score);
    return;
  }

  const scoreMatch = url.pathname.match(/^\/api\/v1\/content\/contents\/(\d+)\/score$/);
  if (scoreMatch && method === 'GET') {
    const content = contents.get(Number(scoreMatch[1]));

    if (!content?.score) {
      json(response, 404, { code: 40400, message: 'Score not found', data: null });
      return;
    }

    ok(response, content.score);
    return;
  }

  const retainMatch = url.pathname.match(/^\/api\/v1\/content\/contents\/(\d+)\/retain$/);
  if (retainMatch && method === 'POST') {
    const contentId = Number(retainMatch[1]);
    const content = contents.get(contentId);

    if (!content) {
      json(response, 404, { code: 40400, message: 'Content not found', data: null });
      return;
    }

    if (!['generated', 'locked', 'reviewed'].includes(content.status)) {
      json(response, 409, { code: 10003, message: 'Cannot retain content', data: null });
      return;
    }

    content.status = 'retained';
    ok(response, {
      id: contentId,
      title: content.title,
      created_at: content.created_at,
      updated_at: content.updated_at,
      username: content.username,
      agent_id: content.agent_id ?? 1,
      user_id: content.user_id ?? 2,
      status: 'retained',
      regen_count: content.regen_count ?? 0,
      current_version_id: content.current_version_id ?? 1,
      params: content.params ?? null,
    });
    return;
  }

  const versionsMatch = url.pathname.match(/^\/api\/v1\/content\/contents\/(\d+)\/versions$/);
  if (versionsMatch && method === 'GET') {
    const contentId = Number(versionsMatch[1]);
    const content = contents.get(contentId);

    if (!content) {
      json(response, 404, { code: 40400, message: 'Content not found', data: null });
      return;
    }

    ok(response, versions.get(contentId) ?? []);
    return;
  }

  const contentMatch = url.pathname.match(/^\/api\/v1\/content\/contents\/(\d+)$/);
  if (contentMatch && method === 'GET') {
    const contentId = Number(contentMatch[1]);
    const content = contents.get(contentId);

    if (!content) {
      json(response, 404, { code: 40400, message: 'Content not found', data: null });
      return;
    }

    const contentVersions = versions.get(contentId) ?? [];
    const currentVersion =
      contentVersions.find((version) => version.id === content.current_version_id) ??
      contentVersions[0] ??
      null;

    ok(response, {
      id: content.id,
      title: content.title,
      created_at: content.created_at,
      updated_at: content.updated_at,
      username: content.username,
      agent_id: content.agent_id,
      user_id: content.user_id,
      status: content.status,
      regen_count: content.regen_count,
      current_version_id: content.current_version_id,
      params: content.params,
      current_version: currentVersion,
    });
    return;
  }

  if (url.pathname === '/api/v1/content/contents') {
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get('page_size') ?? 20) || 20),
    );
    const status = url.searchParams.get('status');
    const agentId = url.searchParams.get('agent_id');
    const keyword = url.searchParams.get('keyword')?.trim().toLowerCase() ?? '';
    const filtered = [...contents.values()]
      .filter((content) => !status || content.status === status)
      .filter((content) => !agentId || String(content.agent_id) === agentId)
      .filter(
        (content) =>
          !keyword ||
          String(content.title ?? '')
            .toLowerCase()
            .includes(keyword),
      )
      .sort((a, b) => b.id - a.id);
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const items = filtered.slice((page - 1) * pageSize, page * pageSize).map((content) => ({
      id: content.id,
      title: content.title,
      created_at: content.created_at,
      updated_at: content.updated_at,
      username: content.username,
      agent_id: content.agent_id,
      user_id: content.user_id,
      status: content.status,
      regen_count: content.regen_count,
      current_version_id: content.current_version_id,
      params: content.params,
    }));

    ok(response, {
      items,
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    });
    return;
  }

  const settingsMatch = url.pathname.match(/^\/api\/v1\/content\/settings\/(.+)$/);
  if (settingsMatch) {
    const key = decodeURIComponent(settingsMatch[1]);

    if (key !== 'content.default_prompt' && key !== 'content.scoring_rule') {
      json(response, 404, { code: 40400, message: 'Setting not found', data: null });
      return;
    }

    if (method === 'GET') {
      const stored = settings.get(key) ?? defaultSettings[key];

      ok(response, {
        key,
        value: stored.value,
        description: stored.description ?? null,
      });
      return;
    }

    if (method === 'PUT') {
      const body = await readJson(request);
      const serialized = typeof body.value === 'string' ? body.value : JSON.stringify(body.value);

      if (serialized.includes('save-fail')) {
        json(response, 500, {
          code: 50000,
          message: 'Setting update failed',
          data: null,
        });
        return;
      }

      settings.set(key, {
        value: body.value,
        description: body.description ?? null,
      });
      ok(response, {
        key,
        value: body.value,
        description: body.description ?? null,
      });
      return;
    }
  }

  if (url.pathname === '/api/v1/roles' && method === 'GET') {
    ok(response, listRoles(url));
    return;
  }

  if (url.pathname === '/api/v1/roles' && method === 'POST') {
    const body = await readJson(request);

    if (
      [...roles.values()].some(
        (role) => role.code.toLowerCase() === String(body.code).toLowerCase(),
      )
    ) {
      json(response, 409, { code: 40900, message: 'Role code already exists', data: null });
      return;
    }

    const role = {
      id: nextRoleId++,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      menu_ids: body.menu_ids ?? [],
    };
    roles.set(role.id, role);
    ok(response, role);
    return;
  }

  const roleMenusMatch = url.pathname.match(/^\/api\/v1\/roles\/(\d+)\/menus$/);
  if (roleMenusMatch && method === 'PUT') {
    const role = roles.get(Number(roleMenusMatch[1]));

    if (!role) {
      json(response, 404, { code: 40400, message: 'Role not found', data: null });
      return;
    }

    const body = await readJson(request);
    role.menu_ids = body.menu_ids ?? [];
    ok(response, role);
    return;
  }

  const roleMatch = url.pathname.match(/^\/api\/v1\/roles\/(\d+)$/);
  if (roleMatch) {
    const role = roles.get(Number(roleMatch[1]));

    if (!role) {
      json(response, 404, { code: 40400, message: 'Role not found', data: null });
      return;
    }

    if (method === 'GET') {
      ok(response, role);
      return;
    }

    if (method === 'PUT') {
      const body = await readJson(request);
      role.name = body.name ?? role.name;
      role.description = body.description ?? role.description;
      ok(response, role);
      return;
    }

    if (method === 'DELETE') {
      roles.delete(role.id);
      ok(response, null);
      return;
    }
  }

  if (url.pathname === '/api/v1/menus/tree' && method === 'GET') {
    ok(response, stripButtons(buildMenuTree()));
    return;
  }

  if (url.pathname === '/api/v1/menus/tree/all' && method === 'GET') {
    ok(response, buildMenuTree());
    return;
  }

  if (url.pathname === '/api/v1/menus' && method === 'POST') {
    const body = await readJson(request);
    const menu = {
      id: nextMenuId++,
      name: body.name,
      type: body.type ?? 1,
      parent_id: body.parent_id ?? 0,
      ancestors: '',
      path: body.path ?? '',
      icon: body.icon ?? null,
      perm_code: body.perm_code ?? null,
      order_no: body.order_no ?? 0,
      visible: body.visible ?? true,
    };
    menus.set(menu.id, menu);
    ok(response, menu);
    return;
  }

  const menuMatch = url.pathname.match(/^\/api\/v1\/menus\/(\d+)$/);
  if (menuMatch) {
    const menu = menus.get(Number(menuMatch[1]));

    if (!menu) {
      json(response, 404, { code: 40400, message: 'Menu not found', data: null });
      return;
    }

    if (method === 'GET') {
      ok(response, menu);
      return;
    }

    if (method === 'PUT') {
      const body = await readJson(request);

      for (const key of [
        'name',
        'type',
        'parent_id',
        'path',
        'icon',
        'perm_code',
        'order_no',
        'visible',
      ]) {
        if (body[key] !== undefined) {
          menu[key] = body[key];
        }
      }

      ok(response, menu);
      return;
    }

    if (method === 'DELETE') {
      removeMenu(menu.id);
      ok(response, null);
      return;
    }
  }

  if (url.pathname === '/api/v1/dashboard/overview' && method === 'GET') {
    const agentId = url.searchParams.get('agent_id');

    if (agentId === '998') {
      json(response, 500, { code: 50000, message: 'Dashboard unavailable', data: null });
      return;
    }

    if (agentId === '999') {
      ok(response, emptyDashboardOverview);
      return;
    }

    ok(response, {
      ...dashboardOverview,
      range: {
        from: url.searchParams.get('from') ?? dashboardOverview.range.from,
        to: url.searchParams.get('to') ?? dashboardOverview.range.to,
      },
    });
    return;
  }

  if (url.pathname === '/api/v1/dashboard/trends' && method === 'GET') {
    const agentId = url.searchParams.get('agent_id');

    if (agentId === '998') {
      json(response, 500, { code: 50000, message: 'Dashboard unavailable', data: null });
      return;
    }

    if (agentId === '999') {
      ok(response, { points: [], timezone: 'Asia/Shanghai' });
      return;
    }

    ok(response, dashboardTrends);
    return;
  }

  json(response, 404, { code: 40400, message: 'not found', data: null });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`stub backend listening on http://127.0.0.1:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
