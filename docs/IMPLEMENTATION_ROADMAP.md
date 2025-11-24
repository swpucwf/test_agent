# Test Agent 系统实施路线图

> **版本**：v1.0  
> **计划周期**：10周  
> **目标**：完成新架构的实施和重构

---

## 📅 总体计划

| 阶段 | 周期 | 主要任务 | 交付物 |
|------|------|--------|--------|
| Phase 1 | Week 1 | 架构建立 | 目录结构 + 接口定义 |
| Phase 2 | Week 2 | 解析模块 | ParsingService + 单元测试 |
| Phase 3 | Week 3-4 | 分析生成模块 | AnalysisGenerationService + 集成测试 |
| Phase 4 | Week 5-6 | 执行调度模块 | ExecutionService + 进度监控 |
| Phase 5 | Week 7 | 报告生成模块 | ReportingService + 导出功能 |
| Phase 6 | Week 8 | 知识库模块 | KnowledgeService + RAG增强 |
| Phase 7 | Week 9-10 | 集成测试 & 优化 | 端到端测试 + 性能优化 |

---

## Phase 1: 架构建立（Week 1）

### 任务1.1：创建目录结构

**目标**：建立标准化的目录结构

**操作步骤**：

```bash
# 创建主模块目录
mkdir -p server/services/{parsing,analysis-generation,execution,reporting,knowledge-base,common}/

# 创建子目录
mkdir -p server/services/parsing/{interfaces,implementations,strategies}
mkdir -p server/services/analysis-generation/{interfaces,implementations,strategies,validators}
mkdir -p server/services/execution/{interfaces,implementations,strategies,context}
mkdir -p server/services/reporting/{interfaces,implementations,templates}
mkdir -p server/services/knowledge-base/{interfaces,implementations,models,strategies}
mkdir -p server/services/common/{database,cache,queue,logger}

# 创建类型定义
mkdir -p server/types/{parsing,analysis,execution,reporting,knowledge,common}

# 创建数据访问层
mkdir -p server/repositories/{documents,testCases,executions,reports,knowledge}

# 创建路由
mkdir -p server/routes/api/{parsing,analysis-generation,execution,reporting,knowledge-base}
mkdir -p server/routes/middleware/{auth,validation,errorHandler}
```

### 任务1.2：定义模块接口

**文件清单**：

1. **解析模块接口** - `server/services/parsing/interfaces/`
   - `document.ts` - 文档接口定义
   - `parser.ts` - 解析器接口
   - `preprocessor.ts` - 预处理接口

2. **分析生成模块接口** - `server/services/analysis-generation/interfaces/`
   - `analyzer.ts` - 分析器接口
   - `generator.ts` - 生成器接口
   - `rag-enhancer.ts` - RAG增强器接口
   - `validator.ts` - 验证器接口

3. **执行调度模块接口** - `server/services/execution/interfaces/`
   - `executor.ts` - 执行器接口
   - `scheduler.ts` - 调度器接口
   - `monitor.ts` - 监控器接口

4. **报告生成模块接口** - `server/services/reporting/interfaces/`
   - `generator.ts` - 报告生成器接口
   - `exporter.ts` - 导出器接口
   - `analyzer.ts` - 分析器接口

5. **知识库模块接口** - `server/services/knowledge-base/interfaces/`
   - `manager.ts` - 管理器接口
   - `embedder.ts` - 向量化接口
   - `retriever.ts` - 检索器接口
   - `indexer.ts` - 索引器接口

### 任务1.3：定义核心数据类型

**文件**：`server/types/common/`

```typescript
// types.ts - 核心类型定义
export interface ParsedDocument { ... }
export interface TestModule { ... }
export interface TestCase { ... }
export interface TestStep { ... }
export interface ExecutionResult { ... }
export interface Report { ... }
```

### 任务1.4：创建门面服务框架

**文件清单**：

- `server/services/parsing/parsingService.ts`
- `server/services/analysis-generation/analysisGenerationService.ts`
- `server/services/execution/executionService.ts`
- `server/services/reporting/reportingService.ts`
- `server/services/knowledge-base/knowledgeService.ts`

**框架示例**：

```typescript
export class ParsingService {
  private axureParser: IDocumentParser;
  private requirementParser: IDocumentParser;
  
  constructor(
    axureParser: IDocumentParser,
    requirementParser: IDocumentParser
  ) {
    this.axureParser = axureParser;
    this.requirementParser = requirementParser;
  }
  
  async parseDocument(file: File, type: 'axure' | 'requirement'): Promise<ParsedDocument> {
    // 门面逻辑
  }
}
```

### 任务1.5：更新 package.json 依赖

