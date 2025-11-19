import { PrismaClient } from '../../src/generated/prisma/index.js';

const RELEVANCE_SCORE_THRESHOLD = 0.3;   // 只把相似度至少30%的候选交给AI做下一步处理
const FALLBACK_RECALL_RATIO = 0.6;       // 阈值命中太少时回退召回约60%的候选集

export interface TestCaseFilters {
  system?: string;
  module?: string;
  tags?: string[];
  priorityFilter?: string;
  changeBrief: string;
}

export interface TestCase {
  id: number;
  title: string;
  steps: any;
  tags: any;
  system?: string;
  module?: string;
  created_at?: Date;
  relevance_score?: number;
  recall_reason?: string;
}

export interface RelevanceResult {
  is_relevant: boolean;
  relevance_score: number;
  recall_reason: string;
}

/**
 * 嵌入和相似度服务
 * 负责基于关键词和语义相似度匹配相关测试用例
 */
export class EmbeddingService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 基于过滤条件和变更描述找到相关的测试用例
   * @param filters 过滤条件
   * @returns 相关测试用例列表
   */
  async findRelevantTestCases(filters: TestCaseFilters): Promise<TestCase[]> {
    console.log(`🔍 [EmbeddingService] 搜索相关测试用例...`);
    console.log(`   系统: ${filters.system}`);
    console.log(`   模块: ${filters.module}`);
    console.log(`   标签: ${filters.tags?.join(', ') || '无'}`);
    console.log(`   变更描述: ${filters.changeBrief}`);

    try {
      // 构建基础过滤条件
      const whereCondition: any = {};

      if (filters.system) {
        whereCondition.system = filters.system;
      }

      if (filters.module) {
        whereCondition.module = filters.module;
      }

      // 标签过滤（如果提供）
      if (filters.tags && filters.tags.length > 0) {
        // 使用JSON搜索查找包含指定标签的用例
        whereCondition.tags = {
          array_contains: filters.tags
        };
      }

      console.log(`🔎 [EmbeddingService] 基础查询条件:`, whereCondition);

      // 先获取符合基础条件的测试用例
      const candidateCases = await this.prisma.test_cases.findMany({
        where: whereCondition,
        select: {
          id: true,
          title: true,
          steps: true,
          tags: true,
          system: true,
          module: true,
          created_at: true
        }
      });

      console.log(`📊 [EmbeddingService] 找到 ${candidateCases.length} 个候选用例`);

      if (candidateCases.length === 0) {
        return [];
      }

      const relevanceRankedCases = await this.filterByRelevance(
        candidateCases,
        filters.changeBrief
      );

      const thresholdCases = relevanceRankedCases.filter(
        testCase => (testCase.relevance_score ?? 0) >= RELEVANCE_SCORE_THRESHOLD
      );

      let relevantCases = thresholdCases;

      if (relevantCases.length === 0) {
        const fallbackCount = Math.max(
          1,
          Math.ceil(candidateCases.length * FALLBACK_RECALL_RATIO)
        );

        relevantCases = relevanceRankedCases.slice(0, fallbackCount);
        console.log(
          `⚖️ [EmbeddingService] 未命中相关性阈值，按 ${FALLBACK_RECALL_RATIO * 100}% 召回回退到 ${relevantCases.length} 个候选`
        );
      }

      console.log(`✅ [EmbeddingService] 最终筛选出 ${relevantCases.length} 个相关用例`);

      return relevantCases.map(c => ({
        id: c.id,
        title: c.title,
        steps: c.steps,
        tags: c.tags,
        system: c.system,
        module: c.module,
        created_at: c.created_at,
        relevance_score: c.relevance_score,
        recall_reason: c.recall_reason
      }));

    } catch (error: any) {
      console.error(`❌ [EmbeddingService] 搜索相关用例失败: ${error.message}`);
      throw new Error(`搜索相关用例失败: ${error.message}`);
    }
  }

  /**
   * 计算两个内容的相似度（简化实现）
   * @param content1 内容1
   * @param content2 内容2
   * @returns 相似度分数 (0-1)
   */
  async calculateSimilarity(content1: string, content2: string): Promise<number> {
    // 简化的文本相似度计算
    // 实际项目中可以使用更复杂的算法或调用向量数据库
    
    const text1 = content1.toLowerCase();
    const text2 = content2.toLowerCase();

    // 基于关键词重叠度计算相似度
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;
    
    const similarity = intersection.size / union.size;
    return Math.min(similarity * 2, 1); // 放大相似度分数
  }

  /**
   * 基于变更描述过滤相关用例
   * @private
   */
  private async filterByRelevance(cases: any[], changeBrief: string): Promise<any[]> {
    console.log(`🤖 [EmbeddingService] 开始语义相关性分析...`);

    const relevantCases: any[] = [];

    for (const testCase of cases) {
      try {
        // 提取用例的文本内容进行相关性判断
        const caseContent = this.extractCaseContent(testCase);
        
        // 基于关键词匹配判断相关性
        const isRelevant = await this.checkKeywordRelevance(caseContent, changeBrief, testCase);

        if (isRelevant.is_relevant) {
          relevantCases.push({
            ...testCase,
            relevance_score: isRelevant.relevance_score,
            recall_reason: isRelevant.recall_reason
          });
        }

      } catch (error: any) {
        console.warn(`⚠️ [EmbeddingService] 分析用例 ${testCase.id} 相关性失败: ${error.message}`);
      }
    }

    // 按相关性分数排序
    relevantCases.sort((a, b) => b.relevance_score - a.relevance_score);

    console.log(`📋 [EmbeddingService] 相关性分析完成，筛选出 ${relevantCases.length} 个相关用例`);

    return relevantCases;
  }

  /**
   * 提取测试用例的文本内容
   * @private
   */
  private extractCaseContent(testCase: any): string {
    const contents: string[] = [];

    // 添加标题
    if (testCase.title) {
      contents.push(testCase.title);
    }

    // 添加步骤内容
    if (testCase.steps && Array.isArray(testCase.steps)) {
      testCase.steps.forEach((step: any) => {
        if (step.description) contents.push(step.description);
        if (step.action) contents.push(step.action);
        if (step.text) contents.push(step.text);
      });
    }

    // 添加标签
    if (testCase.tags && Array.isArray(testCase.tags)) {
      contents.push(...testCase.tags);
    }

    return contents.join(' ').toLowerCase();
  }

  /**
   * 基于关键词匹配检查相关性
   * @private
   */
  private async checkKeywordRelevance(
    caseContent: string, 
    changeBrief: string, 
    testCase: any
  ): Promise<RelevanceResult> {
    
    const changeBriefLower = changeBrief.toLowerCase();
    const caseContentLower = caseContent.toLowerCase();

    // 提取变更描述中的关键词
    const changeKeywords = this.extractKeywords(changeBriefLower);
    
    let relevanceScore = 0;
    let matchedKeywords: string[] = [];
    let reasons: string[] = [];

    // 1. 直接关键词匹配
    for (const keyword of changeKeywords) {
      if (caseContentLower.includes(keyword)) {
        relevanceScore += 0.3;
        matchedKeywords.push(keyword);
      }
    }

    // 2. 模块匹配加分
    if (testCase.system || testCase.module) {
      const moduleText = `${testCase.system || ''} ${testCase.module || ''}`.toLowerCase();
      for (const keyword of changeKeywords) {
        if (moduleText.includes(keyword)) {
          relevanceScore += 0.2;
          reasons.push(`模块匹配: ${keyword}`);
        }
      }
    }

    // 3. 功能词汇匹配
    const functionalWords = [
      '登录', '注册', '搜索', '下单', '支付', '上传', '下载', 
      '添加', '删除', '修改', '查看', '保存', '提交', '取消',
      '弹窗', '页面', '按钮', '表单', '列表', '详情'
    ];

    for (const word of functionalWords) {
      if (changeBriefLower.includes(word) && caseContentLower.includes(word)) {
        relevanceScore += 0.15;
        reasons.push(`功能匹配: ${word}`);
      }
    }

    // 4. 标签相关性
    if (testCase.tags && Array.isArray(testCase.tags)) {
      for (const tag of testCase.tags) {
        if (changeBriefLower.includes(tag.toLowerCase())) {
          relevanceScore += 0.25;
          reasons.push(`标签匹配: ${tag}`);
        }
      }
    }

    // 判断是否相关（降低阈值，让AI做精确判断）
    const isRelevant = relevanceScore >= 0.1;
    
    if (matchedKeywords.length > 0) {
      reasons.unshift(`关键词匹配: ${matchedKeywords.join(', ')}`);
    }

    const recallReason = reasons.length > 0 ? reasons.join('; ') : '无明显关联';

    return {
      is_relevant: isRelevant,
      relevance_score: Math.min(relevanceScore, 1.0),
      recall_reason: recallReason
    };
  }

  /**
   * 从文本中提取关键词
   * @private
   */
  private extractKeywords(text: string): string[] {
    // 移除标点符号和特殊字符
    const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ');
    
    // 分词（简化版，实际项目中可以使用专业分词库）
    const words = cleanText.split(/\s+/).filter(w => w.length > 1);
    
    // 过滤常见停用词
    const stopWords = new Set([
      '的', '是', '在', '了', '和', '与', '或', '但', '而', '所以', '因为',
      '这', '那', '个', '我', '你', '他', '她', '它', '我们', '你们', '他们',
      'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could'
    ]);

    return words.filter(w => !stopWords.has(w.toLowerCase()) && w.length > 1);
  }

  /**
   * 获取用例相关性统计信息
   * @param filters 过滤条件
   * @returns 统计信息
   */
  async getRelevanceStats(filters: TestCaseFilters): Promise<{
    totalCases: number;
    relevantCases: number;
    keywordMatches: number;
    moduleMatches: number;
  }> {
    try {
      // 获取基础候选用例数量
      const whereCondition: any = {};
      if (filters.system) whereCondition.system = filters.system;
      if (filters.module) whereCondition.module = filters.module;

      const totalCases = await this.prisma.test_cases.count({
        where: whereCondition
      });

      // 获取相关用例进行分析
      const relevantCases = await this.findRelevantTestCases(filters);

      // 简单的匹配统计
      const keywordMatches = relevantCases.filter(c => 
        c.title.toLowerCase().includes(filters.changeBrief.toLowerCase())
      ).length;

      const moduleMatches = relevantCases.filter(c =>
        (c.system && filters.changeBrief.toLowerCase().includes(c.system.toLowerCase())) ||
        (c.module && filters.changeBrief.toLowerCase().includes(c.module.toLowerCase()))
      ).length;

      return {
        totalCases,
        relevantCases: relevantCases.length,
        keywordMatches,
        moduleMatches
      };

    } catch (error: any) {
      console.error(`❌ [EmbeddingService] 获取相关性统计失败: ${error.message}`);
      throw new Error(`获取相关性统计失败: ${error.message}`);
    }
  }
}
