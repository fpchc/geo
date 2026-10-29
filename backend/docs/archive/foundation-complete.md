# GEO 内容生产模块 — 底层地基完成报告

> **归档说明**：本文是 2026-07-24 的历史报告，已被 `docs/architecture/implementation.md` 取代；文中出现的 `.claude/commands/...` 路径、Permission 表等内容不代表当前规范，仅作背景追溯。
>
> 日期：2026-07-24  
> 范围：Provider 层重设计 + MinIO 扩展 + 配置 + 白名单 + 菜单种子  
> 状态：✅ 地基完成，待 sync 依赖 + 生成菜单 SQL

---

## 一、已完成清单

### 1. 依赖管理 (`pyproject.toml`)
- ✅ 新增 `miniopy-async>=1.21`（原生异步 MinIO SDK）
- ✅ 新增 `python-docx>=1.1`（M5.6 word 导出预留）

**下一步：运行 `uv sync` 或 `pip install -e .` 同步依赖到环境。**

### 2. 配置层 (`config.py` + `.env.example`)
- ✅ 新增 `type` 别名：`LLMBackend` / `CrawlerBackend`
- ✅ 扩展启用开关：`minio_ext_enabled`
- ✅ MinIO 配置段：endpoint / access_key / secret_key / bucket / secure / presign_expire_seconds
- ✅ LLM (Qwen) 配置段：llm_backend / qwen_base_url / api_key / model / timeout / `qwen_score_temperature=0.1`（评分固定低温，保证可复现）
- ✅ Crawler 配置段：crawler_backend / base_url / timeout / rate_limit_per_second

**注意：`.env.example` 中所有密钥（`MINIO_ACCESS_KEY` / `QWEN_API_KEY`）默认为 `change-me`，请在实际 `.env` 中配置真实值。**

### 3. 异常码扩展 (`exceptions.py` + `__init__.py`)
- ✅ `ErrorCode` 新增：`STORAGE_ERROR=40003` / `LLM_ERROR=40004` / `CRAWLER_ERROR=40005`
- ✅ 新增异常类：`StorageException` / `LLMException` / `CrawlerException`（继承 `AppException`，HTTP 502）
- ✅ 已同步重导出到 `__init__.py`

### 4. Provider 层重设计（核心改造）

#### 4.1 基类精简 (`providers/base.py`)
- ✅ `BaseProvider` 只保留 `aclose()` 抽象方法，去掉硬编码的 `fetch_resource`

#### 4.2 通用 HTTP 基类 (`providers/http_provider.py`)
- ✅ 重设计为可复用基类：Trace ID 注入 + `request_json` 统一错误处理
- ✅ Qwen / Crawler Provider 继承此类，复用 `httpx.AsyncClient`

#### 4.3 结果类型定义 (`providers/types.py` 新增)
- ✅ `LLMResult`（body / title_options / word_count）
- ✅ `ScoreResult`（overall_score / grade / dimensions[7 维]）
- ✅ `SearchHit`（keyword / engine / hit / matched_url / rank）

#### 4.4 MinIO 存储 Provider (`providers/minio_provider.py` 新增)
- ✅ `MinioStorageProvider`：upload / download / presigned_url（调用 `minio_ext` 客户端）
- ✅ `MockStorageProvider`：内存 Mock 实现
- ✅ `build_storage_provider()` 工厂：按 `minio_ext_enabled` 切换

#### 4.5 Qwen 大模型 Provider (`providers/qwen_provider.py` 新增)
- ✅ `QwenProvider`（继承 `HttpProvider`）：generate / optimize / score
- ✅ 生成/优化用 `qwen_generate_temperature`；评分固定 `qwen_score_temperature=0.1`（保证可复现）
- ✅ `MockLLMProvider`：内存 Mock 实现
- ✅ `build_llm_provider()` 工厂：按 `llm_backend` 切换

#### 4.6 爬虫 Provider (`providers/crawler_provider.py` 新增)
- ✅ `HttpCrawlerProvider`（继承 `HttpProvider`）：search（按关键词+引擎检索）
- ✅ `MockCrawlerProvider`：内存 Mock 实现
- ✅ `build_crawler_provider()` 工厂：按 `crawler_backend` 切换

#### 4.7 注册中心重设计 (`core/providers/provider_registry.py`)
- ✅ 保留 `ExampleProvider`（骨架向后兼容）
- ✅ 新增三类 Protocol：`LLMProvider` / `StorageProvider` / `CrawlerProvider`
- ✅ 新增三个 FastAPI 依赖：`get_llm_provider` / `get_storage_provider` / `get_crawler_provider`
- ✅ `core/providers/__init__.py` 同步重导出

