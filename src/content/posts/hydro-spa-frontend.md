---
title: HydroOJ 前端 SPA 化实践
date: 2026-09-16 17:25:46
categories:
- 二次开发
tags:
- HydroOJ
- 前端
- SPA
excerpt: 不 fork、不整站切换，用 registerRenderer 白名单渐进接管：自研 React SPA 与 stock 前端长期共存的关键设计——首屏 seed 契约、pageapi 缓存隔离、一份 manifest 三处复用、能后端算的就不进 bundle。
---

HydroOJ 的 stock 前端（`ui-default`）是服务端渲染的 Nunjucks 模板加一套 jQuery 风格的客户端脚本。二次开发做到一定规模后，我们决定把前端迁到 React + TypeScript 的 SPA 技术栈，但不接受两个常见方案的代价：fork stock 全量重写（无法持续跟进上游），或整站一次性切换（风险不可控）。

最终走的是第三条路：**白名单渐进接管**——自研 SPA（下文称 `ui-custom`）以插件形式注册自己的渲染器，按模板白名单逐页接管 stock 页面，白名单之外的页面仍由 stock 渲染，两套 UI 长期并存。本文记录这套架构的关键设计与踩过的坑。在这套架构上怎么做灰度发布，见姊妹篇《HydroOJ SPA 化前端的灰度发布实践》。

## 接管点：渲染器注册

Hydro 处理一次 HTML 请求时，由 `renderHTML` 决定谁来渲染：

```ts
// framework/framework/server.ts
renderHTML(templateName: string, args: Record<string, any>) {
    const renderers = Object.values(server.renderers)
        .filter((r) => r.accept.includes(templateName) || r.asFallback);
    const topPrio = renderers.sort((a, b) => b.priority - a.priority)[0];
    return topPrio.render(templateName, args, { handler: this, /* ... */ });
}
```

`ui-default` 注册为 `asFallback: true, priority: 1` 兜底；`ui-custom` 注册为 `priority: 50`，`accept` 只列自己接管的模板。于是一个模板要么整体归 SPA，要么整体归 stock，不存在混渲染的中间态——这正是"渐进"的落点：**接管一个新页面 = 白名单加一行**。

## SPA 外壳与首屏 seed

SPA 要渲染首屏就得有数据。两个选择：先出壳再 fetch（请求瀑布 + 白屏抖动），或者服务端把首屏数据直接种进 HTML。我们选后者：`index.html` 是纯静态外壳，渲染器只做三件事——塞语言脚本、塞首屏种子、改标题：

```ts
const seed = JSON.stringify({
    UiContext: context.handler.UiContext,
    UserContext: context.UserContext,
    pageName: args.page_name || name,
    title,
    ...args,  // handler 的 response.body，即页面数据
}, serializer(false, context.handler)).replace(/</g, '\\u003c');
```

种子有一条铁律：**它必须和客户端 `fetchPage` 对同一 URL 拿到的数据完全一致**。客户端启动时把 seed 直接灌进数据缓存，首屏渲染一个请求都不用发；一旦两者不一致，用户首屏看到的和点击刷新后客户端拉到的就会不同——这类 bug 极难排查，所以一致性要在结构上保证（后文"`handler/after`"一节）。

一个安全细节：seed 里含用户可控字符串（标题、昵称、简介），`JSON.stringify` 之后必须把 `<` 转义成 `\u003c`，否则内容里出现 `</script>` 就能逃出 script 标签。

## 取数：pageapi 与内容协商

客户端导航的取数走的是同一条业务路由：fetch 同一个 URL，带 `x-hydro-inject` 头，`Accept` 协商到 JSON，框架把 UiContext/UserContext 折进响应体。这个设计有两个必须主动处理的点。

**缓存键隔离**。同一个 URL 既出 HTML 又出 JSON，任何共享缓存（代理、浏览器磁盘缓存）都可能把 A 用户的 HTML 缓存当成 B 用户的 JSON 命中——反过来也一样，这就是"Accept 协商投毒"。我们的解法是不让协商参与缓存分键：插件用 `addCaptureRoute('/pageapi/')` 把数据请求 rewrite 到独立前缀，JSON 永远住在与文档不同的 URL 上；同时页面数据含用户态，响应带 `no-store`。

**JSON 分支要自己补 SSR 语义**。有些处理逻辑只写在 handler 渲染 HTML 的分支里——比如题目附件的 `file://` 链接重写。JSON 协商路径不执行那段代码，SPA 的取数路径必须把等价逻辑补上，否则页面上附件链接全部断链。教训：**接管一个页面时，要通读它在非 JSON 分支里干了什么**。

