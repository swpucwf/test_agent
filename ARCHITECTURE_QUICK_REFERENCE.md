# Test Agent 架构快速参考卡

## 🎯 5大核心模块一览

### 1️⃣ 文档解析模块 (Parsing Module)
```
输入：Axure HTML / 需求文档
输出：结构化数据 (ParsedDocument)

主要类：
├── AxureParser         - Axure文件解析
├── RequirementParser   - 需求文档解析
├── Preprocessor       - 数据预处理
└── ParsingService     - 门面服务

目录：server/services/parsing/
```

### 2️⃣ 分析生成模块 (Analysis & Generation Module)
```
输入：ParsedDocument
输出：TestCase[] (完整测试用例)

主要类：
├── RequirementAnalyzer      - 需求分析
├── TestModuleGenerator      - 模块拆分
├── TestPointGenerator       - 测试点生成
├── TestCaseGenerator        - 用例生成
├── RAGEnhancer             - 知识库增强
└── AnalysisGenerationService - 门面服务

目录：server/services/analysis-generation/
```

### 3️⃣ 执行调度模块 (Execution & Scheduling Module)
```
输入：TestCase[]
输出：ExecutionResult[]

主要类：
├── TestExecutionEngine      - 执行引擎
├── MCPScheduler            - 调度器
├── SuiteManager            - 套件管理
├── ProgressMonitor         - 进度监控
├── EvidenceCollector       - 证据收集
└── ExecutionService        - 门面服务

目录：server/services/execution/
```

### 4️⃣ 报告生成模块 (Reporting Module)
```
输入：ExecutionResult[]
输出：Report (包含统计、图表、趋势)

主要类：
├── ReportGenerator         - 报告生成
├── StatisticsCalculator    - 数据统计
├── TrendAnalyzer          - 趋势分析
├── ReportExporter         - 导出器
└── ReportingService       - 门面服务

目录：server/services/reporting/
```

### 5️⃣ 知识库管理模块 (Knowledge Base Module)
```
输入：查询文本
输出：KnowledgeItem[]

主要类：
├── KnowledgeManager        - 知识管理
├── EmbeddingService       - 向量化
├── RAGRetriever           - 检索器
├── KnowledgeIndexer       - 索引
└── KnowledgeService       - 门面服务

目录：server/services/knowledge-base/
```

---

## 🔄 数据流转流程

### 完整流程
```
上传 → 解析 → 分析 → 生成 → 执行 → 报告
              ↓
            RAG增强
```

### 关键数据结构
```typescript
ParsedDocument → TestModule → TestPoint → TestCase → ExecutionResult → Report
```

---

## 📊 分层架构（从上到下）

```
┌─────────────────────────────┐
│  表现层：React前端 + WebSocket
├─────────────────────────────┤
│  网关层：Express路由 + 中间件
├─────────────────────────────┤
│  业务层：5个独立模块 + 通用服务
├─────────────────────────────┤
│  数据层：Prisma Repository
├─────────────────────────────┤
│  基础层：MySQL / Qdrant / 文件存储
└─────────────────────────────┘
```

---

## 🔌 通信机制

### 机制1：Service Facade（门面）
```typescript
// 简化调用
const service = new AnalysisGenerationService();
const result = await service.generateFromDocument(doc);
```

### 机制2：Event-Driven（事件）
```typescript
// 发布事件
eventBus.emit('test.completed', result);

// 订阅事件
eventBus.on('test.completed', (result) => { });
```

### 机制3：Dependency Injection（依赖注入）
```typescript
const service = new Service(
  dependency1,
  dependency2
);
```

### 机制4：Repository Pattern（仓储）
```typescript
// 统一的数据访问
const testCase = await repository.findById(id);
await repository.save(testCase);
```

---

## 📋 API端点速查表

| 功能 | 方法 | 端点 |
|------|------|------|
| 解析文档 | POST | `/api/v1/parsing/parse` |
| 查询解析 | GET | `/api/v1/parsing/status/:jobId` |
| 生成用例 | POST | `/api/v1/analysis-generation/generate` |
| 执行用例 | POST | `/api/v1/execution/run` |
| 执行套件 | POST | `/api/v1/execution/run-suite` |
| 查询状态 | GET | `/api/v1/execution/status/:runId` |
| 取消执行 | POST | `/api/v1/execution/cancel/:runId` |
| 获取报告 | GET | `/api/v1/reporting/report/:suiteId` |
| 搜索知识 | GET | `/api/v1/knowledge/search?query=xxx` |
| 获取增强 | POST | `/api/v1/knowledge/enhance` |

---

## 🎓 核心原则