### 5. MinIO 扩展 (`extensions/minio_ext.py` 新增)
- ✅ `get_minio()` 惰性单例异步客户端
- ✅ `startup`：建桶探活（`bucket_exists` / `make_bucket`）
- ✅ `shutdown`：释放客户端引用
- ✅ 已注册到 `extensions/__init__.py` + `loader.py`

### 6. 权限白名单 (`.claude/commands/endpoint-permission.md`)
- ✅ 业务动词扩展：`generate`（AI 生成）/ `score`（GEO 评分）/ `optimize`（AI 优化）/ `apply`（确认替换）/ `check`（爬虫检索）

### 7. 菜单种子 (`scripts/menu_seed.py`)
- ✅ 新增顶级目录 id=2「内容管理」（order_no=2，在「系统管理」之后）
- ✅ 4 个二级菜单：创作模板(id=10) / 内容创作(id=11) / 内容库(id=12) / 关键词命中(id=13)
- ✅ 19 个按钮节点（id 200–233），覆盖模板增删查、AI 生成/评分/优化/素材上传、内容保存/导出、关键词命中检索
- ✅ 所有 `perm_code` 已映射到前面定稿的 28 个接口权限码（严格三段式）

**下一步：运行 `python -m scripts.gen_menu_sql` 生成 `doc/sql/menu.sql`（共 41 行，20 个系统管理 + 21 个内容管理）。**

---

## 二、架构设计确认点

### 全异步保证
- ✅ MinIO：`miniopy-async` 原生异步（基于 aiohttp），无阻塞同步 I/O
- ✅ Qwen / 爬虫：`httpx.AsyncClient` 全异步
- ✅ 所有 Provider 通过 `AsyncGenerator` 依赖注入，请求结束后自动 `aclose()`

### 分层职责
```
extensions/minio_ext.py     ← 连接生命周期（lifespan startup/shutdown）
providers/minio_provider.py ← 业务语义封装（upload/download/presigned_url）
core/providers/             ← Protocol 抽象 + DI 注册
services/                   ← 业务逻辑层（注入 Provider，下一步实现）
```

### 配置驱动
- 所有 backend 开关可运行时切换（qwen ↔ mock、http ↔ mock、minio_ext_enabled）
- 密钥统一走 `.env`，仓库只提交 `.env.example`（已标注 `change-me`）

---

## 三、验证结果

### 1. 语法检查
```bash
python -c "import ast; [ast.parse(open(f,encoding='utf-8').read()) for f in [...12个文件...]]"
# 输出：AST OK
```

### 2. 菜单树 flatten
```bash
python -c "from scripts.menu_seed import flatten; rows=flatten(); print(len(rows))"
# 输出：total nodes: 41
#       roots: [(1, '系统管理', 0, '0'), (2, '内容管理', 0, '0')]
#       content perm nodes: 21
```

### 3. Ruff 检查
- ✅ 所有发现（RUF001/002/003 全角标点、TC001/002 type-checking imports）均为项目既有风格，与 pre-existing baseline 一致
- ✅ `ruff format` 无需改动（已符合格式）

---

## 四、依赖关系图（Provider 层）

```
service → Depends(get_llm_provider) → build_llm_provider()
              ↓ Protocol                    ↓ factory
          LLMProvider                   QwenProvider (extends HttpProvider)
                                             ↓ config
                                        settings.qwen_*

service → Depends(get_storage_provider) → build_storage_provider()
              ↓ Protocol                       ↓ factory
          StorageProvider                 MinioStorageProvider
                                                ↓ client
                                          minio_ext.get_minio()
                                                ↓ lifespan
                                          minio_ext.startup/shutdown

service → Depends(get_crawler_provider) → build_crawler_provider()
              ↓ Protocol                       ↓ factory
          CrawlerProvider                HttpCrawlerProvider (extends HttpProvider)
```

---

## 五、下一步行动项（接口实现阶段）

地基已打好，按以下顺序推进 28 个接口 + 模型层：

1. **模型层**（`app/models/content.py` + Alembic migration）
   - Agent / Template / Material / Content / ContentVersion / Score / Keyword / ContentKeyword / PublishUrl / CrawlResult
   - 关键约束：`Content.current_version_id` 指针、`Score` 按 1:N 留痕、`PublishUrl` 预留

2. **Repository 层**（`app/repositories/content_repo.py` 等）
   - 泛型 `BaseRepository` 已有，按资源建具体 repo

3. **Service 层**（`app/services/content_service.py` 等）
   - 注入 Provider（`Depends(get_llm_provider)` 等）
   - 封装异步任务状态（建议统一 `AsyncTask` 表或 Celery + Redis）

