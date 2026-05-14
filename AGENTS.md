# ai-images-tools 项目大纲

> 后续任务先读本文件，再按需打开具体模块。除非任务要求全局审计，不要每次重新扫描整个项目。

## 协作约定

- 默认使用中文回复，输出文档也使用中文。
- 接到新任务后，先用自己的理解简短复述任务。
- 能并行拆分且有价值时优先使用子代理；不适合并行的任务不要强行使用。
- 有歧义或不理解的需求先追问，不要盲目改代码。
- 当前工作树可能包含用户或前序任务的未提交改动，修改前先看 `git status --short`，不要回滚无关改动。

## 项目定位

这是一个本地桌面图片压缩工具，目标是通过 Electron 打包为 Windows/macOS 可执行应用。核心链路是：

1. 用户上传单张或多张本地图片。
2. 前端读取图片信息并维护图片列表。
3. 用户配置质量、输出格式和尺寸调整参数。
4. Renderer 通过 preload 暴露的安全 API 调用 Electron 主进程 IPC。
5. 主进程使用 Sharp 在本地压缩图片，输出到临时目录。
6. 前端展示压缩结果、对比视图、保存/批量导出入口，并把压缩记录写入本地历史。

## 技术栈

- 桌面框架：Electron 34
- 构建工具：electron-vite、Vite 5
- 前端：Vue 3、TypeScript、Pinia
- UI/样式：PrimeVue 4、PrimeIcons、Tailwind CSS 4、项目自定义 CSS
- 图片处理：Sharp
- 文件与历史持久化：Electron 主进程 + Node.js fs API + JSON 文件
- 打包：electron-builder

## 常用命令

- 安装依赖：`pnpm install`
- 开发启动：`pnpm run dev`
- 生产构建：`pnpm run build`
- macOS/Windows 打包：
  - `pnpm run build:mac`
  - `pnpm run build:win`
  - `pnpm run build:unpack`

当前没有发现测试脚本。改动后至少运行 `pnpm run build` 和 `git diff --check`。

## 关键目录

- `docs/`：产品需求、技术方案、实现计划和架构流程图。后续做功能审计时以这里为需求来源。
- `electron/main/index.ts`：Electron 主进程入口，创建窗口并注册 IPC。
- `electron/main/ipc/handlers.ts`：主进程 IPC 注册中心，覆盖窗口控制、文件对话框、图片信息、压缩、保存和历史记录。
- `electron/main/services/imageCompress.ts`：Sharp 压缩服务，包含元数据读取、格式转换、尺寸调整、临时文件清理。
- `electron/main/services/historyService.ts`：历史记录 JSON 读写、追加、删除、清空、导入导出。
- `electron/preload/index.ts`：通过 `contextBridge` 暴露 `window.electronAPI`，Renderer 不能直接访问 Node API。
- `src/main.ts`：Vue/Pinia/PrimeVue 前端入口。
- `src/App.vue`：应用布局入口，挂载标题栏、侧栏、主工作区、控制面板、拖拽层、Toast 和历史面板。
- `src/stores/imageStore.ts`：图片列表、当前选中项、压缩参数和批量压缩状态。
- `src/stores/historyStore.ts`：历史记录列表、搜索筛选、抽屉开关和统计信息。
- `src/types/index.ts`：图片、压缩参数、历史记录和 `window.electronAPI` 类型定义。
- `src/components/`：前端功能组件。

## 前端组件大纲

- `TitleBar.vue`：自定义标题栏、窗口按钮、历史入口。
- `SidePanel.vue`：左侧栏容器，组合上传区和图片列表。
- `UploadZone.vue`：点击上传、文件夹上传、局部拖拽上传，底层复用 `useImageImport.ts`。
- `ImageList.vue`：图片列表、选中、删除、清空、全选/反选、选中删除、排序、状态徽章。
- `ContentArea.vue`：中央工作区，切换对比视图/原图/压缩图，展示空状态和批量进度。
- `ImagePreview.vue`：单图预览。
- `ImageCompare.vue`：压缩前后并排对比、同步缩放和平移、重置视图。
- `ControlPanel.vue`：右侧压缩设置容器。
- `QualitySlider.vue`：质量滑块、低/中/高/极高预设、预估大小。
- `FormatSelector.vue`：保持原格式/JPG/PNG/WebP 选择。
- `ScaleAdjuster.vue`：尺寸调整开关、比例缩放、最大宽高。
- `ActionButtons.vue`：开始压缩、保存单张、导出全部、压缩完成写历史。
- `ProgressBar.vue`：批量进度与取消压缩。
- `DragOverlay.vue`：全局拖拽遮罩，接收窗口级拖拽并复用 `useImageImport.ts`。
- `HistoryPanel.vue`：历史抽屉、统计、时间筛选、搜索、导入导出、清空。
- `HistoryItem.vue`：历史记录条目、缩略图、节省比例、打开压缩结果、重新压缩、应用参数、删除。
- `ToastContainer.vue` 与 `useToast.ts`：全局提示。

## IPC 与数据流