## 单一事实源：一份 manifest，三处复用

哪些页面归 SPA 管，这件事有三个消费方：服务端渲染器的 `accept` 列表、客户端的链接拦截判定、客户端路由的页面集合。三处各写一份必然漂移，所以收敛成一个纯数据模块：

```ts
// src/pages.ts —— 服务端直接 import，客户端经 vite 打包
export const SPA_PAGES = [
    { template: 'problem_main.html',   route: '/p' },
    { template: 'problem_detail.html', route: '/p/$pid' },
    // 一个模板可以对应多个路由（如编辑页的 create/edit）
];

export const ACCEPT_TEMPLATES = [...new Set(SPA_PAGES.map((p) => p.template))];

/** 客户端判定：这个 URL 形状归不归 SPA 管（query/hash 不参与） */
export function isSpaRoute(path: string): boolean { /* 形状匹配 */ }
```

配套的约定有两条。一是路由文件放在 `src/routes/` 下按文件路由，但没有 manifest entry 的路由文件永不激活（服务端仍渲染 stock），有 entry 没路由文件则落到 router 的 not-found——两头都响，漂移藏不住。二是这个模块必须保持"纯数据 + 纯函数"，不能引 React/路由库；也因此它必须放在 `src/` 下——dev 模式只有 `/src/*` 的请求会被转发给内嵌 vite。

## 不重造轮子：能后端算的就不进 bundle

SPA 化最容易犯的错，是把 stock 的服务端逻辑在客户端重写一遍：markdown 渲染、权限过滤、i18n、标题规则……每一样都是体积和偏差的来源。我们的原则相反：**stock 怎么算的，后端照原样算好塞进响应，SPA 只做展示**：

- **顶栏与用户菜单**：遍历 stock 注册的 `Nav`/`UserDropdown` UI 节点，逐节点跑它自带的权限 checker——第三方插件往导航里注册的入口，SPA 顶栏自动出现，前端零适配；
- **markdown/公式/防 XSS**：直接复用 `ui-default` 的 backendlib 渲染管线（直引它的服务端模块，不引客户端代码），产出 `contentHtml` 下发；
- **多语言题面**：按用户首选语言选段（精确匹配 → 前缀匹配 → 首个 key）在后端完成，前端拿到的就是确定语言的文本；
- **页面标题**：`renderTitle` 规则与 stock 的 SSR 外壳相同。

这些全部收敛在一个 `handler/after` 钩子里：它在任何渲染器之前运行，所以 JSON 取数和 SPA 首屏 seed 看到的是同一份数据——上一节说的 seed 一致性，就是靠这个结构保证的。

## 与 stock 共存的约定

并存能长期成立，靠的是三条纪律：**注入只增不改**——塞进响应体的字段 stock 模板一律不读，对 stock 页面零副作用；**静态资源各走各的**——stock 页引 `ui-default` 的 bundle，SPA 页引自己的，缓存互不干扰；**接管以页面为单位**——一个 URL 要么整页 SPA 要么整页 stock，界面上不存在两套 UI 的混排。

## 开发与构建

dev 模式下插件内嵌一个 `middlewareMode` 的 vite dev server，只把 `/@vite/`、`/src/`、`/node_modules/` 这类前缀 capture 给 vite，其余请求照常走 Hydro——改前端代码即时热更，改插件的 `index.ts` 才需要重启进程。生产模式读构建产物 `dist/index.html`；产物还没构建好时返回一个 `meta refresh` 的"building"页，而不是 404。

两个踩过的坑值得留档：vite 配置文件不能占用默认名（会被自动加载，路由插件被实例化两次）；dev 模式的 Service Worker 会缓存旧模块，加依赖后页面白屏报 504 outdated dep，要清 `.vite` 缓存并注销 SW 才能恢复。

## 小结

- 白名单接管让 SPA 化变成一连串小步提交：加一行 manifest 接管一个页面，出问题删一行回退，全程不需要 fork stock；
- 首屏 seed 与 `fetchPage` 的数据一致性是结构保证的（同一个 `handler/after`），不是靠约定维护的；
- 取数路径要自己补齐 JSON 协商分支缺失的 SSR 语义，缓存分键与内容协商彻底解耦（`/pageapi/` 前缀 + `no-store`）；
- 能后端算的就不进 bundle：markdown、权限、i18n、标题全部复用 stock 管线，SPA 只做展示。

这套架构的最大价值是**每一步都可退**。灰度发布（每模板独立放量、客户端路由判定与服务端规则同源）建立在这套接管机制之上，细节见姊妹篇《HydroOJ SPA 化前端的灰度发布实践》。
