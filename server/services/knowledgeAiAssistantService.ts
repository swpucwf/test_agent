import type { KnowledgeItem } from './testCaseKnowledgeBase.js';
import type { LLMConfig } from './aiParser.js';
import { llmConfigManager } from '../../src/services/llmConfigManager.js';
import { ProxyAgent } from 'undici';

export interface KnowledgeAiRequest {
  description: string;
  systemName?: string;
  preferredCategory?: KnowledgeItem['category'];
  preferredDomain?: string;
  partialFields?: Partial<KnowledgeItem>;
}

export interface KnowledgeAiSuggestion {
  suggestion: KnowledgeItem;
  reasoning?: string;
  improvements?: string[];
  confidence?: number;
  raw: string;
}

export class KnowledgeAiAssistantService {
  private async getConfig(): Promise<LLMConfig> {
    try {
      if (!llmConfigManager.isReady()) {
        await llmConfigManager.initialize();
      }
      return llmConfigManager.getCurrentConfig();
    } catch (error) {
      console.error('⚠️ 知识库AI助手配置管理器不可用，回退至环境变量配置', error);
      const fallback: LLMConfig = {
        apiKey: process.env.OPENROUTER_API_KEY || '',
        baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
        model: process.env.DEFAULT_MODEL || 'openai/gpt-4o',
        temperature: parseFloat(process.env.DEFAULT_TEMPERATURE || '0.25'),
        maxTokens: parseInt(process.env.DEFAULT_MAX_TOKENS || '2000', 10)
      };

      if (!fallback.apiKey) {
        throw new Error('AI服务未配置API Key，请在系统设置中配置 OPENROUTER_API_KEY');
      }
      return fallback;
    }
  }

  private async callLLM(systemPrompt: string, userPrompt: string, maxTokens?: number): Promise<string> {
    const config = await this.getConfig();

    const requestBody = {
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: config.temperature ?? 0.2,
      max_tokens: maxTokens || config.maxTokens || 1500
    };

    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    const fetchOptions: RequestInit & { dispatcher?: ProxyAgent } = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'HTTP-Referer': 'https://testflow-ai.com',
        'X-Title': 'TestFlow Knowledge Assistant',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    };

    if (proxyUrl) {
      console.log(`[KnowledgeAI] 使用代理: ${proxyUrl}`);
      fetchOptions.dispatcher = new ProxyAgent(proxyUrl);
    }

