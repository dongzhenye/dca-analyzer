# Claude Code 工作流优化方案
> 面向一人公司和初创产品的高质量快速开发

**版本**: 1.0
**日期**: 2026-02-10
**适用场景**: Next.js / React / TypeScript 项目，独立开发者或小团队

---

## 目录

1. [核心原则](#核心原则)
2. [Git 工作流](#git-工作流)
3. [Claude Code 定制化](#claude-code-定制化)
4. [Changelog 策略](#changelog-策略)
5. [Vibe Coding 最佳实践](#vibe-coding-最佳实践)
6. [自动化清单](#自动化清单)
7. [实战工作流](#实战工作流)

---

## 核心原则

### 平衡速度与质量

**目标**: 既要保持独立开发者的敏捷性，又要达到硅谷科技公司的工程标准。

**三大支柱**:
1. **结构化分支策略** — GitHub Flow + worktree，保证 main 永远可部署
2. **AI 辅助质量门** — 用 Claude Code 做代码审查和测试生成
3. **最小化但有效的自动化** — CI/CD 只做必要检查，避免过度工程

---

## Git 工作流

### 1. GitHub Flow（推荐）

**核心规则**: 所有非平凡工作都在分支上进行，main 永远可部署。

```bash
# 开始新功能
git checkout -b feat/new-feature

# 或使用 worktree（并行开发多个特性）
git worktree add ../dca-wt/feat-new-feature -b feat/new-feature
```

**何时直接提交到 main**:
- ✅ 单行 typo 修复
- ✅ 文档更新（README、注释）
- ✅ 配置调整（.gitignore、.env.example）
- ❌ 任何可能破坏构建的改动

**何时必须开分支**:
- 多次提交的工作（功能、重构、i18n）
- 实验性改动
- 任何需要回滚的可能性

### 2. Git Worktree 实战

**目录结构**:
```
~/projects/
  dca-analyzer/              # 主仓库
  dca-analyzer-wt/           # worktree 容器
    feat-auth/               # 功能分支 worktree
    hotfix-payment/          # 紧急修复 worktree
    review-pr-123/           # PR 审查 worktree
```

**常用命令**:
```bash
# 创建 worktree + 新分支
git worktree add -b feat/auth ../dca-analyzer-wt/feat-auth main

# 列出所有 worktree
git worktree list

# 删除 worktree
git worktree remove ../dca-analyzer-wt/feat-auth

# 清理过期元数据
git worktree prune
```

**关键注意事项**:
- 每个 worktree 需要独立的 `node_modules`（运行 `bun install`）
- 限制同时活跃的 worktree 数量（2-3 个）
- 使用描述性目录名匹配分支名
- 定期清理已合并的 worktree

### 3. Commit 规范

**格式**: [Conventional Commits](https://www.conventionalcommits.org/)

```
<type>: <subject>

[optional body]

[optional footer]
```

**类型**:
- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档
- `refactor:` 重构（不改变行为）
- `chore:` 维护、配置、依赖

**AI Co-Author 归属**:
```bash
git commit -m "$(cat <<'EOF'
feat: implement DCA calculation engine

Add core calculation logic for dollar-cost averaging analysis.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

**何时归属 AI**:
- ✅ 完整函数或功能由 AI 生成（>50% 代码）
- ✅ 复杂算法你没有自己写
- ❌ Tab 补全和语法修复
- ❌ 你逐步指导的重构

### 4. PR 工作流（即使单人）

**为什么单人也要 PR**:
1. 创建可审查的记录
2. 触发 CI/CD 检查
3. 生成预览部署（Vercel）
4. 保持 main 分支历史清晰

**流程**:
```bash
# 1. 推送分支
git push -u origin feat/new-feature

# 2. 创建 PR
gh pr create --title "feat: add new feature" --body "Description..."

# 3. CI 自动运行（lint, test, build）

# 4. 自我审查（见下节）

# 5. 合并（squash 保持历史清晰）
gh pr merge --squash --delete-branch

# 6. 清理 worktree
git worktree remove ../dca-analyzer-wt/feat-new-feature
```

---

## Claude Code 定制化

### 1. 项目级 CLAUDE.md

**位置**: `.claude/CLAUDE.md` 或 `./CLAUDE.md`

**内容**:
```markdown
# DCA Analyzer Project

## Tech Stack
- Next.js 16 (App Router)
- React 19
- TypeScript (strict mode)
- Tailwind CSS 4
- Bun (package manager)

## Code Conventions
- Use `bun` for all package operations (not npm/npx)
- Prefer functional components with hooks
- Keep components under 200 lines
- Co-locate tests with source files

## Testing
- Run: `bun test`
- Write tests for calculation logic (critical path)
- Skip tests for simple UI components

## Build & Deploy
- Build: `bun run build`
- Deploy: Vercel auto-deploys on push to main
- Preview: Vercel creates preview for PRs

## Git Workflow
- Use GitHub Flow (feature branches)
- Squash merge to main
- Include AI co-author attribution for substantial contributions
```

### 2. 自定义 Skills

**创建 PR 审查 Skill**:

`.claude/skills/review-pr/SKILL.md`:
```yaml
---
name: review-pr
description: Review pull request for quality, security, and best practices
disable-model-invocation: true
allowed-tools: Bash, Read, Grep
context: fork
agent: Explore
---

Review the current PR:

1. **Get PR diff**: Run `gh pr diff`
2. **Analyze changes**:
   - Edge cases not covered
   - Security vulnerabilities (XSS, injection, etc.)
   - Performance concerns
   - Test coverage gaps
3. **Check conventions**:
   - Conventional commit format
   - TypeScript strict mode compliance
   - Tailwind class usage (no inline styles)
4. **Output**: Markdown report with findings and suggestions
```

**使用**: `/review-pr` 在 PR 创建后运行

**创建部署前检查 Skill**:

`.claude/skills/pre-deploy/SKILL.md`:
```yaml
---
name: pre-deploy
description: Run pre-deployment checks before merging to main
disable-model-invocation: true
allowed-tools: Bash, Read
---

Pre-deployment checklist:

1. Run tests: `bun test`
2. Type check: `bunx tsc --noEmit`
3. Lint: `bun run lint`
4. Build: `bun run build`
5. Check for console.log/debugger statements
6. Verify .env.example is up to date

Report any failures and block merge if critical issues found.
```

### 3. Hooks 配置

**自动格式化** (PostToolUse):

`.claude/settings.json`:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/auto-format.sh",
            "async": true
          }
        ]
      }
    ]
  }
}
```

`.claude/hooks/auto-format.sh`:
```bash
#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path')

if [[ "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
  npx prettier --write "$FILE_PATH" 2>&1 || true
fi

exit 0
```

**阻止危险命令** (PreToolUse):

`.claude/hooks/block-dangerous.sh`:
```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

# 阻止 rm -rf, git push --force 等
if echo "$COMMAND" | grep -qE '\brm\s+-rf\b|git\s+push\s+.*--force'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Destructive command blocked. Use trash or confirm manually."
    }
  }'
  exit 0
fi

exit 0
```

### 4. 自定义 Subagent

**代码审查专家**:

`.claude/agents/code-reviewer.md`:
```yaml
---
name: code-reviewer
description: Expert code reviewer. Use after significant code changes.
tools: Read, Glob, Grep
model: sonnet
permissionMode: default
maxTurns: 30
---

You are a senior code reviewer specializing in React/TypeScript/Next.js.

When invoked, analyze the code and provide:
1. **Quality**: Code smells, anti-patterns, over-engineering
2. **Security**: XSS, injection, auth issues
3. **Performance**: Unnecessary re-renders, N+1 queries
4. **Best practices**: React hooks rules, TypeScript strict mode
5. **Testing**: Missing test coverage for critical paths

Be specific and actionable. Reference file:line for each issue.
```

**使用**: Claude 会在代码改动后自动调用，或手动触发

---

## Changelog 策略

### 对比三种方案

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **不维护（靠 git log）** | 零成本 | 用户难以理解，缺乏分类 | 内部工具、实验项目 |
| **自动生成** | 低成本，一致性高 | 缺乏人类视角，可能冗余 | 快速迭代的 MVP |
| **手动维护** | 高质量，用户友好 | 高成本，容易遗漏 | 面向用户的产品 |

### 推荐方案：半自动化

**工具链**: Conventional Commits + [changesets](https://github.com/changesets/changesets)

**工作流**:
1. 开发时遵循 Conventional Commits
2. 发版前运行 `changeset` 生成草稿
3. 人工审查和润色（添加用户视角）
4. 发布时自动更新 CHANGELOG.md 和版本号

**安装**:
```bash
bun add -D @changesets/cli
bunx changeset init
```

**配置** (`.changeset/config.json`):
```json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

**使用**:
```bash
# 开发完成后，添加 changeset
bunx changeset
# 选择版本类型（major/minor/patch）
# 输入用户友好的描述

# 发版时
bunx changeset version  # 更新 CHANGELOG.md 和 package.json
git add .
git commit -m "chore: release v1.2.0"
git tag v1.2.0
git push --follow-tags
```

**CHANGELOG.md 示例**:
```markdown
# Changelog

## 1.2.0 (2026-02-10)

### Features
- **Custom strategy**: Allow 0-100% weight per level (removed 40% cap) (#6)
- **i18n**: Add Chinese localization

### Bug Fixes
- **validation**: Fix asymmetric weight validation edge case

### Performance
- Optimize chart rendering for large datasets

---

## 1.1.0 (2026-01-15)
...
```

### 高标准初创项目的选择

**推荐**: **半自动化（changesets）**

**理由**:
1. **用户视角**: 手动润色确保 changelog 对用户有意义
2. **低成本**: 自动生成草稿减少 80% 工作量
3. **一致性**: 基于 Conventional Commits，不会遗漏
4. **版本管理**: 自动更新 package.json 和 git tag

**不推荐纯手动**: 容易遗漏，尤其是快速迭代时

---

## Vibe Coding 最佳实践

### 刘小排的经验（2025-2026）

**背景**: 刘小排是 Claude Code 的"榜一大哥"，一个月用了数万美元的 token，成功打造数十款产品并实现可观年收入。

**核心实践**:

1. **需求对齐先行**
   - 不要直接让 AI 写代码
   - 先与 AI 共同梳理详细的 spec.md（规格说明书）
   - 明确需求、架构、测试策略

2. **小步迭代（分块工作流）**
   - 将复杂任务分解为小的、可测试的增量
   - 每次实现一个功能 → 测试 → 下一步
   - 避免让 AI 一次性生成大量代码

3. **测试驱动开发（TDD）**
   - AI 擅长编写测试用例
   - 先写测试，再让 AI 实现代码，最后验证
   - 有效约束 AI 行为并提高代码质量

4. **多实例并行**
   - 同时运行多个 Claude Code 实例处理不同任务
   - 例如：一个实例写代码，另一个实例审查

5. **"超思考"模式**
   - 使用内部指令（如 `ultrathink`）促使 AI 深入思考
   - 避免 AI "偷懒"给出浅层答案

6. **理解 AI 推理**
   - 使用 `claude.continue fork session` 复制会话
   - 在新会话中提问理解 AI 的决策逻辑

7. **角色转变**
   - 从"编码员"转变为"指挥家"
   - 思考代码而非写代码
   - 审查 AI 生成的代码，确保符合规范

### 实战模式

**模式 1: 需求对齐 → 分块实现**

```bash
# 1. 需求对齐
claude
> 我想实现一个 DCA 策略分析器，支持自定义权重分配。
> 先帮我梳理一份 spec.md，包括：
> - 核心功能
> - 数据模型
> - UI 组件结构
> - 测试策略

# 2. 审查 spec.md，确认无误

# 3. 分块实现
> 按照 spec.md，先实现数据模型（types.ts）
> [AI 生成代码]
> 写单元测试验证数据模型
> [AI 生成测试]
> 运行测试，确认通过

# 4. 继续下一块
> 实现计算引擎（calculations.ts）
> ...
```

**模式 2: TDD 驱动**

```bash
claude
> 我需要一个函数 calculatePositionStats，输入是 allocations, bottomPrice, targetPrice, totalSize，输出是 PositionMetrics。
> 先写测试用例，覆盖以下场景：
> 1. 所有价格都被触发
> 2. 部分价格被触发
> 3. 没有价格被触发
> 4. 边界情况（bottomPrice = targetPrice）

# [AI 生成测试]

> 现在实现 calculatePositionStats 函数，确保所有测试通过

# [AI 生成实现]

> 运行测试
```

**模式 3: 并行开发（worktree + 多实例）**

```bash
# Terminal 1: 主功能开发
cd ~/projects/dca-analyzer
claude

# Terminal 2: 测试编写
cd ~/projects/dca-analyzer-wt/feat-tests
claude
> 为 calculations.ts 编写完整的单元测试

# Terminal 3: 文档更新
cd ~/projects/dca-analyzer-wt/docs-update
claude
> 更新 README.md，添加新功能说明
```

---

## 自动化清单

### 必须自动化（高 ROI）

| 任务 | 工具 | 配置位置 |
|------|------|----------|
| **Lint** | Biome / ESLint | `.github/workflows/ci.yml` |
| **Type check** | TypeScript | `.github/workflows/ci.yml` |
| **Test** | Bun test | `.github/workflows/ci.yml` |
| **Build** | Next.js | `.github/workflows/ci.yml` |
| **Deploy** | Vercel | 自动（push to main） |
| **Preview** | Vercel | 自动（PR 创建） |

### 可选自动化（中 ROI）

| 任务 | 工具 | 何时使用 |
|------|------|----------|
| **Changelog** | changesets | 有版本发布需求 |
| **依赖更新** | Dependabot | 依赖较多时 |
| **代码格式化** | Prettier hook | 团队协作时 |
| **Commit lint** | commitlint | 严格规范时 |

### 不推荐自动化（低 ROI）

- ❌ 自动合并 PR（即使测试通过）
- ❌ 自动发布到生产（保留人工审查）
- ❌ 复杂的多环境部署流水线（初创阶段用不上）
- ❌ 代码覆盖率强制要求（过度工程）

### GitHub Actions 配置

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Lint
        run: bun run lint

      - name: Type check
        run: bunx tsc --noEmit

      - name: Test
        run: bun test

      - name: Build
        run: bun run build
        env:
          # 如果 build 需要环境变量
          NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
```

---

## 实战工作流

### 场景 1: 新功能开发

```bash
# 1. 创建分支 + worktree
git worktree add -b feat/custom-weights ../dca-wt/feat-custom-weights main
cd ../dca-wt/feat-custom-weights

# 2. 安装依赖
bun install

# 3. 启动 Claude Code
claude

# 4. 需求对齐
> 我想移除自定义策略中每个仓位 40% 的上限，改为 0-100%。
> 先帮我分析影响范围，列出需要修改的文件。

# [AI 分析]

> 看起来只需要改 lib/constants.ts 中的 MAX_LEVEL_WEIGHT。
> 帮我生成一个 plan.md，包括：
> - 改动内容
> - 测试策略
> - 验证步骤

# 5. 实现
> 按照 plan.md 实现改动

# 6. 测试
> 运行测试确认没有破坏现有功能
bun test

# 7. 提交
git add lib/constants.ts
git commit -m "fix: allow custom weight 0-100% per level

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"

# 8. 推送 + 创建 PR
git push -u origin feat/custom-weights
gh pr create --title "fix: allow custom weight 0-100% per level" \
  --body "Remove hardcoded 40% cap. Users can now allocate 0-100% to any level."

# 9. 自我审查
claude
> /review-pr

# 10. CI 通过后合并
gh pr merge --squash --delete-branch

# 11. 清理
cd ~/projects/dca-analyzer
git worktree remove ../dca-wt/feat-custom-weights
git pull
```

### 场景 2: Bug 修复（紧急）

```bash
# 1. 直接在主仓库创建分支（无需 worktree）
git checkout -b hotfix/validation-bug

# 2. 快速修复
claude
> 修复 use-simulator.ts 中的权重验证逻辑，确保对称性

# 3. 测试
bun test

# 4. 提交 + 推送
git add hooks/use-simulator.ts
git commit -m "fix: asymmetric weight validation edge case"
git push -u origin hotfix/validation-bug

# 5. 快速合并（跳过 PR 如果非常紧急）
gh pr create --title "fix: validation bug" --body "Critical fix" --web
# 或直接合并到 main（仅限单行修复）
git checkout main
git merge hotfix/validation-bug
git push
git branch -d hotfix/validation-bug
```

### 场景 3: 重构（大规模）

```bash
# 1. 创建 worktree
git worktree add -b refactor/modular-arch ../dca-wt/refactor-modular main
cd ../dca-wt/refactor-modular
bun install

# 2. 需求对齐
claude
> 我想将 1500 行的 page.tsx 拆分为模块化架构。
> 先帮我设计目录结构和组件划分。

# 3. 分块重构
> 第一步：提取 ConfigPanel 组件
> [AI 实现]
> 运行测试确认无破坏
bun test

> 第二步：提取 StrategySelector 组件
> [AI 实现]
> 运行测试
bun test

# ... 逐步完成

# 4. 最终验证
bun run build
bun test

# 5. 提交 + PR
git add .
git commit -m "refactor: modularize page.tsx into focused components"
git push -u origin refactor/modular-arch
gh pr create --title "refactor: modular architecture" \
  --body "Split monolithic page.tsx into 8 focused components. No behavior change."

# 6. 审查 + 合并
claude
> /review-pr
gh pr merge --squash --delete-branch

# 7. 清理
cd ~/projects/dca-analyzer
git worktree remove ../dca-wt/refactor-modular
git pull
```

---

## 总结

### 核心要点

1. **GitHub Flow + worktree** — 保证 main 永远可部署，支持并行开发
2. **AI 辅助但人工审查** — 让 AI 生成代码，但你要理解和审查
3. **半自动化 changelog** — changesets 生成草稿，人工润色
4. **最小化 CI/CD** — lint + test + build 足够，避免过度工程
5. **Vibe Coding 纪律化** — 需求对齐 → 小步迭代 → TDD → 审查

### 下一步行动

- [ ] 创建 `.claude/skills/review-pr/SKILL.md`
- [ ] 配置 `.claude/hooks/` 自动格式化和危险命令拦截
- [ ] 安装 changesets: `bun add -D @changesets/cli`
- [ ] 配置 GitHub Actions CI
- [ ] 实践一次完整的 feature 开发流程

### 参考资料

**Git 工作流**:
- [Unlocking Solo-Dev Superpowers with Claude Code and GitHub Flow](https://nuttakitkundum.medium.com/unlocking-solo-dev-superpowers-with-claude-code-and-github-flow-991978f7543b)
- [Should AI Be Listed as a Co-Author in Your Git Commits?](https://www.dariuszparys.com/should-ai-be-listed-as-a-co-author-in-your-git-commits/)

**Claude Code 定制**:
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks)
- [Claude Code Subagents Documentation](https://code.claude.com/docs/en/sub-agents)

**Vibe Coding**:
- 刘小排（Liu Xiaopai）— Claude Code "榜一大哥"，vibe coding 实践者
- [Vibe Coding 最佳实践（2025-2026）](https://oreateai.com) — 需求对齐、小步迭代、TDD

**Changelog 自动化**:
- [Changesets](https://github.com/changesets/changesets) — 半自动化 changelog 工具
- [Conventional Commits](https://www.conventionalcommits.org/) — 提交信息规范

---

**版本历史**:
- v1.0 (2026-02-10): 初始版本，基于 dca-analyzer 项目实践和社区最佳实践