**新增依赖**：
```json
{
  "dependencies": {
    "reflect-metadata": "^0.1.13",
    "qdrant-js-client": "^x.x.x"
  }
}
```

---

## Phase 2: 解析模块完成（Week 2）

### 任务2.1：实现 Axure 解析器

**文件**：`server/services/parsing/implementations/axureParser.ts`

**任务清单**：
- [ ] 实现HTML解析逻辑
- [ ] 提取页面信息
- [ ] 提取组件信息
- [ ] 提取交互信息
- [ ] 单元测试覆盖率 > 80%

### 任务2.2：实现需求文档解析器

**文件**：`server/services/parsing/implementations/requirementParser.ts`

**任务清单**：
- [ ] 实现文本解析逻辑
- [ ] 提取需求信息
- [ ] 提取业务规则
- [ ] 提取功能模块
- [ ] 单元测试覆盖率 > 80%

### 任务2.3：实现文档预处理器

**文件**：`server/services/parsing/implementations/preprocessor.ts`

**任务清单**：
- [ ] 文本清洗
- [ ] 格式标准化
- [ ] 数据验证
- [ ] 单元测试

### 任务2.4：创建路由和API

**文件**：`server/routes/api/parsing/`

**端点**：
```
POST /api/v1/parsing/parse           - 解析文档
GET  /api/v1/parsing/status/:jobId   - 查询解析进度
```

### 任务2.5：集成测试

**文件**：`server/services/parsing/__tests__/integration.test.ts`

**测试场景**：
- 解析Axure文件
- 解析需求文档
- 预处理逻辑
- 错误处理

---

## Phase 3: 分析生成模块（Week 3-4）

### 任务3.1：实现需求分析器

**文件**：`server/services/analysis-generation/implementations/requirementAnalyzer.ts`

**功能**：
- 分析需求文档结构
- 识别功能模块
- 提取业务规则
- 生成分析报告

### 任务3.2：实现测试模块生成器

**文件**：`server/services/analysis-generation/implementations/testModuleGenerator.ts`

**功能**：
- 基于需求拆分测试模块
- 模块验证
- 模块关联

### 任务3.3：实现测试点生成器

**文件**：`server/services/analysis-generation/implementations/testPointGenerator.ts`

**功能**：
- 生成测试点
- 测试点分类
- 覆盖率分析

### 任务3.4：实现测试用例生成器

**文件**：`server/services/analysis-generation/implementations/testCaseGenerator.ts`

**功能**：
- 调用AI生成测试用例
- 步骤解析
- 预期结果生成

### 任务3.5：实现 RAG 增强器

**文件**：`server/services/analysis-generation/implementations/ragEnhancer.ts`

**功能**：
- 调用KnowledgeService获取知识
- 注入到Prompt中
- 增强生成结果

### 任务3.6：实现验证器

**文件**：`server/services/analysis-generation/validators/`

**验证器**：
- `requirementValidator.ts` - 需求验证
- `caseValidator.ts` - 用例验证

### 任务3.7：创建API路由

**端点**：
```
POST /api/v1/analysis/analyze              - 分析文档
POST /api/v1/analysis/generate-modules     - 生成模块
POST /api/v1/analysis/generate-points      - 生成测试点
POST /api/v1/analysis/generate-cases       - 生成用例
```

### 任务3.8：集成和测试

- 各组件间的集成测试
- 端到端流程测试
- RAG增强效果验证

---

## Phase 4: 执行调度模块（Week 5-6）

### 任务4.1：重构 TestExecutionService

**文件**：`server/services/execution/implementations/testExecutionEngine.ts`

**功能**：
- 清晰的执行生命周期
- 错误处理
- 重试机制
- 超时控制

### 任务4.2：实现 MCP 调度器

**文件**：`server/services/execution/implementations/mcpScheduler.ts`

**功能**：
- 任务调度
- 并发控制
- 优先级管理
- 队列管理

### 任务4.3：实现套件管理器

**文件**：`server/services/execution/implementations/suiteManager.ts`

**功能**：
- 套件创建
- 套件执行
- 套件管理

### 任务4.4：实现进度监控

**文件**：`server/services/execution/implementations/progressMonitor.ts`

**功能**：
- 实时进度跟踪
- WebSocket推送
- 进度统计

### 任务4.5：实现证据收集器

**文件**：`server/services/execution/implementations/evidenceCollector.ts`

**功能**：
- 截图收集
- 日志收集
- 证据存储
- 证据索引

### 任务4.6：实现执行策略

**文件**：`server/services/execution/strategies/`

