# Test Agent 系统架构设计文档

> **版本**：v2.0  
> **更新时间**：2025-11-24  
> **适用范围**：需求文档解析、测试点生成、测试用例生成、测试用例执行  
> **设计原则**：企业级开发规范、充分解耦合

---

## 📑 目录

1. [系统概览](#系统概览)
2. [核心模块架构](#核心模块架构)
3. [分层架构](#分层架构)
4. [模块间通信](#模块间通信)
5. [数据流转](#数据流转)
6. [详细模块设计](#详细模块设计)
7. [目录结构规范](#目录结构规范)
8. [依赖关系](#依赖关系)
9. [扩展性设计](#扩展性设计)

---

## 系统概览

### 核心流程

```
原型文档/需求文档
    ↓
[文档解析层] → 解析为结构化数据
    ↓
[分析层] → 需求分析、测试模块拆分
    ↓
[生成层] → 测试点/测试用例生成（支持RAG增强）
    ↓
[执行层] → 测试执行、结果收集
    ↓
[报告层] → 测试报告生成
```

### 系统全景

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端层 (Frontend)                        │
│  - UI界面（React）   - WebSocket实时推送                          │
└─────────────────────────────────────────────────────────────────┘
                              ↑↓
┌─────────────────────────────────────────────────────────────────┐
│                      API网关层 (Gateway)                         │
│  - 路由分发  - 认证授权  - 请求验证  - 限流控制                   │
└─────────────────────────────────────────────────────────────────┘
                              ↑↓
┌──────────────────────────────────────────────────────────────────┐
│                   业务处理层 (Business Logic)                    │
├──────────────────────────────────────────────────────────────────┤
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐│
│ │   文档解析模块   │  │   分析生成模块   │  │   执行调度模块   ││
│ │ ┌──────────────┐ │  │ ┌──────────────┐ │  │ ┌──────────────┐ ││
│ │ │ Axure解析器  │ │  │ │ 需求分析器   │ │  │ │测试执行引擎 │ ││
│ │ │ 需求文档解析 │ │  │ │ 测试点生成器 │ │  │ │MCP调度器    │ ││
│ │ │ 文档预处理   │ │  │ │ 测试用例生成 │ │  │ │套件管理器   │ ││
│ │ └──────────────┘ │  │ │ RAG知识增强  │ │  │ └──────────────┘ ││
│ └──────────────────┘  │ └──────────────┘ │  └──────────────────┘│
│ ┌──────────────────┐  │ ┌──────────────┐  │ ┌──────────────────┐│
│ │   报告生成模块   │  │ │ 批量操作模块  │  │ │ 知识库管理模块   ││
│ │ ┌──────────────┐ │  │ ┌──────────────┐ │  │ ┌──────────────┐ ││
│ │ │ 报告生成器   │ │  │ │ AI批量更新   │ │  │ │RAG向量数据库 │ ││
│ │ │ 数据统计器   │ │  │ │ 批量执行     │ │  │ │知识库索引    │ ││
│ │ │ 趋势分析      │ │  │ │ 并发控制     │ │  │ │知识库搜索    │ ││
│ │ └──────────────┘ │  │ └──────────────┘ │  │ └──────────────┘ ││
│ └──────────────────┘  └──────────────────┘  └──────────────────┘│
└──────────────────────────────────────────────────────────────────┘
                              ↑↓
┌──────────────────────────────────────────────────────────────────┐
│                    数据支撑层 (Data Layer)                       │
├──────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│ │  关系数据库  │  │  向量数据库  │  │  缓存系统    │            │
│ │  (MySQL)     │  │  (Qdrant)    │  │  (Redis)     │            │
│ └──────────────┘  └──────────────┘  └──────────────┘            │
└──────────────────────────────────────────────────────────────────┘
                              ↑↓
┌──────────────────────────────────────────────────────────────────┐
│                   基础设施层 (Infrastructure)                    │
├──────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│ │  异步队列    │  │  日志系统    │  │  文件存储    │            │
│ │  (Bull/BEE)  │  │              │  │  (本地/云端) │            │
│ └──────────────┘  └──────────────┘  └──────────────┘            │
└──────────────────────────────────────────────────────────────────┘
```

---

## 核心模块架构

### 1️⃣ 文档解析模块 (Document Parsing Module)

**职责**：
- 解析Axure原型文件 → 结构化信息
- 解析需求文档 → 功能模块/需求点
- 预处理和清洗数据

**核心类**：
- `AxureParser` - Axure HTML解析器
- `RequirementParser` - 需求文档解析器
- `DocumentPreprocessor` - 文档预处理器

**输入**：Axure HTML / 需求文档文本
**输出**：
```typescript
{
  pages: [{
    name: string;
    components: Component[];
    interactions: Interaction[];
  }];
  requirements: RequirementItem[];
  businessRules: BusinessRule[];
}
```

---

### 2️⃣ 分析生成模块 (Analysis & Generation Module)

**职责**：
- 分析结构化需求
- 生成测试模块/模块
- 生成测试点
- 生成完整测试用例
- 应用RAG知识库增强

**核心类**：
- `RequirementAnalyzer` - 需求分析器
- `TestModuleGenerator` - 测试模块生成器
- `TestPointGenerator` - 测试点生成器
- `TestCaseGenerator` - 完整测试用例生成器
- `RAGEnhancer` - RAG知识增强器

**工作流**：
```
需求信息 → 分析 → 模块拆分 → 测试点生成 → RAG增强 → 生成用例
```

---

### 3️⃣ 执行调度模块 (Execution & Scheduling Module)

**职责**：
- 管理测试执行生命周期
- 调度MCP执行引擎
- 管理测试套件
- 实时监控和进度推送
- 管理截图和证据

**核心类**：
- `TestExecutionEngine` - 测试执行引擎
- `MCPScheduler` - MCP调度器
- `SuiteManager` - 套件管理器
- `ProgressMonitor` - 进度监控器
- `EvidenceCollector` - 证据收集器

**执行流程**：
```
测试用例 → 解析步骤 → MCP调度 → 浏览器执行 → 结果收集 → WebSocket推送
```

---

### 4️⃣ 报告生成模块 (Report Generation Module)

**职责**：
- 生成测试报告
- 数据统计和分析
- 趋势分析
- 导出报告（PDF/Excel）

**核心类**：
- `ReportGenerator` - 报告生成器
- `StatisticsCalculator` - 统计计算器
- `TrendAnalyzer` - 趋势分析器
- `ReportExporter` - 报告导出器

---

### 5️⃣ 知识库管理模块 (Knowledge Base Module)

**职责**：
- 管理业务规则知识库
- 管理测试模式库
- 管理历史踩坑库
- 管理风险场景库
- 向量化和检索

**核心类**：
- `KnowledgeManager` - 知识库管理器
- `EmbeddingService` - 向量化服务
- `RAGRetriever` - RAG检索器
- `KnowledgeIndexer` - 知识索引器

---

## 分层架构

### 第1层：表现层 (Presentation Layer)
- **React前端** 
- WebSocket客户端
- 页面和组件

### 第2层：网关层 (API Gateway Layer)
- Express路由
- 认证中间件
- 请求验证
- 速率限制

### 第3层：业务逻辑层 (Business Logic Layer)
划分为5个核心模块（如上所述）

**特点**：
- 每个模块高度独立
- 通过接口通信
- 支持插件式扩展

### 第4层：数据访问层 (Data Access Layer)
- Prisma ORM
- Repository模式
- 数据库抽象

### 第5层：基础设施层 (Infrastructure Layer)
- 数据库（MySQL）
- 向量数据库（Qdrant）
- 缓存系统（Redis可选）
- 文件存储

---

## 模块间通信

### 通信机制

```
┌──────────────┐
│ 模块1：解析   │
└──────────────┘
       ↓ (输出：StructuredData)
       ↓
┌──────────────┐
│ 模块2：分析   │
└──────────────┘
       ↓ (输出：GeneratedCases)
       ↓
┌──────────────┐
│ 模块3：执行   │
└──────────────┘
       ↓ (输出：ExecutionResult)
       ↓
┌──────────────┐
│ 模块4：报告   │
└──────────────┘
```

### 数据接口定义

#### 解析模块输出
```typescript
interface ParsedDocument {
  id: string;
  type: 'axure' | 'requirement';
  pages?: Page[];
  requirements?: Requirement[];
  businessRules?: BusinessRule[];
  metadata: {
    uploadedAt: Date;
    uploadedBy: string;
    fileName: string;
  };
}
```

#### 分析模块输出
```typescript
interface AnalysisResult {
  documentId: string;
  modules: TestModule[];
  testPoints: TestPoint[];
  testCases: TestCase[];
  ragEnhancementMetrics: {
    appliedKnowledgeCount: number;
    enhancementRatio: number;
  };
}
```

#### 执行模块输出
```typescript
interface ExecutionResult {
  runId: string;
  caseId: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  steps: StepResult[];
  screenshots: Screenshot[];
  logs: string[];
  error?: {
    message: string;
    stack?: string;
  };
}
```

---

## 数据流转

### 场景1：从原型生成测试用例

```
1. 用户上传Axure文件
   ↓
2. 解析模块：解析HTML → StructuredData
   ↓
3. 分析模块：拆分模块 → 生成测试点 → RAG增强
   ↓
4. 生成完整测试用例
   ↓
5. 存储到数据库
   ↓
6. 前端展示用于审核
```

### 场景2：执行测试用例

```
1. 用户选择用例点击执行
   ↓
2. 执行模块：解析测试步骤
   ↓
3. MCP调度：发送命令到浏览器
   ↓
4. 浏览器执行：自动化操作
   ↓
5. 证据收集：截图、日志
   ↓
6. 实时推送：WebSocket推送进度
   ↓
7. 结果收集：保存到数据库
   ↓
8. 报告生成：统计分析
```

---

## 详细模块设计

### 模块1：文档解析模块

**目录结构**：
```
server/services/parsing/
├── interfaces/
│   ├── document.ts          # 文档接口
│   └── parser.ts            # 解析器接口
├── implementations/
│   ├── axureParser.ts       # Axure解析实现
│   ├── requirementParser.ts # 需求解析实现
│   └── preprocessor.ts      # 预处理实现
├── strategies/
│   ├── axureStrategy.ts     # Axure解析策略
│   └── requirementStrategy.ts
└── parsingService.ts        # 解析服务（门面）
```

**核心接口**：
```typescript
// 解析器接口
interface IDocumentParser {
  parse(input: Buffer | string): Promise<ParsedDocument>;
  validate(input: Buffer | string): Promise<boolean>;
}

// 解析服务（门面模式）
class ParsingService {
  private axureParser: IDocumentParser;
  private requirementParser: IDocumentParser;
  
  async parseDocument(file: File, type: 'axure' | 'requirement'): Promise<ParsedDocument> {
    const parser = type === 'axure' ? this.axureParser : this.requirementParser;
    return parser.parse(file.buffer);
  }
}
```

---

### 模块2：分析生成模块

**目录结构**：
```
server/services/analysis-generation/
├── interfaces/
│   ├── analyzer.ts          # 分析器接口
│   ├── generator.ts         # 生成器接口
│   └── rag-enhancer.ts      # RAG增强器接口
├── implementations/
│   ├── requirementAnalyzer.ts
│   ├── testModuleGenerator.ts
│   ├── testPointGenerator.ts
│   ├── testCaseGenerator.ts
│   └── ragEnhancer.ts
├── strategies/
│   ├── generationStrategy.ts # 生成策略（可切换AI模型）
│   └── ragStrategy.ts        # RAG策略
├── validators/
│   ├── requirementValidator.ts
│   └── caseValidator.ts
└── analysisGenerationService.ts # 综合服务（门面）
```

**核心接口**：
```typescript
interface IRequirementAnalyzer {
  analyze(doc: ParsedDocument): Promise<AnalysisResult>;
}

interface ITestPointGenerator {
  generate(modules: TestModule[]): Promise<TestPoint[]>;
}

interface ITestCaseGenerator {
  generate(testPoints: TestPoint[]): Promise<TestCase[]>;
}

interface IRAGEnhancer {
  enhance(cases: TestCase[]): Promise<EnhancedTestCase[]>;
  getRelevantKnowledge(query: string): Promise<KnowledgeItem[]>;
}

// 综合服务
class AnalysisGenerationService {
  async generateFromDocument(doc: ParsedDocument): Promise<GeneratedCases> {
    // 1. 分析需求
    const analysis = await this.analyzer.analyze(doc);
    
    // 2. 生成测试点
    const testPoints = await this.pointGenerator.generate(analysis.modules);
    
    // 3. 生成测试用例
    const cases = await this.caseGenerator.generate(testPoints);
    
    // 4. RAG增强
    const enhanced = await this.ragEnhancer.enhance(cases);
    
    return { cases: enhanced, metadata: analysis };
  }
}
```

---

### 模块3：执行调度模块

**目录结构**：
```
server/services/execution/
├── interfaces/
│   ├── executor.ts          # 执行器接口
│   ├── scheduler.ts         # 调度器接口
│   └── monitor.ts           # 监控器接口
├── implementations/
│   ├── testExecutionEngine.ts
│   ├── mcpScheduler.ts
│   ├── suiteManager.ts
│   ├── progressMonitor.ts
│   └── evidenceCollector.ts
├── strategies/
│   ├── sequentialExecutionStrategy.ts  # 顺序执行
│   ├── parallelExecutionStrategy.ts    # 并行执行
│   └── retryStrategy.ts                # 重试策略
├── context/
│   └── executionContext.ts  # 执行上下文
└── executionService.ts      # 执行服务（门面）
```

**核心接口**：
```typescript
interface IExecutor {
  execute(testCase: TestCase): Promise<ExecutionResult>;
  cancel(executionId: string): Promise<void>;
}

interface IScheduler {
  schedule(tasks: ExecutionTask[]): Promise<void>;
  getStatus(taskId: string): Promise<TaskStatus>;
}

interface ISuiteManager {
  createSuite(cases: TestCase[]): Promise<Suite>;
  executeSuite(suiteId: string): Promise<SuiteResult>;
}

interface IProgressMonitor {
  trackProgress(executionId: string): Promise<ProgressUpdate>;
  onProgress(listener: (update: ProgressUpdate) => void): void;
}

// 执行服务
class ExecutionService {
  async executeCase(testCase: TestCase): Promise<ExecutionResult> {
    const context = new ExecutionContext(testCase);
    
    // 1. 创建执行任务
    const task = context.createTask();
    
    // 2. 调度执行
    await this.scheduler.schedule([task]);
    
    // 3. 实时监控
    const monitor = this.progressMonitor.track(task.id);
    monitor.onProgress((update) => {
      this.wsManager.pushProgress(update);
    });
    
    // 4. 收集结果
    const result = await task.completion;
    
    return result;
  }
}
```

---

### 模块4：报告生成模块

**目录结构**：
```
server/services/reporting/
├── interfaces/
│   ├── generator.ts         # 生成器接口
│   ├── exporter.ts          # 导出器接口
│   └── analyzer.ts          # 分析器接口
├── implementations/
│   ├── reportGenerator.ts
│   ├── statisticsCalculator.ts
│   ├── trendAnalyzer.ts
│   └── reportExporter.ts
├── templates/
│   ├── htmlTemplate.ts
│   ├── pdfTemplate.ts
│   └── excelTemplate.ts
└── reportingService.ts      # 报告服务（门面）
```

**核心接口**：
```typescript
interface IReportGenerator {
  generate(results: ExecutionResult[]): Promise<Report>;
}

interface IStatisticsCalculator {
  calculate(results: ExecutionResult[]): Promise<Statistics>;
}

interface ITrendAnalyzer {
  analyze(historicalData: Report[]): Promise<TrendAnalysis>;
}

interface IReportExporter {
  exportToHTML(report: Report): Promise<string>;
  exportToPDF(report: Report): Promise<Buffer>;
  exportToExcel(report: Report): Promise<Buffer>;
}

// 报告服务
class ReportingService {
  async generateReport(suiteId: string): Promise<Report> {
    // 1. 获取执行结果
    const results = await this.repository.getResults(suiteId);
    
    // 2. 统计数据
    const stats = await this.calculator.calculate(results);
    
    // 3. 趋势分析
    const historical = await this.repository.getHistoricalReports(suiteId);
    const trends = await this.analyzer.analyze(historical);
    
    // 4. 生成报告
    const report = await this.generator.generate(results);
    report.statistics = stats;
    report.trends = trends;
    
    return report;
  }
}
```

---

### 模块5：知识库管理模块

**目录结构**：
```
server/services/knowledge-base/
├── interfaces/
│   ├── manager.ts           # 知识库管理器接口
│   ├── embedder.ts          # 向量化接口
│   ├── retriever.ts         # 检索器接口
│   └── indexer.ts           # 索引器接口
├── implementations/
│   ├── knowledgeManager.ts
│   ├── embeddingService.ts
│   ├── ragRetriever.ts
│   └── knowledgeIndexer.ts
├── models/
│   ├── businessRuleKnowledge.ts
│   ├── testPatternKnowledge.ts
│   ├── pitfallKnowledge.ts
│   └── riskScenarioKnowledge.ts
├── strategies/
│   ├── embeddingStrategy.ts  # 不同embedding提供商
│   └── retrievalStrategy.ts  # 不同检索策略
└── knowledgeService.ts       # 知识库服务（门面）
```

**核心接口**：
```typescript
interface IKnowledgeManager {
  addKnowledge(knowledge: KnowledgeItem): Promise<void>;
  updateKnowledge(id: string, knowledge: KnowledgeItem): Promise<void>;
  deleteKnowledge(id: string): Promise<void>;
  getKnowledge(id: string): Promise<KnowledgeItem>;
}

interface IEmbedder {
  embed(text: string): Promise<number[]>;
  batchEmbed(texts: string[]): Promise<number[][]>;
}

interface IRetriever {
  retrieve(query: string, limit: number): Promise<KnowledgeItem[]>;
  similaritySearch(embedding: number[], limit: number): Promise<KnowledgeItem[]>;
}

interface IIndexer {
  index(knowledge: KnowledgeItem): Promise<void>;
  reindex(): Promise<void>;
  clearIndex(): Promise<void>;
}

// 知识库服务
class KnowledgeService {
  async getEnhancementKnowledge(testPoint: TestPoint): Promise<EnhancementKnowledge> {
    // 1. 向量化查询
    const embedding = await this.embedder.embed(testPoint.description);
    
    // 2. 检索相关知识
    const knowledge = await this.retriever.similaritySearch(embedding, limit: 5);
    
    // 3. 分类整理
    return {
      businessRules: knowledge.filter(k => k.type === 'business-rule'),
      testPatterns: knowledge.filter(k => k.type === 'test-pattern'),
      pitfalls: knowledge.filter(k => k.type === 'pitfall'),
      riskScenarios: knowledge.filter(k => k.type === 'risk-scenario')
    };
  }
}
```

---

## 目录结构规范

```
server/
├── services/
│   ├── parsing/                    # 文档解析模块
│   │   ├── interfaces/
│   │   ├── implementations/
│   │   ├── strategies/
│   │   └── parsingService.ts
│   │
│   ├── analysis-generation/        # 分析生成模块
│   │   ├── interfaces/
│   │   ├── implementations/
│   │   ├── strategies/
│   │   ├── validators/
│   │   └── analysisGenerationService.ts
│   │
│   ├── execution/                  # 执行调度模块
│   │   ├── interfaces/
│   │   ├── implementations/
│   │   ├── strategies/
│   │   ├── context/
│   │   └── executionService.ts
│   │
│   ├── reporting/                  # 报告生成模块
│   │   ├── interfaces/
│   │   ├── implementations/
│   │   ├── templates/
│   │   └── reportingService.ts
│   │
│   ├── knowledge-base/             # 知识库管理模块
│   │   ├── interfaces/
│   │   ├── implementations/
│   │   ├── models/
│   │   ├── strategies/
│   │   └── knowledgeService.ts
│   │
│   ├── common/                     # 通用服务
│   │   ├── database/
│   │   ├── cache/
│   │   ├── queue/
│   │   └── logger/
│   │
│   └── legacy/                     # 旧服务（逐步迁移）
│
├── routes/
│   ├── api/
│   │   ├── parsing/
│   │   ├── analysis-generation/
│   │   ├── execution/
│   │   ├── reporting/
│   │   └── knowledge-base/
│   │
│   └── middleware/
│       ├── auth/
│       ├── validation/
│       └── errorHandler/
│
├── types/
│   ├── parsing/
│   ├── analysis/
│   ├── execution/
│   ├── reporting/
│   ├── knowledge/
│   └── common/
│
├── repositories/
│   ├── documents/
│   ├── testCases/
│   ├── executions/
│   ├── reports/
│   └── knowledge/
│
└── utils/
    ├── validators/
    ├── converters/
    ├── helpers/
    └── constants/
```

---

## 依赖关系

### 单向依赖原则

```
前端层
  ↓
API网关层
  ↓
业务逻辑层（5个独立模块 + 通用服务）
  ↓
数据访问层（Repository）
  ↓
基础设施层（数据库、缓存、队列）
```

### 模块间调用关系

```
路由层
  ↓
ServicesX (门面模式)
  ↓
IXXXImplementation (实现接口)
  ↓
具体实现类
  ↓
Repository (数据访问)
```

**重要原则**：
- ✅ 只能向下调用（依赖倒置）
- ✅ 模块间通过接口通信
- ✅ 禁止循环依赖
- ✅ 禁止跨层级调用

---

## 扩展性设计

### 1. 新增AI模型支持

**现状**：生成模块支持切换AI模型

**扩展方法**：
```typescript
// 1. 定义模型接口
interface IAIModel {
  generateTestCases(context: GenerationContext): Promise<TestCase[]>;
  generateTestPoints(context: GenerationContext): Promise<TestPoint[]>;
}

// 2. 实现具体模型
class GPT4Model implements IAIModel { }
class ClaudeModel implements IAIModel { }
class DeepSeekModel implements IAIModel { }

// 3. 通过工厂模式选择
class ModelFactory {
  create(modelId: string): IAIModel {
    // 根据配置返回模型实例
  }
}
```

### 2. 新增知识库类型

**扩展方法**：
```typescript
// 在knowledge-base/models/中添加新类型
class CustomKnowledge extends BaseKnowledge {
  type = 'custom-type';
  // 实现必要方法
}
```

### 3. 新增执行策略

**扩展方法**：
```typescript
// 在execution/strategies/中添加
class CustomExecutionStrategy implements IExecutionStrategy {
  execute(testCases: TestCase[]): Promise<ExecutionResult[]> {
    // 自定义执行逻辑
  }
}
```

### 4. 新增报告格式

**扩展方法**：
```typescript
// 在reporting/templates/中添加
class CustomReportTemplate implements IReportTemplate {
  generate(data: Report): Promise<string> {
    // 自定义报告格式
  }
}
```

---

## 数据模型

### 核心数据流转

```typescript
// 1. 原始文档
interface RawDocument {
  id: string;
  filename: string;
  type: 'axure' | 'requirement';
  content: Buffer;
}

// 2. 解析结果
interface ParsedDocument {
  id: string;
  pages?: Page[];
  requirements?: Requirement[];
  businessRules?: BusinessRule[];
}

// 3. 分析结果
interface TestModule {
  id: string;
  name: string;
  description: string;
  testPoints: TestPoint[];
}

// 4. 生成的用例
interface TestCase {
  id: string;
  moduleId: string;
  name: string;
  steps: TestStep[];
  expectedResults: string[];
  knowledgeEnhanced: boolean;
}

// 5. 执行结果
interface ExecutionResult {
  id: string;
  caseId: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  steps: StepResult[];
  artifacts: {
    screenshots: string[];
    logs: string[];
  };
}

// 6. 报告
interface Report {
  id: string;
  suiteId: string;
  generatedAt: Date;
  statistics: Statistics;
  results: ExecutionResult[];
  trends: TrendAnalysis;
}
```

---

## 实施路线图

### Phase 1: 核心架构建立（第1周）
- ✅ 创建5个模块的目录结构
- ✅ 定义各模块的接口
- ✅ 实现门面模式的服务类

### Phase 2: 解析模块完成（第2周）
- 实现AxureParser
- 实现RequirementParser
- 单元测试

### Phase 3: 分析生成模块完成（第3-4周）
- 实现各个生成器
- 集成RAG增强
- 单元/集成测试

### Phase 4: 执行调度模块完成（第5-6周）
- 重构TestExecutionService
- 实现MCP调度器
- 实现进度监控

### Phase 5: 报告生成模块完成（第7周）
- 实现报告生成器
- 实现导出功能
- 单元测试

### Phase 6: 知识库模块完成（第8周）
- 实现知识库管理
- 实现RAG检索
- 单元测试

### Phase 7: 集成测试和优化（第9-10周）
- 端到端测试
- 性能优化
- 文档完善

---

## 总结

本架构设计遵循以下核心原则：

1. **高内聚、低耦合**：各模块职责清晰，交互通过接口进行
2. **分层架构**：清晰的依赖关系，便于维护和扩展
3. **开放-闭合原则**：对扩展开放，对修改闭合
4. **接口隔离**：每个模块有清晰的接口定义
5. **可测试性**：支持单元测试和集成测试
6. **可扩展性**：支持新增AI模型、知识库类型、执行策略等

通过此架构，Test Agent将成为一个企业级、高可维护、高可扩展的自动化测试平台。