`window.electronAPI` 暴露的主通道：

- 文件：`openFileDialog`、`openImageFolderDialog`、`resolveImagePaths`、`saveFileDialog`、`selectFolderDialog`、`getImageInfo`、`saveToPath`、`fileExists`、`openPath`
- 压缩：`compressImage`、`compressBatch`、`cancelCompress`
- 压缩事件：`onCompressProgress`、`onCompressResult`、`onCompressError`
- 历史：`loadHistory`、`addHistory`、`deleteHistory`、`clearHistory`、`exportHistory`、`importHistory`
- 窗口：`minimize`、`maximize`、`close`

主进程边界：

- 文件系统、Sharp、系统对话框只放在 `electron/main`。
- Renderer 只通过 `window.electronAPI` 交互，不直接使用 Node.js API。
- 压缩结果当前输出到系统临时目录 `app.getPath('temp')/ai-images-tools`，应用退出时清理。
- 历史记录存储在 `app.getPath('userData')/history.json`。

## docs 功能实现现状

整体判断：核心 P0 链路已经有实现，历史记录也已实现大部分基础能力，但仍未完全达到 `docs/需求分析.md` 和 `docs/实现计划.md` 的完整范围。

已实现或基本实现：

- Electron + Vue 3 + TypeScript + Pinia + PrimeVue + Tailwind/electron-vite 基础工程。
- 自定义单窗口三栏布局：标题栏、左侧上传/列表、中间预览/对比、右侧控制面板。
- 主进程窗口安全配置：`contextIsolation: true`、`nodeIntegration: false`。
- 图片格式校验：JPG/JPEG、PNG、WebP、BMP、GIF。
- 单文件 100MB 上限校验。
- 点击上传、快捷键上传、文件夹上传、局部拖拽和全局拖拽上传。
- 图片基本信息读取和列表展示。
- 质量滑块、质量预设、输出格式选择、尺寸缩放/最大宽高。
- Sharp 本地压缩，支持 JPEG/PNG/WebP 输出，GIF 按首帧处理，BMP 可转码。
- 单张和批量压缩，进度事件，错误事件，取消标志。
- 原图/压缩图/对比视图切换。
- 对比视图同步缩放和平移。
- 单张保存和批量导出，导出支持同名自动避让、逐张进度和失败重试。
- Toast 操作反馈。
- 历史记录本地 JSON 持久化、启动加载、压缩后自动追加、100 条上限、去重。
- 历史面板搜索、今天/近 7 天/近 30 天/全部筛选、删除、清空二次确认、导入导出、统计摘要。
- electron-builder macOS/Windows 打包配置。

部分实现或需要复核：

- 上传入口已收敛到 `useImageImport.ts`，点击上传、`Ctrl/Cmd + O`、文件夹上传、局部拖拽和全局拖拽共用 Electron IPC 路径解析。
- 上传进度没有独立展示，只在读取完成后 Toast。
- 压缩进度是 Sharp 流程中的阶段性/模拟进度，不是底层真实编码进度。
- 取消压缩通过全局标志实现，只能在单张处理完成后的检查点生效，不能中断正在执行的 Sharp `toFile`。
- 默认单张保存路径会优先使用原图所在目录。
- 批量导出已通过主进程 `avoidConflict` 自动生成 `_compressed_1` 之类的可用文件名。
- 历史记录重复时主进程返回成功但不回传最终记录，前端乐观添加可能与磁盘历史产生短暂不一致。
- 历史时间筛选的“今天”已按自然日计算。
- 构建通过不等于运行态完整验收，后续 UI/功能变更建议用 `pnpm run dev` 做真实 Electron smoke。

未实现或明显缺口：

- 上传导入阶段缺少逐文件进度条。
- 压缩取消仍是软取消，不能硬中断当前 Sharp 任务。
- 内存占用监控。
- README 使用文档。
- 性能基准测试和可执行包安装态验收。
- 自动化测试。

## 后续任务建议入口

- 做上传/文件选择问题：先读 `src/components/UploadZone.vue`、`src/App.vue`、`electron/preload/index.ts`、`electron/main/ipc/handlers.ts`。
- 做压缩引擎：先读 `electron/main/services/imageCompress.ts`、`electron/main/ipc/handlers.ts`、`src/components/ActionButtons.vue`。
- 做导出保存：先读 `src/components/ActionButtons.vue` 和 `electron/main/ipc/handlers.ts`。
- 做历史记录：先读 `src/composables/useHistory.ts`、`src/stores/historyStore.ts`、`src/components/HistoryPanel.vue`、`src/components/HistoryItem.vue`、`electron/main/services/historyService.ts`。
- 做 UI 调整：先读 `src/App.vue`、目标组件和 `src/assets/styles/main.css`。
- 做 docs 对齐：先读 `docs/需求分析.md` 和 `docs/实现计划.md`，再对照本文件的“docs 功能实现现状”。

## 本轮验证记录

- 已运行：`pnpm run build`
- 结果：通过。主进程、preload 和 renderer 均成功构建。