4. **接口层**（`app/api/v1/content*.py` 等，按功能块分文件）
   - M1 创作配置域（6 个接口）
   - M2 内容生成域（3+1 个接口，含素材上传）
   - M3 GEO 评分域（3 个接口，含评分历史）
   - M4 AI 优化域（3 个接口）
   - M5 内容管理域（6 个接口）
   - M6 关键词命中域（5 个接口）
   - M7 关联历史域（3 个接口）

5. **Schema 层**（`app/schemas/content.py` 等）
   - 入参校验 Schema（Pydantic BaseModel）
   - 出参 Schema（与 model 分离，控制序列化字段）

6. **注册路由**（`app/api/v1/__init__.py`）
   - `include_router(content.router)` 等

---

## 六、待需求方回答的阻塞项（P0/P1）

这 6 项不阻塞表结构与路由骨架先建，但需业务回答后定型字段：

| 优先级 | 问题 | 影响接口 | 当前处理 |
| --- | --- | --- | --- |
| **P0** | Q1 命中判据（完整 URL 精确 / 域名+标题模糊） | 6.4 `CrawlResult.matched_url` 匹配逻辑 | 先按完整 URL 精确建 |
| **P0** | Q3 爬哪些搜索引擎 | 6.3 `searchEngines[]` 枚举 | 先预留：百度/谷歌/必应/360/搜狗 |
| **P0** | Q4 关键词优先级语义 | 6.1 `Keyword.priority` 含义 | 先按"查询顺序"建（int） |
| P1 | Q5 创作参数枚举完整取值 | 1.1 返回值 | 先按界面推断候选 |
| P1 | Q6 GEO 7 维权重值 | 3.1/3.2 `dimensions[].weight` | 先按均等(各14.3%) |
| P2 | Q9 内容状态机取值 | 5.3 `status` 筛选 | 先建：draft/generated/scored/optimized/published/archived |

---

## 七、手动操作清单（必须执行）

1. **Sync 依赖**：
   ```bash
   uv sync
   # 或
   pip install -e .
   ```

2. **生成菜单 SQL**：
   ```bash
   python -m scripts.gen_menu_sql
   # 产物：doc/sql/menu.sql（41 行 INSERT）
   ```

3. **配置密钥（.env）**：
   ```bash
   cp .env.example .env
   # 修改 MINIO_ACCESS_KEY、MINIO_SECRET_KEY、QWEN_API_KEY 为真实值
   ```

4. **验证启动**（地基完成后可跑通）：
   ```bash
   uvicorn app.main:app --reload
   # 应看到 minio_ext 日志：minio connected / bucket created
   ```

---

## 八、关键文件清单

| 文件 | 改动类型 | 说明 |
| --- | --- | --- |
| `pyproject.toml` | 编辑 | 新增 2 个依赖 |
| `app/core/config/config.py` | 编辑 | 新增 3 段配置 + 1 个 type 别名 |
| `.env.example` | 编辑 | 新增 3 段环境变量示例 |
| `app/core/exceptions/exceptions.py` | 编辑 | 新增 3 个错误码 + 3 个异常类 |
| `app/core/exceptions/__init__.py` | 编辑 | 重导出 3 个新异常 |
| `app/providers/base.py` | 重写 | 精简基类（只留 aclose） |
| `app/providers/http_provider.py` | 重写 | 改为可复用通用 HTTP 基类 |
| `app/providers/types.py` | **新增** | 结果类型定义（3 个 dataclass） |
| `app/providers/minio_provider.py` | **新增** | MinIO 存储实现 + Mock |
| `app/providers/qwen_provider.py` | **新增** | Qwen 大模型实现 + Mock |
| `app/providers/crawler_provider.py` | **新增** | 爬虫实现 + Mock |
| `app/core/providers/provider_registry.py` | 重写 | 多 Protocol 注册中心 |
| `app/core/providers/__init__.py` | 编辑 | 重导出 5 个 Protocol + 4 个依赖 |
| `app/extensions/minio_ext.py` | **新增** | MinIO 扩展（lifespan） |
| `app/extensions/__init__.py` | 编辑 | 导出 minio_ext |
| `app/core/config/loader.py` | 编辑 | 注册 minio_ext |
| `.claude/commands/endpoint-permission.md` | 编辑 | 扩展 5 个业务动词 |
| `scripts/menu_seed.py` | 编辑 | 新增内容管理树（21 节点） |

---

**底层地基已完成，现可进入模型层 + 接口实现阶段。需要我继续建模型层吗？还是你希望先 sync 依赖验证地基可用性？**