**策略**：
- `sequentialExecutionStrategy.ts` - 顺序执行
- `parallelExecutionStrategy.ts` - 并行执行
- `retryStrategy.ts` - 重试策略

### 任务4.7：创建执行上下文

**文件**：`server/services/execution/context/executionContext.ts`

**功能**：
- 执行状态管理
- 上下文数据
- 生命周期管理

### 任务4.8：创建API路由

**端点**：
```
POST /api/v1/execution/run              - 执行测试
GET  /api/v1/execution/status/:runId    - 查询执行状态
POST /api/v1/execution/cancel/:runId    - 取消执行
```

### 任务4.9：测试和优化

- 单元测试
- 集成测试
- 压力测试
- 性能优化

---

## Phase 5: 报告生成模块（Week 7）

### 任务5.1：实现报告生成器

**文件**：`server/services/reporting/implementations/reportGenerator.ts`

**功能**：
- 汇总执行结果
- 生成报告数据结构
- 报告缓存

### 任务5.2：实现统计计算器

**文件**：`server/services/reporting/implementations/statisticsCalculator.ts`

**功能**：
- 通过率计算
- 执行时间统计
- 覆盖率计算
- 缺陷统计

### 任务5.3：实现趋势分析器

**文件**：`server/services/reporting/implementations/trendAnalyzer.ts`

**功能**：
- 历史数据分析
- 趋势预测
- 异常检测

### 任务5.4：实现报告导出器

**文件**：`server/services/reporting/implementations/reportExporter.ts`

**导出格式**：
- HTML
- PDF
- Excel
- JSON

### 任务5.5：创建报告模板

**文件**：`server/services/reporting/templates/`

**模板**：
- `htmlTemplate.ts`
- `pdfTemplate.ts`
- `excelTemplate.ts`

### 任务5.6：创建API路由

**端点**：
```
GET  /api/v1/reporting/report/:suiteId          - 获取报告
GET  /api/v1/reporting/report/:suiteId/html     - HTML报告
GET  /api/v1/reporting/report/:suiteId/pdf      - PDF报告
GET  /api/v1/reporting/report/:suiteId/excel    - Excel报告
```

### 任务5.7：测试

- 单元测试
- 报告正确性验证
- 导出功能测试

---

## Phase 6: 知识库模块（Week 8）

### 任务6.1：实现知识库管理器

**文件**：`server/services/knowledge-base/implementations/knowledgeManager.ts`

**功能**：
- CRUD操作
- 知识索引
- 知识分类

### 任务6.2：实现向量化服务

**文件**：`server/services/knowledge-base/implementations/embeddingService.ts`

**功能**：
- 文本向量化
- 批量向量化
- 向量缓存

### 任务6.3：实现 RAG 检索器

**文件**：`server/services/knowledge-base/implementations/ragRetriever.ts`

**功能**：
- 相似度检索
- 多维度检索
- 结果排序

### 任务6.4：实现知识索引器

**文件**：`server/services/knowledge-base/implementations/knowledgeIndexer.ts`

**功能**：
- 知识索引构建
- 索引更新
- 索引优化

### 任务6.5：创建知识模型

**文件**：`server/services/knowledge-base/models/`

**模型**：
- `businessRuleKnowledge.ts`
- `testPatternKnowledge.ts`
- `pitfallKnowledge.ts`
- `riskScenarioKnowledge.ts`

### 任务6.6：创建API路由

**端点**：
```
GET  /api/v1/knowledge/search           - 搜索知识
POST /api/v1/knowledge                  - 添加知识
PUT  /api/v1/knowledge/:id              - 更新知识
DELETE /api/v1/knowledge/:id            - 删除知识
```

### 任务6.7：测试

- 向量化测试
- 检索准确率测试
- 性能测试

---

## Phase 7: 集成测试和优化（Week 9-10）

### 任务7.1：端到端集成测试

**测试场景**：

1. **完整流程测试**
   - 上传原型 → 解析 → 分析 → 生成 → 执行 → 报告

2. **各模块集成**
   - 解析 + 分析
   - 分析 + 生成
   - 生成 + 执行
   - 执行 + 报告

3. **RAG增强流程**
   - 生成 + 知识库检索 + 增强

### 任务7.2：性能测试

**测试指标**：
- 解析性能：100MB文件 < 30秒
- 生成性能：1000个用例 < 5分钟
- 执行性能：100个用例并行 < 50% CPU
- 报告生成：< 2秒

### 任务7.3：压力测试

**测试场景**：
- 并发解析10个文档
- 并发执行100个用例
- 并发生成1000个用例

### 任务7.4：代码质量检查

