---
title: HydroOJ SPA 化前端的灰度发布实践
date: 2026-09-16 16:40:44
categories:
- 二次开发
tags:
- HydroOJ
- 前端
- 灰度发布
excerpt: Hydro 的 renderer 选择是进程级全局决策，SPA 插件一启用，白名单页面即全量切换。但 renderHTML 把完整的 handler 传进了 render 函数——分流的正确位置就在自己插件里，细到每个模板一个灰度值。
---

在 HydroOJ 上做二次开发，我们把前端 SPA 化：自研 SPA 前端（下文称 `ui-custom`）通过 `registerRenderer` 按模板白名单接管页面，白名单外的页面仍由 stock 前端（`ui-default`）渲染，两套 UI 长期并存、逐步替换。

这套改造上线即全量——插件一启用，所有用户在白名单页面上立刻切到新界面。如果想要"一部分人先用新 UI，其他人继续用 stock"，Hydro 并没有现成的开关。

读完渲染管线的源码后会发现：Hydro 确实没有按人灰度的机制，但架构留了口子，在自己插件里加十几行就能做，而且能细到"每个模板一个独立灰度值"。

## 渲染管线：一个全局静态的选择器

一次 HTML 请求渲染成什么样，由 `renderHTML` 决定：

```ts
// framework/framework/server.ts
renderHTML(templateName: string, args: Record<string, any>) {
    const renderers = Object.values(server.renderers)
        .filter((r) => r.accept.includes(templateName) || r.asFallback);
    const topPrio = renderers.sort((a, b) => b.priority - a.priority)[0];
    return topPrio.render(templateName, args, {
        handler: this,
        UserContext: this.user,
        url: this.url,
        _: this.translate,
    });
}
```

进程里有两个 renderer：`ui-default` 注册为 `asFallback: true, priority: 1` 兜底所有模板；`ui-custom` 注册为 `priority: 50`，只 `accept` 自己接管的模板白名单。

关键观察有两点：

1. **筛选和排序只看注册时的静态元数据**（`accept`/`priority`），没有任何请求维度。这就是"Hydro 没法灰度"这一错觉的来源——插件装没装是进程级事实，选谁在启动时就定死了。
2. **但最后调用 `render` 时，把整个 handler 传了进去**：`user`、`domain`、`session`、`request` 全都在。

所以分流的正确位置不在框架，而在自己 renderer 的 `render` 函数内部。

## 分流：一处分支 + 委托兜底

```ts
ctx.server.registerRenderer('ui-custom', {
    accept: ACCEPT_TEMPLATES,
    priority: 50,
    asFallback: false,
    render: async (name, args, context) => {
        if (!allowed(context.handler.user, name)) {
            // 等价于本插件未注册：ui-default 本来就是 asFallback 兜底
            return ctx.server.renderers['ui-default'].render(name, args, context);
        }
        // ↓ 原有 SPA 渲染逻辑，不动
        ...
    },
});
```

委托为什么是对的：`ctx.server.renderers` 就是框架那份注册表（`renderHTML` 自己也是从这取的），手动调用 `ui-default` 的 render，拿到的结果和"插件没装"完全一致。非灰度用户看到的就是原汁原味的 stock 页面。

## 规则表：每个模板一个灰度值

判定函数的输入是（用户，模板），输出是走 SPA 还是 stock。规则用一张有序表表达：

```yaml
grayRules:
  - { templates: [team_main, team_detail], percent: 100 }  # 已全量
  - { templates: [problem_detail],         percent: 20 }   # 放量中
  - { templates: [contest_detail],         percent: 0 }    # 暂不接管
```

两个细节值得展开。

**为什么按模板名而不是原始 URL 匹配？** Hydro 的 URL 有带不带 `/d/<domainId>/` 前缀两种形态，模板名天然归一了这层差异，而且和 renderer 的 `accept` 白名单是同一套语言——规则表就是白名单的连续化。

**哈希怎么取？**

```ts
function inBucket(uid: number, percent: number): boolean {
    let h = 0;
    for (const c of String(uid)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h % 100 < percent;
}
```

这里有两个刻意的约束：

1. **哈希是 uid 的纯函数**，同一用户永远落在同一侧，不会出现会话中途换皮、刷新一下界面跳来跳去的情况。
2. **所有模板共用同一个哈希空间**（`h % 100` 对不同阈值比较），放量 20 → 50 时，只有"恰好落在 20–50 段"的用户被卷进来，已在新 UI 里的用户永远不会被翻回去。灰度发布要的正是这种单调性：只进不退。

注意 `percent: 0` 就等价于"该模板回滚到 stock"。这套规则表实际上把原来"改白名单上下架页面"的二元操作，泛化成了连续调节的旋钮。

维度还可以继续加：uid 白名单（内部人员全量）、用户组、`handler.domain`（按域灰度——多域部署下每个域就是天然的试点单位）。都是在规则匹配函数里多写一行的量级。