    const response = await fetch(`${config.baseUrl}/chat/completions`, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[KnowledgeAI] 调用LLM失败:', response.status, errorText);
      throw new Error(`AI接口调用失败(${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('AI接口返回格式异常：缺少content');
    }
    return content;
  }

  private extractJsonBlock(text: string): string | null {
    if (!text) return null;

    const fenced = text.match(/```json([\s\S]*?)```/i);
    if (fenced && fenced[1]) {
      return fenced[1].trim();
    }

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return text.substring(firstBrace, lastBrace + 1);
    }

    return null;
  }

  private sanitizeCategory(category: unknown, fallback?: KnowledgeItem['category']): KnowledgeItem['category'] {
    const valid = ['business_rule', 'test_pattern', 'pitfall', 'risk_scenario'];
    if (typeof category === 'string' && valid.includes(category)) {
      return category as KnowledgeItem['category'];
    }
    return fallback || 'business_rule';
  }

  private sanitizeTags(tags: unknown): string[] {
    if (Array.isArray(tags)) {
      return tags
        .map(tag => String(tag).trim())
        .filter(tag => tag.length > 0)
        .slice(0, 10);
    }

    if (typeof tags === 'string') {
      return tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .slice(0, 10);
    }

    return [];
  }

  private buildSystemPrompt(): string {
    return `你是企业测试知识库策展专家，负责把业务或测试描述转成可检索的知识条目。
输出必须是合法 JSON，结构如下：
{
  "knowledge": {
    "category": "business_rule | test_pattern | pitfall | risk_scenario",
    "title": "简洁、<=20字，精准表达知识点",
    "content": "包含背景、触发条件、应对措施/验证要点。使用自然段，方便向量检索",
    "businessDomain": "核心业务领域，如订单、风控、支付",
    "tags": ["标签1","标签2","标签3"],
    "metadata": {
      "riskLevel": "low|medium|high",
      "source": "来源描述，如口述/模块",
      "vectorHints": "列出实体、枚举值、时间、金额等结构化关键信息"
    }
  },
  "reasoning": "说明提炼依据（50~120字）",
  "improvements": ["若描述不足时建议补充"],
  "confidence": 0-1
}

必须遵守：
1. 只能基于输入内容推断，不得虚构。
2. tags 取 3~6 个高质量关键词。
3. content 覆盖场景背景 + 触发条件 + 处理策略/测试关注点。
4. metadata.vectorHints 用于Qdrant向量检索，列出可结构化的要素。
5. JSON之外不输出任何文本。`;
  }

  private buildUserPrompt(request: KnowledgeAiRequest): string {
    const contextLines: string[] = [
      `系统名称：${request.systemName || '默认'}`,
      `期望类别：${request.preferredCategory || '未指定'}`,
      `期望业务领域：${request.preferredDomain || '未指定'}`
    ];

    if (request.partialFields && Object.keys(request.partialFields).length > 0) {
      contextLines.push(`当前已有字段（若存在请尽量保留约束）：${JSON.stringify(request.partialFields)}`);
    }

    return `${contextLines.join('\n')}

请把以下描述整理成上述 JSON 结构：
---
${request.description.trim()}
---

额外规则：
- 如果描述提到风险/缺陷/踩坑，优先分类 pitfall 或 risk_scenario；
- 如果描述是流程策略/验证方法，更偏向 test_pattern；
- 信息缺失时在 improvements 部分提示用户补充；
- 所有文本使用中文输出。`;
  }

  private normalizeSuggestion(rawData: any, request: KnowledgeAiRequest): KnowledgeItem {
    const knowledge = rawData?.knowledge || rawData?.suggestion || rawData;
    if (!knowledge) {
      throw new Error('AI返回结果缺少知识字段');
    }

    const category = this.sanitizeCategory(knowledge.category, request.preferredCategory);
    const tags = this.sanitizeTags(knowledge.tags);

    let metadata: Record<string, unknown> | undefined;
    if (knowledge.metadata && typeof knowledge.metadata === 'object') {
      metadata = {
        ...knowledge.metadata,
        generatedBy: 'ai-assistant',
        generatedAt: new Date().toISOString()
      };
    } else if (typeof knowledge.metadata === 'string') {
      metadata = {
        originalMetadata: knowledge.metadata,
        generatedBy: 'ai-assistant',
        generatedAt: new Date().toISOString()
      };
    } else {
      metadata = {
        generatedBy: 'ai-assistant',
        generatedAt: new Date().toISOString()
      };
    }

    if (!metadata.vectorHints && request.description) {
      metadata.vectorHints = `来源描述: ${request.description.slice(0, 120)}...`;
    }

    if (request.systemName && !metadata.source) {
      metadata.source = request.systemName;
    }

    return {
      category,
      title: (knowledge.title || '未命名知识点').trim(),
      content: (knowledge.content || '').trim(),
      businessDomain: (
        knowledge.businessDomain ||
        request.preferredDomain ||
        request.systemName ||
        '通用业务'
      ).trim(),
      tags: tags.length > 0 ? tags : ['知识库'],
      metadata
    };
  }

  public async generateSuggestion(request: KnowledgeAiRequest): Promise<KnowledgeAiSuggestion> {
    if (!request.description || request.description.trim().length === 0) {
      throw new Error('描述不能为空');
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(request);

    const raw = await this.callLLM(systemPrompt, userPrompt);
    const jsonString = this.extractJsonBlock(raw);
    if (!jsonString) {
      throw new Error('AI未返回JSON结构，请补充描述后重试');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (error) {
      console.error('[KnowledgeAI] 解析AI返回JSON失败:', jsonString, error);
      throw new Error('AI返回内容格式错误，无法解析JSON');
    }

    const suggestion = this.normalizeSuggestion(parsed, request);

    return {
      suggestion,
      reasoning: parsed.reasoning,
      improvements: parsed.improvements,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
      raw
    };
  }
}

export const knowledgeAiAssistantService = new KnowledgeAiAssistantService();
