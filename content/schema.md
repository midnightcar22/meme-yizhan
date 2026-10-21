# 梗内容字段规范（content/schema.md）

投稿梗内容的**唯一参考文档**。每条梗一个 JSON 文件：`content/memes/<id>.json`。
字段与 `js/data.js` 中的梗数据结构 1:1 对应；`js/data.js` 由脚本生成，**不要手改**。

## 语言约定（重要）

所有内容字段都有**中文版和英文版**：无后缀字段为中文（zh），带 `En` 后缀的为英文（en）。
**词条本身（`nameCN`）与拼音（`pinyin`）跨语言不变**；界面标签、导航、按钮等 UI 文案跟随语言切换。
中文版详情页展示中文内容字段，英文版展示英文内容字段。

## 顶层字段

| 字段 | 类型 | 必填 | 约束与说明 |
| --- | --- | --- | --- |
| id | string | ✅ | 与文件名一致（不含 .json）；只允许小写字母、数字、连字符（`^[a-z0-9]+(-[a-z0-9]+)*$`）；全局唯一；即详情页 URL 的 slug |
| nameCN | string | ✅ | 中文名（词条本身，跨语言不变），非空 |
| nameEN | string | ✅ | 英文译名，非空 |
| titleEn | string | ✅ | 英文标题（英文版 H1 / og:title / JSON-LD headline 用），含英文关键词，非空 |
| summaryEn | string | ✅ | 英文摘要（给搜索引擎/海外读者），**80~160 字符**，解释梗的含义 + 使用场景，外国人无背景也能看懂 |
| pinyin | string | ✅ | 不带声调，空格分隔（跨语言不变） |
| emotionEquivalent | string | ✅ | **中文**情绪等价表达（非直译）；多个候选用 ` / ` 分隔 |
| emotionEquivalentEn | string | ✅ | **英文**情绪等价表达；多个候选用 ` / ` 分隔 |
| symbolLayer | object | ✅ | 见下表 |
| origin | string | ✅ | **中文**起源：谁在何时何地如何走红 |
| originEn | string | ✅ | **英文**起源 |
| usage | string | ✅ | **中文**用法：什么场景如何使用 |
| usageEn | string | ✅ | **英文**用法 |
| commonMisreading | string | ✅ | **中文**常见误读：海外用户最容易理解错的地方 |
| commonMisreadingEn | string | ✅ | **英文**常见误读 |
| accessibilityScore | object | ✅ | 见下表 |
| mediaTemperature | string | ✅ | 枚举：`cold`（冷媒介）/ `warm`（温媒介）/ `hot`（热媒介） |
| tags | string[] | ✅ | 非空数组，每个元素为非空字符串（建议 2-5 个；中文标签，展示时经 tagword 词典翻译） |
| memeLineage | object[] | ✅ | 非空数组，见下表 |
| likes | number | ✅ | 点赞数，非负整数（站内展示用） |
| shares | number | ✅ | 分享数，非负整数 |
| image | string | ✅ | 梗图 URL，必须 `http(s)://` 开头 |
| related | string[] | 选填 | 引用其他梗的 id 数组；引用的 id 必须已存在于 `content/memes/` |

## symbolLayer（符号层）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| literalTranslation | string | ✅ | 中文字面翻译 |
| literalTranslationEn | string | ✅ | 英文字面翻译 |
| explanation | string | ✅ | 中文结构说明：为什么这么构词/造句 |
| explanationEn | string | ✅ | 英文结构说明 |

## accessibilityScore（文化折扣指数）

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | --- | --- |
| language | number | ✅ | 1-5 整数，越高语言依赖越强（越难懂） |
| context | number | ✅ | 1-5 整数，越高语境依赖越强 |
| adaptability | number | ✅ | 1-5 整数，越高越难跨文化适配 |

## memeLineage[]（模因谱系节点）

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | --- | --- |
| date | string | ✅ | `YYYY-MM` 格式 |
| event | string | ✅ | 中文节点事件描述，非空 |
| eventEn | string | ✅ | 英文节点事件描述，非空 |
| type | string | ✅ | 枚举：`origin`（起源）/ `copy`（复制）/ `mutation`（变异）/ `crossover`（跨文化传播）/ `reimport`（本土化回传） |

## 校验规则（npm run validate 自动执行）

1. JSON 必须可解析，根节点必须是对象；
2. 上表全部必填字段必须存在且类型正确（含 titleEn / summaryEn 及全部 `En` 双语字段）；
3. summaryEn 长度必须在 80~160 字符之间；
4. id 与文件名一致、全局唯一、只允许小写字母数字连字符；
5. 枚举值（mediaTemperature、lineage[].type）必须合法；
6. accessibilityScore 三项必须为 1-5 整数；likes / shares 为非负数字；
7. image 必须 `http(s)://` 开头；memeLineage 非空且 date 为 `YYYY-MM`；
8. related（如有）引用的梗 id 必须真实存在；
9. **未知字段一律报错**：投稿模板中的 `_说明` 字段提交前必须删除；字段名拼写错误也会被拦截。

任一失败：`npm run validate` 输出中文错误并 exit 1；`npm run build` 前置执行校验，内容不合法时构建不会继续。
