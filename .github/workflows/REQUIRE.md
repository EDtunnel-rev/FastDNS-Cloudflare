### `REQUIRE.md`

## 额外配置指南

本文件简述了项目中使用的 GitHub Actions 工作流所需的额外配置步骤。这些步骤涉及到仓库的 Secrets 配置、必要的依赖项、以及如何适应具体环境的修改。

### 1. `.github/workflows/cf.yml`

#### 功能概述
`cf.yml` 文件定义了一个持续集成（CI）工作流，它在代码推送或拉取请求时，自动执行代码格式检查、单元测试，并在所有测试通过后将代码部署到 Cloudflare Workers。

#### 额外配置步骤
- **Cloudflare API Token**：
  - 你需要在 GitHub 仓库的 "Settings > Secrets and variables > Actions" 中配置一个名为 `CF_API_TOKEN` 的秘密（Secret），该秘密应包含 Cloudflare 的 API 令牌。
  - API 令牌需要拥有对 Cloudflare Workers 的部署权限。可以通过 Cloudflare 仪表板生成该令牌。

- **Node.js 环境**：
  - 确保 `package.json` 文件中包含适当的 `deploy` 脚本，例如 `wrangler publish`，用于将代码发布到 Cloudflare Workers。
  - 添加 `wrangler` 作为开发依赖，确保在工作流中能够成功安装并使用。

### 2. `.github/workflows/create.yml`

#### 功能概述
`create.yml` 文件定义了一个工作流，用于在推送代码或创建拉取请求时自动执行代码格式检查、测试，并在必要时将代码同步到多个分支或仓库。

#### 额外配置步骤
- **GitHub Token**：
  - 该工作流使用 GitHub 提供的 `GITHUB_TOKEN` 进行身份验证。这是一个自动生成的令牌，GitHub Actions 可以通过它访问和操作私有仓库。无需手动配置，但你可以在需要时创建自定义的个人访问令牌，并将其配置为 Secret。

- **适配源和目标仓库**：
  - 在 `sync.yml` 文件中，确保将源仓库和目标仓库的 URL 替换为实际的仓库地址。
  - 适当地配置 `ref` 参数，以指定需要同步的分支。

### 3. `.github/workflows/sync.yml`

#### 功能概述
`sync.yml` 文件定义了一个同步工作流，定期或手动触发，将源仓库的代码自动同步到目标仓库。适用于跨仓库或跨分支的代码同步场景。

#### 额外配置步骤
- **配置目标仓库的远程 URL**：
  - 在 `sync.yml` 文件中，替换 `your-source-repo/your-repo-name` 和 `your-destination-repo/your-repo-name` 为实际的源和目标仓库名称及 URL。
  
- **定时任务的调整**：
  - 根据需要调整 `cron` 表达式的定时任务。默认情况下，工作流每晚凌晨 0 点自动运行。如果需要更高频率的同步，可以修改 `cron` 表达式。
  
- **Git 配置**：
  - `sync.yml` 中使用的 `git` 命令依赖 GitHub Actions 默认的 Git 配置。无需额外配置，但可以根据需要定制 Git 用户名和邮箱信息。

### 额外注意事项
- **依赖管理**：
  - 确保所有的项目依赖项在 `package.json` 中正确配置，并通过 `npm ci` 或 `npm install` 安装。
  - 在执行 `npm run deploy` 或 `npm test` 之前，请确保这些命令在本地开发环境中正常工作。

- **安全性**：
  - 请勿在 GitHub Actions 的工作流文件中直接暴露敏感信息（如 API Token）。始终使用 GitHub Secrets 来管理这些信息。

以上配置完成后，你的 GitHub Actions 工作流应该能够正常运行并自动处理 CI/CD 流程中的各项任务。