## SPA 架构的共性：客户端会绕过你的灰度

服务端分流对传统多页应用是完备的——每个页面都是整页加载，每次都重新过一遍 `renderHTML`。但 SPA 只在硬加载时经过 renderer：用户一旦拿到 SPA 外壳，站内导航就由客户端路由接管，renderer 级灰度对这些请求完全不可见。这是"SSR 外壳 + 客户端路由"架构的共性，不是哪一家的实现 bug——官方的 `ui-next` 更极端，`Link` 组件拦截全部站内链接、`fetchPage` 软导航，且它 `asFallback` 全站兜底，一旦启用就没有"落回 stock"这回事。

对 `ui-custom` 来说，绕过风险集中在一点：在 SPA 页面里点击"归 stock 管"的链接时，客户端的拦截判定是纯 URL 形状匹配，不认人：

```ts
// src/layout.tsx
function isSpaNavTarget(url?: string): url is string {
    return isSpaRoute(spaTarget(url).to);  // 只看路径形状，不认人
}
```

后果：张三按规则在题目页该走 stock，但他在一个 SPA 页面里点了题目链接时，客户端照样拦截并 SPA 渲染——服务端的灰度规则被绕过了。

解法是把"该用户的生效接管集"随首屏 seed 下发（SPA 首屏本来就要注入 UiContext，加一个字段的事），客户端的拦截判定改为查这份数据：

- SPA 内点击非接管页 → 判定为 false → 整页跳转 → 服务端渲染 stock，闭环；
- stock 页面没有 SPA JS，所有跳转本来就是整页加载，自然回到服务端分支，闭环。

落点也是现成的：`pages.ts` 在设计上就是服务端/客户端共享的纯数据模块——服务端引它的 `ACCEPT_TEMPLATES`，客户端引它的 `isSpaRoute`。把规则求值函数放进这里，服务端喂 `handler.user`，客户端喂 seed 里下发的规则，"改一处两边生效"的单一事实源约定不破。

也要说明方案的边界：本文的"按模板灰度"依赖白名单接管这套架构。`ui-next` 那种全站兜底式 SPA 没有模板边界，renderer 级灰度只能做用户维度的全有/全无；而它的客户端路由要接灰度，同样得加"哪些 URL 整页跳转"的判定——原理相同，改造点不同。

## 为什么两套 UI 并存是安全的

灰度意味着任意时刻、任意请求都可能渲染成两套皮肤中的任意一套，前提是它们全程并存且互不干扰。几件事验证下来都是成立的：

1. **SPA 的取数接口不经过 renderer**。页面数据走 `/pageapi/*` 和 `x-hydro-inject` 内容协商，与 HTML 渲染分支无关，灰度不影响 API。
2. **SPA 的 `handler/after` 钩子对 stock 页无副作用**。它注入的 `contentHtml`、分类数据等只是往响应里多塞字段，stock 模板不读；注入的顶栏导航数据 stock 模板根本不消费。
3. **静态资源各走各的**：stock 页引 `ui-default` 的 bundle，SPA 页引自己的，缓存互不影响。

另一个佐证：官方的 `ui-next` 也走同一个 `registerRenderer` 通道。多 renderer 并存是这套设计支持的形态，缺的只是 per-request 分支这一步。

## 另一条路：部署级灰度

如果完全不想动代码，还有个零代码方案：跑两个 Hydro 实例连同一个数据库，`addon.json` 一个带 SPA 插件、一个不带，反向代理按 cookie 或百分比分流。Hydro 的 session 存在数据库里，两个实例登录态互通，用户感知不到自己被分到了哪台。

代价是粒度粗（只能按路由规则切，做不到按用户组精细控制），且两个实例必须保持数据兼容。它适合"整体放量"式的发布，不适合"内部人员先试用"这类按人的灰度。

## 小结

- Hydro 的 renderer 选择是进程级全局决策，这是"没法灰度"错觉的来源；但 `render` 收到完整 handler，**分流点就在自己插件的 render 函数里**。
- 规则表用 **模板名 × 灰度百分比**，模板名归一了域名前缀差异；共用 uid 哈希空间保证放量单调（只进不退）；`percent: 0` 即回滚。
- 纯用户灰度客户端零改动；**每模板独立灰度必须让客户端的接管判定与服务端规则同源**（生效接管集随 seed 下发），否则 SPA 内导航会绕过灰度。客户端绕过是"SSR 外壳 + 客户端路由"架构的共性（ui-next 亦然），但按模板灰度这套方案依赖白名单接管架构，全站兜底式 SPA 只能做用户维度灰度。
- 部署级双实例分流是零代码替代方案，粒度粗但运维简单。

对二次开发来说，这类改动的共同特点是：不 fork 框架、不改核心包，全部收在自己的插件模块里。框架给出的扩展点（`registerRenderer`、`addCaptureRoute`、事件钩子）加上一点对渲染管线的理解，足够把发布流程做出大厂灰度系统的核心语义。