**检查项**：
- 单元测试覆盖率 > 80%
- 代码规范检查
- 类型检查完整性
- 文档完整性

### 任务7.5：性能优化

**优化方向**：
- 数据库查询优化
- 缓存策略优化
- 算法优化
- 并发优化

### 任务7.6：文档完善

**文档**：
- API文档
- 使用指南
- 扩展指南
- 故障排查指南

### 任务7.7：部署准备

**准备事项**：
- 数据库迁移脚本
- 数据平迁方案
- 灰度部署计划
- 回滚方案

---

## 关键里程碑

| 里程碑 | 时间 | 检查清单 |
|--------|------|---------|
| 架构完成 | Week 1 | ✅ 目录结构 ✅ 接口定义 ✅ 门面服务 |
| 解析模块 | Week 2 | ✅ 解析器实现 ✅ 单元测试 ✅ API接口 |
| 分析生成 | Week 4 | ✅ 生成器实现 ✅ RAG集成 ✅ 集成测试 |
| 执行调度 | Week 6 | ✅ 执行引擎 ✅ 调度器 ✅ 监控系统 |
| 报告系统 | Week 7 | ✅ 报告生成 ✅ 导出功能 ✅ API |
| 知识库 | Week 8 | ✅ 知识管理 ✅ RAG检索 ✅ API |
| 上线准备 | Week 10 | ✅ 端到端测试 ✅ 性能优化 ✅ 文档完整 |

---

## 团队分工建议

**假设5人团队**：

1. **架构师** (1人)
   - 总体架构设计
   - Phase 1 + 核心接口
   - 跨模块协调

2. **后端开发1** (1人)
   - Phase 2: 解析模块
   - Phase 4: 执行模块

3. **后端开发2** (1人)
   - Phase 3: 分析生成模块
   - Phase 5: 报告模块

4. **后端开发3** (1人)
   - Phase 6: 知识库模块
   - 基础设施优化

5. **QA/测试** (1人)
   - 单元测试
   - 集成测试
   - 性能测试

---

## 风险管理

### 高风险项

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|---------|
| AI生成质量不稳定 | 高 | 高 | 构建质量评估体系 |
| RAG检索准确率低 | 中 | 中 | 优化向量化和检索策略 |
| 并发性能不足 | 中 | 高 | 提前进行压力测试 |
| 数据库性能 | 低 | 高 | 提前优化索引和查询 |

### 缓解策略

1. **早期验证**：Week 3完成RAG集成验证
2. **性能基准**：Week 5前建立性能基准
3. **备选方案**：准备备选AI模型和检索策略
4. **增量部署**：灰度部署，逐步切换流量

---

## 成功标准

✅ **功能完整性**
- 所有5个模块完整实现
- 所有接口可用
- 端到端流程可用

✅ **质量标准**
- 单元测试覆盖率 > 80%
- 集成测试通过率 100%
- 性能指标达成

✅ **文档完整性**
- API文档完整
- 用户指南完整
- 开发文档完整

✅ **可维护性**
- 代码规范遵循
- 无重大技术债
- 清晰的扩展点

---

## 常见问题解答

**Q: 是否需要停止现有功能开发？**
A: 建议采用双轨制：新架构在新模块目录，旧功能保留在legacy目录，逐步迁移。

**Q: 数据库迁移如何处理？**
A: 使用Prisma migrations，每个Phase进行一次数据库变更，并准备回滚脚本。

**Q: 如何验证新架构质量？**
A: 每个Phase结束进行Code Review + 集成测试，关键节点进行性能基准测试。

**Q: 前端需要修改吗？**
A: API接口保持兼容，前端无需修改，仅需集成新增的API端点。

---

## 附录：技术栈确认

- **后端框架**：Express.js + TypeScript
- **ORM**：Prisma + TypeScript
- **数据库**：MySQL 8.0
- **向量数据库**：Qdrant
- **AI模型**：OpenRouter API
- **向量化**：阿里通义Embedding
- **自动化**：Playwright + MCP
- **异步队列**：Bull/BEE
- **WebSocket**：ws + Socket.IO
- **测试框架**：Jest + Supertest
- **代码检查**：ESLint + TypeScript Compiler

---

## 下一步行动

1. **立即启动Phase 1**
   - [ ] 创建目录结构（Day 1）
   - [ ] 定义接口（Day 2-3）
   - [ ] 创建门面服务框架（Day 4-5）

2. **准备Phase 2**
   - [ ] 分配开发资源
   - [ ] 准备开发环境
   - [ ] 准备测试工具

3. **设置项目管理**
   - [ ] 建立每周同步机制
   - [ ] 建立Code Review流程
   - [ ] 建立性能基准监控

