# Test Agent 模块通信与数据流转指南

> **版本**：v1.0  
> **目的**：详细说明各模块间的通信机制和数据流转过程

---

## 目录

1. [通信原则](#通信原则)
2. [通信机制](#通信机制)
3. [数据流转场景](#数据流转场景)
4. [接口规范](#接口规范)
5. [错误处理](#错误处理)

---

## 通信原则

### 原则1：单向依赖

```
路由层 (Routes)
   ↓ 依赖
服务门面层 (Service Facade)
   ↓ 依赖
实现层 (Implementation)
   ↓ 依赖
数据访问层 (Repository)
   ↓ 依赖
数据库层 (Database)
```

**禁止**：
- ❌ 底层模块调用上层模块
- ❌ 模块间的循环依赖
- ❌ 跨层级直接调用

### 原则2：接口隔离

```typescript
// ✅ 正确：通过接口通信
interface ITestCaseGenerator {
  generate(input: GenerationInput): Promise<TestCase[]>;
}

// ❌ 错误：直接依赖具体类
import { ConcreteGenerator } from './concreteGenerator';
```

### 原则3：异步优先

```typescript
// ✅ 正确：返回Promise
async function generate(input: GenerationInput): Promise<TestCase[]> {
  return testCases;
}

// ❌ 错误：同步阻塞
function generate(input: GenerationInput): TestCase[] {
  return testCases;
}
```

### 原则4：数据验证

```typescript
// 数据流转时必须在边界处进行验证
class ParsingService {
  async parseDocument(file: File): Promise<ParsedDocument> {
    // 1. 输入验证
    if (!file || !this.isValidFile(file)) {
      throw new ValidationError('Invalid file');
    }
    
    // 2. 处理
    const result = await this.parser.parse(file);
    
    // 3. 输出验证
    if (!this.isValidOutput(result)) {
      throw new ValidationError('Invalid output');
    }
    
    return result;
  }
}
```

---

## 通信机制

### 机制1：Service Facade模式

**目的**：简化模块间的调用

```typescript
// ❌ 复杂的直接调用
const analyzer = new RequirementAnalyzer();
const moduleGenerator = new TestModuleGenerator();
const pointGenerator = new TestPointGenerator();

const analysis = await analyzer.analyze(doc);
const modules = await moduleGenerator.generate(analysis);
const points = await pointGenerator.generate(modules);

// ✅ 使用门面
class AnalysisGenerationService {
  async generateFromDocument(doc: ParsedDocument) {
    const analysis = await this.analyzer.analyze(doc);
    const modules = await this.moduleGenerator.generate(analysis);
    const points = await this.pointGenerator.generate(modules);
    return { analysis, modules, points };
  }
}

// 调用者只需要
const service = new AnalysisGenerationService();
const result = await service.generateFromDocument(doc);
```

### 机制2：Event-Driven（事件驱动）

**应用场景**：一个模块的输出需要触发其他模块的操作

```typescript
// 事件发布
class ExecutionService {
  async executeCase(testCase: TestCase) {
    const result = await this.engine.execute(testCase);
    
    // 发布执行完成事件
    this.eventBus.emit('test.completed', {
      caseId: testCase.id,
      result: result
    });
    
    return result;
  }
}

// 事件订阅
class ReportingService {
  constructor(eventBus: EventBus) {
    // 监听测试完成事件
    eventBus.on('test.completed', async (data) => {
      await this.updateReport(data.caseId, data.result);
    });
  }
}

// 或通过WebSocket推送到前端
class WebSocketManager {
  constructor(eventBus: EventBus) {
    eventBus.on('test.completed', (data) => {
      this.broadcast({
        type: 'test_completed',
        payload: data
      });
    });
  }
}
```

### 机制3：Dependency Injection（依赖注入）

**目的**：解耦模块间的依赖关系

```typescript
// ✅ 使用DI容器
class Container {
  private services = new Map();
  
  register(name: string, factory: () => any) {
    this.services.set(name, factory);
  }
  
  resolve(name: string): any {
    const factory = this.services.get(name);
    return factory ? factory() : null;
  }
}

// 应用DI
const container = new Container();

// 注册服务
container.register('parsingService', () => new ParsingService());
container.register('analysisService', () => 
  new AnalysisGenerationService(
    container.resolve('parsingService')
  )
);

// 获取服务
const analysisService = container.resolve('analysisService');
```

### 机制4：Repository Pattern（仓储模式）

**目的**：统一的数据访问接口

```typescript
// 接口定义
interface ITestCaseRepository {
  save(testCase: TestCase): Promise<void>;
  findById(id: string): Promise<TestCase | null>;
  findByModuleId(moduleId: string): Promise<TestCase[]>;
}

// 实现
class TestCaseRepository implements ITestCaseRepository {
  async save(testCase: TestCase): Promise<void> {
    await prisma.testCases.upsert({
      where: { id: testCase.id },
      update: testCase,
      create: testCase
    });
  }
  
  async findById(id: string): Promise<TestCase | null> {
    return prisma.testCases.findUnique({ where: { id } });
  }
}

// 使用
class AnalysisGenerationService {
  constructor(private repository: ITestCaseRepository) {}
  
  async generateFromDocument(doc: ParsedDocument) {
    const cases = await this.generate(doc);
    
    // 保存到数据库
    for (const testCase of cases) {
      await this.repository.save(testCase);
    }
  }
}
```

---

## 数据流转场景

### 场景1：从Axure原型生成测试用例

```
步骤1：用户上传Axure文件
   ↓
POST /api/v1/parsing/parse { file }
   ↓
   
步骤2：路由接收请求
   ↓
ParsingController
   ↓
   
步骤3：验证和处理
   ↓
ParsingService.parseDocument(file)
   ↓
   ├─ AxureParser.parse()    → ParsedDocument
   ├─ Preprocessor.clean()   → CleanedDocument
   └─ Validator.validate()   → ✓ Valid
   ↓
   
步骤4：存储解析结果
   ↓
DocumentRepository.save(parsedDocument)
   ↓
MySQL: documents表
   ↓
   
步骤5：返回给前端
   ↓
Response: { documentId, status: 'parsed' }
   ↓
   
步骤6：前端请求分析生成
   ↓
POST /api/v1/analysis-generation/generate
   { documentId }
   ↓
   
步骤7：服务处理
   ↓
AnalysisGenerationService
   ├─ 加载ParsedDocument
   ├─ RequirementAnalyzer.analyze()
   ├─ TestModuleGenerator.generate()
   ├─ TestPointGenerator.generate()
   ├─ RAGEnhancer.enhance()
   └─ TestCaseGenerator.generate()
   ↓
   
步骤8：保存生成结果
   ↓
TestCaseRepository.saveMany(testCases)
   ↓
MySQL: test_cases表
   ↓
   
步骤9：返回生成结果
   ↓
Response: { cases, statistics }
```

### 场景2：执行单个测试用例

```
步骤1：用户点击执行
   ↓
POST /api/v1/execution/run { caseId }
   ↓
   
步骤2：路由处理
   ↓
ExecutionController
   └─ 验证权限和参数
   ↓
   
步骤3：服务处理
   ↓
ExecutionService.executeCase(caseId)
   ├─ TestCaseRepository.findById(caseId)
   ├─ ParseSteps.convert() → ExecutionTasks
   └─ ExecutionEngine.execute(tasks)
   ↓
   
步骤4：任务调度
   ↓
MCPScheduler.schedule(tasks)
   ├─ 创建执行上下文
   ├─ 管理浏览器会话
   └─ 分发到MCP Worker
   ↓
   
步骤5：浏览器执行
   ↓
Playwright执行自动化操作
   ├─ 导航
   ├─ 点击
   ├─ 输入
   ├─ 验证
   └─ 截图
   ↓
   
步骤6：实时推送进度
   ↓
ProgressMonitor.trackProgress()
   └─ WebSocket推送给前端
   
步骤7：收集证据
   ↓
EvidenceCollector.collect()
   ├─ 截图存储
   ├─ 日志收集
   └─ 性能指标
   ↓
   
步骤8：生成结果
   ↓
ExecutionResult {
  status: 'passed' | 'failed',
  duration: number,
  steps: StepResult[],
  screenshots: string[],
  logs: string[]
}
   ↓
   
步骤9：保存结果
   ↓
ExecutionRepository.save(result)
   ↓
MySQL: test_runs表
   ↓
   
步骤10：发送完成事件
   ↓
eventBus.emit('test.completed', result)
   ├─ 更新报告
   ├─ 更新统计
   └─ WebSocket通知
```

### 场景3：执行测试套件

```
步骤1：用户选择多个用例点击执行
   ↓
POST /api/v1/execution/run-suite { caseIds }
   ↓
   
步骤2：创建套件
   ↓
SuiteManager.createSuite(caseIds)
   └─ Suite { id, cases, status: 'pending' }
   ↓
   
步骤3：初始化执行
   ↓
SuiteExecutionService.execute(suiteId)
   ├─ 加载所有用例
   ├─ 创建执行队列
   └─ 启动调度
   ↓
   
步骤4：并发执行
   ↓
ExecutionScheduler.schedule(queue)
   ├─ 根据配置（maxConcurrency）分批
   ├─ 为每个用例创建ExecutionTask
   └─ 监控资源使用
   ↓
   
步骤5：单个用例执行
   ↓
   （参考场景2）
   ↓
   
步骤6：实时推送套件进度
   ↓
SuiteProgressMonitor.track()
   └─ WebSocket推送套件级进度
   
步骤7：收集套件结果
   ↓
SuiteExecutionResult {
  suiteId: string,
  totalCases: number,
  passedCases: number,
  failedCases: number,
  duration: number,
  cases: ExecutionResult[]
}
   ↓
   
步骤8：生成报告
   ↓
ReportingService.generateReport(suiteId)
   ├─ 统计数据
   ├─ 分析趋势
   └─ 生成图表
   ↓
   
步骤9：保存报告
   ↓
ReportRepository.save(report)
```

---

## 接口规范

### RESTful API规范

#### 解析模块

```typescript
// 解析文档
POST /api/v1/parsing/parse
Request: {
  file: File,
  type: 'axure' | 'requirement'
}
Response: {
  success: boolean,
  data: {
    documentId: string,
    pages?: number,
    requirementItems?: number,
    businessRules?: number
  },
  status: 'queued' | 'parsing' | 'completed' | 'failed'
}

// 查询解析进度
GET /api/v1/parsing/status/:jobId
Response: {
  success: boolean,
  data: {
    status: 'queued' | 'parsing' | 'completed' | 'failed',
    progress: 0-100,
    documentId?: string,
    error?: string
  }
}
```

#### 分析生成模块

```typescript
// 分析文档并生成用例
POST /api/v1/analysis-generation/generate
Request: {
  documentId: string,
  includeRagEnhancement?: boolean
}
Response: {
  success: boolean,
  data: {
    jobId: string,
    cases: TestCase[],
    modules: TestModule[],
    statistics: {
      totalCases: number,
      enhancedCases: number,
      generatedAt: Date
    }
  }
}
```

#### 执行调度模块

```typescript
// 执行单个用例
POST /api/v1/execution/run
Request: {
  caseId: string,
  timeout?: number,
  retryAttempts?: number
}
Response: {
  success: boolean,
  data: {
    runId: string,
    caseId: string,
    status: 'queued' | 'running' | 'completed' | 'failed'
  }
}

// 执行套件
POST /api/v1/execution/run-suite
Request: {
  caseIds: string[],
  parallel?: boolean,
  maxConcurrency?: number
}
Response: {
  success: boolean,
  data: {
    suiteId: string,
    totalCases: number,
    estimatedDuration: number
  }
}

// 查询执行状态
GET /api/v1/execution/status/:runId
Response: {
  success: boolean,
  data: {
    runId: string,
    status: 'queued' | 'running' | 'passed' | 'failed',
    progress: 0-100,
    currentStep?: string,
    result?: ExecutionResult
  }
}

// 取消执行
POST /api/v1/execution/cancel/:runId
Response: {
  success: boolean,
  data: {
    runId: string,
    cancelledAt: Date
  }
}
```

#### 报告生成模块

```typescript
// 获取报告
GET /api/v1/reporting/report/:suiteId
Response: {
  success: boolean,
  data: {
    reportId: string,
    suiteId: string,
    generatedAt: Date,
    statistics: {
      totalCases: number,
      passedCases: number,
      failedCases: number,
      passRate: number,
      duration: number
    },
    results: ExecutionResult[]
  }
}

// 导出报告
GET /api/v1/reporting/report/:suiteId/export?format=pdf|html|excel
Response: Buffer (PDF/Excel) 或 HTML文本
```

#### 知识库模块

```typescript
// 搜索知识
GET /api/v1/knowledge/search?query=xxx&limit=10
Response: {
  success: boolean,
  data: {
    items: KnowledgeItem[],
    total: number,
    query: string
  }
}

// 获取增强知识
POST /api/v1/knowledge/enhance
Request: {
  testPoint: TestPoint
}
Response: {
  success: boolean,
  data: {
    businessRules: KnowledgeItem[],
    testPatterns: KnowledgeItem[],
    pitfalls: KnowledgeItem[],
    riskScenarios: KnowledgeItem[]
  }
}
```

---

## 错误处理

### 错误分类

```typescript
// 验证错误（400）
class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// 认证错误（401）
class AuthenticationError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// 权限错误（403）
class AuthorizationError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// 不存在错误（404）
class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}

// 冲突错误（409）
class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

// 业务逻辑错误（422）
class BusinessLogicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessLogicError';
  }
}

// 外部服务错误（503）
class ExternalServiceError extends Error {
  constructor(service: string, message: string) {
    super(`${service}: ${message}`);
    this.name = 'ExternalServiceError';
  }
}

// 服务器错误（500）
class InternalServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InternalServerError';
  }
}
```

### 错误处理流程

```typescript
// 在路由层统一捕获和处理错误
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // 记录错误
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // 映射错误状态码
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: err.message,
      field: err.field
    });
  }

  if (err instanceof AuthenticationError) {
    return res.status(401).json({
      success: false,
      error: err.message
    });
  }

  if (err instanceof AuthorizationError) {
    return res.status(403).json({
      success: false,
      error: err.message
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: err.message
    });
  }

  if (err instanceof ConflictError) {
    return res.status(409).json({
      success: false,
      error: err.message
    });
  }

  if (err instanceof BusinessLogicError) {
    return res.status(422).json({
      success: false,
      error: err.message
    });
  }

  if (err instanceof ExternalServiceError) {
    return res.status(503).json({
      success: false,
      error: err.message
    });
  }

  // 默认500错误
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
```

### 在服务层的错误处理

```typescript
class AnalysisGenerationService {
  async generateFromDocument(doc: ParsedDocument): Promise<GeneratedCases> {
    try {
      // 验证输入
      if (!doc || !doc.id) {
        throw new ValidationError('Document is required');
      }

      // 分析
      const analysis = await this.analyzer.analyze(doc);
      if (!analysis) {
        throw new BusinessLogicError('Analysis failed');
      }

      // 生成
      const cases = await this.caseGenerator.generate(analysis);
      if (!cases || cases.length === 0) {
        throw new BusinessLogicError('No test cases generated');
      }

      return cases;

    } catch (error) {
      // 如果是已知错误，直接抛出
      if (error instanceof CustomError) {
        throw error;
      }

      // 未知错误，包装为服务错误
      throw new InternalServerError(
        `Failed to generate test cases: ${error.message}`
      );
    }
  }
}
```

### 异步操作的错误处理

```typescript
// ❌ 错误的处理方式
async function executeTask() {
  const result = await asyncOperation1();
  const result2 = await asyncOperation2(result);
  return result2;
}

// ✅ 正确的处理方式
async function executeTask() {
  try {
    const result = await asyncOperation1();
    if (!result) {
      throw new BusinessLogicError('Operation1 returned empty result');
    }

    const result2 = await asyncOperation2(result);
    if (!result2) {
      throw new BusinessLogicError('Operation2 returned empty result');
    }

    return result2;

  } catch (error) {
    if (error instanceof CustomError) {
      throw error;
    }
    throw new InternalServerError(`Task execution failed: ${error.message}`);
  }
}
```

---

## 最佳实践总结

### ✅ DO（应该做）

1. **通过接口通信**
   ```typescript
   const service = new AnalysisService(parser, generator);
   ```

2. **异步优先**
   ```typescript
   async function process(): Promise<Result> { }
   ```

3. **数据验证**
   ```typescript
   if (!validate(input)) throw new ValidationError();
   ```

4. **错误传播**
   ```typescript
   try {
     await service.doSomething();
   } catch (error) {
     throw new ServiceError(error);
   }
   ```

5. **门面模式简化调用**
   ```typescript
   const result = await service.complexOperation();
   ```

### ❌ DON'T（不应该做）

1. **直接依赖具体实现类**
   ```typescript
   import { ConcreteClass } from './concreteClass';
   ```

2. **跨模块直接调用**
   ```typescript
   import { InternalService } from '../other-module/internal';
   ```

3. **同步阻塞操作**
   ```typescript
   function slowOperation(): Result { }
   ```

4. **忽略错误**
   ```typescript
   await service.doSomething(); // 错误被吞掉
   ```

5. **暴露内部实现**
   ```typescript
   return internalObject; // 应该返回接口
   ```