### ✅ 单向依赖
- 只能从上往下依赖
- 禁止循环依赖
- 禁止跨层级调用

### ✅ 接口隔离
- 通过接口通信
- 避免直接依赖具体实现
- 支持多个实现

### ✅ 异步优先
- 所有IO操作都是异步
- 返回Promise
- 支持并发

### ✅ 数据验证
- 边界处验证输入
- 验证输出结果
- 完整的错误处理

---

## 📦 目录结构速览

```
server/services/
├── parsing/                    # 解析模块
│   ├── interfaces/            # 接口定义
│   ├── implementations/        # 实现
│   ├── strategies/            # 策略
│   └── parsingService.ts      # 门面
│
├── analysis-generation/        # 分析生成模块
│   ├── interfaces/
│   ├── implementations/
│   ├── strategies/
│   ├── validators/
│   └── analysisGenerationService.ts
│
├── execution/                  # 执行模块
│   ├── interfaces/
│   ├── implementations/
│   ├── strategies/
│   ├── context/
│   └── executionService.ts
│
├── reporting/                  # 报告模块
│   ├── interfaces/
│   ├── implementations/
│   ├── templates/
│   └── reportingService.ts
│
├── knowledge-base/             # 知识库模块
│   ├── interfaces/
│   ├── implementations/
│   ├── models/
│   ├── strategies/
│   └── knowledgeService.ts
│
└── common/                     # 通用服务
    ├── database/
    ├── cache/
    ├── queue/
    └── logger/
```

---

## 🚀 快速开始

### 1. 理解架构
- 阅读：`docs/ARCHITECTURE_DESIGN.md`
- 学习：5大模块的职责

### 2. 查看实施计划
- 阅读：`docs/IMPLEMENTATION_ROADMAP.md`
- 了解：10周的实施安排

### 3. 学习通信指南
- 阅读：`docs/MODULE_COMMUNICATION_GUIDE.md`
- 掌握：模块间如何通信

### 4. 开发新模块
- 创建interfaces/接口
- 创建implementations/实现
- 创建Service/门面
- 编写单元测试
- 创建API路由

---

## 🔍 关键设计模式

### 1. Facade Pattern（门面）
```typescript
// 简化复杂子系统的调用
class AnalysisGenerationService {
  async generateFromDocument(doc) {
    // 内部协调多个组件
  }
}
```

### 2. Strategy Pattern（策略）
```typescript
// 支持多种执行策略
class ExecutionService {
  private strategy: IExecutionStrategy;
  
  setStrategy(strategy: IExecutionStrategy) {
    this.strategy = strategy;
  }
}
```

### 3. Repository Pattern（仓储）
```typescript
// 统一的数据访问接口
interface IRepository<T> {
  save(entity: T): Promise<void>;
  findById(id: string): Promise<T>;
}
```

### 4. Dependency Injection（依赖注入）
```typescript
// 解耦依赖关系
class Service {
  constructor(
    private repo: IRepository,
    private logger: ILogger
  ) {}
}
```

---

## ⚠️ 常见错误

### ❌ 错误1：循环依赖
```typescript
// 错误
ModuleA → ModuleB → ModuleA
```

### ❌ 错误2：跨层级调用
```typescript
// 错误
Route → Repository（应该 Route → Service → Repository）
```

### ❌ 错误3：同步阻塞
```typescript
// 错误
function process(): Result {
  return result; // 应该返回Promise
}
```

### ❌ 错误4：直接依赖实现
```typescript
// 错误
import { ConcreteClass } from './file';
// 应该
import { IInterface } from './interface';
```

---

## 📞 快速查找

| 我要... | 查看 |
|--------|------|
| 理解整个系统 | ARCHITECTURE_DESIGN.md |
| 计划实施 | IMPLEMENTATION_ROADMAP.md |
| 学习通信方式 | MODULE_COMMUNICATION_GUIDE.md |
| 实现新模块 | 本文件 + 相应模块的interfaces |
| 理解数据流 | MODULE_COMMUNICATION_GUIDE.md 中的"数据流转场景" |
| 添加新API | MODULE_COMMUNICATION_GUIDE.md 中的"接口规范" |
| 错误处理 | MODULE_COMMUNICATION_GUIDE.md 中的"错误处理" |

---

## 🎯 下一步

1. **今天** - 阅读本参考卡
2. **明天** - 深入阅读ARCHITECTURE_DESIGN.md
3. **本周** - 完成Phase 1（架构建立）
4. **下周** - 开始Phase 2（解析模块）

---

**创建时间**：2025-11-24  
**版本**：1.0  
**更新维护**：架构师
